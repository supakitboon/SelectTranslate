'use strict';

// ── Bootstrap ─────────────────────────────────────────────────────────────

var PROVIDER_META = {
  openrouter: { placeholder: 'sk-or-v1-…',      defaultModel: 'anthropic/claude-haiku-4-5', hint: '(openrouter.ai/models)' },
  anthropic:  { placeholder: 'sk-ant-api03-…',   defaultModel: 'claude-haiku-4-5',           hint: '(docs.anthropic.com/models)' },
  openai:     { placeholder: 'sk-…',             defaultModel: 'gpt-4o-mini',                hint: '(platform.openai.com/docs/models)' },
  gemini:     { placeholder: 'AIzaSy…',          defaultModel: 'gemini-2.0-flash',           hint: '(ai.google.dev/models)' }
};

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  loadVocabSummary();

  document.getElementById('save-key').addEventListener('click', saveApiKey);
  document.getElementById('api-key-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveApiKey();
  });

  document.getElementById('provider-select').addEventListener('change', function (e) {
    var provider = e.target.value;
    chrome.storage.local.set({ provider: provider });
    applyProviderMeta(provider);
  });

  document.getElementById('target-lang').addEventListener('change', function (e) {
    chrome.storage.local.set({ targetLang: e.target.value });
  });

  document.getElementById('model-input').addEventListener('change', function (e) {
    chrome.storage.local.set({ modelName: e.target.value.trim() });
  });
  document.getElementById('model-input').addEventListener('blur', function (e) {
    chrome.storage.local.set({ modelName: e.target.value.trim() });
  });

  document.getElementById('export-csv').addEventListener('click', exportCSV);
  document.getElementById('clear-all').addEventListener('click', confirmClearAll);
});

function applyProviderMeta(provider) {
  var meta = PROVIDER_META[provider] || PROVIDER_META.openrouter;
  document.getElementById('api-key-input').placeholder = meta.placeholder;
  document.getElementById('model-input').placeholder   = meta.defaultModel;
  document.getElementById('model-hint').textContent    = meta.hint;
}

// ── Settings ──────────────────────────────────────────────────────────────

function loadSettings() {
  chrome.storage.local.get(['apiKey', 'targetLang', 'modelName', 'provider'], function (result) {
    var provider = result.provider || 'openrouter';
    document.getElementById('provider-select').value = provider;
    applyProviderMeta(provider);

    if (result.apiKey) {
      document.getElementById('api-key-input').placeholder = '••••••••••••' + result.apiKey.slice(-4);
      setStatus('key-status', 'API key saved', 'ok');
    }
    if (result.targetLang) {
      document.getElementById('target-lang').value = result.targetLang;
    }
    if (result.modelName) {
      document.getElementById('model-input').value = result.modelName;
    }
  });
}

function saveApiKey() {
  var input = document.getElementById('api-key-input');
  var key   = input.value.trim();
  if (!key) {
    setStatus('key-status', 'Please enter an API key', 'err');
    return;
  }
  chrome.storage.local.set({ apiKey: key }, function () {
    input.value       = '';
    input.placeholder = '••••••••••••' + key.slice(-4);
    setStatus('key-status', 'API key saved', 'ok');
    setTimeout(function () { setStatus('key-status', '', ''); }, 3000);
  });
}

function setStatus(id, text, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = 'status-text' + (type ? ' status-' + type : '');
}

// ── Vocabulary summary ────────────────────────────────────────────────────

