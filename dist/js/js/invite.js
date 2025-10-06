const inlineOpenInvite =
  typeof window !== "undefined" && typeof window.openInvite === "function"
    ? window.openInvite
    : null;

const toast = () => window.__cxToast || window.showToast || null;

const stageLabels = {
  applied: "Applied",
  recruiter: "Recruiter Screen",
  hiring_manager: "Hiring Manager",
  panel: "Panel Interview",
  assignment: "Take-home",
  offer: "Offer",
  rejected: "Closure",
};

function formatAspect(value = "") {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function derivePriority(index = 0.6, nss = 0.3) {
  if (nss < 0 || index < 0.5) return "high";
  if (nss < 0.35 || index < 0.65) return "medium";
  return "low";
}

function ensureTaskHeader() {
  const header = document.querySelector(".task-header");
  if (!header) return;
  const visible = Array.from(document.querySelectorAll(".task-item"))
    .filter((item) => item.style.display !== "none")
    .length;
  header.textContent = `Active Tasks (${visible})`;
}

function createTaskCard({
  stage,
  aspects,
  index,
  priority,
  createdAt,
  nss,
  cue,
}) {
  const container = document.getElementById("task-list");
  if (!container) return null;
  const card = document.createElement("div");
  card.className = "task-item";
  card.dataset.stage = stage;
  card.dataset.priority = priority;
  card.dataset.createdAt = createdAt;
  card.dataset.ageMinutes = Math.max(
    0,
    Math.round((Date.now() - createdAt) / 60000),
  );
  const stageLabel = stageLabels[stage] || formatAspect(stage);
  const aspectTags = (aspects || [])
    .map((a) => `<span class="tag">${formatAspect(a)}</span>`)
    .join(" ");
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
  const diffMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));
  const relFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const ageLabel =
    diffMinutes < 60
      ? relFormatter.format(-diffMinutes, "minute")
      : relFormatter.format(-Math.round(diffMinutes / 60), "hour");
  card.innerHTML = `
    <div class="task-meta">
      <div>
        <span class="task-priority priority-${priority}">${priorityLabel}</span>
        <span class="muted ml-1">${stageLabel} • ${ageLabel}</span>
      </div>
      <div class="muted small">NSS: ${nss >= 0 ? "+" : ""}${nss.toFixed(2)}</div>
    </div>
    <div class="task-coaching">${new Option(cue ?? "").innerHTML}</div>
    <div class="task-details">Aspects: ${aspectTags || "–"} • Index: ${(index * 100).toFixed(
      0,
    )}</div>
  `;
  container.prepend(card);
  return card;
}

function appendTaskRow({ stage, aspects, index, priority, createdAt, nss, cue }) {
  const tableBody = document.getElementById("task-rows");
  if (!tableBody) return;
  const row = document.createElement("tr");
  const ts = new Date(createdAt);
  row.innerHTML = `
    <td>${ts.toLocaleString()}</td>
    <td>${stageLabels[stage] || formatAspect(stage)}</td>
    <td>${(aspects || [])
      .map((aspect) => `<span class="tag">${formatAspect(aspect)}</span>`)
      .join(" ")}</td>
    <td><span class="priority-${priority}">${(index * 100).toFixed(0)}</span></td>
  `;
  tableBody.prepend(row);
}

export function openInvite(candidateToken = "", nudgeRound = 0) {
  if (typeof inlineOpenInvite === "function") {
    return inlineOpenInvite(candidateToken, nudgeRound);
  }
  return null;
}

export function pushTaskRow(task = {}) {
  const submission = window.__lastSubmission || {};
  const result = window.__lastResult || {};
  const stage = task.stage || submission.stage || "panel";
  const aspects = task.aspects && task.aspects.length ? task.aspects : submission.aspects || [];
  const index =
    typeof task.index === "number"
      ? task.index
      : typeof result.composite_index === "number"
        ? result.composite_index
        : 0.62;
  const nss =
    typeof task.nss === "number"
      ? task.nss
      : typeof result.nss === "number"
        ? result.nss
        : 0.32;
  const cue =
    task.cue ||
    document.getElementById("coaching-cue")?.textContent ||
    "Confirm follow-up SLAs and share the interview outline.";
  const priority = task.priority || derivePriority(index, nss);
  const createdAt = task.createdAt || Date.now();

  createTaskCard({ stage, aspects, index, priority, createdAt, nss, cue });
  appendTaskRow({ stage, aspects, index, priority, createdAt, nss, cue });
  ensureTaskHeader();
  window.filterTasks?.();
  const notify = toast();
  notify?.("Task queued for the hiring squad.", priority === "high" ? "warning" : "positive");
}

export function showATSWebhook(stage, role, token) {
  let debugMode = false;
  try {
    debugMode = new URL(location.href).searchParams.get("debug") === "1";
  } catch (_) {
    debugMode = false;
  }
  if (!debugMode) return;
  const payload = {
    event: "candidate_feedback_invite",
    stage: stage || "panel",
    role_family: role || "engineering",
    candidate_token:
      token ||
      window.CANDIDATE_TOKEN ||
      "anon_" + Math.random().toString(36).slice(2, 7),
    sent_at: new Date().toISOString(),
    source: new URL(location.href).searchParams.get("src") || null,
  };
  const panel = document.getElementById("ats-panel");
  const json = document.getElementById("ats-json");
  const stageEl = document.getElementById("ats-stage");
  const roleEl = document.getElementById("ats-role");
  const tokenEl = document.getElementById("ats-token");
  if (stageEl) stageEl.textContent = payload.stage;
  if (roleEl) roleEl.textContent = payload.role_family;
  if (tokenEl) tokenEl.textContent = payload.candidate_token;
  if (json) json.textContent = JSON.stringify(payload, null, 2);
  if (panel) {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
  }
}
