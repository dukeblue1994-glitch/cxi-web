// Lazy heatmap renderer. Consumes bands or synthetic scores from last result.
import { performanceMark } from './utils.js';

export function renderHeatmap(data) {
  const container = document.getElementById('heatmap-cells');
  if (!container) return;
  performanceMark('heatmap_render_start');
  container.innerHTML = '';
  // Use bands if present; else synthetic fallback
  const dims = ['overall','fairness','sentiment','rigor','speed','clarity','trust'];
  dims.forEach(dim => {
    const cell = document.createElement('div');
    const score = typeof data?.scores?.[dim] === 'number' ? data.scores[dim] : Math.random();
    cell.className = 'cell ' + (score > 0.6 ? 'good' : score > 0.4 ? 'warn' : 'bad');
    cell.title = dim + ' ' + (score * 100).toFixed(0);
    cell.textContent = (score * 100).toFixed(0);
    container.appendChild(cell);
  });
  performanceMark('heatmap_render_end');
}
