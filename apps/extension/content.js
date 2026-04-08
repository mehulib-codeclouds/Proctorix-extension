// // content.js — Proctorix Exam Guard v5.0

// // ─── Browser API polyfill ─────────────────────────────────────────────────
// (function () {
//   if (typeof globalThis.browser !== 'undefined') return;
//   if (typeof chrome === 'undefined' || !chrome.runtime) return;
//   var wrap = function (api) {
//     return new Proxy(api, {
//       get: function (target, prop) {
//         var val = target[prop];
//         if (val && typeof val === 'object' && !Array.isArray(val)) return wrap(val);
//         if (typeof val === 'function') {
//           return function () {
//             var args = Array.prototype.slice.call(arguments);
//             var last = args[args.length - 1];
//             if (typeof last === 'function') return val.apply(target, args);
//             return new Promise(function (resolve, reject) {
//               val.apply(target, args.concat([function (result) {
//                 var err = chrome.runtime.lastError;
//                 if (err) reject(new Error(err.message));
//                 else resolve(result);
//               }]));
//             });
//           };
//         }
//         return val;
//       }
//     });
//   };
//   globalThis.browser = wrap(chrome);
// })();

// // ─── Main logic ───────────────────────────────────────────────────────────
// (function () {

//   var proctoringActive = false;
//   var overlayEl = null;
//   var toastEl = null;
//   var focusLockTimer = null;

//   // ── Deduplication: prevent the same event firing multiple times
//   //    in one "incident" (blur + visibilitychange + tab all fire together)
//   var lastEventTime = 0;
//   var lastEventType = '';
//   var EVENT_DEBOUNCE_MS = 800; // events within 800ms of same type = 1 incident

//   // ── Per-type violation counters (for display)
//   var counts = {
//     tab_switch:      0,
//     fullscreen_exit: 0,
//     window_blur:     0,
//     copy_attempt:    0,
//     paste_attempt:   0,
//     right_click:     0,
//     total:           0,
//   };

//   // ── Priority: fullscreen(3) > blur(2) > tab(1)
//   var PRIORITY = { tab: 1, blur: 2, fullscreen: 3 };
//   var currentPriority = 0;

//   // ── Overlay config per reason
//   var OVERLAY_CFG = {
//     fullscreen: { color: '#c0392b', icon: '⛔', label: 'Fullscreen Exited',       violationType: 'fullscreen_exit' },
//     blur:       { color: '#7d3c98', icon: '👁',  label: 'Focus Lost',              violationType: 'window_blur'     },
//     tab:        { color: '#d35400', icon: '⚠',  label: 'Tab Switch Detected',     violationType: 'tab_switch'      },
//   };

//   // ─── Deduped event recorder ────────────────────────────────────────────
//   function recordViolation(type) {
//     var now = Date.now();
//     // Deduplicate: same type within debounce window = skip
//     if (type === lastEventType && (now - lastEventTime) < EVENT_DEBOUNCE_MS) {
//       return false;
//     }
//     lastEventType = type;
//     lastEventTime = now;

//     if (counts[type] !== undefined) counts[type]++;
//     counts.total++;
//     sendEvent(type, { count: counts[type] });
//     return true; // new incident
//   }

//   function sendToBackground(msg) {
//     if (typeof browser === 'undefined') return;
//     try {
//       var p = browser.runtime.sendMessage(msg);
//       if (p && typeof p.catch === 'function') p.catch(function () {});
//     } catch (_) {}
//   }

//   function sendEvent(type, meta) {
//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: type, metadata: meta || {} });
//   }

//   // ─── Fullscreen ────────────────────────────────────────────────────────
//   function goFullscreen() {
//     document.documentElement.requestFullscreen().catch(function () {});
//   }
//   function inFullscreen() { return !!document.fullscreenElement; }

//   // ─── Styles ───────────────────────────────────────────────────────────
//   function injectStyles() {
//     if (document.getElementById('px-styles')) return;
//     var s = document.createElement('style');
//     s.id = 'px-styles';
//     s.textContent = [
//       '@keyframes px-in{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}',
//       '@keyframes px-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}',
//       '@keyframes px-pulse{0%,100%{opacity:1}50%{opacity:0.6}}',
//     ].join('');
//     (document.head || document.documentElement).appendChild(s);
//   }

//   // ─── Build violation log lines ────────────────────────────────────────
//   function buildLogHTML() {
//     var lines = [
//       { key: 'tab_switch',      label: 'Tab switches'       },
//       { key: 'fullscreen_exit', label: 'Fullscreen exits'   },
//       { key: 'window_blur',     label: 'Focus losses'       },
//       { key: 'copy_attempt',    label: 'Copy/cut attempts'  },
//       { key: 'paste_attempt',   label: 'Paste attempts'     },
//       { key: 'right_click',     label: 'Right-click attempts'},
//     ];
//     var html = '';
//     lines.forEach(function (l) {
//       if (counts[l.key] > 0) {
//         html +=
//           '<div style="display:flex;justify-content:space-between;padding:4px 0;' +
//           'border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:#aaa;">' +
//           '<span>' + l.label + '</span>' +
//           '<span style="color:#e74c3c;font-weight:700;">' + counts[l.key] + '</span>' +
//           '</div>';
//       }
//     });
//     return html;
//   }

//   // ─── Overlay ──────────────────────────────────────────────────────────
//   function showOverlay(reason) {
//     var priority = PRIORITY[reason] || 1;

//     // Never replace a higher-priority overlay
//     if (overlayEl && currentPriority > priority) {
//       shakeOverlay();
//       return;
//     }
//     // Same reason — update stats and shake
//     if (overlayEl && overlayEl.dataset.reason === reason) {
//       refreshOverlayStats();
//       shakeOverlay();
//       return;
//     }

//     destroyOverlay();
//     currentPriority = priority;

//     var cfg = OVERLAY_CFG[reason] || OVERLAY_CFG.fullscreen;

//     overlayEl = document.createElement('div');
//     overlayEl.id = 'px-overlay';
//     overlayEl.dataset.reason = reason;

//     // ── Outer shell
//     var shell = document.createElement('div');
//     shell.style.cssText = [
//       'position:fixed', 'inset:0', 'z-index:2147483647',
//       'background:rgba(8,8,12,0.96)',
//       'display:flex', 'align-items:center', 'justify-content:center',
//       'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
//       'animation:px-in 0.3s ease',
//     ].join(';');

//     // ── Top accent bar
//     var bar = document.createElement('div');
//     bar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:4px;background:' + cfg.color + ';z-index:2147483648;';

