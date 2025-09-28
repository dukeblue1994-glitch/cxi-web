// Survey invitation and modal functionality

export function openInvite(candidateToken = '', nudgeRound = 0) {
  // This function is implemented inline in index.html
  // Keeping this as a stub for module compatibility
  if (window.openInvite && typeof window.openInvite === 'function') {
    return window.openInvite(candidateToken, nudgeRound);
  }
}

export function pushTaskRow(task) {
  console.log('pushTaskRow:', task);
}

export function showATSWebhook() {
  const panel = document.getElementById('ats-panel');
  if (panel) panel.hidden = false;
}
