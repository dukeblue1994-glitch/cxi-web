const stageLabels = {
  applied: "Applied",
  recruiter: "Recruiter Screen",
  hiring_manager: "Hiring Manager",
  panel: "Panel Interview",
  assignment: "Take-home",
  offer: "Offer",
  rejected: "Closure",
};

const roster = [
  { name: "Jason R.", goal: "SLA < 48 hours feedback." },
  {
    name: "Jess D.",
    goal: "Clarify interview agenda and the role every time.",
  },
  {
    name: "Priya K.",
    goal: "Ship technical debriefs with action-ready notes.",
  },
  {
    name: "Amelia S.",
    goal: "Walk candidates through the rubric before questions start.",
  },
];

const aspectPlaybook = {
  communication: {
    headline: "Tighten interview communication loops",
    action:
      "Share the interview outline before each call and recap decisions in writing within 24 hours.",
  },
  clarity: {
    headline: "Level-set expectations on scope",
    action:
      "Align interviewers on what “great” looks like and provide concrete examples when answering role questions.",
  },
  feedback: {
    headline: "Accelerate candidate feedback",
    action:
      "Commit to a 48-hour feedback SLA and template the debrief so panelists can add signal quickly.",
  },
  respect: {
    headline: "Reinforce candidate-first etiquette",
    action:
      "Remind panelists to pause, let the candidate finish, and thank them for their time explicitly.",
  },
  scheduling: {
    headline: "Smooth out the scheduling path",
    action:
      "Centralize interviewer availability and send consolidated invites with buffers for prep.",
  },
};

const shareTemplates = {
  email: (ctx, tasks) => `Subject: CXI coaching plan for ${ctx.stageLabel}

Hi team,

${ctx.summary}
\nKey coaching moves:\n${tasks
    .map((task) => `• ${task.headline} — ${task.action}`)
    .join("\n")}\n\nLet’s close the loop by ${ctx.deadlineLabel}.`,
  slack: (ctx, tasks) => `:sparkles: CXI pulse for ${ctx.stageLabel}\n${ctx.summary}\n${tasks
    .map((task) => `• *${task.headline}* — ${task.action}`)
    .join("\n")}\n${ctx.deadlineLabel}`,
  teams: (ctx, tasks) => `CXI dashboard sync (${ctx.stageLabel})\n${ctx.summary}\nAction queue:\n${tasks
    .map((task) => `• ${task.headline} — ${task.action}`)
    .join("\n")}\nReply here with owners by ${ctx.deadlineLabel}.`,
  pdf: (ctx, tasks) => `CXI Coaching Brief\nStage: ${ctx.stageLabel}\nNSS: ${ctx.nss.toFixed(2)}\nComposite Index: ${(ctx.index * 100).toFixed(0)}\n\nSummary\n${ctx.summary}\n\nCoaching Plan\n${tasks
    .map((task, idx) => `${idx + 1}. ${task.headline}\n   ${task.action}`)
    .join("\n")}\n\nDistribution List\n${roster.map((r) => `${r.name} — ${r.goal}`).join("\n")}`,
};

const aspectKeywords = {
  communication: ["communicat", "explain", "responsive", "tone"],
  clarity: ["clear", "clarity", "understand", "expect"],
  feedback: ["feedback", "follow", "response", "update"],
  respect: ["respect", "kind", "rude", "courteous"],
  scheduling: ["schedule", "reschedule", "calendar", "timing"],
};

const timeframeMinutes = {
  "7d": 7 * 24 * 60,
  "30d": 30 * 24 * 60,
  "90d": 90 * 24 * 60,
};

let modalOverlay;
let checklistEl;
let summaryEl;
let sharePreviewEl;
let currentTasks = [];
let lastContext = null;

function getToast() {
  return window.__cxToast || window.showToast || null;
}

