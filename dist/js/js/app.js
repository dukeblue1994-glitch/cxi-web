// Orchestrator module tying together survey, invite, panels, overlay.
// dashboard.js & metrics.js are now lazy-loaded via dynamic import proxies.
import { openInvite, pushTaskRow, showATSWebhook } from "./invite.js";
import { toggleHud, trackNetTiming } from "./overlay.js";
import { restorePanels } from "./panels.js";
import {
  setupSurveyInteractions,
  showResultsTab,
  updateProgress,
} from "./survey.js";
import {
  animateNumber,
  performanceMark,
  seededRandom,
  typewriter,
  showElement,
  hideElement,
} from "./utils.js";

window.showResultsTab = showResultsTab;
if (typeof window.openInvite !== "function") {
  window.openInvite = (...args) => openInvite(...args);
}
window.showATSWebhook = showATSWebhook;
window.pushTaskRow = pushTaskRow;
window.toggleHud = toggleHud;
// Dashboard helpers (for existing onclick attributes)
// Lazy dashboard loader proxies (first invocation triggers network fetch)
function ensureDashboard() {
  if (window.__dashboardLoaded) return Promise.resolve();
  return import("./dashboard.js").then((mod) => {
    window.exportData = mod.exportData;
    window.showHeatmapDetail = mod.showHeatmapDetail;
    window.filterTasks = mod.filterTasks;
    window.pushToDashboard = mod.pushToDashboard;
    if (mod.updateRosterHighlight) {
      window.updateRosterHighlight = mod.updateRosterHighlight;
    }
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

let instructionTimers = { fade: 0, hide: 0 };
function setupInstructionPlacard() {
  const placard = document.getElementById("inline-cta");
  if (!placard) return;
  if (placard.dataset.managed === "true") return;
  placard.dataset.managed = "true";
  const clearTimers = () => {
    clearTimeout(instructionTimers.fade);
    clearTimeout(instructionTimers.hide);
  };
  const schedule = () => {
    clearTimers();
    instructionTimers.fade = window.setTimeout(() => {
      placard.setAttribute("data-state", "fading");
    }, 9000);
    instructionTimers.hide = window.setTimeout(() => {
      placard.setAttribute("data-state", "fading");
      placard.setAttribute("aria-hidden", "true");
      placard.setAttribute("data-hidden", "true");
    }, 15000);
  };
  const reveal = () => {
    placard.removeAttribute("data-state");
    placard.removeAttribute("data-hidden");
    placard.setAttribute("aria-hidden", "false");
  };
  const dismiss = () => {
    clearTimers();
    placard.setAttribute("data-state", "fading");
    placard.setAttribute("aria-hidden", "true");
    placard.setAttribute("data-hidden", "true");
  };
  schedule();
  placard.addEventListener("mouseenter", () => {
    reveal();
    clearTimers();
  });
  placard.addEventListener("focusin", () => {
    reveal();
    clearTimers();
  });
  placard.addEventListener("mouseleave", () => {
    if (placard.getAttribute("data-hidden") === "true") return;
    schedule();
  });
  placard.addEventListener("focusout", () => {
    if (!placard.contains(document.activeElement)) schedule();
  });
  placard
    .querySelector("[data-dismiss-instructions]")
    ?.addEventListener("click", dismiss);
}

let scoreRevealEl = null;
const scoreRevealTimers = new Set();

function clearScoreRevealTimers() {
  scoreRevealTimers.forEach((id) => clearTimeout(id));
  scoreRevealTimers.clear();
}

function hideScoreReveal() {
  if (!scoreRevealEl) return;
  clearScoreRevealTimers();
  hideElement(scoreRevealEl, { transition: true, transitionDuration: 240 });
}

function setupScoreReveal() {
  scoreRevealEl = document.getElementById("score-reveal");
  if (!scoreRevealEl) return;
  scoreRevealEl.hidden = true;
  scoreRevealEl.setAttribute("aria-hidden", "true");
  scoreRevealEl.addEventListener("click", (evt) => {
    if (evt.target === scoreRevealEl) hideScoreReveal();
  });
  scoreRevealEl
    .querySelectorAll("[data-close-reveal]")
    .forEach((btn) => btn.addEventListener("click", hideScoreReveal));
  const jumpBtn = scoreRevealEl.querySelector(
    "[data-reveal-open-dashboard]",
  );
  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => {
      hideScoreReveal();
      showResultsTab("summary");
      document
        .getElementById("results-view")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  window.dismissScoreReveal = hideScoreReveal;
}

function highlightRevealSentence(sentence = "", aspects = []) {
  if (!scoreRevealEl) return;
  const target = scoreRevealEl.querySelector("[data-reveal-sentence]");
  if (!target) return;
  const cleaned = (sentence || "").trim();
  if (!cleaned) {
    target.textContent =
      "NSS translator will light up once a candidate story streams in.";
    return;
  }
  target.textContent = cleaned;
  const keywords = (aspects || [])
    .map((aspect) => formatAspect(aspect).toLowerCase())
    .filter(Boolean)
    .flatMap((word) => [word, word.replace(/\s+/g, "")]);
  const timer = window.setTimeout(() => {
    const tokens = cleaned.split(/(\s+)/);
    target.innerHTML = tokens
      .map((token) => {
        const normalized = token
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const hit = keywords.some((kw) =>
          normalized.includes(kw.replace(/[^a-z0-9]/g, "")),
        );
        return hit && token.trim()
          ? `<mark>${token}</mark>`
          : token;
      })
      .join("");
  }, 720);
  scoreRevealTimers.add(timer);
}

function triggerScoreReveal(context) {
  if (!scoreRevealEl) return;
  clearScoreRevealTimers();
  showElement(scoreRevealEl, { transition: true });
  const indexEl = scoreRevealEl.querySelector("[data-reveal-index]");
  const nssEl = scoreRevealEl.querySelector("[data-reveal-nss]");
  const qualityEl = scoreRevealEl.querySelector("[data-reveal-quality]");
  if (indexEl)
    animateNumber(indexEl, {
      from: 0,
      to: Number(context.index || 0) * 100,
      duration: 900,
      decimals: 0,
    });
  if (nssEl)
    animateNumber(nssEl, {
      from: 0,
      to: Number(context.nss || 0),
      duration: 900,
      decimals: 2,
      prefix: context.nss >= 0 ? "+" : "",
    });
  if (qualityEl)
    animateNumber(qualityEl, {
      from: 0,
      to: Number(context.quality || 0) * 100,
      duration: 900,
      decimals: 0,
      suffix: "%",
    });
  const summaryEl = scoreRevealEl.querySelector("[data-reveal-summary]");
  if (summaryEl) {
    summaryEl.textContent = context.summary || "Fresh signal incoming.";
    summaryEl.classList.remove("is-highlighted");
    const t = window.setTimeout(
      () => summaryEl.classList.add("is-highlighted"),
      520,
    );
    scoreRevealTimers.add(t);
  }
  const stageEl = scoreRevealEl.querySelector("[data-reveal-stage]");
  if (stageEl) stageEl.textContent = formatStage(context.stage);
  const bandEl = scoreRevealEl.querySelector("[data-reveal-band]");
  if (bandEl)
    bandEl.textContent =
      context.band || (context.index >= 0.7 ? "Success" : "Watch");
  const aspectsEl = scoreRevealEl.querySelector("[data-reveal-aspects]");
  if (aspectsEl) {
    const aspects = Array.isArray(context.aspects) ? context.aspects : [];
    const chips = aspects
      .slice(0, 4)
      .map((aspect) => `<span>${formatAspect(aspect)}</span>`)
      .join("");
    aspectsEl.innerHTML = chips || '<span>Candidate Delight</span>';
  }
  highlightRevealSentence(context.sentence, context.aspects);
  const hideTimer = window.setTimeout(hideScoreReveal, 10000);
  scoreRevealTimers.add(hideTimer);
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

  requestAnimationFrame(() => {
    const resultsView = document.getElementById("results-view");
    resultsView?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  showResultsTab("summary");

  const submission = window.__lastSubmission || {};
  const bands = data.bands || {};
  const compositeIndex = Number(data.composite_index || 0);
  const textScore = Number(data.diagnostics?.textScore ?? 0.6);
  const qualityScore = Number(data.quality_score ?? 0);
  const attentionRaw = Number(submission.attention ?? 0);
  const nss = Number(((textScore - 0.5) * 2).toFixed(2));

  window.__lastResult = { ...data, nss };
  window.CXI_LAST_INDEX = compositeIndex;

  animateNumber(document.getElementById("orb-score"), {
    from: 0,
    to: compositeIndex * 100,
    duration: 1200,
    decimals: 0,
  });
  const orbBand = document.getElementById("orb-band-label");
  if (orbBand) orbBand.textContent = bands.overall || "Success";

  animateNumber(document.getElementById("nss-display"), {
    from: 0,
    to: nss,
    duration: 1000,
    decimals: 2,
    prefix: nss >= 0 ? "+" : "",
  });
  setBandIndicator(
    document.getElementById("nss-band"),
    bands.sentiment || (nss >= 0 ? "Positive" : "Needs Work"),
  );

  animateNumber(document.getElementById("quality-score"), {
    from: 0,
    to: qualityScore * 100,
    decimals: 0,
    suffix: "%",
  });
  const qualityLabel =
    qualityScore >= 0.75 ? "Eligible" : qualityScore >= 0.55 ? "Caution" : "Risk";
  setBandIndicator(document.getElementById("quality-band"), qualityLabel);

  animateNumber(document.getElementById("attention-score"), {
    from: 0,
    to: attentionRaw,
    decimals: 1,
  });
  const attentionLabel =
    attentionRaw >= 4 ? "High" : attentionRaw >= 3 ? "Medium" : "Low";
  setBandIndicator(document.getElementById("attention-band"), attentionLabel);

  renderHighlights(submission.aspects || [], data.quality_flags || []);

  const summaryText = buildSummaryText(
    submission.stage,
    nss,
    submission.aspects || [],
    bands.overall,
  );
  const summaryEl = document.getElementById("response-summary");
  if (summaryEl) typewriter(summaryEl, summaryText, { delay: 16 });

  const cueText = buildCoachingCue(submission.aspects || [], submission.stage);
  const cueEl = document.getElementById("coaching-cue");
  if (cueEl) typewriter(cueEl, cueText, { delay: 20 });

  renderTranscriptPlayback(
    [submission.well, submission.better, submission.rant]
      .filter(Boolean)
      .join(" "),
  );

  const revealSentence =
    (submission.rant || "").trim() ||
    (submission.well || "").trim() ||
    (submission.better || "").trim() ||
    "";
  triggerScoreReveal({
    stage: submission.stage,
    band: bands.overall,
    index: compositeIndex,
    nss,
    quality: qualityScore,
    summary: summaryText,
    aspects: submission.aspects || [],
    sentence: revealSentence,
  });

  updateQualityBlock(data);

  const heatmap = synthesizeHeatmapMatrix(
    compositeIndex,
    textScore,
    submission,
  );
  applyHeatmapMatrix(heatmap);
  window.__lastResult.heatmap = heatmap;
  ensureDashboard().then(() => {
    window.updateRosterHighlight?.();
  });
}

function setBandIndicator(element, label = "") {
  if (!element) return;
  element.classList.remove("band-success", "band-caution", "band-risk");
  const lower = label.toLowerCase();
  const cls = lower.includes("risk")
    ? "band-risk"
    : lower.includes("caution") || lower.includes("medium") || lower.includes("later")
      ? "band-caution"
      : "band-success";
  element.classList.add(cls);
  element.textContent = label;
}

function renderHighlights(aspects, flags) {
  const highlightEl = document.getElementById("highlights-display");
  const absaEl = document.getElementById("absa-display");
  const items = Array.isArray(aspects) && aspects.length ? aspects : ["responsiveness", "clarity"];
  if (highlightEl) {
    highlightEl.innerHTML = items
      .slice(0, 4)
      .map((aspect) => {
        const tone = aspect.includes("feedback") || flags.length ? "negative" : "positive";
        return `<span class="highlight-item highlight-${tone}">${formatAspect(aspect)}</span>`;
      })
      .join("");
  }
  if (absaEl) {
    absaEl.innerHTML = items
      .slice(0, 5)
      .map((aspect) => {
        const tone = aspect.includes("feedback") ? "negative" : "positive";
        return `<span class="absa-tag absa-${tone}">${formatAspect(aspect)}</span>`;
      })
      .join("");
  }
}

function buildSummaryText(stage, nss, aspects, band) {
  const stageLabel = formatStage(stage);
  const sentiment = band ? band.toLowerCase() : nss >= 0 ? "positive" : "risk";
  const strengths = aspects.slice(0, 2).map(formatAspect);
  const focus = aspects[2] ? formatAspect(aspects[2]) : "feedback cadence";
  const strengthLabel = strengths.length ? strengths.join(" & ") : "responsiveness";
  return `Candidate sentiment landed ${sentiment} at the ${stageLabel} stage. Strengths: ${strengthLabel}. Focus next: ${focus}.`;
}

function buildCoachingCue(aspects, stage) {
  const focus = aspects.find((a) => a.includes("feedback")) || aspects[0] || "follow-up clarity";
  const stageLabel = formatStage(stage);
  return `Coach the ${stageLabel.toLowerCase()} crew on ${formatAspect(
    focus,
  )} and ship a follow-up within 24 hours.`;
}

function renderTranscriptPlayback(text) {
  const target = document.getElementById("transcript-playback");
  if (!target) return;
  clearTimeout(target.__transcriptTimer);
  const cleaned = text.trim();
  if (!cleaned) {
    target.textContent = "Transcript playback will appear here once scored.";
    return;
  }
  const tokens = cleaned.split(/\s+/);
  target.innerHTML = tokens
    .map((word, idx) => `<span data-idx="${idx}">${word}</span>`)
    .join(" ");
  let index = 0;
  const step = () => {
    const prev = target.querySelector("span.active");
    if (prev) prev.classList.remove("active");
    const next = target.querySelector(`span[data-idx="${index}"]`);
    if (next) {
      next.classList.add("active");
      next.scrollIntoView({ block: "nearest", inline: "center" });
    }
    index = (index + 1) % tokens.length;
    target.__transcriptTimer = setTimeout(step, 240);
  };
  target.__transcriptTimer = setTimeout(step, 320);
}

function updateQualityBlock(data) {
  try {
    const qBlock = qs("quality-block");
    if (!qBlock || data.quality_score === undefined) return;
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
      let svg = badge.querySelector("svg");
      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "14");
        svg.setAttribute("height", "14");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
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
    }
    if (flagsEl) {
      const fl = data.quality_flags || [];
      flagsEl.textContent = fl.length ? `Flags: ${fl.join(", ")}` : "";
    }
    if (elig) {
      const eligible = !!data.incentive_eligible;
      elig.textContent = eligible
        ? "Eligible for eGift"
        : "Ineligible (low-effort detected)";
      elig.style.color = eligible ? "#34d399" : "#f87171";
    }
  } catch (err) {
    console.warn("quality block render error", err);
  }
}

function synthesizeHeatmapMatrix(index, textScore, submission) {
  const stages = [
    "applied",
    "recruiter",
    "hiring_manager",
    "panel",
    "assignment",
    "offer",
    "rejected",
  ];
  const aspects = ["communication", "scheduling", "clarity", "respect", "feedback"];
  const token = window.CANDIDATE_TOKEN || "seed";
  const activeStage = submission.stage;
  const matrix = {};
  aspects.forEach((aspect, aIdx) => {
    matrix[aspect] = {};
    stages.forEach((stage, sIdx) => {
      const noise = seededRandom(token, `${aspect}:${stage}`) - 0.5;
      let value = index - 0.4 + noise * 0.6;
      if (stage === activeStage) value += 0.12;
      if (aspect === "feedback") value += (textScore - 0.5) * 0.5;
      if (aspect === "respect") value += 0.05;
      value += (aIdx - 2) * 0.03 + (sIdx - 3) * 0.015;
      value = Math.max(-0.9, Math.min(0.9, value));
      matrix[aspect][stage] = Number(value.toFixed(2));
    });
  });
  return matrix;
}

function applyHeatmapMatrix(matrix) {
  document
    .querySelectorAll(".heatmap-cell[data-aspect]")
    .forEach((cell) => {
      const aspect = cell.dataset.aspect;
      const stage = cell.dataset.stage;
      const value = matrix?.[aspect]?.[stage];
      if (typeof value !== "number") return;
      const formatted = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
      cell.textContent = formatted;
      cell.classList.remove(
        "heatmap-positive",
        "heatmap-negative",
        "heatmap-neutral",
      );
      const cls =
        value > 0.15
          ? "heatmap-positive"
          : value < -0.15
            ? "heatmap-negative"
            : "heatmap-neutral";
      cell.classList.add(cls);
    });
}

function formatStage(stage) {
  const map = {
    applied: "Applied",
    recruiter: "Recruiter Screen",
    hiring_manager: "Hiring Manager",
    panel: "Panel",
    assignment: "Take-home",
    offer: "Offer",
    rejected: "Closure",
  };
  return map[stage] || "Panel";
}

function formatAspect(aspect) {
  return (aspect || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}
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
    toast()?.(r.ok ? "DLQ seeded" : "Error seeding", r.ok ? "positive" : "warning");
  });
  replayBtn?.addEventListener("click", async () => {
    const t0 = performance.now();
    const r = await fetch("/api/dlq-retry");
    const t1 = performance.now();
    trackNetTiming("dlq-retry", Math.round(t1 - t0));
    toast()?.(
      r.ok ? "Replay triggered" : "Replay error",
      r.ok ? "positive" : "warning",
    );
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

function init() {
  performanceMark("app_init_start");
  initCandidateToken();
  wireSurvey();
  wireSubmission();
  wireTabs();
  wireDLQButtons();
  wireMisc();
  setupInstructionPlacard();
  setupScoreReveal();
  restorePanels();
  performanceMark("app_init_end");
  // Auto-load panel metrics after idle
  // Idle-load CTR metrics module only when browser is free
  requestIdleCallback?.(() => {
    import("./metrics.js").then((m) => m.loadCtrMetrics()).catch(() => {});
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
