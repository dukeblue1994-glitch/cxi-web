import { seededIndex, track } from './utils.js';

const COPIES_LI = [
  [
    'Likes don’t buy lattes. We do.',
    'Trade 90 seconds for a $5 eGift. Two quick prompts—kept private.',
  ],
  [
    'Ranting on LinkedIn pays $0. This pays $5.',
    'Tell us what worked and what didn’t (90s). Coffee’s on us.',
  ],
  [
    'Skip the post. Get the coffee.',
    'Two prompts → $5 thank‑you. Your notes route to the right owner.',
  ],
];
const COPIES_STD = [
  [
    '90 seconds for a $5 latte. That’s the deal.',
    'One thing we nailed, one we need to fix. Kept private.',
  ],
  ['Your truth, our treat.', 'Candid notes, kept private → $5 eGift after submit.'],
  ['Tell it straight. We’ll caffeinate.', 'Two quick prompts (90s). Coffee on us.'],
];
const urlCXI = new URL(window.location.href);
const hintedLI =
  ['li', 'linkedin'].includes((urlCXI.searchParams.get('src') || '').toLowerCase()) ||
  (document.referrer || '').toLowerCase().includes('linkedin.com');

function pickCopy(candidateToken = null, li = false, nudgeRound = 0) {
  const bank = li ? COPIES_LI : COPIES_STD;
  const baseIdx = candidateToken
    ? seededIndex(candidateToken, bank.length)
    : Math.floor(Math.random() * bank.length);
  const idx = (baseIdx + (nudgeRound || 0)) % bank.length;
  const [h, s] = bank[idx];
  const variantKey = `${li ? 'li' : 'std'}-${idx}`;
  return { h, s, idx, bank: li ? 'li' : 'std', variantKey };
}

const CXI_NUDGE_KEY = 'cxi_invite_nudge';
function getNudgeState() {
  try {
    return JSON.parse(localStorage.getItem(CXI_NUDGE_KEY)) || { count: 0, nextAt: 0 };
  } catch {
    return { count: 0, nextAt: 0 };
  }
}
function scheduleNudge(hours) {
  const now = Date.now();
  const st = getNudgeState();
  localStorage.setItem(
    CXI_NUDGE_KEY,
    JSON.stringify({ count: st.count, nextAt: now + hours * 3600 * 1000 })
  );
}
function incrementNudgeCount() {
  const st = getNudgeState();
  localStorage.setItem(
    CXI_NUDGE_KEY,
    JSON.stringify({ count: Math.min(st.count + 1, 3), nextAt: 0 })
  );
}
function shouldShowNudgeNow() {
  const st = getNudgeState();
  return st.count < 3 && Date.now() >= (st.nextAt || 0) && st.nextAt !== 0;
}

const $bd = document.getElementById('cxi-invite-backdrop');
const $headline = document.getElementById('cxi-invite-headline');
const $sub = document.getElementById('cxi-invite-sub');

