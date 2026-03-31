// content.js — injected into the exam page
// Monitors all browser-level events and forwards them to background.js

(function () {
  let proctoringActive = false;
  let warningCount = { tabSwitch: 0, fullscreen: 0 };

  // ─── Listen for start/stop commands from the exam page ───────────────────
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'PROCTORIX_START') {
      proctoringActive = true;
      requestFullscreen();
      injectStyles();
    }
    if (e.data?.type === 'PROCTORIX_STOP') {
      proctoringActive = false;
      removeOverlay();
    }
  });

  // ─── Tab visibility (candidate switches tabs) ─────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (!proctoringActive) return;
    if (document.hidden) {
      sendEvent('tab_switch', { hidden: true });
      warningCount.tabSwitch++;
      // Content script can't show overlay when hidden — backend records it
    }
  });

  // ─── Window blur (alt-tab, clicking outside browser) ─────────────────────
  window.addEventListener('blur', () => {
    if (!proctoringActive) return;
    sendEvent('window_blur', {});
  });

  // ─── Fullscreen check ─────────────────────────────────────────────────────
  document.addEventListener('fullscreenchange', () => {
    if (!proctoringActive) return;
    if (!document.fullscreenElement) {
      sendEvent('fullscreen_exit', {});
      warningCount.fullscreen++;
      showWarningOverlay('fullscreen');
    } else {
      sendEvent('fullscreen_enter', {});
      removeOverlay();
    }
  });

  // ─── Right-click block + record ───────────────────────────────────────────
  document.addEventListener('contextmenu', (e) => {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopPropagation();
    sendEvent('right_click', { x: e.clientX, y: e.clientY });
    showToast('Right-click is disabled during the exam.');
  }, true);

  // ─── Copy/paste intercept ─────────────────────────────────────────────────
  document.addEventListener('copy', (e) => {
    if (!proctoringActive) return;
    e.preventDefault();
    sendEvent('copy_attempt', {});
    showToast('Copying is disabled during the exam.');
  }, true);

  document.addEventListener('paste', (e) => {
    if (!proctoringActive) return;
    e.preventDefault();
    sendEvent('paste_attempt', {});
    showToast('Pasting is disabled during the exam.');
  }, true);

  // ─── Keyboard shortcuts block (PrintScreen, etc.) ─────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!proctoringActive) return;
    // Block common cheating shortcuts
    if (
      e.key === 'PrintScreen' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
      (e.ctrlKey && e.shiftKey && e.key === 'J') || // Console
      (e.ctrlKey && e.key === 'U')                  // View Source
    ) {
      e.preventDefault();
      sendEvent('copy_attempt', { key: e.key });
    }
  }, true);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function sendEvent(eventType, metadata) {
    chrome.runtime.sendMessage({
      type: 'PROCTOR_EVENT',
      eventType,
      metadata,
    });
  }

  function requestFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  let overlayEl = null;

  function showWarningOverlay(reason) {
    removeOverlay();
    overlayEl = document.createElement('div');
    overlayEl.id = 'proctorix-overlay';
    overlayEl.innerHTML = `
      <div style="
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:rgba(0,0,0,0.82);display:flex;flex-direction:column;
        align-items:center;justify-content:center;z-index:2147483647;
        font-family:sans-serif;color:#fff;
      ">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <div style="font-size:22px;font-weight:600;margin-bottom:8px;">Fullscreen Required</div>
        <div style="font-size:15px;color:#ccc;margin-bottom:24px;max-width:360px;text-align:center;">
          You have exited fullscreen. This incident has been recorded.
          Please return to fullscreen to continue your exam.
        </div>
        <button id="proctorix-return-btn" style="
          background:#fff;color:#111;border:none;padding:10px 28px;
          font-size:15px;border-radius:8px;cursor:pointer;font-weight:600;
        ">Return to fullscreen</button>
        <div style="margin-top:12px;font-size:12px;color:#888;">
          Warning ${warningCount.fullscreen} recorded
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);
    overlayEl.querySelector('#proctorix-return-btn').addEventListener('click', () => {
      requestFullscreen();
    });
  }

  function removeOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  let toastEl = null;
  function showToast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.style.cssText = `
      position:fixed;bottom:24px;right:24px;background:#1a1a1a;color:#fff;
      padding:10px 18px;border-radius:8px;font-family:sans-serif;font-size:14px;
      z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);
      animation: fadeIn 0.2s ease;
    `;
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(() => { toastEl?.remove(); toastEl = null; }, 3000);
  }

  function injectStyles() {
    if (document.getElementById('proctorix-styles')) return;
    const s = document.createElement('style');
    s.id = 'proctorix-styles';
    s.textContent = `@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`;
    document.head.appendChild(s);
  }
})();