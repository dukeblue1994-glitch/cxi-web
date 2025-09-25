import { perfMeasure, performanceMark } from './utils.js';

export function loadCtrMetrics() {
  const sumEl = document.getElementById('ctr-summary');
  const bdEl = document.getElementById('ctr-breakdown');
  if (!sumEl || !bdEl) return;
  sumEl.textContent = 'Loading…';
  bdEl.textContent = '';

  const run = async () => {
    try {
      performanceMark('ctr_fetch_start');
      const dSel = document.getElementById('ctr-days-select');
      const days = dSel ? Number(dSel.value) || 7 : 7;
      const res = await fetch(`/api/metrics?days=${days}`);
      if (!res.ok) throw new Error('metrics_error');
      const { metrics } = await res.json();
      performanceMark('ctr_fetch_end');
      const v = metrics?.totals?.view || 0;
      const a = metrics?.totals?.accept || 0;
      const ctr = v ? (a / v) * 100 : 0;
      sumEl.innerHTML = `${a} accepts / ${v} views <span class="ml-1">(${ctr.toFixed(1)}% CTR)</span>`;
      const by = metrics?.byVariant || {};
      const rows = Object.entries(by).map(([variant, m]) => {
        const vv = m.view || 0;
        const aa = m.accept || 0;
        const cc = vv ? (aa / vv) * 100 : 0;
        const label = variant.replace(/^(li-|std-)/, s => (s === 'li-' ? 'LI ' : 'Std '));
        return `<div class="mt-025">• <b>${label}${variant.replace(/^(li-|std-)/, '')}</b> — ${aa}/${vv} (${cc.toFixed(1)}%)</div>`;
      });
      bdEl.innerHTML = rows.join('') || '<div class="mt-025">No data yet.</div>';
      perfMeasure('ctr_fetch_total', 'ctr_fetch_start', 'ctr_fetch_end');
    } catch (e) {
      sumEl.textContent = 'Metrics unavailable.';
      bdEl.textContent = '';
    }
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 60);
  }
}
