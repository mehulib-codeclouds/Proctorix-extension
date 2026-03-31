(function () {
  if (typeof globalThis.browser !== 'undefined') return;
  
  if (typeof chrome === 'undefined' || !chrome.runtime) return;

  const wrap = (api) =>
    new Proxy(api, {
      get(target, prop) {
        const val = target[prop];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return wrap(val);
        }
        if (typeof val === 'function') {
          return function (...args) {
            const last = args[args.length - 1];
            
            if (typeof last === 'function') return val.apply(target, args);
            
            return new Promise((resolve, reject) => {
              val.apply(target, [
                ...args,
                (result) => {
                  const err = chrome.runtime.lastError;
                  if (err) reject(new Error(err.message));
                  else resolve(result);
                },
              ]);
            });
          };
        }
        return val;
      },
    });

  globalThis.browser = wrap(chrome);
})();

 
(function () {
  let proctoringActive = false;
  let overlayEl = null;
  let toastEl = null;
  let warningCount = { tabSwitch: 0, fullscreen: 0, blur: 0 };

  
  function sendToBackground(msg) {
    if (typeof browser === 'undefined') return;
    try {
      const p = browser.runtime.sendMessage(msg);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
      
    }
  }

  
  function sendEvent(eventType, metadata) {
    sendToBackground({ type: 'PROCTOR_EVENT', eventType, metadata });
  }

  
  function requestFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  
  function injectStyles() {
    if (document.getElementById('proctorix-styles')) return;
    const s = document.createElement('style');
    s.id = 'proctorix-styles';
    s.textContent = `
      @keyframes proctorix-fadein {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:none; }
      }
    `;
    document.head.appendChild(s);
  }

  
  function showWarningOverlay(reason, count) {
    // Update count on existing overlay of same type
    if (overlayEl && overlayEl.dataset.reason === reason) {
      const countEl = overlayEl.querySelector('#proctorix-count');
      if (countEl) countEl.textContent = 'Warning ' + count + ' recorded';
      return;
    }
    removeOverlay();

    var configs = {
      fullscreen: {
        icon: '⛔',
        title: 'Fullscreen Required',
        message: 'You exited fullscreen. This violation has been recorded. Return to fullscreen to continue.',
        btnText: 'Return to fullscreen',
        btnAction: function () { requestFullscreen(); },
      },
      tab: {
        icon: '⚠️',
        title: 'Tab Switching Detected',
        message: 'You attempted to switch tabs. This violation has been recorded. Stay on the exam tab.',
        btnText: 'I understand',
        btnAction: function () { removeOverlay(); },
      },
      blur: {
        icon: '👁️',
        title: 'Focus Lost',
        message: 'You switched to another application. This violation has been recorded. Return to the exam.',
        btnText: 'I am back',
        btnAction: function () { removeOverlay(); },
      },
    };

    var c = configs[reason] || configs.fullscreen;

    overlayEl = document.createElement('div');
    overlayEl.id = 'proctorix-overlay';
    overlayEl.dataset.reason = reason;

    var inner = document.createElement('div');
    inner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh',
      'background:rgba(0,0,0,0.88)', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'z-index:2147483647',
      'font-family:sans-serif', 'color:#fff',
    ].join(';');

    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:52px;margin-bottom:16px;';
    iconEl.textContent = c.icon;

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:10px;';
    titleEl.textContent = c.title;

    var msgEl = document.createElement('div');
    msgEl.style.cssText = 'font-size:15px;color:#ccc;margin-bottom:28px;max-width:400px;text-align:center;line-height:1.6;';
    msgEl.textContent = c.message;

    var btn = document.createElement('button');
    btn.id = 'proctorix-overlay-btn';
    btn.style.cssText = 'background:#fff;color:#111;border:none;padding:11px 32px;font-size:15px;border-radius:8px;cursor:pointer;font-weight:700;';
    btn.textContent = c.btnText;
    btn.addEventListener('click', c.btnAction);

    var countEl = document.createElement('div');
    countEl.id = 'proctorix-count';
    countEl.style.cssText = 'margin-top:14px;font-size:12px;color:#888;';
    countEl.textContent = 'Warning ' + count + ' recorded';

    inner.appendChild(iconEl);
    inner.appendChild(titleEl);
    inner.appendChild(msgEl);
    inner.appendChild(btn);
    inner.appendChild(countEl);
    overlayEl.appendChild(inner);
    document.body.appendChild(overlayEl);
  }

  
  function removeOverlay() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  
  function showToast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px',
      'background:#1a1a1a', 'color:#fff',
      'padding:10px 18px', 'border-radius:8px',
      'font-family:sans-serif', 'font-size:14px',
      'z-index:2147483647', 'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
      'animation:proctorix-fadein 0.2s ease',
    ].join(';');
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(function () {
      if (toastEl) { toastEl.remove(); toastEl = null; }
    }, 3000);
  }

  
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;

    if (e.data && e.data.type === 'PROCTORIX_START') {
      proctoringActive = true;
      injectStyles();
      requestFullscreen();
      sendToBackground({
        type: 'START_PROCTORING',
        attemptId: e.data.attemptId || null,
        sessionId: e.data.sessionId || null,
      });
    }

    if (e.data && e.data.type === 'PROCTORIX_STOP') {
      proctoringActive = false;
      sendToBackground({ type: 'STOP_PROCTORING' });
      removeOverlay();
    }
  });

  
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener(function (msg) {
      if (msg.type === 'SHOW_TAB_WARNING') {
        warningCount.tabSwitch++;
        showWarningOverlay('tab', warningCount.tabSwitch);
      }
    });
  }

  
  document.addEventListener('visibilitychange', function () {
    if (!proctoringActive) return;
    if (document.hidden) {
      warningCount.tabSwitch++;
      sendEvent('tab_switch', { hidden: true });
    }
  });

  
  window.addEventListener('blur', function () {
    if (!proctoringActive) return;
    warningCount.blur++;
    sendEvent('window_blur', { count: warningCount.blur });
    showWarningOverlay('blur', warningCount.blur);
  });

  window.addEventListener('focus', function () {
    if (!proctoringActive) return;
    if (overlayEl && overlayEl.dataset.reason === 'blur') {
      removeOverlay();
    }
  });

  document.addEventListener('fullscreenchange', function () {
    if (!proctoringActive) return;
    if (!document.fullscreenElement) {
      warningCount.fullscreen++;
      sendEvent('fullscreen_exit', { count: warningCount.fullscreen });
      showWarningOverlay('fullscreen', warningCount.fullscreen);
    } else {
      sendEvent('fullscreen_enter', {});
      if (overlayEl && overlayEl.dataset.reason === 'fullscreen') removeOverlay();
    }
  });

  
  document.addEventListener('contextmenu', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopPropagation();
    sendEvent('right_click', { x: e.clientX, y: e.clientY });
    showToast('Right-click is disabled during the exam.');
  }, true);

  
  document.addEventListener('copy', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendEvent('copy_attempt', {});
    showToast('Copying is disabled during the exam.');
  }, true);

  document.addEventListener('cut', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendEvent('copy_attempt', { action: 'cut' });
    showToast('Cutting is disabled during the exam.');
  }, true);

  document.addEventListener('paste', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendEvent('paste_attempt', {});
    showToast('Pasting is disabled during the exam.');
  }, true);

  
  document.addEventListener('keydown', function (e) {
    if (!proctoringActive) return;

    var blocked =
      e.key === 'PrintScreen' ||
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.metaKey && e.shiftKey && (e.key === 'I' || e.key === 'J'));

    if (blocked) {
      e.preventDefault();
      e.stopImmediatePropagation();
      sendEvent('copy_attempt', { key: e.key, reason: 'blocked_shortcut' });
      showToast('This action is not allowed during the exam.');
    }
  }, true);

})();