import { createRng, randomize } from "./rng.js";
import { computeSentiment } from "./sentiment.js";
import { clamp, createSnapshot, describeBand, wordCount } from "./snapshot.js";

const ASPECTS = [
  "Communication",
  "Fairness",
  "Feedback Timeliness",
  "Conduct",
  "Clarity",
  "Scheduling",
  "Respect",
];

const ATTENTION_ITEMS = [
  {
    value: "strongly-agree",
    label: "I strongly agree that I stayed fully attentive through the conversation.",
  },
  { value: "agree", label: "I agree the conversation required my full attention." },
  { value: "neutral", label: "I neither agree nor disagree about my attention level." },
  { value: "disagree", label: "I disagree — my attention dipped." },
  { value: "strongly-disagree", label: "I strongly disagree — I missed key details." },
];

const state = {
  rng: createRng(Date.now().toString(36)),
  samplingRate: 0.35,
  interceptArmed: false,
  forceMode: false,
  snapshot: null,
  seed: null,
};

function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function updateCounter(textarea, counterEl) {
  const kind = textarea.parentElement?.dataset?.kind;
  if (kind === "characters") {
    const len = textarea.value.trim().length;
    counterEl.textContent = `${len} / 90–120`;
    counterEl.dataset.valid = len >= 90 && len <= 120 ? "true" : "false";
  } else {
    const wc = wordCount(textarea.value);
    const min = Number.parseInt(textarea.dataset.minWords ?? "0", 10);
    counterEl.textContent = `${wc} words`;
    counterEl.dataset.valid = wc >= min ? "true" : "false";
  }
}

function updateSentimentChip(target, text) {
  const chip = document.querySelector(`.sentiment-chip[data-target="${target}"]`);
  if (!chip) return;
  const sentiment = computeSentiment(text);
  chip.textContent = `${sentiment.tone.charAt(0).toUpperCase()}${sentiment.tone.slice(1)} · ${sentiment.compound.toFixed(2)}`;
  chip.dataset.tone = sentiment.tone;
}

function sanitizeSubmission(snapshot) {
  return {
    stage: snapshot.stage,
    composite: snapshot.composite,
    nss: snapshot.nss,
    index: snapshot.index,
    eligible: snapshot.eligible,
    attentionPassed: snapshot.attentionPassed,
    consent: snapshot.consent,
    sentiments: snapshot.sentiments,
    aspects: snapshot.aspects,
    summary: snapshot.summary,
    wentWell: snapshot.wentWell,
    couldBeBetter: snapshot.couldBeBetter,
    submittedAt: snapshot.submittedAt,
    seed: snapshot.seed,
    persona: { interviewer: "Jordan (Acme)", candidate: "[candidate]", email: "[email]" },
  };
}

async function postSnapshot(snapshot) {
  try {
    const response = await fetch("/.netlify/functions/dev-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizeSubmission(snapshot)),
    });
    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn("Webhook simulation failed", error);
    return { ok: false };
  }
}

