// Survey invitation and modal functionality

const inlineOpenInvite =
  typeof window !== "undefined" && typeof window.openInvite === "function"
    ? window.openInvite
    : null;

export function openInvite(candidateToken = "", nudgeRound = 0) {
  if (typeof inlineOpenInvite === "function") {
    return inlineOpenInvite(candidateToken, nudgeRound);
  }
}

export function pushTaskRow(task) {
  console.log('pushTaskRow:', task);
}

export function showATSWebhook() {
  const panel = document.getElementById('ats-panel');
  if (panel) panel.hidden = false;
}
