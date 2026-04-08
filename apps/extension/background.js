// Chrome MV3 + Firefox MV2 compatible

var _br = (typeof browser !== 'undefined') ? browser : chrome;

var BACKEND_URL         = 'http://localhost:3000';
var FLUSH_INTERVAL_SECS = 5;
var MAX_QUEUE_SIZE      = 50;

var state = {
  active:    false,
  attemptId: null,
  sessionId: null,
  examTabId: null,
};

var eventQueue     = [];
var isFlushRunning = false;
var flushAlarmSet  = false;

// tab_switch incidents,blur + fullscreen

var globalIncidentCount = 0;

//Deduplication for tab switch
var tabSwitchLock      = false;
var TAB_SWITCH_LOCK_MS = 600;

// Queue event 
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

//HTTP flush 
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

//Close other tabs 
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

// tab switch violation 
async function handleTabViolation(strayTabId, source) {
  if (!state.active || !state.examTabId) return;

  // Deduplicate ->if already handling a tab violation : skip
  if (tabSwitchLock) return;
  tabSwitchLock = true;
  setTimeout(function () { tabSwitchLock = false; }, TAB_SWITCH_LOCK_MS);

  // global count
  globalIncidentCount++;
  queueEvent('tab_switch', {
    strayTabId: strayTabId,
    source: source,
    globalIncident: globalIncidentCount,
  });

  try {
    // Close the other tab
    if (strayTabId && strayTabId !== state.examTabId) {
      await _br.tabs.remove(strayTabId);
    }
    //exam tab back
    await _br.tabs.update(state.examTabId, { active: true });
    
    _br.tabs.sendMessage(state.examTabId, {
      type: 'SHOW_TAB_WARNING',
      globalIncidentCount: globalIncidentCount,
    }).catch(function () {});
  } catch (_) {}
}

//  Tab activated
_br.tabs.onActivated.addListener(function (activeInfo) {
  if (!state.active || !state.examTabId) return;
  if (activeInfo.tabId === state.examTabId) return;
  handleTabViolation(activeInfo.tabId, 'onActivated');
});

// New tab created 
_br.tabs.onCreated.addListener(function (tab) {
  if (!state.active) return;
  if (tab.id === state.examTabId) return;
  setTimeout(function () {
    handleTabViolation(tab.id, 'onCreated');
  }, 80);
});

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
        // Reset counter for fresh exam start : not on reload  returns existing count
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
        //  blur, fullscreen, copy etc.
        if (msg.metadata && typeof msg.metadata.globalTotal === 'number') {
          if (msg.metadata.globalTotal > globalIncidentCount) {
            globalIncidentCount = msg.metadata.globalTotal;
          }
        }
        queueEvent(msg.eventType, msg.metadata || {});
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        // restore state
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