//     // ── Card
//     var card = document.createElement('div');
//     card.style.cssText = [
//       'background:#13131a',
//       'border:1px solid rgba(255,255,255,0.1)',
//       'border-top:3px solid ' + cfg.color,
//       'border-radius:16px',
//       'padding:40px 48px',
//       'max-width:480px', 'width:90%',
//       'box-shadow:0 24px 64px rgba(0,0,0,0.8)',
//       'text-align:center',
//     ].join(';');

//     // Icon circle
//     var iconWrap = document.createElement('div');
//     iconWrap.style.cssText = [
//       'width:72px', 'height:72px', 'border-radius:50%',
//       'background:' + cfg.color + '22',
//       'border:2px solid ' + cfg.color + '66',
//       'display:flex', 'align-items:center', 'justify-content:center',
//       'margin:0 auto 20px',
//       'font-size:32px',
//       'animation:px-pulse 2s ease infinite',
//     ].join(';');
//     iconWrap.textContent = cfg.icon;

//     // Violation type badge
//     var badge = document.createElement('div');
//     badge.style.cssText = [
//       'display:inline-block',
//       'background:' + cfg.color + '22',
//       'color:' + cfg.color,
//       'border:1px solid ' + cfg.color + '55',
//       'border-radius:20px',
//       'padding:4px 14px',
//       'font-size:11px', 'font-weight:700',
//       'letter-spacing:1.5px', 'text-transform:uppercase',
//       'margin-bottom:14px',
//     ].join(';');
//     badge.textContent = cfg.label;

//     var title = document.createElement('div');
//     title.style.cssText = 'font-size:22px;font-weight:700;color:#fff;margin-bottom:10px;';
//     title.textContent = 'Exam Violation Detected';

//     var msg = document.createElement('div');
//     msg.style.cssText = 'font-size:14px;color:#888;line-height:1.75;margin-bottom:20px;';
//     msg.textContent = 'This incident has been recorded and reported to the proctor. You must return to fullscreen to continue your exam.';

//     // Stats box
//     var statsBox = document.createElement('div');
//     statsBox.id = 'px-stats';
//     statsBox.style.cssText = [
//       'background:rgba(255,255,255,0.04)',
//       'border:1px solid rgba(255,255,255,0.08)',
//       'border-radius:8px',
//       'padding:12px 16px',
//       'margin-bottom:24px',
//       'text-align:left',
//     ].join(';');
//     statsBox.innerHTML = buildLogHTML();

//     // Total count
//     var totalEl = document.createElement('div');
//     totalEl.id = 'px-total';
//     totalEl.style.cssText = 'font-size:12px;color:#555;margin-bottom:24px;';
//     totalEl.textContent = 'Total violations this session: ' + counts.total;

//     // Return to fullscreen button
//     var btn = document.createElement('button');
//     btn.id = 'px-btn';
//     btn.style.cssText = [
//       'width:100%',
//       'background:' + cfg.color,
//       'color:#fff', 'border:none',
//       'padding:14px 0', 'font-size:15px', 'font-weight:700',
//       'border-radius:10px', 'cursor:pointer',
//       'letter-spacing:0.3px',
//       'transition:opacity 0.15s',
//     ].join(';');
//     btn.textContent = 'Return to Fullscreen';
//     btn.addEventListener('mouseenter', function () { btn.style.opacity = '0.85'; });
//     btn.addEventListener('mouseleave', function () { btn.style.opacity = '1'; });
//     btn.addEventListener('click', function () { goFullscreen(); });

//     var warn = document.createElement('div');
//     warn.style.cssText = 'font-size:11px;color:#444;margin-top:14px;';
//     warn.textContent = 'Repeated violations may result in exam disqualification.';

//     card.appendChild(iconWrap);
//     card.appendChild(badge);
//     card.appendChild(title);
//     card.appendChild(msg);
//     card.appendChild(statsBox);
//     card.appendChild(totalEl);
//     card.appendChild(btn);
//     card.appendChild(warn);
//     shell.appendChild(bar);
//     shell.appendChild(card);
//     overlayEl.appendChild(shell);
//     document.body.appendChild(overlayEl);
//   }

//   function refreshOverlayStats() {
//     var stats = document.getElementById('px-stats');
//     if (stats) stats.innerHTML = buildLogHTML();
//     var total = document.getElementById('px-total');
//     if (total) total.textContent = 'Total violations this session: ' + counts.total;
//   }

//   function shakeOverlay() {
//     refreshOverlayStats();
//     if (!overlayEl) return;
//     var card = overlayEl.querySelector('[style*="border-radius:16px"]');
//     if (!card) return;
//     card.style.animation = 'none';
//     setTimeout(function () { if (card) card.style.animation = 'px-shake 0.45s ease'; }, 10);
//   }

//   // Overlay removed ONLY here — when fullscreen is confirmed restored
//   function destroyOverlay() {
//     if (overlayEl) { overlayEl.remove(); overlayEl = null; }
//     currentPriority = 0;
//   }

//   // ─── Toast ────────────────────────────────────────────────────────────
//   function toast(msg) {
//     if (toastEl) toastEl.remove();
//     toastEl = document.createElement('div');
//     toastEl.style.cssText = [
//       'position:fixed', 'bottom:28px', 'right:28px',
//       'background:#13131a',
//       'color:#fff', 'padding:12px 20px',
//       'border-radius:10px',
//       'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
//       'font-size:13px',
//       'z-index:2147483647',
//       'box-shadow:0 8px 24px rgba(0,0,0,0.6)',
//       'border-left:4px solid #e74c3c',
//       'animation:px-in 0.2s ease',
//       'max-width:300px',
//     ].join(';');
//     toastEl.textContent = '\uD83D\uDEAB ' + msg;
//     document.body.appendChild(toastEl);
//     setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 3500);
//   }

//   // ─── Focus lock ───────────────────────────────────────────────────────
//   function startFocusLock() {
//     stopFocusLock();
//     focusLockTimer = setInterval(function () {
//       if (!proctoringActive) { stopFocusLock(); return; }
//       if (document.visibilityState === 'hidden') return;
//       if (!document.hasFocus()) window.focus();
//     }, 500);
//   }
//   function stopFocusLock() {
//     if (focusLockTimer) { clearInterval(focusLockTimer); focusLockTimer = null; }
//   }

//   // ─── START / STOP ─────────────────────────────────────────────────────
//   window.addEventListener('message', function (e) {
//     if (e.source !== window || !e.data) return;
//     if (e.data.type === 'PROCTORIX_START') {
//       proctoringActive = true;
//       injectStyles();
//       goFullscreen();
//       startFocusLock();
//       sendToBackground({
//         type: 'START_PROCTORING',
//         attemptId: e.data.attemptId || null,
//         sessionId: e.data.sessionId || null,
//       });
//     }
//     if (e.data.type === 'PROCTORIX_STOP') {
//       proctoringActive = false;
//       stopFocusLock();
//       sendToBackground({ type: 'STOP_PROCTORING' });
//       destroyOverlay();
//     }
//   });

