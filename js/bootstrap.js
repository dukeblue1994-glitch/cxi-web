import { flags, once } from './flags.js';
import { setSnapshot } from './snapshot.js';
import { nssFromText } from './sentiment-lite.js';

export function initPulse(){
  const leave = document.getElementById('leave-btn') || document.getElementById('leaveBtn');
  if (leave) leave.addEventListener('click', openPulse);
}
function openPulse(){
  const nss = nssFromText(window.cxiHeadline?.value || 'not bad overall');
  const snap = window.cxiBuildSnapshot ? window.cxiBuildSnapshot(nss) : null;
  if (snap) setSnapshot(snap);
  fetch('/.netlify/functions/dev-webhook', {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({
      stage: snap?.stage,
      family: snap?.roleFamily,
      went_well: snap?.narrative?.split(' | ')[0],
      improve: snap?.narrative?.split(' | ')[1],
      headline: window.cxiHeadline?.value || ''
    })
  }).catch(()=>{});
}
export function mountFeatures(){
  for (const [k, init] of Object.entries({
    ww:  () => import('./features/webhookWorkbench.js').then(m=>m.init()),
    rt:  () => import('./features/redactorTheater.js').then(m=>m.init()),
    ah:  () => import('./features/aspectHighlighters.js').then(m=>m.init()),
    tl:  () => import('./features/timeLapseHeatmap.js').then(m=>m.init()),
    sla: () => import('./features/slaShrink.js').then(m=>m.init()),
    cc:  () => import('./features/coachCards.js').then(m=>m.init()),
    ab:  () => import('./features/incentiveDial.js').then(m=>m.init()),
    rr:  () => import('./features/riskRadar.js').then(m=>m.init()),
    bm:  () => import('./features/benchmarks.js').then(m=>m.init()),
    roi: () => import('./features/roiTicker.js').then(m=>m.init()),
    zc:  () => import('./features/zerocodeTrigger.js').then(m=>m.init()),
    po:  () => import('./features/pitchOverlay.js').then(m=>m.init())
  })) {
    if (flags[k]) once(k, init);
  }
}
