window.postMessage({ type: 'PROCTORIX_START' }, '*');
if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
  // Redirect to a "desktop required" page
  window.location.href = '/desktop-required';
}