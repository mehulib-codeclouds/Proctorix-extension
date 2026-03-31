// popup.js — runs in the extension popup

const root = document.getElementById('root');

function render(state, socketConnected, eventCounts) {
  if (!state?.active) {
    root.innerHTML = `<div class="idle">No active exam session.<br><br>Start an exam to begin proctoring.</div>`;
    return;
  }

  const events = Object.entries(eventCounts ?? {});
  root.innerHTML = `
    <div class="status-row">
      <div class="dot ${socketConnected ? 'active' : 'warn'}"></div>
      <span>${socketConnected ? 'Connected — proctoring active' : 'Reconnecting...'}</span>
    </div>
    <div class="info">Attempt: ${state.attemptId?.slice(0, 18)}…</div>
    <button class="btn btn-stop" id="stop-btn">End proctoring session</button>
    ${events.length ? `
    <div class="events">
      <div class="events-title">Events recorded</div>
      ${events.map(([type, count]) => `
        <div class="event-row">
          <span>${type.replace(/_/g, ' ')}</span>
          <span class="count">${count}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;

  document.getElementById('stop-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_PROCTORING' }, () => render(null));
  });
}

// Get current state from background
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  // Retrieve event counts from storage
  chrome.storage.local.get(['eventCounts'], (data) => {
    render(state, false, data.eventCounts ?? {});
  });
});

// Listen for live updates while popup is open
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SOCKET_STATUS') {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
      chrome.storage.local.get(['eventCounts'], (data) => {
        render(state, msg.connected, data.eventCounts ?? {});
      });
    });
  }
});