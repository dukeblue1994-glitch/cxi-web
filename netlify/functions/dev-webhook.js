import { format } from "node:util";

function scrubValue(key, value) {
  if (typeof value !== "string") return value;
  let sanitized = value.replace(/\b[\w.-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]");
  if (/(name|candidate|interviewer)/i.test(key)) {
    sanitized = "[candidate]";
  }
  return sanitized;
}

function maskPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const masked = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === "object") {
      masked[key] = maskPayload(value);
    } else {
      masked[key] = scrubValue(key, value);
    }
  }
  return masked;
}

export const handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const masked = maskPayload(payload);
  const summary = {
    stage: masked.stage,
    composite: masked.composite,
    nss: masked.nss,
    eligible: masked.eligible,
    submittedAt: masked.submittedAt,
  };

  console.log("[dev-webhook] snapshot", format("%o", summary));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, summary }),
  };
};
