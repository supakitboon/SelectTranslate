'use strict';

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  handleMessage(message)
    .then(sendResponse)
    .catch(function (err) {
      sendResponse({ error: 'API_ERROR', detail: err.message });
    });
  return true;
});

async function handleMessage(message) {
  switch (message.action) {
    case 'getCount':   return getCount(message.word);
    case 'translate':  return translate(message.text, message.targetLang);
    case 'analyze':    return analyze(message.text, message.targetLang);
    case 'saveWord':   return saveWord(message.data);
    case 'getAllWords': return getAllWords();
    case 'clearAll':   return clearAll();
    case 'deleteWord': return deleteWord(message.normalized);
    default:           return { error: 'UNKNOWN_ACTION' };
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────

async function getSettings() {
  const r = await chrome.storage.local.get(['apiKey', 'provider', 'modelName']);
  return {
    apiKey:   r.apiKey    || null,
    provider: r.provider  || 'openrouter',
    model:    (r.modelName || '').trim()
  };
}

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

// ── Provider configs ──────────────────────────────────────────────────────

const PROVIDER_DEFAULTS = {
  openrouter: 'anthropic/claude-haiku-4-5',
  anthropic:  'claude-haiku-4-5',
  openai:     'gpt-4o-mini',
  gemini:     'gemini-2.0-flash'
};

// ── Unified AI caller ─────────────────────────────────────────────────────

async function callAI(apiKey, prompt, maxTokens) {
  const { provider, model } = await getSettings();
  const resolvedModel = model || PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openrouter;

  switch (provider) {
    case 'anthropic': return callAnthropic(apiKey, prompt, maxTokens, resolvedModel);
    case 'openai':    return callOpenAI(apiKey, prompt, maxTokens, resolvedModel);
    case 'gemini':    return callGemini(apiKey, prompt, maxTokens, resolvedModel);
    default:          return callOpenRouter(apiKey, prompt, maxTokens, resolvedModel);
  }
}

// ── OpenRouter ────────────────────────────────────────────────────────────

async function callOpenRouter(apiKey, prompt, maxTokens, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'chrome-extension://selectlang',
      'X-Title':       'SelectLang'
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  return parseOpenAIResponse(res);
}

// ── OpenAI ────────────────────────────────────────────────────────────────

async function callOpenAI(apiKey, prompt, maxTokens, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  return parseOpenAIResponse(res);
}

async function parseOpenAIResponse(res) {
  if (res.status === 401) throwCode('INVALID_KEY');
  if (res.status === 402) throwCode('NO_CREDITS');
  if (res.status === 429) throwCode('RATE_LIMITED');
  if (!res.ok) {
    let detail = String(res.status);
    try { const b = await res.json(); detail = (b.error && (b.error.message || b.error)) || b.message || detail; } catch (_) {}
    throwDetail(detail);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── Anthropic ─────────────────────────────────────────────────────────────

async function callAnthropic(apiKey, prompt, maxTokens, model) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json'
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  if (res.status === 401) throwCode('INVALID_KEY');
  if (res.status === 429) throwCode('RATE_LIMITED');
  if (!res.ok) {
    let detail = String(res.status);
    try { const b = await res.json(); detail = (b.error && b.error.message) || detail; } catch (_) {}
    throwDetail(detail);
  }
  const data = await res.json();
  return data.content[0].text.trim();
}

// ── Gemini ────────────────────────────────────────────────────────────────

async function callGemini(apiKey, prompt, maxTokens, model) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              model + ':generateContent?key=' + apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens }
    })
  });
  if (res.status === 400) throwCode('INVALID_KEY');
  if (res.status === 429) throwCode('RATE_LIMITED');
  if (!res.ok) {
    let detail = String(res.status);
    try { const b = await res.json(); detail = (b.error && b.error.message) || detail; } catch (_) {}
    throwDetail(detail);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// ── Error helpers ─────────────────────────────────────────────────────────

function throwCode(code) {
  const e = new Error(code); e.code = code; throw e;
}
function throwDetail(detail) {
  const e = new Error(String(detail)); e.code = 'API_ERROR'; e.detail = String(detail); throw e;
}

// ── Action handlers ───────────────────────────────────────────────────────

async function getCount(normalizedWord) {
  const key    = 'vocab_' + normalizedWord;
  const result = await chrome.storage.local.get([key]);
  return { count: result[key] ? result[key].count : 0 };
}

async function translate(text, targetLang) {
  const { apiKey } = await getSettings();
  if (!apiKey) return { error: 'NO_API_KEY' };

  const prompt =
    'Translate "' + text + '" to ' + targetLang + '.\n' +
    'Pick the single most common translation only.\n' +
    'Output the translated word or phrase and nothing else — no markdown, no asterisks, no alternatives, no parentheses, no explanations.';

  try {
    const raw         = await callAI(apiKey, prompt, 100);
    const translation = raw.replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/_([^_]+)_/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
    return { translation };
  } catch (err) {
    return { error: err.code || 'API_ERROR', detail: err.detail || err.message };
  }
}

async function analyze(text, targetLang) {
  const { apiKey } = await getSettings();
  if (!apiKey) return { error: 'NO_API_KEY' };

  const prompt =
    "Analyze this word or phrase: '" + text + "'\n" +
    'Rules:\n' +
    '1. Normalize to the base/dictionary form (e.g. "walked"→"walk", "running"→"run").\n' +
    '2. If the input is an incomplete phrase, random characters, or makes no sense, set part_of_speech to "invalid".\n' +
    'Return ONLY a valid JSON object. No markdown, no code blocks, no backticks:\n' +
    '{"base_form":"normalized base form, or null if invalid",' +
    '"part_of_speech":"noun/verb/adjective/adverb/idiom/phrase/invalid",' +
    '"definition":"one clear concise English definition, or empty string if invalid",' +
    '"example":"one natural example sentence, or empty string if invalid"}';

  try {
    const raw = await callAI(apiKey, prompt, 350);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (_) {
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
  await chrome.storage.local.remove('vocab_' + normalized);
  return { success: true };
}

async function saveWord(data) {
  const normalized = data.normalized || normalizeText(data.original);
  const key        = 'vocab_' + normalized;
  const result     = await chrome.storage.local.get([key]);
  const now        = new Date().toISOString();

  const entry = result[key]
    ? Object.assign({}, result[key], {
        translation: data.translation, part_of_speech: data.part_of_speech,
        definition: data.definition, example: data.example,
        target_language: data.target_language,
        count: result[key].count + 1, last_seen: now, page_url: data.page_url
      })
    : {
        original: data.original, translation: data.translation,
        part_of_speech: data.part_of_speech, definition: data.definition,
        example: data.example, target_language: data.target_language,
        count: 1, first_seen: now, last_seen: now, page_url: data.page_url
      };

  await chrome.storage.local.set({ [key]: entry });
  return { success: true, count: entry.count };
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