//   // ─── Messages from background ─────────────────────────────────────────
//   if (typeof browser !== 'undefined') {
//     browser.runtime.onMessage.addListener(function (msg) {
//       if (msg.type === 'SHOW_TAB_WARNING') {
//         // Background already recorded — just show overlay, don't double-count
//         showOverlay('tab');
//       }
//     });
//   }

//   // ─── Fullscreen change — ONLY place overlay is removed ────────────────
//   document.addEventListener('fullscreenchange', function () {
//     if (!proctoringActive) return;
//     if (inFullscreen()) {
//       sendEvent('fullscreen_enter', {});
//       destroyOverlay();
//     } else {
//       var recorded = recordViolation('fullscreen_exit');
//       if (recorded) showOverlay('fullscreen');
//     }
//   });

//   // ─── Tab visibility ───────────────────────────────────────────────────
//   // NOTE: we do NOT call recordViolation here — background.js handles
//   // tab switching via tabs.onActivated and sends SHOW_TAB_WARNING.
//   // This prevents double-counting (visibilitychange + blur both fire on tab switch)
//   document.addEventListener('visibilitychange', function () {
//     if (!proctoringActive) return;
//     if (document.hidden) {
//       // Just send event — background handles the overlay via SHOW_TAB_WARNING
//       counts.tab_switch++;
//       counts.total++;
//       sendEvent('tab_switch', { count: counts.tab_switch });
//     }
//   });

//   // ─── Window blur (Alt+Tab / other app) ───────────────────────────────
//   // Only fire if tab is NOT hidden (hidden = tab switch, handled above)
//   window.addEventListener('blur', function () {
//     if (!proctoringActive) return;
//     if (document.hidden) return; // tab switch — already handled by visibilitychange
//     var recorded = recordViolation('window_blur');
//     if (recorded) showOverlay('blur');
//   });

//   // Focus return — do NOT remove overlay unless fullscreen is confirmed
//   window.addEventListener('focus', function () {
//     if (!proctoringActive) return;
//     if (overlayEl && inFullscreen()) destroyOverlay();
//   });

//   // ─── Right-click ──────────────────────────────────────────────────────
//   document.addEventListener('contextmenu', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopPropagation();
//     counts.right_click++;
//     counts.total++;
//     sendEvent('right_click', { count: counts.right_click });
//     toast('Right-click is disabled during the exam.');
//   }, true);

//   // ─── Copy ─────────────────────────────────────────────────────────────
//   document.addEventListener('copy', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.copy_attempt++;
//     counts.total++;
//     sendEvent('copy_attempt', { count: counts.copy_attempt });
//     toast('Copying is disabled during the exam.');
//   }, true);

//   // ─── Cut ──────────────────────────────────────────────────────────────
//   document.addEventListener('cut', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.copy_attempt++;
//     counts.total++;
//     sendEvent('copy_attempt', { action: 'cut', count: counts.copy_attempt });
//     toast('Cutting is disabled during the exam.');
//   }, true);

//   // ─── Paste ────────────────────────────────────────────────────────────
//   document.addEventListener('paste', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.paste_attempt++;
//     counts.total++;
//     sendEvent('paste_attempt', { count: counts.paste_attempt });
//     toast('Pasting is disabled during the exam.');
//   }, true);

//   // ─── Keyboard — block everything except exam-allowed keys ────────────
//   //
//   // ALLOWED during exam:
//   //   - Letters a-z A-Z
//   //   - Digits 0-9
//   //   - Standard punctuation/special chars (on main keyboard)
//   //   - Space, Enter, Tab (for form navigation), Backspace, Delete
//   //   - Arrow keys (for navigation)
//   //   - Home, End, PageUp, PageDown (reading)
//   //
//   // BLOCKED:
//   //   - All function keys F1-F12
//   //   - Windows/Meta/Command key
//   //   - All Ctrl+key combos (except Ctrl+A select-all which is harmless)
//   //   - All Alt+key combos (Alt+Tab etc.)
//   //   - PrintScreen, Insert, Pause, ScrollLock
//   //   - Emoji keyboard (Win+. or Win+;)
//   //   - Any media keys, browser keys etc.

//   var ALLOWED_KEYS = [
//     // Navigation (safe)
//     'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
//     'Home','End','PageUp','PageDown',
//     // Editing (safe for answering questions)
//     'Backspace','Delete','Enter','Tab',
//     'Space',' ',
//     // Shift alone is fine (for capitals)
//     'Shift','CapsLock',
//   ];

//   document.addEventListener('keydown', function (e) {
//     if (!proctoringActive) return;

//     var key = e.key;

//     // Always block Meta/Windows key entirely
//     if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('The Windows key is disabled during the exam.');
//       sendEvent('copy_attempt', { key: 'Meta', reason: 'windows_key' });
//       return;
//     }

//     // Block Alt combos (Alt+Tab, Alt+F4, etc.)
//     if (e.altKey && e.key !== 'Alt') {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('This key combination is not allowed during the exam.');
//       sendEvent('copy_attempt', { key: 'Alt+' + e.key, reason: 'alt_combo' });
//       return;
//     }

//     // Block all Ctrl combos EXCEPT Ctrl+A (select all — harmless, copy still blocked)
//     if (e.ctrlKey && e.key !== 'Control') {
//       if (e.key !== 'a' && e.key !== 'A') {
//         e.preventDefault();
//         e.stopImmediatePropagation();
//         sendEvent('copy_attempt', { key: 'Ctrl+' + e.key, reason: 'ctrl_combo' });
//         toast('This action is not allowed during the exam.');
//         return;
//       }
//     }

//     // Block all function keys F1-F12
//     if (/^F\d+$/.test(key)) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       sendEvent('copy_attempt', { key: key, reason: 'function_key' });
//       toast('Function keys are disabled during the exam.');
//       return;
//     }

//     // Block system keys
//     var systemKeys = [
//       'PrintScreen','Insert','Pause','ScrollLock','ContextMenu',
//       'AudioVolumeMute','AudioVolumeDown','AudioVolumeUp',
//       'MediaTrackNext','MediaTrackPrevious','MediaStop','MediaPlayPause',
//       'LaunchMail','LaunchApp1','LaunchApp2',
//       'BrowserSearch','BrowserHome','BrowserBack','BrowserForward',
//       'BrowserStop','BrowserRefresh','BrowserFavorites',
//       'Escape', // handled separately below
//     ];
//     if (systemKeys.indexOf(key) !== -1 && key !== 'Escape') {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       sendEvent('copy_attempt', { key: key, reason: 'system_key' });
//       toast('This key is disabled during the exam.');
//       return;
//     }

