const BACKEND_URL = 'http://localhost:3000'; 
const FLUSH_INTERVAL_SECONDS = 5;            
const MAX_QUEUE_SIZE = 50;                   

let proctoringState = {
  active: false,
  attemptId: null,
  sessionId: null,
};

let eventQueue = [];
let isFlushScheduled = false;

function queueEvent(eventType, metadata = {}) {
  if (!proctoringState.active || !proctoringState.attemptId) return;

  eventQueue.push({
    attemptId: proctoringState.attemptId,
    sessionId: proctoringState.sessionId,
    eventType,
    metadata,
    occurredAt: new Date().toISOString(),
  });

  browser.storage.local.set({ eventQueue });

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
}

async function flushEvents() {
  if (eventQueue.length === 0) return;

  const toSend = [...eventQueue];
  eventQueue = [];
  browser.storage.local.set({ eventQueue: [] });

  try {
    const response = await fetch(`${BACKEND_URL}/proctoring/events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${proctoringState.sessionId}`,
      },
      body: JSON.stringify({ events: toSend }),
    });

    if (!response.ok) {
      eventQueue = [...toSend, ...eventQueue];
      browser.storage.local.set({ eventQueue });
      console.warn('[Proctorix] Batch flush failed, will retry:', response.status);
    }
  } catch (err) {
    eventQueue = [...toSend, ...eventQueue];
    browser.storage.local.set({ eventQueue });
    console.warn('[Proctorix] Batch flush network error, will retry:', err.message);
  }
}

function scheduleFlush() {
  if (isFlushScheduled) return;
  isFlushScheduled = true;
  browser.alarms.create('proctorix-flush', {
    periodInMinutes: FLUSH_INTERVAL_SECONDS / 60,
  });
}

function stopFlush() {
  isFlushScheduled = false;
  browser.alarms.clear('proctorix-flush');
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'proctorix-flush') {
    flushEvents();
  }
});

async function closeOtherTabs(examTabId) {
  const allTabs = await browser.tabs.query({});
  const tabsToClose = allTabs
    .filter(tab => tab.id !== examTabId && !tab.pinned)
    .map(tab => tab.id);

  if (tabsToClose.length > 0) {
    await browser.tabs.remove(tabsToClose);
  }
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'START_PROCTORING': {
        proctoringState = {
          active: true,
          attemptId: msg.attemptId,
          sessionId: msg.sessionId,
          examTabId: sender.tab?.id ?? msg.examTabId ?? null,
        };
        await browser.storage.local.set(proctoringState);

        if (proctoringState.examTabId) {
          await closeOtherTabs(proctoringState.examTabId);
        }

        const stored = await browser.storage.local.get(['eventQueue']);
        if (stored.eventQueue?.length) {
          eventQueue = [...stored.eventQueue, ...eventQueue];
        }

        queueEvent('exam_started', { timestamp: new Date().toISOString() });
        scheduleFlush();
        sendResponse({ ok: true });
        break;
      }

      case 'STOP_PROCTORING': {
        queueEvent('exam_ended', { timestamp: new Date().toISOString() });
        await flushEvents();
        stopFlush();
        proctoringState = { active: false, attemptId: null, sessionId: null };
        eventQueue = [];
        await browser.storage.local.remove(['active', 'attemptId', 'sessionId', 'eventQueue', 'examTabId']);
        sendResponse({ ok: true });
        break;
      }

      case 'PROCTOR_EVENT': {
        queueEvent(msg.eventType, msg.metadata ?? {});
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        sendResponse({ ...proctoringState, queueLength: eventQueue.length });
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


browser.tabs.onActivated.addListener(async (activeInfo) => {
  if (!proctoringState.active) return;
  if (!proctoringState.examTabId) return;

  if (activeInfo.tabId !== proctoringState.examTabId) {
    queueEvent('tab_switch', { toTabId: activeInfo.tabId });

    await browser.tabs.update(proctoringState.examTabId, { active: true });

    browser.tabs.sendMessage(proctoringState.examTabId, {
      type: 'SHOW_TAB_WARNING',
    });
  }
});

browser.storage.local.get(
  ['active', 'attemptId', 'sessionId', 'examTabId', 'eventQueue'],
  (data) => {
    if (data.active && data.attemptId && data.sessionId) {
      proctoringState = {
        active: true,
        attemptId: data.attemptId,
        sessionId: data.sessionId,
        examTabId: data.examTabId ?? null,
      };
      eventQueue = data.eventQueue ?? [];
      scheduleFlush();
    }
  }
);