// Orchestrator module tying together survey, invite, panels, overlay.
// dashboard.js & metrics.js are now lazy-loaded via dynamic import proxies.

function createModuleLoader(loader) {
  let promise;
  return () => {
    if (!promise) {
      promise = loader();
    }
    return promise;
  };
}

const loadInviteModule = createModuleLoader(() => import("./invite.js"));
const loadOverlayModule = createModuleLoader(() => import("./overlay.js"));
const loadPanelsModule = createModuleLoader(() => import("./panels.js"));
const loadSurveyModule = createModuleLoader(() => import("./survey.js"));
const loadUtilsModule = createModuleLoader(() => import("./utils.js"));

let openInvite;
let pushTaskRow;
let showATSWebhook;
let toggleHud;
let trackNetTiming;
let restorePanels;
let setupSurveyInteractions;
let showResultsTab = () => {};
let updateProgress;
let performanceMark = () => {};

let coreModulesReady;

async function ensureCoreModules() {
  if (!coreModulesReady) {
    coreModulesReady = Promise.all([
      loadInviteModule(),
      loadOverlayModule(),
      loadPanelsModule(),
      loadSurveyModule(),
      loadUtilsModule(),
    ]).then(([inviteMod, overlayMod, panelsMod, surveyMod, utilsMod]) => {
      ({ openInvite, pushTaskRow, showATSWebhook } = inviteMod);
      ({ toggleHud, trackNetTiming } = overlayMod);
      ({ restorePanels } = panelsMod);
      ({
        setupSurveyInteractions,
        showResultsTab,
        updateProgress,
      } = surveyMod);
      ({ performanceMark } = utilsMod);

      window.showResultsTab = showResultsTab;
      if (typeof window.openInvite !== "function") {
        window.openInvite = (...args) => openInvite(...args);
      }
      window.showATSWebhook = showATSWebhook;
      window.pushTaskRow = pushTaskRow;
      window.toggleHud = toggleHud;
    });
  }
  return coreModulesReady;
}

// Dashboard helpers (for existing onclick attributes)
// Lazy dashboard loader proxies (first invocation triggers network fetch)
function ensureDashboard() {
  if (window.__dashboardLoaded) return Promise.resolve();
  return import("./dashboard.js").then((mod) => {
    window.exportData = mod.exportData;
    window.showHeatmapDetail = mod.showHeatmapDetail;
    window.filterTasks = mod.filterTasks;
    window.pushToDashboard = mod.pushToDashboard;
    window.__dashboardLoaded = true;
  });
}
// Install provisional proxies (idempotent once real funcs assigned)
["exportData", "showHeatmapDetail", "filterTasks", "pushToDashboard"].forEach(
  (fn) => {
    window[fn] = (...args) => ensureDashboard().then(() => window[fn](...args));
  }
);

function qs(id) {
  return document.getElementById(id);
}

function initCandidateToken() {
  const url = new URL(location.href);
  const existing = url.searchParams.get("token");
  window.CANDIDATE_TOKEN =
    existing || "cand_" + Math.random().toString(36).slice(2, 10).toLowerCase();
}

function wireSurvey() {
  setupSurveyInteractions();
  window.startSurvey = function startSurvey() {
    performanceMark("survey_start");
    if (typeof window.showStage === "function") {
      window.showStage("survey");
    } else {
      document.getElementById("interview-view")?.classList.add("hidden");
      document.getElementById("survey-view")?.classList.remove("hidden");
    }
    const inviteTrigger = document.getElementById("invite-trigger");
    if (inviteTrigger) inviteTrigger.hidden = true;
    updateProgress();
    document.getElementById("well")?.focus();
  };
}

function wireSubmission() {
  const form = qs("survey-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const well = qs("well").value.trim();
    const better = qs("better").value.trim();
    const rant = qs("rant").value.trim();
    const stage = fd.get("stage");
    const role = fd.get("role_family");
    const overall = document.querySelector(
      '.rating-group[data-field="overall"] .rating-btn.selected'
    )?.dataset.value;
    const fairness = document.querySelector(
      '.rating-group[data-field="fairness"] .rating-btn.selected'
    )?.dataset.value;
    const attention = document.querySelector(
      '.rating-group[data-field="attention"] .rating-btn.selected'
    )?.dataset.value;
    const aspects = Array.from(
      document.querySelectorAll(".aspect-btn.selected")
    ).map((b) => b.dataset.aspect);
    const payload = {
      candidate_token: window.CANDIDATE_TOKEN,
      stage,
      role_family: role,
      overall: Number(overall),
      fairness: Number(fairness),
      attention: Number(attention),
      aspects,
      well,
      better,
      rant,
      consent: !!qs("consent").checked,
    };
    window.__lastSubmission = payload;
    const t0 = performance.now();
    const resp = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const t1 = performance.now();
    trackNetTiming("score", Math.round(t1 - t0));
    if (!resp.ok) return alert("Score service error");
    const data = await resp.json();
    window.__lastResult = data;

    displayResults(data);
  });
}

