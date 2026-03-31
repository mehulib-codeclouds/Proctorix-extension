// background.js — service worker
// Holds the WebSocket connection and relays events from content.js to backend

let socket = null;
let proctoringState = {
  active: false,
  attemptId: null,
  sessionId: null,
};

const BACKEND_WS = 'ws://localhost:3000/proctoring'; // change for production

function connectSocket(sessionId) {
  if (socket?.connected) return;

  // Dynamically import socket.io-client via CDN isn't possible in SW
  // Instead we use native WebSocket with a simple JSON protocol
  socket = new WebSocket(`${BACKEND_WS}?sessionId=${sessionId}`);

  socket.onopen = () => {
    broadcastToPopup({ type: 'SOCKET_STATUS', connected: true });
  };

  socket.onclose = () => {
    broadcastToPopup({ type: 'SOCKET_STATUS', connected: false });
    // Reconnect after 3s if still proctoring
    if (proctoringState.active) {
      setTimeout(() => connectSocket(proctoringState.sessionId), 3000);
    }
  };

  socket.onerror = () => {
    broadcastToPopup({ type: 'SOCKET_STATUS', connected: false });
  };
}

function sendEvent(eventType, metadata = {}) {
  if (!proctoringState.active || !proctoringState.attemptId) return;
  const payload = JSON.stringify({
    type: 'proctor_event',
    data: {
      attemptId: proctoringState.attemptId,
      sessionId: proctoringState.sessionId,
      eventType,
      metadata,
      occurredAt: new Date().toISOString(),
    },
  });
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
  }
}

function broadcastToPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {}); // popup may not be open
}

// Messages from content.js and popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'START_PROCTORING': {
      proctoringState = {
        active: true,
        attemptId: msg.attemptId,
        sessionId: msg.sessionId,
      };
      chrome.storage.local.set(proctoringState);
      connectSocket(msg.sessionId);
      sendEvent('exam_started');
      sendResponse({ ok: true });
      break;
    }
    case 'STOP_PROCTORING': {
      sendEvent('exam_ended');
      proctoringState.active = false;
      chrome.storage.local.remove(['active', 'attemptId', 'sessionId']);
      socket?.close();
      socket = null;
      sendResponse({ ok: true });
      break;
    }
    case 'PROCTOR_EVENT': {
      sendEvent(msg.eventType, msg.metadata ?? {});
      sendResponse({ ok: true });
      break;
    }
    case 'GET_STATE': {
      sendResponse(proctoringState);
      break;
    }
  }
  return true; // keep channel open for async sendResponse
});

// Restore state on service worker restart
chrome.storage.local.get(['active', 'attemptId', 'sessionId'], (data) => {
  if (data.active && data.attemptId && data.sessionId) {
    proctoringState = { active: true, attemptId: data.attemptId, sessionId: data.sessionId };
    connectSocket(data.sessionId);
  }
});