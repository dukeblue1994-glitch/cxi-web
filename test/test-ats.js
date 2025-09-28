// ATS webhook & DLQ behavior tests (uses global fetch in Node 22)

const BASE =
  (globalThis.process &&
    globalThis.process.env &&
    globalThis.process.env.BASE_URL) ||
  "http://localhost:8888";

async function post(path, body = {}, headers = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(path + " failed " + res.status + " " + text);
  return json;
}

async function run() {
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log("ATS tests start");
  // Baseline DLQ count
  const base = await post("/api/ats-dlq-stats");
  const baseCount = base.count || 0;
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log("Baseline DLQ count", baseCount);

  // 1. Basic event ingest (should not change DLQ)
  const ev1 = await post("/api/atsWebhook", {
    event: "invite_sent",
    candidate_token: "tok_" + Date.now(),
  });
  if (!ev1.ok) throw new Error("basic ingest failed");
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log("✓ basic ingest");

  // 2. Simulated failure path (header triggers DLQ append)
  const failEv = await post(
    "/api/atsWebhook",
    { event: "invite_failed", candidate_token: "tok_" + Date.now() },
    { "x-ats-test-fail": "1" },
  );
  if (!failEv.ok) throw new Error("fail ingest non-ok");
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log("✓ simulated failure event accepted");

  // Check DLQ increment
  const after = await post("/api/ats-dlq-stats");
  if (after.count <= baseCount) throw new Error("DLQ count did not increment");
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log(
      "✓ DLQ incremented from",
      baseCount,
      "to",
      after.count,
    );

  if (globalThis.console && globalThis.console.log)
    globalThis.console.log("ATS tests complete");
}

run().catch((e) => {
  if (globalThis.console && globalThis.console.error)
    globalThis.console.error("ATS tests failed", e);
  if (globalThis.process && globalThis.process.exit) globalThis.process.exit(1);
});