function displayResults(data) {
  performanceMark("results_display");
  if (typeof window.showStage === "function") {
    window.showStage("results");
  } else {
    const surveyView = document.getElementById("survey-view");
    if (surveyView) surveyView.classList.add("hidden");
    const resultsView = document.getElementById("results-view");
    if (resultsView) resultsView.classList.remove("hidden");
  }
  const { bands = {}, composite_index = 0 } = data;
  const overallEl = qs("overall-score");
  if (overallEl)
    overallEl.textContent = (composite_index * 100).toFixed(0) + "";
  qs("band-overall").textContent = bands.overall || "N/A";
  qs("band-fairness").textContent = bands.fairness || "N/A";
  qs("band-sentiment").textContent = bands.sentiment || "N/A";
  qs("band-rigor").textContent = bands.rigor || "N/A";
  qs("band-speed").textContent = bands.speed || "N/A";
  qs("band-clarity").textContent = bands.clarity || "N/A";
  qs("band-trust").textContent = bands.trust || "N/A";

  // Heatmap now rendered lazily when heatmap tab first viewed.
  showResultsTab("summary");

  // Quality badge integration
  try {
    const qBlock = qs("quality-block");
    if (qBlock && data.quality_score !== undefined) {
      qBlock.hidden = false;
      const badge = qs("quality-badge");
      const elig = qs("incentive-eligibility");
      const flagsEl = qs("quality-flags");
      const score = data.quality_score;
      let cls = "";
      if (score < 0.55) cls = "risk";
      else if (score < 0.75) cls = "warn";
      if (badge) {
        badge.className = "quality-badge " + cls;
        // Ensure structure: <svg><use></use></svg> <span class="qb-text">...</span>
        let svg = badge.querySelector("svg");
        if (!svg) {
          svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("width", "14");
          svg.setAttribute("height", "14");
          svg.setAttribute("aria-hidden", "true");
          const use = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "use"
          );
          svg.appendChild(use);
          badge.prepend(svg);
        }
        const useEl = svg.querySelector("use");
        const icon =
          cls === "risk"
            ? "#icon-risk"
            : cls === "warn"
              ? "#icon-warn"
              : "#icon-check";
        if (useEl) useEl.setAttribute("href", icon);
        let textSpan = badge.querySelector(".qb-text");
        if (!textSpan) {
          textSpan = document.createElement("span");
          textSpan.className = "qb-text";
          badge.appendChild(textSpan);
        }
        textSpan.textContent = `Quality: ${(score * 100).toFixed(0)}%`;
        // Build tooltip with core heuristics if provided
        const q = data.quality || {};
        const tipParts = [];
        if (typeof q.diversity === "number")
          tipParts.push(`Diversity ${(q.diversity * 100).toFixed(0)}%`);
        if (typeof q.longest_run === "number")
          tipParts.push(`Longest Run ${q.longest_run}`);
        if (typeof q.non_lexical_ratio === "number")
          tipParts.push(`Non-lex ${(q.non_lexical_ratio * 100).toFixed(0)}%`);
        if (typeof q.gibberish_score === "number")
          tipParts.push(`Gibberish ${(q.gibberish_score * 100).toFixed(0)}%`);
        if (typeof q.common_word_ratio === "number")
          tipParts.push(`Common ${(q.common_word_ratio * 100).toFixed(0)}%`);
        if (typeof q.entropy === "number")
          tipParts.push(`Entropy ${q.entropy.toFixed(2)}`);
        badge.title = "Quality Heuristics: " + tipParts.join(" • ");
        badge.setAttribute("aria-label", badge.title);
      }
      if (flagsEl) {
        const fl = data.quality_flags || [];
        flagsEl.textContent = fl.length ? "Flags: " + fl.join(", ") : "";
      }
      if (elig) {
        const eligible = !!data.incentive_eligible;
        elig.textContent = eligible
          ? "Eligible for eGift"
          : "Ineligible (low-effort detected)";
        elig.style.color = eligible ? "#34d399" : "#f87171";
        elig.title = eligible
          ? "Submission passes quality heuristics"
          : "Submission failed one or more heuristics (e.g. repetition, low diversity, gibberish) and is excluded from incentive.";
      }
    }
  } catch (e) {
    // ignore quality rendering errors
  }
}

// Expose for legacy inline script references (until full cleanup complete)
window.displayResults = displayResults;

function wireTabs() {
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      showResultsTab(btn.dataset.tab);
    });
  });
}

function wireDLQButtons() {
  const seedBtn = qs("seed-dlq");
  const replayBtn = qs("replay-dlq");
  seedBtn?.addEventListener("click", async () => {
    const t0 = performance.now();
    const r = await fetch("/api/seed-dlq");
    const t1 = performance.now();
    trackNetTiming("seed-dlq", Math.round(t1 - t0));
    alert(r.ok ? "DLQ seeded" : "Error seeding");
  });
  replayBtn?.addEventListener("click", async () => {
    const t0 = performance.now();
    const r = await fetch("/api/dlq-retry");
    const t1 = performance.now();
    trackNetTiming("dlq-retry", Math.round(t1 - t0));
    alert(r.ok ? "Replay triggered" : "Replay error");
  });
}

function wireMisc() {
  qs("invite-trigger")?.addEventListener("click", () =>
    openInvite(window.CANDIDATE_TOKEN)
  );
  qs("open-hud")?.addEventListener("click", () => toggleHud());
  // Autofill helpers
  qs("autofill")?.addEventListener("click", () => {
    qs("well").value =
      "Supportive interviewer detailed role growth values alignment culture";
    qs("better").value =
      "Faster feedback clarity next steps comp range fewer rounds timeline expectations";
    ["well", "better"].forEach((id) =>
      document.getElementById(id).dispatchEvent(new Event("input"))
    );
  });
  qs("reset")?.addEventListener("click", () => location.reload());
}

async function init() {
  await ensureCoreModules();
  performanceMark("app_init_start");
  initCandidateToken();
  wireSurvey();
  wireSubmission();
  wireTabs();
  wireDLQButtons();
  wireMisc();
  restorePanels();
  performanceMark("app_init_end");
  // Auto-load panel metrics after idle
  // Idle-load CTR metrics module only when browser is free
  requestIdleCallback?.(() => {
    import("./metrics.js").then((m) => m.loadCtrMetrics()).catch(() => {});
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch(() => {});
  });
} else {
  init().catch(() => {});
}
