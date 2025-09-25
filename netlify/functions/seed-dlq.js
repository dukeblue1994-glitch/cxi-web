import { getStore } from "@netlify/blobs";

export default async (request) => {
  try {
    const now = new Date().toISOString();
    const body = await request.json().catch(() => ({}));
    const payload = body.payload || {
      schema_version: "v1",
      event: "candidate_feedback_invite",
      stage: "applied",
      role_family: "sales",
      candidate_token: "test_token",
      sent_at: now,
      source: "seed",
      event_id: `evt_${Date.now()}`,
      idempotency_key: `idem_${Date.now()}`,
      received_at: now,
    };

    const dlq = getStore({ name: "ats-dead-letter" });
    const key = `${now.slice(0, 10)}.ndjson`;
    try {
      const existing = (await dlq.get(key)) || "";
      const line = JSON.stringify({ error: "seed", payload }) + "\n";
      await dlq.set(key, existing + line);
    } catch (e) {
      // fallback: set directly
      await dlq.set(key, JSON.stringify({ error: "seed", payload }) + "\n");
    }

    return new Response(JSON.stringify({ ok: true, key, payload, seeded: 1 }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