function renderSnapshot(snapshot) {
  const resultsView = qs("results-view");
  resultsView.hidden = false;

  qs("composite-score").textContent = `${snapshot.composite}`;
  qs("composite-band").textContent = describeBand(snapshot.composite);
  qs("nss-score").textContent = snapshot.nss.toFixed(2);
  qs("index-score").textContent = `${snapshot.index}`;
  qs("eligibility-flag").textContent = snapshot.eligible ? "Eligible" : "Review";
  qs("attention-status").textContent = snapshot.attentionPassed ? "Strongly agree" : "Retake";
  qs("summary-length").textContent = `${snapshot.summaryLength} chars`;

  const chips = snapshot.aspects.map((aspect) => {
    const li = document.createElement("li");
    li.textContent = aspect;
    return li;
  });
  const chipContainer = qs("aspect-chips");
  chipContainer.replaceChildren(...chips);

  const heatmapRows = qs("heatmap-rows");
  heatmapRows.replaceChildren();
  const stages = [
    { stage: "Recruiter screen", index: clamp(snapshot.index - 8, 0, 100), sla: "On track" },
    { stage: "Panel", index: clamp(snapshot.index - 4, 0, 100), sla: "Coaching" },
    { stage: snapshot.stage, index: snapshot.index, sla: snapshot.eligible ? "Met" : "Follow up" },
  ];
  stages.forEach(({ stage, index, sla }) => {
    const row = document.createElement("tr");
    const stageCell = document.createElement("th");
    stageCell.scope = "row";
    stageCell.textContent = stage;
    const indexCell = document.createElement("td");
    indexCell.textContent = `${index}`;
    const slaCell = document.createElement("td");
    slaCell.textContent = sla;
    row.append(stageCell, indexCell, slaCell);
    heatmapRows.append(row);
  });

  const exportPreview = qs("export-preview");
  exportPreview.textContent = JSON.stringify(sanitizeSubmission(snapshot), null, 2);

  const panels = ["aspect-panel", "heatmap-panel", "export-panel"];
  panels.forEach((id) => {
    const panel = qs(id);
    setTimeout(() => {
      panel.dataset.state = "ready";
    }, 320);
  });
}

function toggleHint() {
  const hint = qs("intercept-hint");
  hint.hidden = !state.interceptArmed;
}

function openPulse(reason = "manual") {
  state.lastTrigger = reason;
  const overlay = qs("pulse-overlay");
  overlay.hidden = false;
  overlay.dataset.opened = "true";
  const summary = qs("summary-input");
  summary.focus({ preventScroll: false });
}

function closePulse() {
  qs("pulse-overlay").hidden = true;
  qs("pulse-overlay").dataset.opened = "false";
}

function resetForm(form) {
  form.reset();
  [
    ["summary-input", "summary-counter", "summary"],
    ["well-input", "well-counter", "went-well"],
    ["better-input", "better-counter", "could-be-better"],
  ].forEach(([inputId, counterId, target]) => {
    const textarea = qs(inputId);
    const counter = qs(counterId);
    textarea.value = "";
    updateCounter(textarea, counter);
    updateSentimentChip(target, "");
  });
  document
    .querySelectorAll(".aspect-chip")
    .forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  qs("submit-btn").disabled = true;
  renderAttentionOptions(state.rng);
  validateForm();
}

function validateForm() {
  const summary = qs("summary-input").value.trim();
  const well = qs("well-input").value.trim();
  const better = qs("better-input").value.trim();
  const attention = document.querySelector("input[name=attention]:checked");
  const consent = qs("consent-checkbox").checked;

  const summaryValid = summary.length >= 90 && summary.length <= 120;
  const wellValid = wordCount(well) >= 15;
  const betterValid = wordCount(better) >= 15;
  const attentionValid = attention?.value === "strongly-agree";

  const submitBtn = qs("submit-btn");
  const ready = summaryValid && wellValid && betterValid && attentionValid && consent;
  submitBtn.disabled = !ready;
  qs("submit-hint").textContent = ready
    ? "Looks great — submit when you're ready."
    : "Complete the required fields to enable submit.";
}

function handleAspectToggle(event) {
  const button = event.currentTarget;
  const pressed = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", pressed ? "false" : "true");
}

function renderAspects() {
  const grid = qs("aspect-grid");
  const buttons = ASPECTS.map((aspect) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aspect-chip";
    btn.textContent = aspect;
    btn.setAttribute("aria-pressed", "false");
    btn.dataset.aspect = aspect;
    btn.addEventListener("click", handleAspectToggle);
    return btn;
  });
  grid.replaceChildren(...buttons);
}

function renderAttentionOptions(rng) {
  const options = qs("attention-options");
  const randomized = randomize(ATTENTION_ITEMS, rng);
  const inputs = randomized.map(({ value, label }) => {
    const wrapper = document.createElement("label");
    wrapper.className = "attention-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "attention";
    input.value = value;
    const span = document.createElement("span");
    span.textContent = label;
    wrapper.append(input, span);
    return wrapper;
  });
  options.replaceChildren(...inputs);
}