function loadVocabSummary() {
  chrome.runtime.sendMessage({ action: 'getAllWords' }, function (res) {
    if (chrome.runtime.lastError || !res) return;
    var words   = res.words || [];
    var countEl = document.getElementById('word-count');
    var listEl  = document.getElementById('top-words-list');

    var identified = words.filter(isIdentified);
    countEl.textContent = identified.length + ' unique word' + (identified.length !== 1 ? 's' : '') + ' saved';

    var sorted = identified.slice().sort(function (a, b) { return b.count - a.count; });

    if (sorted.length === 0) {
      listEl.innerHTML = '<li class="empty-state">No words yet — highlight any text on a webpage to get started.</li>';
      return;
    }

    listEl.innerHTML = '';
    sorted.forEach(function (w) {
      var posKey = validPosClass(w.part_of_speech);
      var normalized = (w.normalized || w.original || '').toLowerCase().trim();

      var li = document.createElement('li');
      li.className = 'word-item';

      li.innerHTML =
        '<span class="word-original" title="' + escapeHtml(w.original) + '">' + escapeHtml(w.original) + '</span>' +
        '<span class="word-translation">' + escapeHtml(w.translation || '—') + '</span>' +
        '<span class="word-pos pos-' + escapeHtml(posKey) + '">' + escapeHtml(w.part_of_speech || '?') + '</span>' +
        '<span class="word-count-badge">' + (w.count || 0) + '</span>';

      var delBtn = document.createElement('button');
      delBtn.className = 'word-delete';
      delBtn.title = 'Delete "' + w.original + '"';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteWord(normalized, li, countEl, words);
      });
      li.appendChild(delBtn);

      listEl.appendChild(li);
    });
  });
}

// ── Delete single word ────────────────────────────────────────────────────

function deleteWord(normalized, rowEl, countEl, allWords) {
  chrome.runtime.sendMessage({ action: 'deleteWord', normalized: normalized }, function () {
    if (chrome.runtime.lastError) return;
    rowEl.style.transition = 'opacity 0.2s';
    rowEl.style.opacity    = '0';
    setTimeout(function () {
      rowEl.remove();
      // Update count
      var remaining = countEl.textContent.match(/\d+/);
      var n = remaining ? Math.max(0, parseInt(remaining[0]) - 1) : 0;
      countEl.textContent = n + ' unique word' + (n !== 1 ? 's' : '') + ' saved';
      // Show empty state if last word removed
      var listEl = document.getElementById('top-words-list');
      if (listEl && !listEl.querySelector('.word-item')) {
        listEl.innerHTML = '<li class="empty-state">No words yet — highlight any text on a webpage to get started.</li>';
      }
    }, 200);
  });
}

// ── CSV export ────────────────────────────────────────────────────────────

function exportCSV() {
  chrome.runtime.sendMessage({ action: 'getAllWords' }, function (res) {
    if (chrome.runtime.lastError || !res) return;
    var words  = res.words || [];
    var sorted = words.filter(isIdentified).sort(function (a, b) { return b.count - a.count; });

    if (sorted.length === 0) {
      alert('No identified words to export yet.');
      return;
    }
    var headers = ['timestamp', 'original', 'translation', 'part_of_speech',
                   'definition', 'example', 'target_language', 'count', 'page_url'];

    var rows = sorted.map(function (w) {
      return [
        w.last_seen       || '',
        w.original        || '',
        w.translation     || '',
        w.part_of_speech  || '',
        w.definition      || '',
        w.example         || '',
        w.target_language || '',
        String(w.count    || 0),
        w.page_url        || ''
      ].map(csvField).join(',');
    });

    var csv  = [headers.map(csvField).join(',')].concat(rows).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);

    var today = new Date().toISOString().slice(0, 10);
    var a     = document.createElement('a');
    a.href     = url;
    a.download = 'selectlang_vocab_' + today + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
}

function csvField(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

// ── Clear all ─────────────────────────────────────────────────────────────

function confirmClearAll() {
  chrome.runtime.sendMessage({ action: 'getAllWords' }, function (res) {
    if (chrome.runtime.lastError || !res) return;
    var count = (res.words || []).length;

    if (count === 0) {
      alert('No words to clear.');
      return;
    }

    var ok = confirm('Delete all ' + count + ' saved word' + (count !== 1 ? 's' : '') + '? This cannot be undone.');
    if (!ok) return;

    chrome.runtime.sendMessage({ action: 'clearAll' }, function () {
      loadVocabSummary();
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function validPosClass(pos) {
  var valid = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase'];
  var n = (pos || '').toLowerCase();
  return valid.includes(n) ? n : 'phrase';
}

function isIdentified(w) {
  var valid = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase'];
  return !!(w.translation && valid.indexOf((w.part_of_speech || '').toLowerCase()) !== -1);
}
