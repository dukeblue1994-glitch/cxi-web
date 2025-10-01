const SUMMARY_ID = "ctr-summary";
const BREAKDOWN_ID = "ctr-breakdown";
const DEFAULT_DAYS = 7;

function getElement(id) {
  return typeof document === "undefined" ? null : document.getElementById(id);
}

function getMetricsRoot() {
  const summaryEl = getElement(SUMMARY_ID);
  const breakdownEl = getElement(BREAKDOWN_ID);
  return { summaryEl, breakdownEl };
}

function formatVariantLabel(variant) {
  if (typeof variant !== "string") return "Unknown";
  const match = /^(li-|std-)?(.*)$/.exec(variant);
  if (!match) return "Unknown";
  const [, prefixRaw, core] = match;
  const prefix = prefixRaw === "li-" ? "LI " : prefixRaw === "std-" ? "Std " : "";
  return `${prefix}${core}`;
}

function createBreakdownRow(label, metrics) {
  const row = document.createElement("div");
  row.className = "mt-025";

  const bullet = document.createElement("span");
  bullet.className = "variant-bullet";
  bullet.textContent = "• ";
  const bold = document.createElement("b");
  bold.textContent = label;
  const metricsText = document.createTextNode(
    ` — ${metrics.accept}/${metrics.view} (${metrics.ctr.toFixed(1)}% CTR)`,
  );

  row.append(bullet, bold, metricsText);
  return row;
}

export function renderMetrics(metrics) {
  const { summaryEl, breakdownEl } = getMetricsRoot();
  if (!summaryEl || !breakdownEl) return;

  const totalViews = Number(metrics?.totals?.view) || 0;
  const totalAccepts = Number(metrics?.totals?.accept) || 0;
  const totalCtr = totalViews ? (totalAccepts / totalViews) * 100 : 0;

  summaryEl.textContent = "";
  const summaryText = document.createTextNode(
    `${totalAccepts} accepts / ${totalViews} views `,
  );
  const ctrSpan = document.createElement("span");
  ctrSpan.className = "ml-1";
  ctrSpan.textContent = `(${totalCtr.toFixed(1)}% CTR)`;
  summaryEl.append(summaryText, ctrSpan);

  breakdownEl.textContent = "";
  const entries = Object.entries(metrics?.byVariant || {});
  if (!entries.length) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "mt-025";
    emptyRow.textContent = "No data yet.";
    breakdownEl.appendChild(emptyRow);
    return;
  }

  for (const [variant, variantMetrics] of entries) {
    const view = Number(variantMetrics?.view) || 0;
    const accept = Number(variantMetrics?.accept) || 0;
    const ctr = view ? (accept / view) * 100 : 0;
    const label = formatVariantLabel(variant);
    breakdownEl.appendChild(
      createBreakdownRow(label, { view, accept, ctr }),
    );
  }
}

export async function loadCtrMetrics() {
  const { summaryEl, breakdownEl } = getMetricsRoot();
  if (!summaryEl || !breakdownEl) return;

  summaryEl.textContent = "Loading…";
  breakdownEl.textContent = "";

  const run = async () => {
    try {
      performance.mark?.("ctr_fetch_start");
      const selectEl = getElement("ctr-days-select");
      const days = selectEl ? Number(selectEl.value) || DEFAULT_DAYS : DEFAULT_DAYS;
      const res = await fetch(`/api/metrics?days=${days}`);
      if (!res.ok) throw new Error("metrics_error");
      const { metrics } = await res.json();
      performance.mark?.("ctr_fetch_end");
      renderMetrics(metrics);
      performance.measure?.("ctr_fetch_total", "ctr_fetch_start", "ctr_fetch_end");
    } catch (e) {
      summaryEl.textContent = "Metrics unavailable.";
      breakdownEl.textContent = "";
    }
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 60);
  }
}

if (typeof window !== "undefined") {
  window.loadCtrMetrics = loadCtrMetrics;
}