function formatAspect(value = "") {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function formatPriority(nss = 0, index = 0.6) {
  if (nss < 0 || index < 0.5) return "high";
  if (nss < 0.3 || index < 0.65) return "medium";
  return "low";
}

function ensureModalBound() {
  if (modalOverlay) return;
  modalOverlay = document.getElementById("dashboard-modal");
  checklistEl = document.getElementById("dashboard-task-list");
  summaryEl = document.getElementById("dashboard-modal-summary");
  sharePreviewEl = document.getElementById("share-preview");
  if (!modalOverlay) return;

  modalOverlay.addEventListener("click", (evt) => {
    if (evt.target === modalOverlay) {
      closeModal();
    }
  });
  modalOverlay
    .querySelectorAll("[data-close-dashboard]")
    .forEach((btn) => btn.addEventListener("click", closeModal));
  const shareButtons = modalOverlay.querySelectorAll("[data-share]");
  shareButtons.forEach((btn) =>
    btn.addEventListener("click", () => handleShare(btn.dataset.share)),
  );
  const copyBtn = modalOverlay.querySelector('[data-action="copy-checklist"]');
  copyBtn?.addEventListener("click", copySelectedTasks);
}

function openModal() {
  ensureModalBound();
  if (!modalOverlay) return;
  modalOverlay.hidden = false;
  requestAnimationFrame(() => {
    modalOverlay.classList.add("visible");
  });
}

function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("visible");
  setTimeout(() => {
    modalOverlay.hidden = true;
    if (sharePreviewEl) {
      sharePreviewEl.hidden = true;
      sharePreviewEl.textContent = "";
    }
  }, 180);
}

function gatherContext() {
  const submission = window.__lastSubmission || {};
  const result = window.__lastResult || {};
  const summary =
    document.getElementById("response-summary")?.textContent.trim() ||
    "Latest candidate feedback captured.";
  const stage = submission.stage || "panel";
  const index = Number(result.composite_index || 0.62);
  const nss = Number(result.nss ?? 0.4);
  const stageLabel = stageLabels[stage] || formatAspect(stage);
  const aspects = Array.isArray(submission.aspects) && submission.aspects.length
    ? submission.aspects
    : ["communication", "feedback", "clarity"];
  const deadlineLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(Date.now() + 36 * 3600 * 1000);
  return {
    submission,
    result,
    summary,
    stage,
    stageLabel,
    aspects,
    index,
    nss,
    deadlineLabel,
  };
}

function buildTasks(ctx) {
  const priority = formatPriority(ctx.nss, ctx.index);
  return ctx.aspects.slice(0, 3).map((aspect, idx) => {
    const play = aspectPlaybook[aspect] || {
      headline: `Improve ${formatAspect(aspect)}`,
      action: `Run a coaching huddle focused on ${formatAspect(aspect)} and capture one measurable improvement.`,
    };
    const owner = roster[idx % roster.length];
    return {
      id: `task-${Date.now()}-${idx}`,
      aspect,
      headline: play.headline,
      action: play.action,
      owner,
      priority: idx === 0 ? priority : idx === 1 ? "medium" : "low",
    };
  });
}

function renderChecklist(tasks, ctx) {
  if (!checklistEl) return;
  checklistEl.innerHTML = "";
  tasks.forEach((task) => {
    const item = document.createElement("label");
    item.className = "checklist-item";
    item.innerHTML = `
      <input type="checkbox" data-task-id="${task.id}" checked />
      <span>
        <strong>${task.headline}</strong>
        <em>${task.action}</em>
        <small>Owner: ${task.owner.name} · ${task.owner.goal}</small>
        <span class="chip chip-${task.priority}">${formatAspect(task.priority)} priority</span>
      </span>
    `;
    checklistEl.appendChild(item);
  });
  if (summaryEl) {
    summaryEl.textContent = `${tasks.length} coaching task${
      tasks.length === 1 ? "" : "s"
    } queued for ${ctx.stageLabel}.`;
  }
}