//     // Escape — can't prevent fullscreen exit (browser security) but record it
//     if (key === 'Escape') {
//       if (inFullscreen()) {
//         sendEvent('fullscreen_exit_attempt', { method: 'escape_key' });
//         // fullscreenchange will fire and show overlay automatically
//       }
//       return;
//     }

//   }, true);

//   // ─── Drag block ───────────────────────────────────────────────────────
//   document.addEventListener('dragstart', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//   }, true);

//   // ─── External link block ──────────────────────────────────────────────
//   document.addEventListener('click', function (e) {
//     if (!proctoringActive) return;
//     var a = e.target.closest('a');
//     if (!a) return;
//     var href = a.getAttribute('href') || '';
//     if (a.target === '_blank' || (href && href[0] !== '#' && href.indexOf('javascript') !== 0)) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('Opening links is disabled during the exam.');
//     }
//   }, true);

// })();




// // content.js — Proctorix Exam Guard v6.0
// // Fixes: reload recovery, first-event miss, dual counting, global count, Firefox fullscreen

// // ─── Browser API polyfill ─────────────────────────────────────────────────
// (function () {
//   if (typeof globalThis.browser !== 'undefined') return;
//   if (typeof chrome === 'undefined' || !chrome.runtime) return;
//   var wrap = function (api) {
//     return new Proxy(api, {
//       get: function (target, prop) {
//         var val = target[prop];
//         if (val && typeof val === 'object' && !Array.isArray(val)) return wrap(val);
//         if (typeof val === 'function') {
//           return function () {
//             var args = Array.prototype.slice.call(arguments);
//             var last = args[args.length - 1];
//             if (typeof last === 'function') return val.apply(target, args);
//             return new Promise(function (resolve, reject) {
//               val.apply(target, args.concat([function (result) {
//                 var err = chrome.runtime.lastError;
//                 if (err) reject(new Error(err.message));
//                 else resolve(result);
//               }]));
//             });
//           };
//         }
//         return val;
//       }
//     });
//   };
//   globalThis.browser = wrap(chrome);
// })();

// // ─── Main logic ───────────────────────────────────────────────────────────
// (function () {

//   // ── State ─────────────────────────────────────────────────────────────
//   var proctoringActive   = false;
//   var overlayEl          = null;
//   var toastEl            = null;
//   var focusLockTimer     = null;
//   var fullscreenPending  = false; // waiting for user gesture for Firefox

//   // ── Incident deduplication ────────────────────────────────────────────
//   // ONE incident = ONE global warning count increment, no matter how many
//   // event types fire simultaneously (blur + visibilitychange + tab = 1 incident)
//   var incidentLock       = false;
//   var INCIDENT_WINDOW_MS = 1000; // events within 1s of each other = same incident

//   // ── Per-type counts (for the stats table only) ────────────────────────
//   var counts = {
//     tab_switch:      0,
//     fullscreen_exit: 0,
//     window_blur:     0,
//     copy_attempt:    0,
//     paste_attempt:   0,
//     right_click:     0,
//     globalTotal:     0, // increments by 1 per incident, not per event
//   };

//   // ── Overlay priority ──────────────────────────────────────────────────
//   var PRIORITY = { tab: 1, blur: 2, fullscreen: 3 };
//   var currentPriority = 0;

//   var OVERLAY_CFG = {
//     fullscreen: { color: '#c0392b', icon: '\u26D4', label: 'FULLSCREEN EXITED',    typeKey: 'fullscreen_exit' },
//     blur:       { color: '#7d3c98', icon: '\uD83D\uDC41', label: 'FOCUS LOST',     typeKey: 'window_blur'     },
//     tab:        { color: '#d35400', icon: '\u26A0',  label: 'TAB SWITCH DETECTED', typeKey: 'tab_switch'      },
//   };

//   // ─── Send to background ───────────────────────────────────────────────
//   function sendToBackground(msg) {
//     if (typeof browser === 'undefined') return;
//     try {
//       var p = browser.runtime.sendMessage(msg);
//       if (p && typeof p.catch === 'function') p.catch(function () {});
//     } catch (_) {}
//   }

//   // ─── Record a violation incident ──────────────────────────────────────
//   // typeKey: the specific event type (tab_switch, window_blur, etc.)
//   // reason:  overlay reason (tab, blur, fullscreen)
//   // Returns true if this is a NEW incident (not deduplicated)
//   function recordIncident(typeKey, reason) {
//     // Always increment the specific type counter
//     if (counts[typeKey] !== undefined) counts[typeKey]++;

//     // Check if we're inside an incident window
//     if (incidentLock) {
//       // Same incident — do NOT increment global, do NOT show new overlay
//       // Just send event to backend for logging
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: typeKey, metadata: { count: counts[typeKey], deduplicated: true } });
//       return false;
//     }

//     // New incident — start lock window
//     incidentLock = true;
//     counts.globalTotal++;
//     setTimeout(function () { incidentLock = false; }, INCIDENT_WINDOW_MS);

//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: typeKey, metadata: { count: counts[typeKey], globalTotal: counts.globalTotal } });
//     return true;
//   }

//   // ─── Fullscreen ────────────────────────────────────────────────────────
//   function goFullscreen() {
//     if (document.fullscreenElement) return;
//     var p = document.documentElement.requestFullscreen();
//     if (p && typeof p.catch === 'function') {
//       p.catch(function (err) {
//         // Firefox: not allowed without user gesture
//         if (err.name === 'TypeError' || err.message.indexOf('user gesture') !== -1) {
//           fullscreenPending = true;
//           showFullscreenPrompt();
//         }
//       });
//     }
//   }

//   function inFullscreen() { return !!document.fullscreenElement; }

