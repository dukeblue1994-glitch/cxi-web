import { loadCtrMetrics } from "./metrics.js";
import { countWords } from "./utils.js";

export const state = { ratings: {}, aspects: [] };

export function updateProgress() {
  const form = document.getElementById("survey-form");
  if (!form) return;
  const formData = new FormData(form);
  let completed = 0;
  const total = 8;
  if (formData.get("stage")) completed++;
  if (formData.get("role_family")) completed++;
  if (state.ratings.overall) completed++;
  if (state.ratings.fairness) completed++;
  if (countWords(document.getElementById("well").value) === 15) completed++;
  if (countWords(document.getElementById("better").value) === 15) completed++;
  if ((state.ratings.attention || 0) >= 4) completed++;
  if (document.getElementById("consent").checked) completed++;
  const percentage = (completed / total) * 100;
  document.getElementById("progress-fill").style.width = percentage + "%";
  const submitBtn = document.getElementById("submit-btn");
  const disable = completed < total;
  submitBtn.disabled = disable;
  submitBtn.title = disable
    ? "Complete all required items: stage, role family, two ratings, exactly 15 words twice, attention, consent."
    : "Ready to score";
}
export function enforceExactWords(textareaId, countId, exact) {
  const ta = document.getElementById(textareaId);
  const words = ta.value.trim().match(/\S+/g) || [];
  if (words.length > exact) {
    ta.value = words.slice(0, exact).join(" ");
  }
  const n = (ta.value.trim().match(/\S+/g) || []).length;
  const countDiv = document.getElementById(countId);
  countDiv.textContent = `${n} / ${exact} words`;
  countDiv.className = "word-count " + (n === exact ? "valid" : "invalid");
  updateProgress();
}
export function setupSurveyInteractions() {
  document.addEventListener("click", (e) => {
    if (e.target.classList?.contains("rating-btn")) {
      const group = e.target.parentElement;
      const field = group.dataset.field;
      const value = parseInt(e.target.dataset.value);
      group
        .querySelectorAll(".rating-btn")
        .forEach((btn) => btn.classList.remove("selected"));
      e.target.classList.add("selected");
      state.ratings[field] = value;
      updateProgress();
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.classList?.contains("aspect-btn")) {
      const aspect = e.target.dataset.aspect;
      if (e.target.classList.contains("selected")) {
        e.target.classList.remove("selected");
        state.aspects = state.aspects.filter((a) => a !== aspect);
      } else {
        e.target.classList.add("selected");
        state.aspects.push(aspect);
      }
      updateProgress();
    }
  });
  document
    .getElementById("well")
    ?.addEventListener("input", () =>
      enforceExactWords("well", "well-count", 15)
    );
  document
    .getElementById("better")
    ?.addEventListener("input", () =>
      enforceExactWords("better", "better-count", 15)
    );
  document.getElementById("rant")?.addEventListener("input", () => {
    const ta = document.getElementById("rant");
    const n = ta.value.length;
    const c = document.getElementById("rant-count");
    c.textContent = `${n} / 120 chars`;
  });
  document
    .getElementById("survey-form")
    ?.addEventListener("change", updateProgress);
  document
    .getElementById("consent")
    ?.addEventListener("change", updateProgress);
}
export function showResultsTab(tabName) {
  const tabsBtns = Array.from(document.querySelectorAll(".nav-tab"));
  tabsBtns.forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
    btn.setAttribute("tabindex", "-1");
  });
  const match = tabsBtns.find((b) =>
    (b.textContent || "").toLowerCase().includes(tabName)
  );
  if (match) {
    match.classList.add("active");
    match.setAttribute("aria-selected", "true");
    match.removeAttribute("tabindex");
  }
  const tabs = ["summary", "heatmap", "tasks", "export"];
  tabs.forEach((tab) => {
    const el = document.getElementById(`${tab}-tab`);
    if (el) {
      el.classList.toggle("hidden", tab !== tabName);
      el.setAttribute("role", "tabpanel");
      el.setAttribute("aria-labelledby", `tab-${tab}`);
      el.setAttribute("tabindex", "0");
    }
  });
  if (tabName === "summary") loadCtrMetrics();
  if (tabName === "heatmap") {
    // Lazy import heatmap module and render using last result if available
    import("./heatmap.js")
      .then((m) => {
        const data = window.__lastResult || {};
        m.renderHeatmap(data);
      })
      .catch((err) => console.error("Failed to load or render heatmap:", err));
  }
}