export function openInvite(candidateToken = null, nudgeRound = 0) {
  const picked = pickCopy(candidateToken, hintedLI, nudgeRound);
  window.__cxiVariantKey = picked.variantKey;
  $headline.textContent = picked.h;
  $sub.textContent = picked.s;
  $bd.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  const focusable = Array.from(
    $bd.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first) first.focus();
  function trap(e) {
    if (e.key === 'Escape') closeInvite();
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  $bd.addEventListener('keydown', trap);
  $bd.__trapHandler = trap;
  track('view', { bank: picked.bank, idx: picked.idx, nudgeRound });
}
export function closeInvite() {
  $bd.style.display = 'none';
  document.body.style.overflow = '';
  if ($bd.__trapHandler) $bd.removeEventListener('keydown', $bd.__trapHandler);
}
window.openInvite = openInvite;

// Button wiring
document.getElementById('cxi-close-x')?.addEventListener('click', () => {
  track('decline', { ui: 'close-x', variant: window.__cxiVariantKey });
  closeInvite();
});
document.getElementById('cxi-cta-decline')?.addEventListener('click', () => {
  track('decline', { ui: 'decline-btn', variant: window.__cxiVariantKey });
  closeInvite();
});
document.getElementById('cxi-cta-remind')?.addEventListener('click', () => {
  const st = getNudgeState();
  const plan = [4, 24, 72];
  const nextIdx = Math.min(st.count, plan.length - 1);
  track('remind', { count: st.count, nextHours: plan[nextIdx], variant: window.__cxiVariantKey });
  scheduleNudge(plan[nextIdx]);
  closeInvite();
});
document.getElementById('cxi-cta-accept')?.addEventListener('click', () => {
  track('accept', { variant: window.__cxiVariantKey });
  closeInvite();
  if (typeof window.startSurvey === 'function') window.startSurvey();
  try {
    const stage = document.querySelector('#stage')?.value || 'screen';
    const role = document.querySelector('#role_family')?.value || 'engineering';
    const token = window.CANDIDATE_TOKEN || null;
    fetch('/api/atsWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'candidate_feedback_invite',
        stage,
        role_family: role,
        candidate_token: token,
        sent_at: new Date().toISOString(),
        source: new URL(location.href).searchParams.get('src') || null,
      }),
    }).catch(() => {});
  } catch (e) {
    // ignore ATS webhook errors
  }
});

(function maybeNudge() {
  if (shouldShowNudgeNow()) {
    incrementNudgeCount();
    openInvite(window.CANDIDATE_TOKEN || '', getNudgeState().count - 1);
  }
})();

window.cxiColorBand = function (idx) {
  if (idx >= 0.6) return 'good';
  if (idx >= 0.4) return 'warning';
  return 'bad';
};

export function showATSWebhook(stage, role, token) {
  const payload = {
    event: 'candidate_feedback_invite',
    stage,
    role_family: role,
    candidate_token: token || 'anon_' + Math.random().toString(36).slice(2, 7),
    sent_at: new Date().toISOString(),
    source: new URL(location.href).searchParams.get('src') || null,
  };
  const el = document.getElementById('ats-json');
  const panel = document.getElementById('ats-panel');
  if (el && panel) {
    el.textContent = JSON.stringify(payload, null, 2);
    panel.hidden = false;
  }
}

export function pushTaskRow({ stage, aspects, index }) {
  const tb = document.getElementById('task-rows');
  const wrap = document.getElementById('task-drawer');
  if (!tb || !wrap) return;
  const tr = document.createElement('tr');
  const date = new Date().toLocaleString();
  const band = window.cxiColorBand
    ? window.cxiColorBand(index)
    : index >= 0.6
      ? 'good'
      : index >= 0.4
        ? 'warning'
        : 'bad';
  tr.innerHTML = `
          <td>${date}</td>
          <td>${stage}</td>
          <td>${(aspects || []).map(a => `<span class="tag">${a}</span>`).join('')}</td>
          <td><span id="cxi-index-pill" class="${band}">${(index * 100).toFixed(0)}</span></td>`;
  tb.prepend(tr);
  wrap.hidden = false;
}
document.addEventListener('click', e => {
  const t = e.target;
  if (t && t.id === 'cxi-cta-accept') {
    const stage = document.querySelector('#stage')?.value || 'screen';
    const role = document.querySelector('#role_family')?.value || 'engineering';
    const token = window.CANDIDATE_TOKEN || null;
    showATSWebhook(stage, role, token);
  }
  if (t && t.matches('[data-action="push-dashboard"]')) {
    const stage = window.__lastSubmission?.stage || 'panel';
    const aspects = (window.__lastSubmission?.aspects || []).slice(0, 3);
    const index = window.__lastResult?.composite_index || 0.58;
    pushTaskRow({ stage, aspects, index });
  }
});