//   // Firefox fallback — show a button the user must click to enter fullscreen
//   function showFullscreenPrompt() {
//     if (document.getElementById('px-fs-prompt')) return;
//     var prompt = document.createElement('div');
//     prompt.id = 'px-fs-prompt';
//     prompt.style.cssText = [
//       'position:fixed', 'inset:0', 'z-index:2147483647',
//       'background:rgba(0,0,0,0.95)',
//       'display:flex', 'flex-direction:column',
//       'align-items:center', 'justify-content:center',
//       'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
//       'color:#fff',
//     ].join(';');
//     var box = document.createElement('div');
//     box.style.cssText = 'text-align:center;max-width:400px;padding:40px;';
//     var icon = document.createElement('div');
//     icon.style.cssText = 'font-size:48px;margin-bottom:20px;';
//     icon.textContent = '\uD83D\uDCBB';
//     var title = document.createElement('div');
//     title.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:12px;';
//     title.textContent = 'Fullscreen Required to Start Exam';
//     var msg = document.createElement('div');
//     msg.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:28px;line-height:1.6;';
//     msg.textContent = 'This exam must be taken in fullscreen mode. Click the button below to enter fullscreen and begin your exam.';
//     var btn = document.createElement('button');
//     btn.style.cssText = 'background:#27ae60;color:#fff;border:none;padding:14px 40px;font-size:16px;font-weight:700;border-radius:10px;cursor:pointer;';
//     btn.textContent = 'Enter Fullscreen & Start Exam';
//     btn.addEventListener('click', function () {
//       document.documentElement.requestFullscreen().then(function () {
//         fullscreenPending = false;
//         var el = document.getElementById('px-fs-prompt');
//         if (el) el.remove();
//       }).catch(function () {});
//     });
//     box.appendChild(icon);
//     box.appendChild(title);
//     box.appendChild(msg);
//     box.appendChild(btn);
//     prompt.appendChild(box);
//     document.body.appendChild(prompt);
//   }

//   // ─── Styles ────────────────────────────────────────────────────────────
//   function injectStyles() {
//     if (document.getElementById('px-styles')) return;
//     var s = document.createElement('style');
//     s.id = 'px-styles';
//     s.textContent =
//       '@keyframes px-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}' +
//       '@keyframes px-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}' +
//       '@keyframes px-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}';
//     (document.head || document.documentElement).appendChild(s);
//   }

//   // ─── Stats table HTML ──────────────────────────────────────────────────
//   function buildStats() {
//     var rows = [
//       { key: 'tab_switch',      label: 'Tab switches'        },
//       { key: 'fullscreen_exit', label: 'Fullscreen exits'    },
//       { key: 'window_blur',     label: 'Focus losses'        },
//       { key: 'copy_attempt',    label: 'Copy / cut attempts' },
//       { key: 'paste_attempt',   label: 'Paste attempts'      },
//       { key: 'right_click',     label: 'Right-click attempts'},
//     ];
//     var html = '';
//     rows.forEach(function (r) {
//       if (counts[r.key] > 0) {
//         html +=
//           '<div style="display:flex;justify-content:space-between;padding:5px 0;' +
//           'border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;color:#999;">' +
//           '<span>' + r.label + '</span>' +
//           '<span style="color:#e74c3c;font-weight:700;">' + counts[r.key] + '</span>' +
//           '</div>';
//       }
//     });
//     return html || '<div style="font-size:12px;color:#555;text-align:center;padding:8px 0;">No violations yet</div>';
//   }

//   // ─── Overlay ───────────────────────────────────────────────────────────
//   function showOverlay(reason) {
//     var priority = PRIORITY[reason] || 1;

//     // Never downgrade a higher-priority overlay
//     if (overlayEl && currentPriority > priority) {
//       shakeOverlay();
//       return;
//     }
//     if (overlayEl && overlayEl.dataset.reason === reason) {
//       shakeOverlay();
//       return;
//     }

//     destroyOverlay();
//     currentPriority = priority;

//     var cfg = OVERLAY_CFG[reason] || OVERLAY_CFG.fullscreen;

//     overlayEl = document.createElement('div');
//     overlayEl.id = 'px-overlay';
//     overlayEl.dataset.reason = reason;

//     var shell = document.createElement('div');
//     shell.style.cssText = [
//       'position:fixed', 'inset:0', 'z-index:2147483647',
//       'background:rgba(5,5,10,0.96)',
//       'display:flex', 'align-items:center', 'justify-content:center',
//       'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
//       'animation:px-in 0.3s ease',
//     ].join(';');

//     var topBar = document.createElement('div');
//     topBar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:4px;background:' + cfg.color + ';z-index:2147483648;';

//     var card = document.createElement('div');
//     card.id = 'px-card';
//     card.style.cssText = [
//       'background:#111118',
//       'border:1px solid rgba(255,255,255,0.08)',
//       'border-top:3px solid ' + cfg.color,
//       'border-radius:18px',
//       'padding:40px 44px',
//       'max-width:460px', 'width:88%',
//       'box-shadow:0 32px 80px rgba(0,0,0,0.9)',
//       'text-align:center',
//     ].join(';');

//     var iconCircle = document.createElement('div');
//     iconCircle.style.cssText = [
//       'width:76px', 'height:76px', 'border-radius:50%',
//       'background:' + cfg.color + '20',
//       'border:2px solid ' + cfg.color + '50',
//       'display:flex', 'align-items:center', 'justify-content:center',
//       'margin:0 auto 18px',
//       'font-size:34px',
//       'animation:px-pulse 2.5s ease infinite',
//     ].join(';');
//     iconCircle.textContent = cfg.icon;

//     var badge = document.createElement('div');
//     badge.style.cssText = [
//       'display:inline-block',
//       'background:' + cfg.color + '18',
//       'color:' + cfg.color,
//       'border:1px solid ' + cfg.color + '45',
//       'border-radius:20px',
//       'padding:4px 16px',
//       'font-size:10px', 'font-weight:700',
//       'letter-spacing:2px',
//       'margin-bottom:16px',
//     ].join(';');
//     badge.textContent = cfg.label;

//     var title = document.createElement('div');
//     title.style.cssText = 'font-size:21px;font-weight:700;color:#fff;margin-bottom:10px;';
//     title.textContent = 'Exam Violation Detected';

//     var msgEl = document.createElement('div');
//     msgEl.style.cssText = 'font-size:13px;color:#777;line-height:1.75;margin-bottom:18px;';
//     msgEl.textContent = 'This incident has been recorded and reported to the proctor. Return to fullscreen to continue your exam.';

//     var statsBox = document.createElement('div');
//     statsBox.id = 'px-stats';
//     statsBox.style.cssText = [
//       'background:rgba(255,255,255,0.03)',
//       'border:1px solid rgba(255,255,255,0.07)',
//       'border-radius:10px',
//       'padding:12px 14px',
//       'margin-bottom:10px',
//       'text-align:left',
//     ].join(';');
//     statsBox.innerHTML = buildStats();

//     var totalEl = document.createElement('div');
//     totalEl.id = 'px-total';
//     totalEl.style.cssText = 'font-size:12px;color:#444;margin-bottom:22px;';
//     totalEl.textContent = 'Total incidents this session: ' + counts.globalTotal;