function getSelectedAspects() {
  return Array.from(document.querySelectorAll(".aspect-chip[aria-pressed='true']"), (btn) => btn.dataset.aspect);
}

function armSampling(params) {
  const samplingParam = Number.parseFloat(params.get("sampling"));
  if (!Number.isNaN(samplingParam) && samplingParam >= 0 && samplingParam <= 1) {
    state.samplingRate = samplingParam;
  }
  const seed = params.get("seed") ?? Date.now().toString(36);
  state.seed = seed;
  state.rng = createRng(seed);
  state.forceMode = params.get("force") === "1";
  state.interceptArmed = state.forceMode || state.rng() < state.samplingRate;
  toggleHint();
  if (state.forceMode) {
    setTimeout(() => openPulse("force"), 800);
  }
}

function handleKeyboard(event) {
  if (event.key.toLowerCase() === "d" && event.shiftKey) {
    state.interceptArmed = !state.interceptArmed;
    toggleHint();
    if (state.interceptArmed && qs("pulse-overlay").hidden) {
      setTimeout(() => openPulse("demo-toggle"), 200);
    }
  }
  if (event.key === "Escape" && !qs("pulse-overlay").hidden) {
    closePulse();
  }
}

function setUpCounters() {
  const summary = qs("summary-input");
  const well = qs("well-input");
  const better = qs("better-input");
  updateCounter(summary, qs("summary-counter"));
  updateCounter(well, qs("well-counter"));
  updateCounter(better, qs("better-counter"));
}

function init() {
  renderAspects();
  setUpCounters();

  const params = new URLSearchParams(window.location.search);
  armSampling(params);
  renderAttentionOptions(state.rng);

  qs("leave-button").addEventListener("click", () => {
    if (state.interceptArmed) {
      openPulse("leave");
      state.interceptArmed = state.forceMode ? true : state.rng() < state.samplingRate;
      toggleHint();
    } else {
      state.interceptArmed = state.rng() < state.samplingRate;
      toggleHint();
    }
  });

  qs("pulse-close").addEventListener("click", closePulse);
  qs("pulse-overlay").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closePulse();
    }
  });

  const form = qs("pulse-form");
  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      if (target instanceof HTMLInputElement) {
        if (target.name === "attention" || target.name === "consent") {
          validateForm();
        }
      }
      return;
    }

    if (target.id === "summary-input") {
      updateCounter(target, qs("summary-counter"));
      updateSentimentChip("summary", target.value);
    } else if (target.id === "well-input") {
      updateCounter(target, qs("well-counter"));
      updateSentimentChip("went-well", target.value);
    } else if (target.id === "better-input") {
      updateCounter(target, qs("better-counter"));
      updateSentimentChip("could-be-better", target.value);
    }
    validateForm();
  });

  form.addEventListener("change", validateForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const summary = qs("summary-input").value.trim();
    const wentWell = qs("well-input").value.trim();
    const couldBeBetter = qs("better-input").value.trim();
    const attention = form.elements.namedItem("attention");
    const attentionValue = attention && "value" in attention ? attention.value :
      (form.querySelector("input[name=attention]:checked")?.value ?? "");
    const consent = qs("consent-checkbox").checked;
    const aspects = getSelectedAspects();

    const snapshot = createSnapshot({
      summary,
      wentWell,
      couldBeBetter,
      aspects,
      attention: attentionValue,
      consent,
      stage: "Final round",
      seed: state.seed,
    });

    state.snapshot = snapshot;
    renderSnapshot(snapshot);
    resetForm(form);
    closePulse();
    await postSnapshot(snapshot);
    document.dispatchEvent(new CustomEvent("cxi:snapshot", { detail: snapshot }));
  });

  document.addEventListener("keydown", handleKeyboard);

  document.dispatchEvent(new CustomEvent("cxi:ready", { detail: { state } }));
  validateForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
