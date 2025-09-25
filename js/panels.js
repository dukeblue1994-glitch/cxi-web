// Panel open/close, inactivity, persistence
const PANEL_STATE_KEY = 'cxi_panel_state_v2';
const panelState = loadPanelState();
const inactivityTimers = { ats: null, tasks: null };
const INACTIVITY_MS = 15000;

function loadPanelState() {
  try {
    return JSON.parse(localStorage.getItem(PANEL_STATE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function savePanelState(st) {
  try {
    localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(st));
  } catch (e) {
    /* ignore */
  }
}
function getEls() {
  return {
    atsPanel: document.getElementById('ats-panel'),
    taskDrawer: document.getElementById('task-drawer'),
    chipAts: document.getElementById('toggle-ats'),
    chipTasks: document.getElementById('toggle-tasks'),
  };
}
function showChip(which) {
  const { chipAts, chipTasks } = getEls();
  if (which === 'ats' && chipAts) chipAts.hidden = false;
  if (which === 'tasks' && chipTasks) chipTasks.hidden = false;
}
function hideChip(which) {
  const { chipAts, chipTasks } = getEls();
  if (which === 'ats' && chipAts) chipAts.hidden = true;
  if (which === 'tasks' && chipTasks) chipTasks.hidden = true;
}
export function openPanel(which) {
  const { atsPanel, taskDrawer, chipAts, chipTasks } = getEls();
  const el = which === 'ats' ? atsPanel : taskDrawer;
  const chip = which === 'ats' ? chipAts : chipTasks;
  if (!el) return;
  el.hidden = false;
  hideChip(which);
  chip?.setAttribute('aria-expanded', 'true');
  panelState[which] = 'open';
  savePanelState(panelState);
  resetInactivity(which);
  animateIn(el, which === 'ats' ? 1 : -1);
}
export function closePanel(which) {
  const { atsPanel, taskDrawer, chipAts, chipTasks } = getEls();
  const el = which === 'ats' ? atsPanel : taskDrawer;
  const chip = which === 'ats' ? chipAts : chipTasks;
  if (!el || el.hidden) return;
  animateOut(el, which === 'ats' ? 1 : -1, () => {
    el.hidden = true;
    showChip(which);
    chip?.setAttribute('aria-expanded', 'false');
    panelState[which] = 'closed';
    savePanelState(panelState);
  });
}
function animateIn(el, dir = 1) {
  el.style.opacity = '0';
  el.style.transform = `translate(${dir * 8}px,0)`;
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .22s ease, transform .28s ease';
    el.style.opacity = '1';
    el.style.transform = 'translate(0,0)';
  });
}
function animateOut(el, dir = 1, cb) {
  el.style.transition = 'opacity .18s ease, transform .24s ease';
  el.style.opacity = '0';
  el.style.transform = `translate(${dir * 8}px,4px)`;
  setTimeout(cb, 240);
}
function resetInactivity(which) {
  if (!which) return;
  clearTimeout(inactivityTimers[which]);
  inactivityTimers[which] = setTimeout(() => closePanel(which), INACTIVITY_MS);
}
function bumpAll() {
  const { atsPanel, taskDrawer } = getEls();
  if (atsPanel && !atsPanel.hidden) resetInactivity('ats');
  if (taskDrawer && !taskDrawer.hidden) resetInactivity('tasks');
}
['mousemove', 'keydown', 'click', 'touchstart'].forEach(ev =>
  document.addEventListener(ev, bumpAll, { passive: true })
);
export function restorePanels() {
  if (panelState.ats === 'open') openPanel('ats');
  else showChip('ats');
  if (panelState.tasks === 'open') openPanel('tasks');
  else showChip('tasks');
  bumpAll();
  const { chipAts, chipTasks } = getEls();
  chipAts?.addEventListener('click', () => openPanel('ats'));
  chipTasks?.addEventListener('click', () => openPanel('tasks'));
  document.getElementById('close-ats')?.addEventListener('click', () => closePanel('ats'));
  document.getElementById('close-tasks')?.addEventListener('click', () => closePanel('tasks'));
  document.addEventListener('mousedown', e => {
    const { atsPanel, taskDrawer } = getEls();
    if (
      atsPanel &&
      !atsPanel.hidden &&
      !atsPanel.contains(e.target) &&
      e.target !== document.getElementById('toggle-ats')
    )
      closePanel('ats');
    if (
      taskDrawer &&
      !taskDrawer.hidden &&
      !taskDrawer.contains(e.target) &&
      e.target !== document.getElementById('toggle-tasks')
    )
      closePanel('tasks');
  });
}