//     var btn = document.createElement('button');
//     btn.style.cssText = [
//       'width:100%',
//       'background:' + cfg.color,
//       'color:#fff', 'border:none',
//       'padding:14px 0', 'font-size:15px', 'font-weight:700',
//       'border-radius:10px', 'cursor:pointer',
//     ].join(';');
//     btn.textContent = 'Return to Fullscreen';
//     btn.addEventListener('click', function () { goFullscreen(); });
//     btn.addEventListener('mouseenter', function () { this.style.opacity = '0.85'; });
//     btn.addEventListener('mouseleave', function () { this.style.opacity = '1'; });

//     var warnNote = document.createElement('div');
//     warnNote.style.cssText = 'font-size:11px;color:#333;margin-top:12px;';
//     warnNote.textContent = 'Repeated violations may result in exam disqualification.';

//     card.appendChild(iconCircle);
//     card.appendChild(badge);
//     card.appendChild(title);
//     card.appendChild(msgEl);
//     card.appendChild(statsBox);
//     card.appendChild(totalEl);
//     card.appendChild(btn);
//     card.appendChild(warnNote);
//     shell.appendChild(topBar);
//     shell.appendChild(card);
//     overlayEl.appendChild(shell);
//     document.body.appendChild(overlayEl);
//   }

//   function refreshOverlay() {
//     var s = document.getElementById('px-stats');
//     if (s) s.innerHTML = buildStats();
//     var t = document.getElementById('px-total');
//     if (t) t.textContent = 'Total incidents this session: ' + counts.globalTotal;
//   }

//   function shakeOverlay() {
//     refreshOverlay();
//     var card = document.getElementById('px-card');
//     if (!card) return;
//     card.style.animation = 'none';
//     setTimeout(function () { if (card) card.style.animation = 'px-shake 0.45s ease'; }, 10);
//   }

//   // ONLY removed here — when fullscreen is confirmed by fullscreenchange
//   function destroyOverlay() {
//     if (overlayEl) { overlayEl.remove(); overlayEl = null; }
//     currentPriority = 0;
//   }

//   // ─── Toast ─────────────────────────────────────────────────────────────
//   function toast(msg) {
//     if (toastEl) toastEl.remove();
//     toastEl = document.createElement('div');
//     toastEl.style.cssText = [
//       'position:fixed', 'bottom:28px', 'right:28px',
//       'background:#111118', 'color:#fff',
//       'padding:12px 18px', 'border-radius:10px',
//       'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
//       'font-size:13px', 'z-index:2147483647',
//       'box-shadow:0 8px 24px rgba(0,0,0,0.7)',
//       'border-left:4px solid #e74c3c',
//       'animation:px-in 0.2s ease',
//       'max-width:280px',
//     ].join(';');
//     toastEl.textContent = '\uD83D\uDEAB ' + msg;
//     document.body.appendChild(toastEl);
//     setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 3500);
//   }

//   // ─── Focus lock ────────────────────────────────────────────────────────
//   function startFocusLock() {
//     stopFocusLock();
//     focusLockTimer = setInterval(function () {
//       if (!proctoringActive) { stopFocusLock(); return; }
//       if (document.visibilityState === 'hidden') return;
//       if (!document.hasFocus()) window.focus();
//     }, 500);
//   }
//   function stopFocusLock() {
//     if (focusLockTimer) { clearInterval(focusLockTimer); focusLockTimer = null; }
//   }

//   // ─── Restore from background after page reload ─────────────────────────
//   // When the exam page reloads, content.js re-runs but proctoringActive=false
//   // We ask the background if a session was active and restore state
//   function restoreStateFromBackground() {
//     if (typeof browser === 'undefined') return;
//     try {
//       browser.runtime.sendMessage({ type: 'GET_STATE' }, function (response) {
//         if (chrome && chrome.runtime && chrome.runtime.lastError) return;
//         if (response && response.state && response.state.active) {
//           // Session was active — restore proctoring without closing tabs
//           proctoringActive = true;
//           injectStyles();
//           startFocusLock();
//           // Try fullscreen — may need user gesture on Firefox
//           goFullscreen();
//         }
//       });
//     } catch (_) {}
//   }

//   // ─── START exam ────────────────────────────────────────────────────────
//   function startProctoring(attemptId, sessionId) {
//     proctoringActive = true;
//     injectStyles();
//     goFullscreen();
//     startFocusLock();
//     sendToBackground({
//       type:      'START_PROCTORING',
//       attemptId: attemptId || null,
//       sessionId: sessionId || null,
//     });
//   }

//   // ─── STOP exam ─────────────────────────────────────────────────────────
//   function stopProctoring() {
//     proctoringActive = false;
//     stopFocusLock();
//     sendToBackground({ type: 'STOP_PROCTORING' });
//     destroyOverlay();
//     var prompt = document.getElementById('px-fs-prompt');
//     if (prompt) prompt.remove();
//   }

//   // ─── postMessage from exam page ────────────────────────────────────────
//   window.addEventListener('message', function (e) {
//     if (e.source !== window || !e.data) return;
//     if (e.data.type === 'PROCTORIX_START') startProctoring(e.data.attemptId, e.data.sessionId);
//     if (e.data.type === 'PROCTORIX_STOP')  stopProctoring();
//   });

//   // ─── Messages from background ──────────────────────────────────────────
//   if (typeof browser !== 'undefined') {
//     browser.runtime.onMessage.addListener(function (msg) {
//       if (msg.type === 'SHOW_TAB_WARNING') {
//         // Background already recorded tab_switch event
//         // We only show the overlay here — do NOT call recordIncident again
//         // (background already counted it)
//         // But we do update our local counts display
//         counts.tab_switch++;
//         // Do NOT increment globalTotal here — background handles that
//         showOverlay('tab');
//         refreshOverlay();
//       }
//     });
//   }

//   // ─── Fullscreen change — THE ONLY place overlay is removed ─────────────
//   document.addEventListener('fullscreenchange', function () {
//     if (!proctoringActive) return;
//     if (inFullscreen()) {
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'fullscreen_enter', metadata: {} });
//       destroyOverlay();
//     } else {
//       // This is a real incident
//       var isNew = recordIncident('fullscreen_exit', 'fullscreen');
//       if (isNew) showOverlay('fullscreen');
//       else { shakeOverlay(); }
//     }
//   });

//   // ─── Visibility change (tab hidden) ────────────────────────────────────
//   // NOTE: We do NOT call recordIncident here.
//   // Background.js handles tab switching via tabs.onActivated and sends
//   // SHOW_TAB_WARNING. That is the single source of truth for tab switches.
//   // We only send the raw event for backend logging.
//   document.addEventListener('visibilitychange', function () {
//     if (!proctoringActive) return;
//     if (document.hidden) {
//       counts.tab_switch++;
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'tab_switch', metadata: { count: counts.tab_switch } });
//     }
//   });

