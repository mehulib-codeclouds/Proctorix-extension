// const BACKEND_URL = 'http://localhost:3000'; 
// const FLUSH_INTERVAL_SECONDS = 5;            
// const MAX_QUEUE_SIZE = 50;                   

// let proctoringState = {
//   active: false,
//   attemptId: null,
//   sessionId: null,
// };

// let eventQueue = [];
// let isFlushScheduled = false;

// function queueEvent(eventType, metadata = {}) {
//   if (!proctoringState.active || !proctoringState.attemptId) return;

//   eventQueue.push({
//     attemptId: proctoringState.attemptId,
//     sessionId: proctoringState.sessionId,
//     eventType,
//     metadata,
//     occurredAt: new Date().toISOString(),
//   });

//   browser.storage.local.set({ eventQueue });

//   if (eventQueue.length >= MAX_QUEUE_SIZE) {
//     flushEvents();
//   }
// }

// async function flushEvents() {
//   if (eventQueue.length === 0) return;

//   const toSend = [...eventQueue];
//   eventQueue = [];
//   browser.storage.local.set({ eventQueue: [] });

//   try {
//     const response = await fetch(`${BACKEND_URL}/proctoring/events/batch`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${proctoringState.sessionId}`,
//       },
//       body: JSON.stringify({ events: toSend }),
//     });

//     if (!response.ok) {
//       eventQueue = [...toSend, ...eventQueue];
//       browser.storage.local.set({ eventQueue });
//       console.warn('[Proctorix] Batch flush failed, will retry:', response.status);
//     }
//   } catch (err) {
//     eventQueue = [...toSend, ...eventQueue];
//     browser.storage.local.set({ eventQueue });
//     console.warn('[Proctorix] Batch flush network error, will retry:', err.message);
//   }
// }

// function scheduleFlush() {
//   if (isFlushScheduled) return;
//   isFlushScheduled = true;
//   browser.alarms.create('proctorix-flush', {
//     periodInMinutes: FLUSH_INTERVAL_SECONDS / 60,
//   });
// }

// function stopFlush() {
//   isFlushScheduled = false;
//   browser.alarms.clear('proctorix-flush');
// }

// browser.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === 'proctorix-flush') {
//     flushEvents();
//   }
// });

// async function closeOtherTabs(examTabId) {
//   const allTabs = await browser.tabs.query({});
//   const tabsToClose = allTabs
//     .filter(tab => tab.id !== examTabId && !tab.pinned)
//     .map(tab => tab.id);

//   if (tabsToClose.length > 0) {
//     await browser.tabs.remove(tabsToClose);
//   }
// }

// browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   (async () => {
//     switch (msg.type) {

//       case 'START_PROCTORING': {
//         proctoringState = {
//           active: true,
//           attemptId: msg.attemptId,
//           sessionId: msg.sessionId,
//           examTabId: sender.tab?.id ?? msg.examTabId ?? null,
//         };
//         await browser.storage.local.set(proctoringState);

//         if (proctoringState.examTabId) {
//           await closeOtherTabs(proctoringState.examTabId);
//         }

//         const stored = await browser.storage.local.get(['eventQueue']);
//         if (stored.eventQueue?.length) {
//           eventQueue = [...stored.eventQueue, ...eventQueue];
//         }