function copySelectedTasks() {
  if (!checklistEl) return;
  const selectedIds = Array.from(
    checklistEl.querySelectorAll('input[type="checkbox"]:checked'),
  ).map((input) => input.dataset.taskId);
  const tasks = currentTasks.filter((task) => selectedIds.includes(task.id));
  if (!tasks.length) {
    getToast()?.("Select at least one task to copy.", "warning");
    return;
  }
  const payload = tasks
    .map(
      (task, idx) =>
        `${idx + 1}. ${task.headline}\n   ${task.action}\n   Owner: ${task.owner.name} (${task.owner.goal})`,
    )
    .join("\n\n");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(payload).then(
      () => getToast()?.("Coaching tasks copied to clipboard.", "positive"),
      () => getToast()?.("Clipboard copy unavailable in this browser.", "warning"),
    );
  } else {
    getToast()?.("Clipboard access unavailable; select text manually.", "warning");
  }
}

function handleShare(channel) {
  if (!sharePreviewEl) return;
  const template = shareTemplates[channel];
  if (!template) return;
  const preview = template(lastContext, currentTasks);
  sharePreviewEl.hidden = false;
  sharePreviewEl.textContent = preview;
  sharePreviewEl.dataset.channel = channel;
  const toastTone = channel === "email" || channel === "pdf" ? "positive" : "warning";
  getToast()?.(`Preview ready for ${channel.toUpperCase()}.`, toastTone);
}

function highlightCell(aspect, stage) {
  document
    .querySelectorAll(".heatmap-cell.active")
    .forEach((cell) => cell.classList.remove("active"));
  const cell = document.querySelector(
    `.heatmap-cell[data-aspect="${aspect}"][data-stage="${stage}"]`,
  );
  cell?.classList.add("active");
}

function extractEvidence(aspect) {
  const submission = window.__lastSubmission || {};
  const text = [submission.well, submission.better, submission.rant]
    .filter(Boolean)
    .join(" ");
  if (!text) {
    return [
      "No transcript captured yet — once feedback is submitted, NSS will surface exact highlights.",
    ];
  }
  const keywords = aspectKeywords[aspect] || [aspect];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const matches = [];
  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      let highlighted = sentence;
      keywords.forEach((kw) => {
        const reg = new RegExp(`(${kw})`, "gi");
        highlighted = highlighted.replace(reg, '<mark>$1</mark>');
      });
      matches.push(highlighted);
    }
  });
  if (!matches.length) {
    const first = sentences[0] || text;
    return [first];
  }
  return matches.slice(0, 3);
}

function renderHeatmapDetail(aspect, stage) {
  const detailEl = document.getElementById("heatmap-detail");
  const titleEl = document.getElementById("detail-title");
  const contentEl = document.getElementById("detail-content");
  if (!detailEl || !titleEl || !contentEl) return;
  highlightCell(aspect, stage);

  const matrix = window.__lastResult?.heatmap || {};
  const value = matrix?.[aspect]?.[stage];
  const score = typeof value === "number" ? value : 0;
  const ctx = gatherContext();
  const evidence = extractEvidence(aspect);
  const stageLabel = stageLabels[stage] || formatAspect(stage);
  titleEl.textContent = `${formatAspect(aspect)} × ${stageLabel}`;
  const tone = score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";
  const formattedScore = `${score >= 0 ? "+" : ""}${score.toFixed(2)}`;
  contentEl.innerHTML = `
    <div class="score-pill score-${tone}">Sentiment ${formattedScore}</div>
    <p class="mt-6">${aspectPlaybook[aspect]?.headline ||
      `Focus on ${formatAspect(aspect)} to lift ${stageLabel}.`}</p>
    <div class="mt-6"><strong>In their words:</strong></div>
    <ul class="mt-025 insight-list">
      ${evidence.map((line) => `<li>${line}</li>`).join("")}
    </ul>
    <div class="mt-6"><strong>Next coaching move:</strong></div>
    <p>${aspectPlaybook[aspect]?.action ||
      "Review transcripts and capture a coaching follow-up."}</p>
    <div class="mt-8">
      <button class="btn btn-primary" data-action="push-dashboard">Queue task for ${stageLabel}</button>
    </div>
  `;
  contentEl
    .querySelector('[data-action="push-dashboard"]')
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      pushToDashboard();
    });
  detailEl.classList.remove("hidden");
  detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateTaskHeader() {
  const container = document.querySelector(".task-header");
  if (!container) return;
  const visible = Array.from(document.querySelectorAll(".task-item")).filter(
    (item) => item.style.display !== "none",
  );
  container.textContent = `Active Tasks (${visible.length})`;
}