//   // ─── Window blur ────────────────────────────────────────────────────────
//   // ONLY fires for Alt+Tab / clicking other apps (NOT for tab switching)
//   // When tab switches, document.hidden becomes true FIRST, so we skip blur
//   window.addEventListener('blur', function () {
//     if (!proctoringActive) return;
//     // If tab is hidden, this is a tab switch — already handled by visibilitychange
//     // Skip to avoid double-counting
//     if (document.hidden) return;
//     // This is a genuine window blur (Alt+Tab, other app)
//     var isNew = recordIncident('window_blur', 'blur');
//     if (isNew) showOverlay('blur');
//     else shakeOverlay();
//   });

//   // Focus returns
//   window.addEventListener('focus', function () {
//     if (!proctoringActive) return;
//     // Only remove overlay if we're confirmed back in fullscreen
//     if (overlayEl && inFullscreen()) destroyOverlay();
//     // If not in fullscreen, keep showing overlay
//   });

//   // ─── Right-click ───────────────────────────────────────────────────────
//   document.addEventListener('contextmenu', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopPropagation();
//     counts.right_click++;
//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'right_click', metadata: { count: counts.right_click } });
//     toast('Right-click is disabled during the exam.');
//   }, true);

//   // ─── Copy ──────────────────────────────────────────────────────────────
//   document.addEventListener('copy', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.copy_attempt++;
//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { count: counts.copy_attempt } });
//     toast('Copying is disabled during the exam.');
//   }, true);

//   // ─── Cut ───────────────────────────────────────────────────────────────
//   document.addEventListener('cut', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.copy_attempt++;
//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { action: 'cut', count: counts.copy_attempt } });
//     toast('Cutting is disabled during the exam.');
//   }, true);

//   // ─── Paste ─────────────────────────────────────────────────────────────
//   document.addEventListener('paste', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//     e.stopImmediatePropagation();
//     counts.paste_attempt++;
//     sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'paste_attempt', metadata: { count: counts.paste_attempt } });
//     toast('Pasting is disabled during the exam.');
//   }, true);

//   // ─── Keyboard blocks ────────────────────────────────────────────────────
//   document.addEventListener('keydown', function (e) {
//     if (!proctoringActive) return;

//     // Block Windows/Meta key (opens emoji, start menu, etc.)
//     if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('The Windows/Meta key is disabled during the exam.');
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Meta' } });
//       return;
//     }

//     // Block Alt combos
//     if (e.altKey && e.key !== 'Alt') {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('Alt key combinations are not allowed during the exam.');
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Alt+' + e.key } });
//       return;
//     }

//     // Block Ctrl combos except Ctrl+A
//     if (e.ctrlKey && e.key !== 'Control') {
//       if (e.key !== 'a' && e.key !== 'A') {
//         e.preventDefault();
//         e.stopImmediatePropagation();
//         sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: 'Ctrl+' + e.key } });
//         toast('This action is not allowed during the exam.');
//         return;
//       }
//     }

//     // Block F1-F12
//     if (/^F\d+$/.test(e.key)) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: e.key } });
//       toast('Function keys are disabled during the exam.');
//       return;
//     }

//     // Block system keys
//     var systemKeys = [
//       'PrintScreen','Insert','Pause','ScrollLock','ContextMenu',
//       'AudioVolumeMute','AudioVolumeDown','AudioVolumeUp',
//       'MediaTrackNext','MediaTrackPrevious','MediaStop','MediaPlayPause',
//       'LaunchMail','LaunchApp1','LaunchApp2',
//       'BrowserSearch','BrowserHome','BrowserBack','BrowserForward',
//       'BrowserStop','BrowserRefresh','BrowserFavorites',
//     ];
//     if (systemKeys.indexOf(e.key) !== -1) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { key: e.key } });
//       toast('This key is disabled during the exam.');
//       return;
//     }

//     // Escape — record attempt, fullscreenchange handles the overlay
//     if (e.key === 'Escape' && inFullscreen()) {
//       sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'fullscreen_exit_attempt', metadata: { method: 'escape_key' } });
//     }
//   }, true);

//   // ─── Drag block ─────────────────────────────────────────────────────────
//   document.addEventListener('dragstart', function (e) {
//     if (!proctoringActive) return;
//     e.preventDefault();
//   }, true);

//   // ─── Link block ──────────────────────────────────────────────────────────
//   document.addEventListener('click', function (e) {
//     if (!proctoringActive) return;
//     var a = e.target.closest('a');
//     if (!a) return;
//     var href = a.getAttribute('href') || '';
//     if (a.target === '_blank' || (href && href[0] !== '#' && href.indexOf('javascript') !== 0)) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       toast('Opening links is disabled during the exam.');
//     }
//   }, true);

//   // ─── On script load — check if we need to restore state ────────────────
//   // This handles the page reload scenario
//   restoreStateFromBackground();

// })();








// content.js — Proctorix Exam Guard v7.0
// Fixes: persistent counts across reloads, fast Alt+Tab Firefox fix, tab count +1 only

// ─── Browser API polyfill ─────────────────────────────────────────────────
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

