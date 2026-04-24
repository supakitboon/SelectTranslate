(function () {
  'use strict';

  var VERSION = '5';
  if (window.__selectLangVersion === VERSION) return;
  window.__selectLangVersion = VERSION;

  // ── Inject styles ─────────────────────────────────────────────────────────
  // Injecting via JS guarantees styles are present even if the manifest CSS
  // injection is delayed, and avoids conflicts with the page stylesheet.

  (function injectStyles() {
    var STYLE_ID = 'selectlang-styles';
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '@keyframes lc-fadein{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes lc-spin{to{transform:rotate(360deg)}}',

      '.lc-popup{',
        'position:fixed!important;display:block!important;',
        'width:300px!important;',
        'background:#16162A!important;color:#E2E8F0!important;',
        'border-radius:14px!important;',
        'border-top:3px solid #818CF8!important;',
        'box-shadow:0 8px 32px rgba(0,0,0,.7),0 0 0 1px rgba(129,140,248,.15)!important;',
        'font-family:system-ui,-apple-system,sans-serif!important;',
        'font-size:13px!important;line-height:1.5!important;',
        'direction:ltr!important;text-align:left!important;',
        'z-index:2147483647!important;overflow:visible!important;',
        'animation:lc-fadein .18s cubic-bezier(.16,1,.3,1)!important;',
        'box-sizing:border-box!important;user-select:none!important;',
        '-webkit-user-select:none!important;',
      '}',
      '.lc-popup *,.lc-popup *::before,.lc-popup *::after{',
        'box-sizing:border-box!important;',
        'font-family:system-ui,-apple-system,sans-serif!important;',
      '}',
      '.lc-badge{',
        'position:absolute!important;top:-12px!important;left:-12px!important;',
        'width:28px!important;height:28px!important;border-radius:50%!important;',
        'background:#9CA3AF!important;color:#fff!important;',
        'font-size:11px!important;font-weight:700!important;',
        'display:flex!important;align-items:center!important;justify-content:center!important;',
        'z-index:2147483647!important;cursor:default!important;',
        'border:2px solid #16162A!important;transition:background-color .2s!important;',
        'line-height:1!important;box-shadow:0 2px 6px rgba(0,0,0,.4)!important;',
      '}',
      // Header
      '.lc-header{display:flex!important;align-items:flex-start!important;gap:8px!important;padding:14px 12px 12px 22px!important;}',
      '.lc-header-words{flex:1!important;min-width:0!important;}',
      '.lc-word{font-size:22px!important;font-weight:700!important;color:#F8FAFC!important;',
        'overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;',
        'line-height:1.2!important;letter-spacing:-0.3px!important;}',
      '.lc-word-trans{font-size:13px!important;font-weight:500!important;color:#A5B4FC!important;',
        'margin-top:3px!important;word-break:break-word!important;min-height:18px!important;line-height:1.4!important;}',
      '.lc-close{all:unset!important;display:flex!important;align-items:center!important;justify-content:center!important;',
        'width:24px!important;height:24px!important;border-radius:6px!important;',
        'color:#4B5563!important;font-size:12px!important;cursor:pointer!important;',
        'flex-shrink:0!important;transition:color .15s,background .15s!important;margin-top:2px!important;}',
      '.lc-close:hover{color:#F87171!important;background:rgba(239,68,68,.14)!important;}',
      '.lc-divider{height:1px!important;background:rgba(255,255,255,.06)!important;margin:0!important;}',
      // Analysis body
      '.lc-analysis{display:flex!important;flex-direction:column!important;align-items:flex-start!important;',
        'gap:9px!important;padding:13px 14px 15px!important;min-height:44px!important;}',
      '.lc-section-label{font-size:9.5px!important;font-weight:700!important;text-transform:uppercase!important;',
        'letter-spacing:0.1em!important;color:#4B5563!important;line-height:1!important;}',
      '.lc-section-label-gap{margin-top:4px!important;}',
      '.lc-def-row{display:flex!important;align-items:flex-start!important;gap:7px!important;width:100%!important;}',
      '.lc-lang-badge{display:inline-flex!important;align-items:center!important;',
        'padding:2px 7px!important;border-radius:9999px!important;',
        'font-size:10px!important;font-weight:700!important;letter-spacing:0.04em!important;',
        'flex-shrink:0!important;margin-top:1px!important;}',
      '.lc-lang-badge-en{background:rgba(59,130,246,.2)!important;color:#93C5FD!important;}',
      '.lc-lang-badge-target{background:rgba(34,197,94,.2)!important;color:#86EFAC!important;}',
      '.lc-definition{color:#CBD5E1!important;font-size:13px!important;font-weight:400!important;line-height:1.55!important;word-break:break-word!important;}',
      '.lc-definition-translated{color:#C4B5FD!important;font-size:13px!important;font-weight:400!important;line-height:1.55!important;word-break:break-word!important;}',
      '.lc-example{display:block!important;width:100%!important;',
        'background:transparent!important;',
        'border:none!important;border-left:3px solid rgba(129,140,248,.45)!important;border-radius:0!important;',
        'padding:4px 0 4px 10px!important;',
        'color:#94A3B8!important;font-size:11.5px!important;font-style:italic!important;',
        'font-family:Georgia,"Times New Roman",serif!important;',
        'line-height:1.6!important;word-break:break-word!important;}',
      '.lc-pos{display:inline-flex!important;align-items:center!important;padding:3px 10px!important;',
        'border-radius:9999px!important;font-size:11px!important;font-weight:600!important;',
        'text-transform:capitalize!important;white-space:nowrap!important;letter-spacing:0.03em!important;',
        'border:1px solid transparent!important;}',
      '.lc-pos-noun{background:rgba(59,130,246,.35)!important;color:#93C5FD!important;border-color:rgba(59,130,246,.6)!important;}',
      '.lc-pos-verb{background:rgba(34,197,94,.35)!important;color:#86EFAC!important;border-color:rgba(34,197,94,.6)!important;}',
      '.lc-pos-adjective{background:rgba(168,85,247,.35)!important;color:#D8B4FE!important;border-color:rgba(168,85,247,.6)!important;}',
      '.lc-pos-adverb{background:rgba(20,184,166,.35)!important;color:#5EEAD4!important;border-color:rgba(20,184,166,.6)!important;}',
      '.lc-pos-idiom{background:rgba(236,72,153,.35)!important;color:#F9A8D4!important;border-color:rgba(236,72,153,.6)!important;}',
      '.lc-pos-phrase{background:rgba(148,163,184,.35)!important;color:#CBD5E1!important;border-color:rgba(148,163,184,.6)!important;}',
      '.lc-spinner{display:inline-block!important;width:14px!important;height:14px!important;',
        'border:2px solid rgba(255,255,255,.1)!important;border-top-color:#818CF8!important;',
        'border-radius:50%!important;animation:lc-spin .7s linear infinite!important;flex-shrink:0!important;}',
      '.lc-spinner-text{color:#475569!important;font-style:italic!important;font-size:12px!important;}',
      '.lc-error{display:block!important;color:#FCA5A5!important;font-size:12px!important;',
        'background:rgba(239,68,68,.08)!important;padding:6px 10px!important;',
        'border-radius:6px!important;border:1px solid rgba(239,68,68,.15)!important;',
        'line-height:1.4!important;width:100%!important;}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  })();

  // ── State ─────────────────────────────────────────────────────────────────

  var currentPopup = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function normalizeWord(text) {
    return text.toLowerCase().trim();
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function langCode(lang) {
    var map = {
      'english':'EN','thai':'TH','spanish':'ES','french':'FR',
      'japanese':'JA','korean':'KO','chinese (simplified)':'ZH',
      'german':'DE','italian':'IT','portuguese':'PT','arabic':'AR'
    };
    var key = (lang || '').toLowerCase();
    return map[key] || (lang || 'XX').slice(0, 2).toUpperCase();
  }

  function posClass(pos) {
    var valid = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase'];
    var n = (pos || '').toLowerCase();
    return valid.includes(n) ? n : 'phrase';
  }

  var POS_COLORS = {
    noun:      { bg: 'rgba(59,130,246,.35)',  fg: '#93C5FD', border: 'rgba(59,130,246,.6)'  },
    verb:      { bg: 'rgba(34,197,94,.35)',   fg: '#86EFAC', border: 'rgba(34,197,94,.6)'   },
    adjective: { bg: 'rgba(168,85,247,.35)',  fg: '#D8B4FE', border: 'rgba(168,85,247,.6)'  },
    adverb:    { bg: 'rgba(20,184,166,.35)',  fg: '#5EEAD4', border: 'rgba(20,184,166,.6)'  },
    idiom:     { bg: 'rgba(236,72,153,.35)',  fg: '#F9A8D4', border: 'rgba(236,72,153,.6)'  },
    phrase:    { bg: 'rgba(148,163,184,.35)', fg: '#CBD5E1', border: 'rgba(148,163,184,.6)' }
  };

  function posInlineStyle(pos) {
    var c = POS_COLORS[posClass(pos)];
    return 'display:inline-flex!important;align-items:center!important;' +
           'padding:3px 10px!important;border-radius:9999px!important;' +
           'font-size:11px!important;font-weight:600!important;line-height:1!important;' +
           'white-space:nowrap!important;text-transform:capitalize!important;letter-spacing:0.03em!important;' +
           'background-color:' + c.bg     + '!important;' +
           'color:'            + c.fg     + '!important;' +
           'border:1px solid ' + c.border + '!important;' +
           'box-sizing:border-box!important;';
  }

  var EXAMPLE_STYLE =
    'display:block!important;width:100%!important;background-color:transparent!important;' +
    'border-top:none!important;border-right:none!important;border-bottom:none!important;' +
    'border-left:3px solid rgba(129,140,248,.45)!important;border-radius:0!important;' +
    'padding:4px 0 4px 10px!important;color:#94A3B8!important;' +
    'font-size:11.5px!important;font-style:italic!important;font-weight:400!important;' +
    'font-family:Georgia,"Times New Roman",serif!important;' +
    'line-height:1.6!important;word-break:break-word!important;';

  function stripMarkdown(str) {
    return String(str)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g,     '$1')
      .replace(/_([^_]+)_/g,       '$1')
      .replace(/`([^`]+)`/g,       '$1')
      .trim();
  }

  function badgeColor(count) {
    if (count >= 10) return '#EF4444';
    if (count >= 5)  return '#F97316';
    if (count >= 2)  return '#F59E0B';
    return '#9CA3AF';
  }

  function getErrorMessage(code, detail) {
    if (code === 'NO_API_KEY')   return 'Please set your API key in the extension settings';
    if (code === 'INVALID_KEY')  return 'Invalid API key — check your settings';
    if (code === 'NO_CREDITS')   return 'No credits — top up your OpenRouter account';
    if (code === 'RATE_LIMITED') return 'Rate limited — try again in a moment';
    if (detail) return 'API error: ' + String(detail).slice(0, 120);
    return 'Translation failed — please try again';
  }

  // ── Popup helpers ─────────────────────────────────────────────────────────

  function removePopup() {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  }

  function repositionPopup(popup) {
    requestAnimationFrame(function () {
      try {
        if (!popup.isConnected) return;
        var rect = popup.getBoundingClientRect();
        var vw   = window.innerWidth  || document.documentElement.clientWidth  || 800;
        var vh   = window.innerHeight || document.documentElement.clientHeight || 600;

        // Use getPropertyValue so we get the value even when set with !important
        var left = parseFloat(popup.style.getPropertyValue('left'))  || rect.left;
        var top  = parseFloat(popup.style.getPropertyValue('top'))   || rect.top;

        if (left + rect.width > vw - 10) left = vw - rect.width - 10;
        if (left < 10) left = 10;
        if (top + rect.height > vh - 10) top = top - rect.height - 32;
        if (top < 10) top = 10;

        popup.style.setProperty('left', left + 'px', 'important');
        popup.style.setProperty('top',  top  + 'px', 'important');
      } catch (_) { /* never let repositioning crash the popup */ }
    });
  }

  function sendMsg(msg, cb) {
    try {
      chrome.runtime.sendMessage(msg, function (res) {
        if (chrome.runtime.lastError) { if (cb) cb(null); return; }
        if (cb) cb(res);
      });
    } catch (_) {
      if (cb) cb(null);
    }
  }

  function makePopupEl(x, y) {
    var popup = document.createElement('div');
    popup.className = 'lc-popup';
    // Hardcode every structural style inline so page CSS can never hide the popup
    var inlineStyles = [
      ['position',   'fixed'],
      ['display',    'block'],
      ['width',      '300px'],
      ['z-index',    '2147483647'],
      ['background', '#16162A'],
      ['color',      '#E2E8F0'],
      ['opacity',    '1'],
      ['visibility', 'visible'],
      ['overflow',   'visible'],
      ['left',       Math.max(10, x + 12) + 'px'],
      ['top',        (y + 20) + 'px']
    ];
    for (var i = 0; i < inlineStyles.length; i++) {
      popup.style.setProperty(inlineStyles[i][0], inlineStyles[i][1], 'important');
    }
    return popup;
  }

  // ── Main popup ────────────────────────────────────────────────────────────

  function showPopup(selectedText, clientX, clientY) {
    removePopup();

    var normalized = normalizeWord(selectedText);
    var popup = makePopupEl(clientX, clientY);

    popup.innerHTML =
      '<div class="lc-badge" title="Loading…">…</div>' +
      '<div class="lc-header">' +
        '<div class="lc-header-words">' +
          '<div class="lc-word" title="' + escapeHtml(selectedText) + '">' + escapeHtml(selectedText) + '</div>' +
          '<div class="lc-word-trans"><span class="lc-spinner-text">translating…</span></div>' +
        '</div>' +
        '<button class="lc-close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="lc-divider"></div>' +
      '<div class="lc-analysis">' +
        '<span class="lc-spinner"></span>' +
        '<span class="lc-spinner-text">analyzing…</span>' +
      '</div>';

    (document.body || document.documentElement).appendChild(popup);
    currentPopup = popup;

    popup.querySelector('.lc-close').addEventListener('click', function (e) {
      e.stopPropagation();
      removePopup();
    });

    repositionPopup(popup);

    // Step 1 — frequency badge
    sendMsg({ action: 'getCount', word: normalized }, function (res) {
      if (!popup.isConnected) return;
      var count = (res && res.count != null ? res.count : 0) + 1;
      var badge = popup.querySelector('.lc-badge');
      if (!badge) return;
      badge.textContent = String(count);
      badge.style.setProperty('background-color', badgeColor(count), 'important');
      badge.title = 'You’ve looked this up ' + count + ' time(s)';
    });

    // Step 2 — translate → analyze → save
    try {
      chrome.storage.local.get(['targetLang'], handleTargetLang);
    } catch (_) {
      handleTargetLang({});
    }
    function handleTargetLang(stored) {
      if (!popup.isConnected) return;
      var targetLang = (stored && stored.targetLang) || 'English';
      var savedTranslation = '';

      sendMsg({ action: 'translate', text: selectedText, targetLang: targetLang }, function (transRes) {
        if (!popup.isConnected) return;
        var tDiv = popup.querySelector('.lc-word-trans');
        if (!tDiv) return;

        if (!transRes || transRes.error) {
          var tCode   = transRes ? transRes.error  : 'API_ERROR';
          var tDetail = transRes ? transRes.detail : null;
          tDiv.innerHTML = '<span style="color:#FCA5A5;font-size:11px">' + escapeHtml(getErrorMessage(tCode, tDetail)) + '</span>';
        } else {
          savedTranslation = stripMarkdown(transRes.translation || '');
          tDiv.textContent = savedTranslation;
        }

        // Step 3 — analyze
        sendMsg({ action: 'analyze', text: selectedText, targetLang: targetLang }, function (analRes) {
          if (!popup.isConnected) return;
          var aDiv = popup.querySelector('.lc-analysis');
          if (!aDiv) return;

          var pos        = (analRes && !analRes.error) ? (analRes.part_of_speech || '') : '';
          var definition = (analRes && !analRes.error) ? (analRes.definition     || '') : '';
          var example    = (analRes && !analRes.error) ? (analRes.example        || '') : '';
          var baseForm   = (analRes && !analRes.error) ? (analRes.base_form      || null) : null;

          // Update displayed word to base form if different (e.g. “walked” → “walk”)
          var displayWord = baseForm || selectedText;
          var wordEl = popup.querySelector('.lc-word');
          if (wordEl && baseForm && baseForm.toLowerCase() !== selectedText.toLowerCase()) {
            wordEl.textContent = baseForm;
            wordEl.title = baseForm;
          }

          aDiv.innerHTML = '';

          var isInvalid = (pos.toLowerCase() === 'invalid');

          if (isInvalid) {
            var msgEl = document.createElement('div');
            msgEl.textContent = 'This selection is incomplete or does not make sense.';
            (function () {
              var mp = {
                'color':'#94A3B8','font-size':'12.5px','font-style':'italic',
                'font-weight':'400','line-height':'1.5','width':'100%'
              };
              for (var k in mp) msgEl.style.setProperty(k, mp[k], 'important');
            })();
            aDiv.appendChild(msgEl);
            repositionPopup(popup);
            return;
          }

          var posEl = document.createElement('span');
          posEl.textContent = pos || '—';
          (function () {
            var c = POS_COLORS[posClass(pos)];
            var pp = {
              'display':'inline-flex','align-items':'center','padding':'3px 10px',
              'border-radius':'9999px','font-size':'11px','font-weight':'600',
              'line-height':'1','white-space':'nowrap','text-transform':'capitalize',
              'letter-spacing':'0.03em','box-sizing':'border-box',
              'background-color': c.bg, 'color': c.fg,
              'border-width':'1px','border-style':'solid','border-color': c.border
            };
            for (var k in pp) posEl.style.setProperty(k, pp[k], 'important');
          })();
          aDiv.appendChild(posEl);

          var defEl = document.createElement('div');
          defEl.textContent = definition || '—';
          defEl.className = 'lc-definition';
          aDiv.appendChild(defEl);

          var lblEl = document.createElement('div');
          lblEl.textContent = 'Example';
          lblEl.className = 'lc-section-label lc-section-label-gap';
          aDiv.appendChild(lblEl);

          var exEl = document.createElement('div');
          exEl.textContent = example || '—';
          (function () {
            var ep = {
              'display':'block','width':'100%','background-color':'transparent',
              'border-top':'none','border-right':'none','border-bottom':'none',
              'border-left':'3px solid rgba(129,140,248,.45)','border-radius':'0',
              'padding':'4px 0 4px 10px','color':'#94A3B8',
              'font-size':'11.5px','font-style':'italic','font-weight':'400',
              'font-family':'Georgia,”Times New Roman”,serif',
              'line-height':'1.6','word-break':'break-word'
            };
            for (var k in ep) exEl.style.setProperty(k, ep[k], 'important');
          })();
          aDiv.appendChild(exEl);

          repositionPopup(popup);

          // Step 4 — save using base form when available
          var VALID_POS = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase'];
          if (savedTranslation && VALID_POS.indexOf(pos.toLowerCase()) !== -1) {
            var saveOriginal = baseForm || selectedText;
            var saveNormalized = saveOriginal.toLowerCase().trim();
            sendMsg({
              action: 'saveWord',
              data: {
                original:        saveOriginal,
                normalized:      saveNormalized,
                translation:     savedTranslation,
                part_of_speech:  pos,
                definition:      definition,
                example:         example,
                target_language: targetLang,
                page_url:        window.location.href
              }
            }, null);
          }
        });
      });
    }
  }

  function showErrorPopup(message, clientX, clientY) {
    removePopup();
    var popup = makePopupEl(clientX, clientY);
    popup.innerHTML =
      '<div class="lc-header">' +
        '<div class="lc-header-words"><div class="lc-word">SelectLang</div></div>' +
        '<button class="lc-close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="lc-divider"></div>' +
      '<div class="lc-analysis"><span class="lc-error">' + escapeHtml(message) + '</span></div>';
    (document.body || document.documentElement).appendChild(popup);
    currentPopup = popup;
    popup.querySelector('.lc-close').addEventListener('click', function (e) {
      e.stopPropagation();
      removePopup();
    });
    repositionPopup(popup);
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  document.addEventListener('mouseup', function (e) {
    if (window.__selectLangVersion !== VERSION) return;
    if (currentPopup && currentPopup.contains(e.target)) return;
    setTimeout(function () {
      var sel  = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (!text) return;
      if (text.length > 500) {
        showErrorPopup('Selection too long (max 500 chars)', e.clientX, e.clientY);
        return;
      }
      showPopup(text, e.clientX, e.clientY);
    }, 10);
  });

  document.addEventListener('mousedown', function (e) {
    if (window.__selectLangVersion !== VERSION) return;
    if (currentPopup && !currentPopup.contains(e.target)) {
      removePopup();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (window.__selectLangVersion !== VERSION) return;
    if (e.key === 'Escape' && currentPopup) {
      removePopup();
    }
  });

})();
