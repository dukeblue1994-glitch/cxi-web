// Lightweight performance HUD (lazy optional)
// Toggle with Alt+P. Displays FPS, memory if available, CTR metrics fetch time.

import { performanceMark } from "./utils.js";

let hudEl = null;
let fps = 0;
let frames = 0;
let lastSec = performance.now();
let rafId = null;
const netTimings = [];
const longTasks = [];
let navSummary = null;
let clsValue = 0;
let lcpTime = null;
let longTaskWarn = false;
let inpValue = null;

function loop(ts) {
  frames++;
  if (ts - lastSec >= 1000) {
    fps = frames;
    frames = 0;
    lastSec = ts;
    render();
  }
  rafId = requestAnimationFrame(loop);
}

function render() {
  if (!hudEl) return;
  const mem = performance.memory || {};
  const ltTail = longTasks
    .slice(-3)
    .map((t) => t + "ms")
    .join(", ");
  const ltAvg = longTasks.length
    ? Math.round(longTasks.reduce((a, b) => a + b, 0) / longTasks.length)
    : 0;
  longTaskWarn = ltAvg > 50 || longTasks.some((d) => d > 100);
  const netTail = netTimings
    .slice(-4)
    .map((t) => `${t.name}:${t.ms}ms`)
    .join(" ");
  const navLine = navSummary
    ? `Nav: dns ${navSummary.dns} | tls ${navSummary.tls} | ttfb ${navSummary.ttfb} | dom ${navSummary.domContent} | load ${navSummary.load}`
    : "";
  hudEl.innerHTML = `<strong>Perf HUD</strong><br>
    FPS: ${fps} | Heap: ${formatBytes(mem.usedJSHeapSize)}/${formatBytes(mem.jsHeapSizeLimit)}<br>
    ${navLine}<br>
    LCP: ${lcpTime !== null ? lcpTime + "ms" : "—"} | CLS: ${clsValue.toFixed(3)} | INP: ${inpValue !== null ? inpValue + "ms" : "—"}<br>
    LongTasks: <span style="color:${longTaskWarn ? "#f87171" : "#a3e635"}">${ltTail || "—"}</span> (avg ${ltAvg}ms)<br>
    Net: ${netTail}
    `;
}
function formatBytes(b) {
  if (!b) return "n/a";
  return (b / 1024 / 1024).toFixed(1) + "MB";
}

export function trackNetTiming(name, ms) {
  netTimings.push({ name, ms });
  if (netTimings.length > 20) netTimings.shift();
  render();
}

export function toggleHud() {
  if (!hudEl) createHud();
  const hidden = hudEl.style.display === "none";
  hudEl.style.display = hidden ? "block" : "none";
  if (hidden) {
    performanceMark("hud_shown");
    rafId = requestAnimationFrame(loop);
    initLongTasks();
    summarizeNav();
    initLayoutMetrics();
    initInp();
  } else if (rafId) {
    cancelAnimationFrame(rafId);
  }
}
function createHud() {
  hudEl = document.createElement("div");
  hudEl.id = "cxi-perf-hud";
  Object.assign(hudEl.style, {
    position: "fixed",
    top: "8px",
    right: "8px",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    font: "12px/1.3 system-ui, sans-serif",
    padding: "6px 8px",
    zIndex: 9999,
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  });
  hudEl.textContent = "Perf HUD";
  document.body.appendChild(hudEl);
  render();
}

function initLongTasks() {
  if (initLongTasks._done) return;
  initLongTasks._done = true;
  if ("PerformanceObserver" in window) {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(Math.round(entry.duration));
          if (longTasks.length > 20) longTasks.shift();
        }
        render();
      });
      po.observe({ type: "longtask", buffered: true });
    } catch {}
  }
}

function summarizeNav() {
  if (navSummary || !("getEntriesByType" in performance)) return;
  const nav = performance.getEntriesByType("navigation")[0];
  if (!nav) return;
  navSummary = {
    dns: delta(nav.domainLookupStart, nav.domainLookupEnd),
    tls: delta(nav.connectStart, nav.secureConnectionStart)
      ? delta(nav.secureConnectionStart, nav.connectEnd)
      : 0,
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    domContent: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    load: Math.round(nav.loadEventEnd - nav.startTime),
  };
  render();
}

function delta(a, b) {
  return Math.round(b - a);
}

function initLayoutMetrics() {
  if (initLayoutMetrics._done) return;
  initLayoutMetrics._done = true;
  if ("PerformanceObserver" in window) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        render();
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        lcpTime = Math.round(last.startTime);
        render();
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  }
}

function initInp() {
  if (initInp._done || !("PerformanceObserver" in window)) return;
  initInp._done = true;
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // latency = processingStart - startTime OR duration variant
        const dur = entry.duration || entry.processingEnd - entry.startTime;
        const latency = Math.round(dur);
        // Use worst-case (largest) observed for rough INP proxy
        if (inpValue === null || latency > inpValue) inpValue = latency;
      }
      render();
    });
    inpObserver.observe({
      type: "event",
      buffered: true,
      durationThreshold: 40,
    });
  } catch {}
}

window.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === "p") toggleHud();
});