// ─── Main logic ───────────────────────────────────────────────────────────
(function () {

  // ── State ─────────────────────────────────────────────────────────────
  var proctoringActive  = false;
  var overlayEl         = null;
  var toastEl           = null;
  var focusLockTimer    = null;
  var fullscreenPending = false;

  // ── Incident deduplication ────────────────────────────────────────────
  // ONE global incident per 1 second window — no matter how many events fire
  var incidentLock      = false;
  var INCIDENT_MS       = 1000;

  // ── Alt+Tab detection: timestamp-based (fixes fast Alt+Tab on Firefox) ─
  // Instead of checking document.hidden (unreliable on fast keypresses),
  // we track when visibilitychange last fired. If blur fires within
  // BLUR_TAB_GAP_MS of a visibilitychange, treat it as tab switch (skip it).
  // If blur fires independently, it's a genuine Alt+Tab/app switch.
  var lastVisibilityChangeTime = 0;
  var BLUR_TAB_GAP_MS          = 150; // if blur fires within 150ms of visibilitychange = tab switch

  // ── Per-type counts — persisted to storage so reloads don't reset them ─
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

  // Save counts to storage after every change
  function saveCounts() {
    if (typeof browser === 'undefined') return;
    try {
      browser.storage.local.set({ px_counts: counts });
    } catch (_) {}
  }

  // Restore counts from storage (called on page load / restore)
  function loadCounts(callback) {
    if (typeof browser === 'undefined') { callback(); return; }
    try {
      browser.storage.local.get([STORAGE_KEY], function (data) {
        if (data && data[STORAGE_KEY]) {
          var saved = data[STORAGE_KEY];
          // Merge saved counts — preserve all keys
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

  // ── Overlay priority ──────────────────────────────────────────────────
  var PRIORITY = { tab: 1, blur: 2, fullscreen: 3 };
  var currentPriority = 0;

  var OVERLAY_CFG = {
    fullscreen: { color: '#c0392b', icon: '\u26D4',       label: 'FULLSCREEN EXITED',    typeKey: 'fullscreen_exit' },
    blur:       { color: '#7d3c98', icon: '\uD83D\uDC41', label: 'FOCUS LOST',            typeKey: 'window_blur'     },
    tab:        { color: '#d35400', icon: '\u26A0',       label: 'TAB SWITCH DETECTED',  typeKey: 'tab_switch'      },
  };

  // ─── Send to background ───────────────────────────────────────────────
  function sendToBackground(msg) {
    if (typeof browser === 'undefined') return;
    try {
      var p = browser.runtime.sendMessage(msg);
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (_) {}
  }

  // ─── Record incident (deduplication + global count) ───────────────────
  // typeKey: specific event ('window_blur', 'fullscreen_exit', etc.)
  // Returns true = new incident, false = deduplicated (same incident window)
  function recordIncident(typeKey) {
    // Increment the specific type counter
    if (counts[typeKey] !== undefined) counts[typeKey]++;

    var isNew = !incidentLock;
    if (isNew) {
      // New incident window
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

  // ─── Fullscreen ────────────────────────────────────────────────────────
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

  // ─── Styles ────────────────────────────────────────────────────────────
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

  // ─── Stats table ───────────────────────────────────────────────────────
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

  // ─── Overlay ───────────────────────────────────────────────────────────
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

  // ─── Toast ─────────────────────────────────────────────────────────────
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

  // ─── Focus lock ────────────────────────────────────────────────────────
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

  // ─── Restore state after page reload ──────────────────────────────────
  function restoreStateFromBackground() {
    if (typeof browser === 'undefined') return;
    try {
      browser.runtime.sendMessage({ type: 'GET_STATE' }, function (response) {
        // Suppress extension context errors
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) return;
        if (response && response.state && response.state.active) {
          // Load persisted counts FIRST, then restore proctoring
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

  // ─── START ─────────────────────────────────────────────────────────────
  function startProctoring(attemptId, sessionId) {
    // Clear any leftover counts from a previous session
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

  // ─── STOP ──────────────────────────────────────────────────────────────
  function stopProctoring() {
    proctoringActive = false;
    stopFocusLock();
    clearCounts();
    sendToBackground({ type: 'STOP_PROCTORING' });
    destroyOverlay();
    var prompt = document.getElementById('px-fs-prompt');
    if (prompt) prompt.remove();
  }

  // ─── postMessage ───────────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data) return;
    if (e.data.type === 'PROCTORIX_START') startProctoring(e.data.attemptId, e.data.sessionId);
    if (e.data.type === 'PROCTORIX_STOP')  stopProctoring();
  });

  // ─── Messages from background ──────────────────────────────────────────
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener(function (msg) {
      if (msg.type === 'SHOW_TAB_WARNING') {
        // ── SINGLE SOURCE OF TRUTH FOR TAB COUNT ──
        // ONLY this handler increments tab_switch count.
        // visibilitychange does NOT increment it.
        // background sends this ONCE per tab switch incident.
        counts.tab_switch++;
        // globalTotal is managed by background for tab incidents
        // Sync it from the message if provided
        if (typeof msg.globalIncidentCount === 'number') {
          counts.globalTotal = msg.globalIncidentCount;
        }
        saveCounts();
        showOverlay('tab');
        refreshOverlay();
      }
    });
  }

  // ─── Fullscreen change ─────────────────────────────────────────────────
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

  // ─── Visibility change ─────────────────────────────────────────────────
  // Records the timestamp but does NOT increment any counter.
  // Tab count is owned entirely by SHOW_TAB_WARNING from background.
  // We just note the time so blur handler can distinguish tab-switch blur
  // from genuine Alt+Tab blur.
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

  // ─── Window blur ───────────────────────────────────────────────────────
  // Distinguishes Alt+Tab (app switch) from tab switch using timestamp gap.
  // If blur fires within BLUR_TAB_GAP_MS of a visibilitychange, it's a
  // tab switch — skip it (background handles tab switches via tabs.onActivated).
  // If blur fires independently (> BLUR_TAB_GAP_MS gap), it's genuine Alt+Tab.
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

  // Focus returns — only remove overlay if confirmed back in fullscreen
  window.addEventListener('focus', function () {
    if (!proctoringActive) return;
    if (overlayEl && inFullscreen()) destroyOverlay();
  });

  // ─── Right-click ───────────────────────────────────────────────────────
  document.addEventListener('contextmenu', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
    e.stopPropagation();
    counts.right_click++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'right_click', metadata: { count: counts.right_click } });
    toast('Right-click is disabled during the exam.');
  }, true);

  // ─── Copy ──────────────────────────────────────────────────────────────
  document.addEventListener('copy', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.copy_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { count: counts.copy_attempt } });
    toast('Copying is disabled during the exam.');
  }, true);

  // ─── Cut ───────────────────────────────────────────────────────────────
  document.addEventListener('cut', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.copy_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'copy_attempt', metadata: { action: 'cut', count: counts.copy_attempt } });
    toast('Cutting is disabled during the exam.');
  }, true);

  // ─── Paste ─────────────────────────────────────────────────────────────
  document.addEventListener('paste', function (e) {
    if (!proctoringActive) return;
    e.preventDefault(); e.stopImmediatePropagation();
    counts.paste_attempt++;
    saveCounts();
    sendToBackground({ type: 'PROCTOR_EVENT', eventType: 'paste_attempt', metadata: { count: counts.paste_attempt } });
    toast('Pasting is disabled during the exam.');
  }, true);

  // ─── Keyboard blocks ────────────────────────────────────────────────────
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

  // ─── Drag block ──────────────────────────────────────────────────────────
  document.addEventListener('dragstart', function (e) {
    if (!proctoringActive) return;
    e.preventDefault();
  }, true);

  // ─── Link block ──────────────────────────────────────────────────────────
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

  // ─── On load: restore state if exam was active ────────────────────────
  restoreStateFromBackground();

})();