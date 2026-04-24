'use strict';

// All Anthropic API calls happen here (content scripts cannot reach api.anthropic.com directly).

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  handleMessage(message)
    .then(sendResponse)
    .catch(function (err) {
      sendResponse({ error: 'API_ERROR', detail: err.message });
    });
  return true; // keep message channel open for async response
});

async function handleMessage(message) {
  switch (message.action) {
    case 'getCount':    return getCount(message.word);
    case 'translate':   return translate(message.text, message.targetLang);
    case 'analyze':     return analyze(message.text, message.targetLang);
    case 'saveWord':    return saveWord(message.data);
    case 'getAllWords':  return getAllWords();
    case 'clearAll':    return clearAll();
    case 'deleteWord':  return deleteWord(message.normalized);
    default:            return { error: 'UNKNOWN_ACTION' };
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────

async function getApiKey() {
  const result = await chrome.storage.local.get(['apiKey']);
  return result.apiKey || null;
}

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

// ── OpenRouter API (OpenAI-compatible) ───────────────────────────────────

async function callClaude(apiKey, prompt, maxTokens) {
  const stored = await chrome.storage.local.get(['modelName']);
  const model  = (stored.modelName || '').trim() || 'anthropic/claude-haiku-4-5';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'chrome-extension://selectlang',
      'X-Title':       'SelectLang'
    },
    body: JSON.stringify({
      model:      model,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }]
    })
  });

  if (response.status === 401) {
    const e = new Error('INVALID_KEY');
    e.code = 'INVALID_KEY';
    throw e;
  }
  if (response.status === 402) {
    const e = new Error('NO_CREDITS');
    e.code = 'NO_CREDITS';
    throw e;
  }
  if (response.status === 429) {
    const e = new Error('RATE_LIMITED');
    e.code = 'RATE_LIMITED';
    throw e;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => String(response.status));
    // Try to extract a readable message from the JSON error body
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = (parsed.error && (parsed.error.message || parsed.error)) ||
               parsed.message || body;
    } catch (_) {}
    const e = new Error(String(detail));
    e.code   = 'API_ERROR';
    e.detail = String(detail);
    throw e;
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ── Action handlers ───────────────────────────────────────────────────────

async function getCount(normalizedWord) {
  const key    = 'vocab_' + normalizedWord;
  const result = await chrome.storage.local.get([key]);
  return { count: result[key] ? result[key].count : 0 };
}

async function translate(text, targetLang) {
  const apiKey = await getApiKey();
  if (!apiKey) return { error: 'NO_API_KEY' };

  const prompt =
    'Translate "' + text + '" to ' + targetLang + '.\n' +
    'Pick the single most common translation only.\n' +
    'Output the translated word or phrase and nothing else — no markdown, no asterisks, no alternatives, no parentheses, no explanations.';

  try {
    const raw         = await callClaude(apiKey, prompt, 100);
    const translation = raw.replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/_([^_]+)_/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
    return { translation };
  } catch (err) {
    return { error: err.code || 'API_ERROR', detail: err.detail || err.message };
  }
}

async function analyze(text, targetLang) {
  const apiKey = await getApiKey();
  if (!apiKey) return { error: 'NO_API_KEY' };

  const prompt =
    "Analyze this word or phrase: '" + text + "'\n" +
    'Rules:\n' +
    '1. Normalize to the base/dictionary form (e.g. "walked"→"walk", "running"→"run", "better"→"better").\n' +
    '2. If the input is an incomplete phrase, random characters, or makes no sense, set part_of_speech to "invalid".\n' +
    'Return ONLY a valid JSON object. No markdown, no code blocks, no backticks:\n' +
    '{"base_form":"the normalized base form, or null if invalid",' +
    '"part_of_speech":"noun/verb/adjective/adverb/idiom/phrase/invalid",' +
    '"definition":"one clear concise English definition, or empty string if invalid",' +
    '"example":"one natural example sentence, or empty string if invalid"}';

  try {
    const raw = await callClaude(apiKey, prompt, 350);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON in response');
      parsed = JSON.parse(m[0]);
    }

    return {
      base_form:      parsed.base_form ? String(parsed.base_form) : null,
      part_of_speech: String(parsed.part_of_speech || ''),
      definition:     String(parsed.definition     || ''),
      example:        String(parsed.example        || '')
    };
  } catch (err) {
    return { error: err.code || 'API_ERROR', detail: err.detail || err.message };
  }
}

async function deleteWord(normalized) {
  const key = 'vocab_' + normalized;
  await chrome.storage.local.remove(key);
  return { success: true };
}

async function saveWord(data) {
  const normalized = data.normalized || normalizeText(data.original);
  const key        = 'vocab_' + normalized;
  const result     = await chrome.storage.local.get([key]);
  const now        = new Date().toISOString();

  let entry;
  if (result[key]) {
    entry = Object.assign({}, result[key], {
      translation:          data.translation,
      part_of_speech:       data.part_of_speech,
      definition:           data.definition,
      example:              data.example,
      target_language:      data.target_language,
      count:                result[key].count + 1,
      last_seen:            now,
      page_url:             data.page_url
    });
  } else {
    entry = {
      original:             data.original,
      translation:          data.translation,
      part_of_speech:       data.part_of_speech,
      definition:           data.definition,
      example:              data.example,
      target_language:      data.target_language,
      count:                1,
      first_seen:           now,
      last_seen:            now,
      page_url:             data.page_url
    };
  }

  await chrome.storage.local.set({ [key]: entry });
  return { success: true };
}

async function getAllWords() {
  const all   = await chrome.storage.local.get(null);
  const words = [];
  for (const [key, val] of Object.entries(all)) {
    if (key.startsWith('vocab_')) words.push(val);
  }
  return { words };
}

async function clearAll() {
  const all  = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(k => k.startsWith('vocab_'));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  return { success: true, removed: keys.length };
}