//         queueEvent('exam_started', { timestamp: new Date().toISOString() });
//         scheduleFlush();
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'STOP_PROCTORING': {
//         queueEvent('exam_ended', { timestamp: new Date().toISOString() });
//         await flushEvents();
//         stopFlush();
//         proctoringState = { active: false, attemptId: null, sessionId: null };
//         eventQueue = [];
//         await browser.storage.local.remove(['active', 'attemptId', 'sessionId', 'eventQueue', 'examTabId']);
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'PROCTOR_EVENT': {
//         queueEvent(msg.eventType, msg.metadata ?? {});
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'GET_STATE': {
//         sendResponse({ ...proctoringState, queueLength: eventQueue.length });
//         break;
//       }

//       case 'FLUSH_NOW': {
//         await flushEvents();
//         sendResponse({ ok: true });
//         break;
//       }
//     }
//   })();
//   return true; 
// });


// browser.tabs.onActivated.addListener(async (activeInfo) => {
//   if (!proctoringState.active) return;
//   if (!proctoringState.examTabId) return;

//   if (activeInfo.tabId !== proctoringState.examTabId) {
//     queueEvent('tab_switch', { toTabId: activeInfo.tabId });

//     await browser.tabs.update(proctoringState.examTabId, { active: true });

//     browser.tabs.sendMessage(proctoringState.examTabId, {
//       type: 'SHOW_TAB_WARNING',
//     });
//   }
// });

// browser.storage.local.get(
//   ['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue'],
//   (data) => {
//     if (data.active && data.attemptId && data.sessionId) {
//       proctoringState = {
//         active: true,
//         attemptId: data.attemptId,
//         sessionId: data.sessionId,
//         examTabId: data.examTabId ?? null,
//       };
//       eventQueue = data.eventQueue ?? [];
//       scheduleFlush();
//     }
//   }
// );





// // background.js — Proctorix service worker
// // Works for Chrome MV3 and Firefox MV2 (browser.* API used throughout)
// // Firefox has native browser.* — Chrome uses the polyfill in content.js
// // Background scripts DO have chrome.* directly — we normalise here too.

// var _br = (typeof browser !== 'undefined') ? browser : chrome;

// var BACKEND_URL           = 'http://localhost:3000';
// var FLUSH_INTERVAL_SECS   = 5;
// var MAX_QUEUE_SIZE        = 50;

// // ── State ─────────────────────────────────────────────────────────────────
// var state = {
//   active:    false,
//   attemptId: null,
//   sessionId: null,
//   examTabId: null,
// };

// var eventQueue      = [];
// var isFlushRunning  = false;
// var flushAlarmSet   = false;

// // ── Queue event ───────────────────────────────────────────────────────────
// function queueEvent(eventType, metadata) {
//   if (!state.active || !state.attemptId) return;
//   eventQueue.push({
//     attemptId:  state.attemptId,
//     sessionId:  state.sessionId,
//     eventType:  eventType,
//     metadata:   metadata || {},
//     occurredAt: new Date().toISOString(),
//   });
//   _br.storage.local.set({ eventQueue: eventQueue });
//   if (eventQueue.length >= MAX_QUEUE_SIZE) flushEvents();
// }

// // ── HTTP batch flush ──────────────────────────────────────────────────────
// async function flushEvents() {
//   if (isFlushRunning || eventQueue.length === 0) return;
//   isFlushRunning = true;

//   var toSend = eventQueue.slice();
//   eventQueue  = [];
//   _br.storage.local.set({ eventQueue: [] });

//   try {
//     var res = await fetch(BACKEND_URL + '/proctoring/events/batch', {
//       method:  'POST',
//       headers: {
//         'Content-Type':  'application/json',
//         'Authorization': 'Bearer ' + state.sessionId,
//       },
//       body: JSON.stringify({ events: toSend }),
//     });
//     if (!res.ok) {
//       // Put failed events back
//       eventQueue = toSend.concat(eventQueue);
//       _br.storage.local.set({ eventQueue: eventQueue });
//     }
//   } catch (_) {
//     // Network error — retry next flush
//     eventQueue = toSend.concat(eventQueue);
//     _br.storage.local.set({ eventQueue: eventQueue });
//   }

//   isFlushRunning = false;
// }

// // ── Alarm-based flush (survives SW sleep) ────────────────────────────────
// function scheduleFlush() {
//   if (flushAlarmSet) return;
//   flushAlarmSet = true;
//   _br.alarms.create('px-flush', { periodInMinutes: FLUSH_INTERVAL_SECS / 60 });
// }

// function stopFlush() {
//   flushAlarmSet = false;
//   _br.alarms.clear('px-flush');
// }

// _br.alarms.onAlarm.addListener(function (alarm) {
//   if (alarm.name === 'px-flush') flushEvents();
// });

// // ── Close all tabs EXCEPT the exam tab ────────────────────────────────────
// async function closeOtherTabs(examTabId) {
//   if (!examTabId) return;
//   try {
//     var allTabs = await _br.tabs.query({});
//     var toClose = allTabs
//       .filter(function (t) { return t.id !== examTabId && !t.pinned; })
//       .map(function (t) { return t.id; });
//     if (toClose.length > 0) await _br.tabs.remove(toClose);
//   } catch (_) {}
// }

// // ── Force user back to exam tab + close the stray tab ────────────────────
// async function enforceExamTab(strayTabId) {
//   if (!state.active || !state.examTabId) return;
//   try {
//     // Record the violation
//     queueEvent('tab_switch', { strayTabId: strayTabId });

//     // Close the stray tab immediately (not just switch — CLOSE it)
//     if (strayTabId && strayTabId !== state.examTabId) {
//       await _br.tabs.remove(strayTabId);
//     }

//     // Focus exam tab
//     await _br.tabs.update(state.examTabId, { active: true });

//     // Tell content script to show warning
//     _br.tabs.sendMessage(state.examTabId, { type: 'SHOW_TAB_WARNING' });
//   } catch (_) {}
// }

// // ── Tab activated listener ────────────────────────────────────────────────
// // This fires for EVERY tab switch including the very first one
// _br.tabs.onActivated.addListener(function (activeInfo) {
//   if (!state.active) return;
//   if (!state.examTabId) return;
//   if (activeInfo.tabId === state.examTabId) return; // came back to exam — fine

//   // Any other tab = violation, close it and force back
//   enforceExamTab(activeInfo.tabId);
// });

// // ── New tab created during exam — close it immediately ───────────────────
// _br.tabs.onCreated.addListener(function (tab) {
//   if (!state.active) return;
//   if (tab.id === state.examTabId) return;
//   // New tab created during exam — close it
//   setTimeout(function () {
//     _br.tabs.remove(tab.id).catch(function () {});
//     if (state.examTabId) {
//       _br.tabs.update(state.examTabId, { active: true }).catch(function () {});
//       _br.tabs.sendMessage(state.examTabId, { type: 'SHOW_TAB_WARNING' }).catch(function () {});
//     }
//   }, 100);
// });

// // ── Message handler ───────────────────────────────────────────────────────
// _br.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
//   (async function () {
//     switch (msg.type) {

//       case 'START_PROCTORING': {
//         var examTabId = (sender.tab && sender.tab.id) ? sender.tab.id : (msg.examTabId || null);
//         state = {
//           active:    true,
//           attemptId: msg.attemptId,
//           sessionId: msg.sessionId,
//           examTabId: examTabId,
//         };
//         await _br.storage.local.set(state);

//         // Recover any unsent events from storage
//         var stored = await _br.storage.local.get(['eventQueue']);
//         if (stored.eventQueue && stored.eventQueue.length) {
//           eventQueue = stored.eventQueue.concat(eventQueue);
//         }

//         // Close ALL other tabs immediately when exam starts
//         await closeOtherTabs(examTabId);

//         queueEvent('exam_started', { timestamp: new Date().toISOString() });
//         scheduleFlush();
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'STOP_PROCTORING': {
//         queueEvent('exam_ended', { timestamp: new Date().toISOString() });
//         await flushEvents();
//         stopFlush();
//         state = { active: false, attemptId: null, sessionId: null, examTabId: null };
//         eventQueue = [];
//         await _br.storage.local.remove(['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue']);
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'PROCTOR_EVENT': {
//         queueEvent(msg.eventType, msg.metadata || {});
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'GET_STATE': {
//         sendResponse({ state: state, queueLength: eventQueue.length });
//         break;
//       }

//       case 'FLUSH_NOW': {
//         await flushEvents();
//         sendResponse({ ok: true });
//         break;
//       }
//     }
//   })();
//   return true; // keep channel open for async
// });

// // ── Restore state on SW restart ───────────────────────────────────────────
// _br.storage.local.get(
//   ['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue'],
//   function (data) {
//     if (data.active && data.attemptId && data.sessionId) {
//       state = {
//         active:    true,
//         attemptId: data.attemptId,
//         sessionId: data.sessionId,
//         examTabId: data.examTabId || null,
//       };
//       eventQueue = data.eventQueue || [];
//       scheduleFlush();
//     }
//   }
// );


// // background.js — Proctorix v6.0
// // Chrome MV3 + Firefox MV2 compatible via _br abstraction

// var _br = (typeof browser !== 'undefined') ? browser : chrome;

// var BACKEND_URL         = 'http://localhost:3000';
// var FLUSH_INTERVAL_SECS = 5;
// var MAX_QUEUE_SIZE      = 50;

// // ── State ──────────────────────────────────────────────────────────────────
// var state = {
//   active:    false,
//   attemptId: null,
//   sessionId: null,
//   examTabId: null,
// };

// var eventQueue     = [];
// var isFlushRunning = false;
// var flushAlarmSet  = false;

// // Global incident counter — kept in sync with content.js
// // Background owns the tab_switch incidents; content.js owns blur/fullscreen
// var globalIncidentCount = 0;

// // ── Queue event for backend ────────────────────────────────────────────────
// function queueEvent(eventType, metadata) {
//   if (!state.active || !state.attemptId) return;
//   eventQueue.push({
//     attemptId:  state.attemptId,
//     sessionId:  state.sessionId,
//     eventType:  eventType,
//     metadata:   metadata || {},
//     occurredAt: new Date().toISOString(),
//   });
//   _br.storage.local.set({ eventQueue: eventQueue });
//   if (eventQueue.length >= MAX_QUEUE_SIZE) flushEvents();
// }

// // ── HTTP batch flush ───────────────────────────────────────────────────────
// async function flushEvents() {
//   if (isFlushRunning || eventQueue.length === 0) return;
//   isFlushRunning = true;
//   var toSend = eventQueue.slice();
//   eventQueue = [];
//   _br.storage.local.set({ eventQueue: [] });
//   try {
//     var res = await fetch(BACKEND_URL + '/proctoring/events/batch', {
//       method: 'POST',
//       headers: {
//         'Content-Type':  'application/json',
//         'Authorization': 'Bearer ' + state.sessionId,
//       },
//       body: JSON.stringify({ events: toSend }),
//     });
//     if (!res.ok) {
//       eventQueue = toSend.concat(eventQueue);
//       _br.storage.local.set({ eventQueue: eventQueue });
//     }
//   } catch (_) {
//     eventQueue = toSend.concat(eventQueue);
//     _br.storage.local.set({ eventQueue: eventQueue });
//   }
//   isFlushRunning = false;
// }

// // ── Alarm flush ────────────────────────────────────────────────────────────
// function scheduleFlush() {
//   if (flushAlarmSet) return;
//   flushAlarmSet = true;
//   _br.alarms.create('px-flush', { periodInMinutes: FLUSH_INTERVAL_SECS / 60 });
// }
// function stopFlush() {
//   flushAlarmSet = false;
//   _br.alarms.clear('px-flush');
// }
// _br.alarms.onAlarm.addListener(function (alarm) {
//   if (alarm.name === 'px-flush') flushEvents();
// });

// // ── Close all other tabs ───────────────────────────────────────────────────
// async function closeOtherTabs(examTabId) {
//   if (!examTabId) return;
//   try {
//     var all = await _br.tabs.query({});
//     var toClose = all
//       .filter(function (t) { return t.id !== examTabId && !t.pinned; })
//       .map(function (t) { return t.id; });
//     if (toClose.length > 0) await _br.tabs.remove(toClose);
//   } catch (_) {}
// }

// // ── Enforce exam tab — close stray, force back, warn ──────────────────────
// // tabSwitchCount: current count to send to content for display sync
// async function enforceExamTab(strayTabId) {
//   if (!state.active || !state.examTabId) return;
//   globalIncidentCount++;
//   queueEvent('tab_switch', { strayTabId: strayTabId, globalIncident: globalIncidentCount });
//   try {
//     if (strayTabId && strayTabId !== state.examTabId) {
//       await _br.tabs.remove(strayTabId);
//     }
//     await _br.tabs.update(state.examTabId, { active: true });
//     // Send warning to content — content will show overlay and update display
//     _br.tabs.sendMessage(state.examTabId, {
//       type: 'SHOW_TAB_WARNING',
//       globalIncidentCount: globalIncidentCount,
//     }).catch(function () {});
//   } catch (_) {}
// }

// // ── Tab activated listener ─────────────────────────────────────────────────
// // Fires for EVERY tab switch — first one included
// _br.tabs.onActivated.addListener(function (activeInfo) {
//   if (!state.active) return;
//   if (!state.examTabId) return;
//   if (activeInfo.tabId === state.examTabId) return;
//   enforceExamTab(activeInfo.tabId);
// });

// // ── New tab created during exam — close immediately ───────────────────────
// _br.tabs.onCreated.addListener(function (tab) {
//   if (!state.active) return;
//   if (tab.id === state.examTabId) return;
//   setTimeout(function () {
//     _br.tabs.remove(tab.id).catch(function () {});
//     if (state.examTabId) {
//       _br.tabs.update(state.examTabId, { active: true }).catch(function () {});
//       _br.tabs.sendMessage(state.examTabId, {
//         type: 'SHOW_TAB_WARNING',
//         globalIncidentCount: globalIncidentCount,
//       }).catch(function () {});
//     }
//   }, 80);
// });

// // ── Message handler ────────────────────────────────────────────────────────
// _br.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
//   (async function () {
//     switch (msg.type) {

//       case 'START_PROCTORING': {
//         var examTabId = (sender.tab && sender.tab.id)
//           ? sender.tab.id
//           : (msg.examTabId || null);

//         state = {
//           active:    true,
//           attemptId: msg.attemptId,
//           sessionId: msg.sessionId,
//           examTabId: examTabId,
//         };
//         globalIncidentCount = 0;
//         await _br.storage.local.set(state);

//         // Recover queued events from storage (page may have reloaded)
//         var stored = await _br.storage.local.get(['eventQueue']);
//         if (stored.eventQueue && stored.eventQueue.length) {
//           eventQueue = stored.eventQueue.concat(eventQueue);
//         }

//         await closeOtherTabs(examTabId);
//         queueEvent('exam_started', { timestamp: new Date().toISOString() });
//         scheduleFlush();
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'STOP_PROCTORING': {
//         queueEvent('exam_ended', { timestamp: new Date().toISOString() });
//         await flushEvents();
//         stopFlush();
//         state = { active: false, attemptId: null, sessionId: null, examTabId: null };
//         globalIncidentCount = 0;
//         eventQueue = [];
//         await _br.storage.local.remove(['active','attemptId','sessionId','examTabId','eventQueue']);
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'PROCTOR_EVENT': {
//         queueEvent(msg.eventType, msg.metadata || {});
//         sendResponse({ ok: true });
//         break;
//       }

//       case 'GET_STATE': {
//         // Used by content.js on page reload to restore proctoring state
//         sendResponse({ state: state, globalIncidentCount: globalIncidentCount });
//         break;
//       }

//       case 'FLUSH_NOW': {
//         await flushEvents();
//         sendResponse({ ok: true });
//         break;
//       }
//     }
//   })();
//   return true;
// });

// // ── Restore on SW restart ──────────────────────────────────────────────────
// _br.storage.local.get(
//   ['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue'],
//   function (data) {
//     if (data.active && data.attemptId && data.sessionId) {
//       state = {
//         active:    true,
//         attemptId: data.attemptId,
//         sessionId: data.sessionId,
//         examTabId: data.examTabId || null,
//       };
//       eventQueue = data.eventQueue || [];
//       scheduleFlush();
//     }
//   }
// );























// background.js — Proctorix v7.0
// Chrome MV3 + Firefox MV2 compatible

var _br = (typeof browser !== 'undefined') ? browser : chrome;

var BACKEND_URL         = 'http://localhost:3000';
var FLUSH_INTERVAL_SECS = 5;
var MAX_QUEUE_SIZE      = 50;

// ── State ──────────────────────────────────────────────────────────────────
var state = {
  active:    false,
  attemptId: null,
  sessionId: null,
  examTabId: null,
};

var eventQueue     = [];
var isFlushRunning = false;
var flushAlarmSet  = false;

// Global incident counter — background owns tab_switch incidents
// content.js owns blur + fullscreen incidents
// Both sync via messages
var globalIncidentCount = 0;

// ── Deduplication for tab switch ──────────────────────────────────────────
// Prevents onActivated + onCreated both sending SHOW_TAB_WARNING for 1 action
var tabSwitchLock      = false;
var TAB_SWITCH_LOCK_MS = 600;

// ── Queue event ────────────────────────────────────────────────────────────
function queueEvent(eventType, metadata) {
  if (!state.active || !state.attemptId) return;
  eventQueue.push({
    attemptId:  state.attemptId,
    sessionId:  state.sessionId,
    eventType:  eventType,
    metadata:   metadata || {},
    occurredAt: new Date().toISOString(),
  });
  _br.storage.local.set({ eventQueue: eventQueue });
  if (eventQueue.length >= MAX_QUEUE_SIZE) flushEvents();
}

// ── HTTP batch flush ───────────────────────────────────────────────────────
async function flushEvents() {
  if (isFlushRunning || eventQueue.length === 0) return;
  isFlushRunning = true;
  var toSend = eventQueue.slice();
  eventQueue = [];
  _br.storage.local.set({ eventQueue: [] });
  try {
    var res = await fetch(BACKEND_URL + '/proctoring/events/batch', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + state.sessionId,
      },
      body: JSON.stringify({ events: toSend }),
    });
    if (!res.ok) {
      eventQueue = toSend.concat(eventQueue);
      _br.storage.local.set({ eventQueue: eventQueue });
    }
  } catch (_) {
    eventQueue = toSend.concat(eventQueue);
    _br.storage.local.set({ eventQueue: eventQueue });
  }
  isFlushRunning = false;
}

function scheduleFlush() {
  if (flushAlarmSet) return;
  flushAlarmSet = true;
  _br.alarms.create('px-flush', { periodInMinutes: FLUSH_INTERVAL_SECS / 60 });
}
function stopFlush() {
  flushAlarmSet = false;
  _br.alarms.clear('px-flush');
}
_br.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'px-flush') flushEvents();
});

// ── Close all other tabs ───────────────────────────────────────────────────
async function closeOtherTabs(examTabId) {
  if (!examTabId) return;
  try {
    var all = await _br.tabs.query({});
    var toClose = all
      .filter(function (t) { return t.id !== examTabId && !t.pinned; })
      .map(function (t) { return t.id; });
    if (toClose.length > 0) await _br.tabs.remove(toClose);
  } catch (_) {}
}

// ── Handle a tab switch violation ─────────────────────────────────────────
// Uses a lock to ensure ONLY ONE SHOW_TAB_WARNING is sent per incident
// regardless of whether onActivated and onCreated both fire
async function handleTabViolation(strayTabId, source) {
  if (!state.active || !state.examTabId) return;

  // Deduplicate — if already handling a tab violation, skip
  if (tabSwitchLock) return;
  tabSwitchLock = true;
  setTimeout(function () { tabSwitchLock = false; }, TAB_SWITCH_LOCK_MS);

  // Increment global incident count (background owns tab_switch incidents)
  globalIncidentCount++;
  queueEvent('tab_switch', {
    strayTabId: strayTabId,
    source: source,
    globalIncident: globalIncidentCount,
  });

  try {
    // Close the stray tab
    if (strayTabId && strayTabId !== state.examTabId) {
      await _br.tabs.remove(strayTabId);
    }
    // Bring exam tab back to front
    await _br.tabs.update(state.examTabId, { active: true });
    // Send EXACTLY ONE warning to content script
    _br.tabs.sendMessage(state.examTabId, {
      type: 'SHOW_TAB_WARNING',
      globalIncidentCount: globalIncidentCount,
    }).catch(function () {});
  } catch (_) {}
}

// ── Tab activated ──────────────────────────────────────────────────────────
_br.tabs.onActivated.addListener(function (activeInfo) {
  if (!state.active || !state.examTabId) return;
  if (activeInfo.tabId === state.examTabId) return;
  handleTabViolation(activeInfo.tabId, 'onActivated');
});

// ── New tab created ────────────────────────────────────────────────────────
_br.tabs.onCreated.addListener(function (tab) {
  if (!state.active) return;
  if (tab.id === state.examTabId) return;
  setTimeout(function () {
    handleTabViolation(tab.id, 'onCreated');
  }, 80);
});

// ── Message handler ────────────────────────────────────────────────────────
_br.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    switch (msg.type) {

      case 'START_PROCTORING': {
        var examTabId = (sender.tab && sender.tab.id)
          ? sender.tab.id
          : (msg.examTabId || null);
        state = {
          active:    true,
          attemptId: msg.attemptId,
          sessionId: msg.sessionId,
          examTabId: examTabId,
        };
        // Reset incident counter for fresh exam start
        // (not on reload — reload uses GET_STATE which returns existing count)
        globalIncidentCount = 0;
        await _br.storage.local.set(state);

        var stored = await _br.storage.local.get(['eventQueue']);
        if (stored.eventQueue && stored.eventQueue.length) {
          eventQueue = stored.eventQueue.concat(eventQueue);
        }

        await closeOtherTabs(examTabId);
        queueEvent('exam_started', { timestamp: new Date().toISOString() });
        scheduleFlush();
        sendResponse({ ok: true });
        break;
      }

      case 'STOP_PROCTORING': {
        queueEvent('exam_ended', { timestamp: new Date().toISOString() });
        await flushEvents();
        stopFlush();
        state = { active: false, attemptId: null, sessionId: null, examTabId: null };
        globalIncidentCount = 0;
        eventQueue = [];
        await _br.storage.local.remove(['active','attemptId','sessionId','examTabId','eventQueue','px_counts']);
        sendResponse({ ok: true });
        break;
      }

      case 'PROCTOR_EVENT': {
        // Content.js sends these for blur, fullscreen, copy etc.
        // Also sync globalIncidentCount if content sends it
        if (msg.metadata && typeof msg.metadata.globalTotal === 'number') {
          // Content manages its own incidents — keep the higher value
          if (msg.metadata.globalTotal > globalIncidentCount) {
            globalIncidentCount = msg.metadata.globalTotal;
          }
        }
        queueEvent(msg.eventType, msg.metadata || {});
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        // Content.js calls this on page reload to restore state
        sendResponse({
          state: state,
          globalIncidentCount: globalIncidentCount,
        });
        break;
      }

      case 'FLUSH_NOW': {
        await flushEvents();
        sendResponse({ ok: true });
        break;
      }
    }
  })();
  return true;
});

// ── Restore on SW restart ──────────────────────────────────────────────────
_br.storage.local.get(
  ['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue'],
  function (data) {
    if (data.active && data.attemptId && data.sessionId) {
      state = {
        active:    true,
        attemptId: data.attemptId,
        sessionId: data.sessionId,
        examTabId: data.examTabId || null,
      };
      eventQueue = data.eventQueue || [];
      scheduleFlush();
    }
  }
);