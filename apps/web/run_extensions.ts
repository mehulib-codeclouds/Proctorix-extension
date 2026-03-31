// In your exam page component
function startExam(attemptId: string, sessionId: string) {
  // 1. Tell the extension via postMessage (content.js relays to background)
  window.postMessage({ type: 'PROCTORIX_START' }, '*');

  // 2. Tell the background worker the IDs (via extension messaging if same origin)
  //    OR the exam page sends this itself if it knows the extension ID
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage(
      'YOUR_EXTENSION_ID', // hardcode or put in env
      { type: 'START_PROCTORING', attemptId, sessionId }
    );
  }
}