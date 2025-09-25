// Dashboard / results helper functions migrated from legacy inline script
// Provides exportData, showHeatmapDetail, filterTasks, pushToDashboard wrappers.
// (No direct utils needed currently but keep pattern for future extensions)
import { pushTaskRow } from './invite.js';
import { loadCtrMetrics } from './metrics.js';

function qs(id) {
  return document.getElementById(id);
}

export function exportData(format) {
  const last = window.__lastResult || {};
  const nssText = (qs('nss-display')?.textContent || '').trim();
  const nssParsed = parseFloat(nssText.replace('+', ''));
  const idxText = (qs('index-display')?.textContent || '').trim();
  const idxParsed = parseFloat(idxText);
  const data = {
    timestamp: new Date().toISOString(),
    nss: Number.isFinite(last.nss) ? last.nss : Number.isFinite(nssParsed) ? nssParsed : 0.75,
    composite_index: Number.isFinite(last.composite_index)
      ? last.composite_index
      : Number.isFinite(idxParsed)
        ? idxParsed
        : 0.82,
    summary: last.summary || qs('response-summary')?.textContent || '',
    coaching_cue: last.coaching_cue || qs('coaching-cue')?.textContent || '',
    format,
  };
  const previewEl = qs('export-preview');
  const contentEl = qs('export-content');
  if (!previewEl || !contentEl) return;
  switch (format) {
    case 'json':
      contentEl.textContent = JSON.stringify(data, null, 2);
      break;
    case 'summary':
      contentEl.textContent = `CXI Analysis Summary\n\nNSS: ${data.nss}\nIndex: ${data.composite_index}\nSummary: ${data.summary}\nCoaching: ${data.coaching_cue}`;
      break;
    case 'csv':
      contentEl.textContent = `timestamp,nss,index,summary,coaching\n"${data.timestamp}",${data.nss},${data.composite_index},"${data.summary}","${data.coaching_cue}"`;
      break;
    case 'pdf':
      contentEl.textContent = 'PDF generation placeholder – integrate jsPDF or server rendering.';
      break;
  }
  previewEl.hidden = false;
}

export function showHeatmapDetail(aspect, stage) {
  const detailEl = qs('heatmap-detail');
  if (!detailEl) return;
  const titleEl = qs('detail-title');
  const contentEl = qs('detail-content');
  if (titleEl) titleEl.textContent = `${aspect} × ${stage}`;
  const sampleData = {
    'communication-panel': {
      score: '+0.5',
      summary: 'Generally positive communication during panel interviews.',
      evidence: ['clear explanations', 'responsive to questions', 'professional tone'],
      improvement: 'Some candidates noted brief responses from panel members.',
    },
  };
  const key = `${aspect}-${stage}`;
  const data = sampleData[key] || {
    score: 'N/A',
    summary: `Analysis for ${aspect} at ${stage} stage.`,
    evidence: ['Sample evidence point'],
    improvement: 'Continue monitoring this combination.',
  };
  if (contentEl) {
    contentEl.innerHTML = `
      <div><strong>Score:</strong> ${data.score}</div>
      <div class="mt-6"><strong>Summary:</strong> ${data.summary}</div>
      <div class="mt-6"><strong>Evidence:</strong></div>
      <ul class="mt-025 ml-1">${data.evidence.map(e => `<li>"${e}"</li>`).join('')}</ul>
      <div class="mt-6"><strong>Recommendation:</strong> ${data.improvement}</div>
    `;
  }
  detailEl.classList.remove('hidden');
  // determine band (currently unused but left for potential styling)
  // const band = window.cxiColorBand ? window.cxiColorBand(window.CXI_LAST_INDEX || 0.58) : 'good';
  if (contentEl) {
    const cta = document.createElement('div');
    cta.className = 'mt-8';
    cta.innerHTML = `<button id="push-from-heatmap" class="btn btn-primary" data-action="push-dashboard">Push to dashboard</button> <span class="small muted ml-1">Adds a coaching task for ${stage} → ${aspect}</span>`;
    contentEl.appendChild(cta);
  }
}

export function filterTasks() {
  const stageFilter = qs('stage-filter')?.value;
  const priorityFilter = qs('priority-filter')?.value;
  const tasks = document.querySelectorAll('.task-item');
  let visible = 0;
  tasks.forEach(task => {
    const taskStage = task.getAttribute('data-stage');
    const taskPriority = task.getAttribute('data-priority');
    const stageMatch = !stageFilter || taskStage === stageFilter;
    const priorityMatch = !priorityFilter || taskPriority === priorityFilter;
    if (stageMatch && priorityMatch) {
      task.style.display = 'block';
      visible++;
    } else {
      task.style.display = 'none';
    }
  });
  const header = document.querySelector('.task-header');
  if (header) header.textContent = `Active Tasks (${visible})`;
}

export async function pushToDashboard() {
  try {
    const response = await fetch('/api/pushTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_id: window.__lastSubmission?.candidate_token || `resp_${Date.now()}`,
        coaching_cue: qs('coaching-cue')?.textContent || 'N/A',
        stage: window.__lastSubmission?.stage || 'panel',
        aspects: window.__lastSubmission?.aspects || ['communication', 'clarity'],
        nss: window.__lastResult?.nss || 0.75,
        index: window.__lastResult?.composite_index || 0.58,
      }),
    });
    if (response.ok) {
      alert('✅ Results pushed to recruiter dashboard (demo).');
      pushTaskRow({
        stage: window.__lastSubmission?.stage || 'panel',
        aspects: (window.__lastSubmission?.aspects || ['communication', 'clarity']).slice(0, 3),
        index: window.__lastResult?.composite_index || 0.58,
      });
    } else {
      alert('⚠️ Error pushing to dashboard.');
    }
  } catch (e) {
    alert('⚠️ Network error pushing to dashboard.');
  }
}

// Expose globally for existing onclick handlers in markup
window.exportData = exportData;
window.showHeatmapDetail = showHeatmapDetail;
window.filterTasks = filterTasks;
window.pushToDashboard = pushToDashboard;

// Auto-load CTR metrics when summary tab visible (legacy support)
if (document.readyState !== 'loading') {
  if (!document.getElementById('summary-tab')?.classList.contains('hidden')) loadCtrMetrics();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('summary-tab')?.classList.contains('hidden')) loadCtrMetrics();
  });
}
