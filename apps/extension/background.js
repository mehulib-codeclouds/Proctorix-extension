// background.js — service worker (MV3)
// Uses browser.* API (polyfilled for Chrome)
// Events are queued locally and flushed in batches via HTTP POST
// This is far more scalable than WebSocket for mass exams

const BACKEND_URL = 'http://localhost:3000'; // change for production
const FLUSH_INTERVAL_SECONDS = 5;            // flush every 5 seconds
const MAX_QUEUE_SIZE = 50;                   // flush immediately if queue hits this

let proctoringState = {
  active: false,
  attemptId: null,
  sessionId: null,
};

let eventQueue = [];
let isFlushScheduled = false;

// ─── Queue an event locally ───────────────────────────────────────────────
function queueEvent(eventType, metadata = {}) {
  if (!proctoringState.active || !proctoringState.attemptId) return;

  eventQueue.push({
    attemptId: proctoringState.attemptId,
    sessionId: proctoringState.sessionId,
    eventType,
    metadata,
    occurredAt: new Date().toISOString(),
  });

  // Save queue to storage so it survives service worker sleep
  browser.storage.local.set({ eventQueue });

  // Flush immediately if queue is getting large
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
}

// ─── Flush queued events to backend via HTTP POST ────────────────────────
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
      // Put failed events back at front of queue to retry
      eventQueue = [...toSend, ...eventQueue];
      browser.storage.local.set({ eventQueue });
      console.warn('[Proctorix] Batch flush failed, will retry:', response.status);
    }
  } catch (err) {
    // Network error — put events back to retry next flush
    eventQueue = [...toSend, ...eventQueue];
    browser.storage.local.set({ eventQueue });
    console.warn('[Proctorix] Batch flush network error, will retry:', err.message);
  }
}

// ─── Schedule periodic flush using chrome.alarms (survives SW sleep) ─────
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

// ─── Close all other tabs when exam starts ────────────────────────────────
async function closeOtherTabs(examTabId) {
  const allTabs = await browser.tabs.query({});
  const tabsToClose = allTabs
    .filter(tab => tab.id !== examTabId && !tab.pinned)
    .map(tab => tab.id);

  if (tabsToClose.length > 0) {
    await browser.tabs.remove(tabsToClose);
  }
}

// ─── Message handler ──────────────────────────────────────────────────────
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

        // Close all other tabs immediately
        if (proctoringState.examTabId) {
          await closeOtherTabs(proctoringState.examTabId);
        }

        // Restore any unsent events from storage (service worker may have slept)
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
        // Flush immediately on exam end — don't wait for next interval
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
  return true; // keep channel open for async
});

// ─── Block tab switching during exam ─────────────────────────────────────
// If user tries to switch to another tab, immediately switch back
browser.tabs.onActivated.addListener(async (activeInfo) => {
  if (!proctoringState.active) return;
  if (!proctoringState.examTabId) return;

  if (activeInfo.tabId !== proctoringState.examTabId) {
    // They switched away — record it and force back
    queueEvent('tab_switch', { toTabId: activeInfo.tabId });

    // Switch back to exam tab
    await browser.tabs.update(proctoringState.examTabId, { active: true });

    // Tell the exam tab's content script to show warning
    browser.tabs.sendMessage(proctoringState.examTabId, {
      type: 'SHOW_TAB_WARNING',
    });
  }
});

// ─── Restore state on service worker restart ─────────────────────────────
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