export function exportData(format = "json") {
  ensureModalBound();
  const previewEl = document.getElementById("export-preview");
  const contentEl = document.getElementById("export-content");
  if (!previewEl || !contentEl) return;
  const ctx = gatherContext();
  const payload = {
    timestamp: new Date().toISOString(),
    nss: ctx.nss,
    composite_index: ctx.index,
    stage: ctx.stage,
    summary: ctx.summary,
    coaching_cue:
      document.getElementById("coaching-cue")?.textContent.trim() ||
      "Coach interview team on timely follow-ups.",
  };
  let preview = "";
  switch (format) {
    case "json":
      preview = JSON.stringify(payload, null, 2);
      break;
    case "csv":
      preview = `timestamp,nss,index,stage,summary,coaching\n"${payload.timestamp}",${payload.nss.toFixed(
        2,
      )},${(payload.composite_index * 100).toFixed(0)},${payload.stage},"${payload.summary}","${payload.coaching_cue}"`;
      break;
    case "pdf":
      preview = shareTemplates.pdf(ctx, buildTasks(ctx));
      break;
    case "summary":
    default:
      preview = `${ctx.summary}\n\nNSS: ${ctx.nss.toFixed(2)}\nComposite Index: ${(ctx.index * 100).toFixed(0)}\nCoaching: ${payload.coaching_cue}`;
      break;
  }
  previewEl.hidden = false;
  contentEl.textContent = preview;
  getToast()?.(`Preview ready for ${format.toUpperCase()}.`, "positive");
}

export function showHeatmapDetail(aspect, stage) {
  ensureModalBound();
  renderHeatmapDetail(aspect, stage);
}

export function filterTasks() {
  const stageFilter = document.getElementById("stage-filter")?.value || "";
  const priorityFilter = document.getElementById("priority-filter")?.value || "";
  const timeframeFilter = document.getElementById("timeframe-filter")?.value || "30d";
  const maxAge = timeframeMinutes[timeframeFilter] || timeframeMinutes["30d"];
  const now = Date.now();
  const items = document.querySelectorAll(".task-item");
  let visibleCount = 0;
  items.forEach((item) => {
    const stage = item.dataset.stage || "";
    const priority = item.dataset.priority || "";
    const created = Number(item.dataset.createdAt || 0);
    const ageMinutes = created ? (now - created) / 60000 : Number(item.dataset.ageMinutes || 0);
    const matchesStage = !stageFilter || stage === stageFilter;
    const matchesPriority = !priorityFilter || priority === priorityFilter;
    const matchesTimeframe = !maxAge || ageMinutes <= maxAge;
    if (matchesStage && matchesPriority && matchesTimeframe) {
      item.style.display = "block";
      visibleCount += 1;
    } else {
      item.style.display = "none";
    }
  });
  const header = document.querySelector(".task-header");
  if (header) header.textContent = `Active Tasks (${visibleCount})`;
}

export function pushToDashboard() {
  ensureModalBound();
  if (!modalOverlay) return;
  const ctx = gatherContext();
  lastContext = ctx;
  currentTasks = buildTasks(ctx);
  renderChecklist(currentTasks, ctx);
  openModal();
  handleShare("email");
  getToast()?.("Coaching plan staged in dashboard.", "positive");
}

export function pushToDashboardSilent(task) {
  currentTasks = buildTasks(task || gatherContext());
}

export function showHeatmapDetailFromCell(aspect, stage) {
  showHeatmapDetail(aspect, stage);
}

// Initialize filters on load
if (document.readyState === "complete") {
  filterTasks();
} else {
  window.addEventListener("load", () => filterTasks());
}

export function updateRosterHighlight() {
  const rosterEl = document.getElementById("interviewer-roster");
  if (!rosterEl) return;
  rosterEl.classList.add("pulse");
  setTimeout(() => rosterEl.classList.remove("pulse"), 1200);
}

export default {
  exportData,
  showHeatmapDetail,
  filterTasks,
  pushToDashboard,
};
