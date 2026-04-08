// Browser API polyfill
(function () {
  if (typeof globalThis.browser !== 'undefined') return;
  if (typeof chrome === 'undefined' || !chrome.runtime) return;
  var wrap = function (api) {
    return new Proxy(api, {
      get: function (target, prop) {
        var val = target[prop];
        if (val && typeof val === 'object' && !Array.isArray(val)) return wrap(val);
        if (typeof val === 'function') {
          return function () {
            var args = Array.prototype.slice.call(arguments);
            var last = args[args.length - 1];
            if (typeof last === 'function') return val.apply(target, args);
            return new Promise(function (resolve, reject) {
              val.apply(target, args.concat([function (result) {
                var err = chrome.runtime.lastError;
                if (err) reject(new Error(err.message));
                else resolve(result);
              }]));
            });
          };
        }
        return val;
      }
    });
  };
  globalThis.browser = wrap(chrome);
})();

(function () {

  var proctoringActive  = false;
  var overlayEl         = null;
  var toastEl           = null;
  var focusLockTimer    = null;
  var fullscreenPending = false;

  //  deduplication 
  var incidentLock      = false;
  var INCIDENT_MS       = 1000;

  // Alt+Tab detection
  var lastVisibilityChangeTime = 0;
  var BLUR_TAB_GAP_MS          = 150; // if blur within 150ms = tab switch

  var counts = {
    tab_switch:      0,
    fullscreen_exit: 0,
    window_blur:     0,
    copy_attempt:    0,
    paste_attempt:   0,
    right_click:     0,
    globalTotal:     0,
  };

  var STORAGE_KEY = 'px_counts';

  function saveCounts() {
    if (typeof browser === 'undefined') return;
    try {
      browser.storage.local.set({ px_counts: counts });
    } catch (_) {}
  }

  function loadCounts(callback) {
    if (typeof browser === 'undefined') { callback(); return; }
    try {
      browser.storage.local.get([STORAGE_KEY], function (data) {
        if (data && data[STORAGE_KEY]) {
          var saved = data[STORAGE_KEY];
          // Merge saved counts
          Object.keys(counts).forEach(function (k) {
            if (typeof saved[k] === 'number') counts[k] = saved[k];
          });
        }
        callback();
      });
    } catch (_) { callback(); }
  }

  // Clear counts from storage when exam stops
  function clearCounts() {
    counts = {
      tab_switch: 0, fullscreen_exit: 0, window_blur: 0,
      copy_attempt: 0, paste_attempt: 0, right_click: 0, globalTotal: 0,
    };
    if (typeof browser === 'undefined') return;
    try { browser.storage.local.remove([STORAGE_KEY]); } catch (_) {}
  }

  // Overlay 
  var PRIORITY = { tab: 1, blur: 2, fullscreen: 3 };
  var currentPriority = 0;

  var OVERLAY_CFG = {
    fullscreen: { color: '#c0392b', icon: '\u26D4',       label: 'FULLSCREEN EXITED',    typeKey: 'fullscreen_exit' },
    blur:       { color: '#7d3c98', icon: '\uD83D\uDC41', label: 'FOCUS LOST',            typeKey: 'window_blur'     },
    tab:        { color: '#d35400', icon: '\u26A0',       label: 'TAB SWITCH DETECTED',  typeKey: 'tab_switch'      },
  };

  function sendToBackground(msg) {
    if (typeof browser === 'undefined') return;
    try {
      var p = browser.runtime.sendMessage(msg);
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (_) {}
  }

  // deduplication + global count
  function recordIncident(typeKey) {
    // Increment specific type counter
    if (counts[typeKey] !== undefined) counts[typeKey]++;

    var isNew = !incidentLock;
    if (isNew) {
      incidentLock = true;
      counts.globalTotal++;
      setTimeout(function () { incidentLock = false; }, INCIDENT_MS);
    }

    saveCounts();

    sendToBackground({
      type: 'PROCTOR_EVENT',
      eventType: typeKey,
      metadata: { count: counts[typeKey], globalTotal: counts.globalTotal, deduplicated: !isNew },
    });

    return isNew;
  }

  // Fullscreen 
  function goFullscreen() {
    if (document.fullscreenElement) return;
    var p = document.documentElement.requestFullscreen();
    if (p && typeof p.catch === 'function') {
      p.catch(function (err) {
        if (err.name === 'TypeError' || (err.message && err.message.indexOf('user gesture') !== -1)) {
          fullscreenPending = true;
          showFullscreenPrompt();
        }
      });
    }
  }

  function inFullscreen() { return !!document.fullscreenElement; }

  function showFullscreenPrompt() {
    if (document.getElementById('px-fs-prompt')) return;
    var prompt = document.createElement('div');
    prompt.id = 'px-fs-prompt';
    prompt.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(0,0,0,0.97)',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#fff',
    ].join(';');
    var box = document.createElement('div');
    box.style.cssText = 'text-align:center;max-width:420px;padding:48px 40px;';
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:52px;margin-bottom:20px;';
    icon.textContent = '\uD83D\uDCBB';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:14px;';
    title.textContent = 'Fullscreen Required to Start Exam';
    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:30px;line-height:1.7;';
    msg.textContent = 'This exam must be taken in fullscreen mode. Click the button below to enter fullscreen and begin.';
    var btn = document.createElement('button');
    btn.style.cssText = 'background:#27ae60;color:#fff;border:none;padding:14px 44px;font-size:16px;font-weight:700;border-radius:10px;cursor:pointer;';
    btn.textContent = 'Enter Fullscreen & Start Exam';
    btn.addEventListener('click', function () {
      document.documentElement.requestFullscreen().then(function () {
        fullscreenPending = false;
        var el = document.getElementById('px-fs-prompt');
        if (el) el.remove();
      }).catch(function () {});
    });
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    prompt.appendChild(box);
    document.body.appendChild(prompt);
  }

  function injectStyles() {
    if (document.getElementById('px-styles')) return;
    var s = document.createElement('style');
    s.id = 'px-styles';
    s.textContent =
      '@keyframes px-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}' +
      '@keyframes px-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}' +
      '@keyframes px-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}';
    (document.head || document.documentElement).appendChild(s);
  }

  //  Stats table 
  function buildStats() {
    var rows = [
      { key: 'tab_switch',      label: 'Tab switches'         },
      { key: 'fullscreen_exit', label: 'Fullscreen exits'     },
      { key: 'window_blur',     label: 'Focus losses'         },
      { key: 'copy_attempt',    label: 'Copy / cut attempts'  },
      { key: 'paste_attempt',   label: 'Paste attempts'       },
      { key: 'right_click',     label: 'Right-click attempts' },
    ];
    var html = '';
    rows.forEach(function (r) {
      if (counts[r.key] > 0) {
        html +=
          '<div style="display:flex;justify-content:space-between;padding:5px 0;' +
          'border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;color:#999;">' +
          '<span>' + r.label + '</span>' +
          '<span style="color:#e74c3c;font-weight:700;">' + counts[r.key] + '</span>' +
          '</div>';
      }
    });
    return html || '<div style="font-size:12px;color:#555;text-align:center;padding:8px 0;">No violations yet</div>';
  }

  //  Overlay 
  function showOverlay(reason) {
    var priority = PRIORITY[reason] || 1;
    if (overlayEl && currentPriority > priority) { shakeOverlay(); return; }
    if (overlayEl && overlayEl.dataset.reason === reason) { shakeOverlay(); return; }

    destroyOverlay();
    currentPriority = priority;
    var cfg = OVERLAY_CFG[reason] || OVERLAY_CFG.fullscreen;

    overlayEl = document.createElement('div');
    overlayEl.id = 'px-overlay';
    overlayEl.dataset.reason = reason;

    var shell = document.createElement('div');
    shell.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(5,5,10,0.96)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'animation:px-in 0.3s ease',
    ].join(';');

    var topBar = document.createElement('div');
    topBar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:4px;background:' + cfg.color + ';z-index:2147483648;';

    var card = document.createElement('div');
    card.id = 'px-card';
    card.style.cssText = [
      'background:#111118',
      'border:1px solid rgba(255,255,255,0.08)',
      'border-top:3px solid ' + cfg.color,
      'border-radius:18px', 'padding:40px 44px',
      'max-width:460px', 'width:88%',
      'box-shadow:0 32px 80px rgba(0,0,0,0.9)',
      'text-align:center',
    ].join(';');

    var iconCircle = document.createElement('div');
    iconCircle.style.cssText = [
      'width:76px', 'height:76px', 'border-radius:50%',
      'background:' + cfg.color + '20',
      'border:2px solid ' + cfg.color + '50',
      'display:flex', 'align-items:center', 'justify-content:center',
      'margin:0 auto 18px', 'font-size:34px',
      'animation:px-pulse 2.5s ease infinite',
    ].join(';');
    iconCircle.textContent = cfg.icon;

    var badge = document.createElement('div');
    badge.style.cssText = [
      'display:inline-block',
      'background:' + cfg.color + '18',
      'color:' + cfg.color,
      'border:1px solid ' + cfg.color + '45',
      'border-radius:20px', 'padding:4px 16px',
      'font-size:10px', 'font-weight:700',
      'letter-spacing:2px', 'margin-bottom:16px',
    ].join(';');
    badge.textContent = cfg.label;

    var title = document.createElement('div');
    title.style.cssText = 'font-size:21px;font-weight:700;color:#fff;margin-bottom:10px;';
    title.textContent = 'Exam Violation Detected';

    var msgEl = document.createElement('div');
    msgEl.style.cssText = 'font-size:13px;color:#777;line-height:1.75;margin-bottom:18px;';
    msgEl.textContent = 'This incident has been recorded and reported to the proctor. Return to fullscreen to continue your exam.';

    var statsBox = document.createElement('div');
    statsBox.id = 'px-stats';
    statsBox.style.cssText = [
      'background:rgba(255,255,255,0.03)',
      'border:1px solid rgba(255,255,255,0.07)',
      'border-radius:10px', 'padding:12px 14px',
      'margin-bottom:10px', 'text-align:left',
    ].join(';');
    statsBox.innerHTML = buildStats();

    var totalEl = document.createElement('div');
    totalEl.id = 'px-total';
    totalEl.style.cssText = 'font-size:12px;color:#444;margin-bottom:22px;';
    totalEl.textContent = 'Total incidents this session: ' + counts.globalTotal;

    var btn = document.createElement('button');
    btn.style.cssText = [
      'width:100%', 'background:' + cfg.color,
      'color:#fff', 'border:none',
      'padding:14px 0', 'font-size:15px', 'font-weight:700',
      'border-radius:10px', 'cursor:pointer',
    ].join(';');
    btn.textContent = 'Return to Fullscreen';
    btn.addEventListener('click', function () { goFullscreen(); });
    btn.addEventListener('mouseenter', function () { this.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', function () { this.style.opacity = '1'; });

    var warnNote = document.createElement('div');
    warnNote.style.cssText = 'font-size:11px;color:#333;margin-top:12px;';
    warnNote.textContent = 'Repeated violations may result in exam disqualification.';

    card.appendChild(iconCircle); card.appendChild(badge);
    card.appendChild(title);     card.appendChild(msgEl);
    card.appendChild(statsBox);  card.appendChild(totalEl);
    card.appendChild(btn);       card.appendChild(warnNote);
    shell.appendChild(topBar);   shell.appendChild(card);
    overlayEl.appendChild(shell);
    document.body.appendChild(overlayEl);
  }

  function refreshOverlay() {
    var s = document.getElementById('px-stats');
    if (s) s.innerHTML = buildStats();
    var t = document.getElementById('px-total');
    if (t) t.textContent = 'Total incidents this session: ' + counts.globalTotal;
  }

  function shakeOverlay() {
    refreshOverlay();
    var card = document.getElementById('px-card');
    if (!card) return;
    card.style.animation = 'none';
    setTimeout(function () { if (card) card.style.animation = 'px-shake 0.45s ease'; }, 10);
  }

  function destroyOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    currentPriority = 0;
  }

  // Toast 
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px',
      'background:#111118', 'color:#fff',
      'padding:12px 18px', 'border-radius:10px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:13px', 'z-index:2147483647',
      'box-shadow:0 8px 24px rgba(0,0,0,0.7)',
      'border-left:4px solid #e74c3c',
      'animation:px-in 0.2s ease', 'max-width:280px',
    ].join(';');
    toastEl.textContent = '\uD83D\uDEAB ' + msg;
    document.body.appendChild(toastEl);
    setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 3500);
  }

  // Focus lock 
  function startFocusLock() {
    stopFocusLock();
    focusLockTimer = setInterval(function () {
      if (!proctoringActive) { stopFocusLock(); return; }
      if (document.visibilityState === 'hidden') return;
      if (!document.hasFocus()) window.focus();
    }, 500);
  }
  function stopFocusLock() {
    if (focusLockTimer) { clearInterval(focusLockTimer); focusLockTimer = null; }
  }

  // Restore state after page reload 
  function restoreStateFromBackground() {
    if (typeof browser === 'undefined') return;
    try {
      browser.runtime.sendMessage({ type: 'GET_STATE' }, function (response) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) return;
        if (response && response.state && response.state.active) {
          loadCounts(function () {
            proctoringActive = true;
            injectStyles();
            startFocusLock();
            goFullscreen();
          });
        }
      });
    } catch (_) {}
  }

  // START 
  function startProctoring(attemptId, sessionId) {
    // Clear leftover counts from previous session
    clearCounts();
    proctoringActive = true;
    injectStyles();
    goFullscreen();
    startFocusLock();
    sendToBackground({
      type: 'START_PROCTORING',
      attemptId: attemptId || null,
      sessionId: sessionId || null,
    });
  }

  // STOP 
  function stopProctoring() {
    proctoringActive = false;
    stopFocusLock();
    clearCounts();
    sendToBackground({ type: 'STOP_PROCTORING' });
    destroyOverlay();
    var prompt = document.getElementById('px-fs-prompt');
    if (prompt) prompt.remove();
  }

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data) return;
    if (e.data.type === 'PROCTORIX_START') startProctoring(e.data.attemptId, e.data.sessionId);
    if (e.data.type === 'PROCTORIX_STOP')  stopProctoring();
  });

  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener(function (msg) {
      if (msg.type === 'SHOW_TAB_WARNING') {
        counts.tab_switch++;
        if (typeof msg.globalIncidentCount === 'number') {
          counts.globalTotal = msg.globalIncidentCount;
        }
        saveCounts();
        showOverlay('tab');
        refreshOverlay();
      }
    });
  }

  //Fullscreen change 
  document.addEventListener('fullscreenchange', function () {
    if (!proctoringActive) return;
    if (inFullscreen()) {
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'fullscreen_enter', metadata: {} });
      destroyOverlay();
    } else {
      var isNew = recordIncident('fullscreen_exit');
      if (isNew) showOverlay('fullscreen');
      else shakeOverlay();
    }
  });

  // Visibility change 
  
  document.addEventListener('visibilitychange', function () {
    if (!proctoringActive) return;
    if (document.hidden) {
      lastVisibilityChangeTime = Date.now();
      // Send raw event to backend for audit trail only — no count increment
      sendToBackground({
        type: 'PROCTOR_EVENT',
        eventType: 'tab_visibility_hidden',
        metadata: { timestamp: new Date().toISOString() },
      });
    }
  });

  // Window blur 
  window.addEventListener('blur', function () {
    if (!proctoringActive) return;
    var now = Date.now();
    var timeSinceVisibilityChange = now - lastVisibilityChangeTime;
    if (timeSinceVisibilityChange < BLUR_TAB_GAP_MS) {
      // Tab switch blur — skip, background handles it
      return;
    }
    // Genuine Alt+Tab / app switch
    var isNew = recordIncident('window_blur');
    if (isNew) showOverlay('blur');
    else shakeOverlay();
  });

  window.addEventListener('focus', function () {
    if (!proctoringActive) return;
    if (overlayEl && inFullscreen()) destroyOverlay();
  });

  // Right-click 
  document.addEventListener('contextmenu', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopPropagation();
    counts.right_click++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'right_click', metadata: { count: counts.right_click } });
    toast('Right-click is disabled during the exam.');
  }, true);

  // Copy 
  document.addEventListener('copy', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.copy_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { count: counts.copy_attempt } });
    toast('Copying is disabled during the exam.');
  }, true);

  // Cut 
  document.addEventListener('cut', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.copy_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { action: 'cut', count: counts.copy_attempt } });
    toast('Cutting is disabled during the exam.');
  }, true);

  //  Paste 
  document.addEventListener('paste', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.paste_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'paste_attempt', metadata: { count: counts.paste_attempt } });
    toast('Pasting is disabled during the exam.');
  }, true);

  // Keyboard blocks 
  document.addEventListener('keydown', function (e) {
    if (!proctoringActive) return;

    if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('The Windows/Meta key is disabled during the exam.');
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Meta' } });
      return;
    }

    if (e.altKey && e.key !== 'Alt') {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('Alt key combinations are not allowed during the exam.');
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Alt+' + e.key } });
      return;
    }

    if (e.ctrlKey && e.key !== 'Control' && e.key !== 'a' && e.key !== 'A') {
      e.preventDefault(); e.stopImmediatePropagation();
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Ctrl+' + e.key } });
      toast('This action is not allowed during the exam.');
      return;
    }

    if (/^F\d+$/.test(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation();
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: e.key } });
      toast('Function keys are disabled during the exam.');
      return;
    }

    var sysKeys = [
      'PrintScreen','Insert','Pause','ScrollLock','ContextMenu',
      'AudioVolumeMute','AudioVolumeDown','AudioVolumeUp',
      'MediaTrackNext','MediaTrackPrevious','MediaStop','MediaPlayPause',
      'LaunchMail','LaunchApp1','LaunchApp2',
      'BrowserSearch','BrowserHome','BrowserBack','BrowserForward',
      'BrowserStop','BrowserRefresh','BrowserFavorites',
    ];
    if (sysKeys.indexOf(e.key) !== -1) {
      e.preventDefault(); e.stopImmediatePropagation();
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: e.key } });
      toast('This key is disabled during the exam.');
      return;
    }

    if (e.key === 'Escape' && inFullscreen()) {
      sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'fullscreen_exit_attempt', metadata: { method: 'escape_key' } });
    }
  }, true);

  // Drag block 
  document.addEventListener('dragstart', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
  }, true);

  // Link block 
  document.addEventListener('click', function (e) {
    if (!proctoringActive) return;
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.target === '_blank' || (href && href[0] !== '#' && href.indexOf('javascript') !== 0)) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('Opening links is disabled during the exam.');
    }
  }, true);

  // On load: restore state if exam was active 
  restoreStateFromBackground();

})();