import 'dotenv/config';
import { getStore } from "@netlify/blobs";

async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function forwardWithRetry(url, data, headers, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return true;
      }
      lastErr = new Error(`status_${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
  }
  throw lastErr;
}

// Vendor-specific adapters (module scope)
async function greenhouseAdapter(data) {
  const base = process.env.GH_BASE_URL || "https://harvest.greenhouse.io/v1";
  const apiKey = process.env.GH_API_KEY; // Harvest API key
  const applicationId = process.env.GH_APPLICATION_ID; // or map by email if available
  if (!apiKey || !applicationId) {
    return { forwarded: false, reason: "missing_env" };
  }
  const note = {
    body: `[CXI] ${data.event} at ${data.stage} (${data.role_family}) — token=${data.candidate_token}`,
  };
  const url = `${base}/applications/${applicationId}/activity_feed/notes`;
  const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(note),
  });
  return { forwarded: res.ok, status: res.status };
}

async function leverAdapter(data) {
  const base = process.env.LEVER_BASE_URL || "https://api.lever.co/v1";
  const apiKey = process.env.LEVER_API_KEY;
  const opportunityId = process.env.LEVER_OPPORTUNITY_ID; // or map via email
  if (!apiKey || !opportunityId) {
    return { forwarded: false, reason: "missing_env" };
  }
  const note = {
    text: `[CXI] ${data.event} at ${data.stage} (${data.role_family}) — token=${data.candidate_token}`,
  };
  const url = `${base}/opportunities/${opportunityId}/notes`;
  const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(note),
  });
  return { forwarded: res.ok, status: res.status };
}

async function workdayAdapter(data) {
  // Placeholder: Workday often requires OAuth/SOAP; integrate via iPaaS webhook preferred
  const url = process.env.WORKDAY_WEBHOOK_URL; // Use an integration bridge endpoint
  if (!url) {
    return { forwarded: false, reason: "missing_env" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { forwarded: res.ok, status: res.status };
}

export default async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const schema_version = "v1";
    const event_id =
      body.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const idempotency_key =
      request.headers.get("x-idempotency-key") || event_id;

    const payload = {
      schema_version,
      event: body.event || "candidate_feedback_invite",
      stage: body.stage || "unknown",
      role_family: body.role_family || "unknown",
      candidate_token: body.candidate_token || "anon",
      sent_at: body.sent_at || now,
      source: body.source || null,
      event_id,
      idempotency_key,
      received_at: now,
    };

    // Persist to Blobs (append via get+set for local dev compatibility)
    try {
      const store = getStore({ name: "ats" });
      const key = `${now.slice(0, 10)}.ndjson`;
      const existing = (await store.get(key)) || "";
      await store.set(key, existing + JSON.stringify(payload) + "\n");
    } catch (e) {
      console.error("[ATS] blob append failed", e);
    }

    // Test hook: simulate forward failure when header x-ats-test-fail = '1'
    const simulateFail = request.headers.get("x-ats-test-fail") === "1";

    // HMAC sign and forward if ATS_WEBHOOK_URL is set (webhook mode)
    const ATS_WEBHOOK_URL = process.env.ATS_WEBHOOK_URL;
    const HMAC_SECRET = process.env.HMAC_SECRET || "";
    const ATS_VENDOR = (process.env.ATS_VENDOR || "webhook").toLowerCase();

    if (ATS_VENDOR === "greenhouse") {
      try {
        await greenhouseAdapter(payload);
      } catch (e) {
        console.error("[ATS] greenhouse adapter failed", e);
      }
    } else if (ATS_VENDOR === "lever") {
      try {
        await leverAdapter(payload);
      } catch (e) {
        console.error("[ATS] lever adapter failed", e);
      }
    } else if (ATS_VENDOR === "workday") {
      try {
        await workdayAdapter(payload);
      } catch (e) {
        console.error("[ATS] workday adapter failed", e);
      }
    } else if (ATS_WEBHOOK_URL || simulateFail) {
      const bodyStr = JSON.stringify(payload);
      const signature = HMAC_SECRET
        ? await hmacHex(HMAC_SECRET, bodyStr)
        : null;
      try {
        if (simulateFail) {
          throw new Error("simulated_test_failure");
        }
        await forwardWithRetry(ATS_WEBHOOK_URL, payload, {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotency_key,
          ...(signature ? { "X-Signature": signature } : {}),
        });
      } catch (err) {
        console.error("[ATS] forward failed", err);
        // Dead-letter (append via get+set)
        try {
          const dlq = getStore({ name: "ats-dead-letter" });
          const key = `${now.slice(0, 10)}.ndjson`;
          const existing = (await dlq.get(key)) || "";
          await dlq.set(
            key,
            existing + JSON.stringify({ error: String(err), payload }) + "\n"
          );
        } catch (e) {
          console.error("[ATS] dlq append failed", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, event_id, idempotency_key }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
