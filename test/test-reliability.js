// Basic reliability flow test: DLQ seeding and retry endpoints
const BASE =
  (globalThis.process &&
    globalThis.process.env &&
    globalThis.process.env.BASE_URL) ||
  "http://localhost:8888";
async function hit(path) {
  const url = BASE + path;
  const t0 = Date.now();
  const r = await fetch(url);
  const text = await r.text();
  const ms = Date.now() - t0;
  if (!r.ok) throw new Error(path + " failed " + r.status + " body:" + text);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain text */
  }
  if (globalThis.console && globalThis.console.log) {
    globalThis.console.log(path, "OK", ms + "ms", json ? "" : "(non-JSON)");
  }
  return json || text;
}

(async () => {
  const seed = await hit("/api/seed-dlq");
  if (!seed || !seed.seeded)
    throw new Error("Seed response missing seeded count");
  let replay = await hit("/api/dlq-retry");
  // If Netlify dev treats dlq-retry as scheduled, it returns a plain text notice. Fallback to HTTP variant.
  if (typeof replay === "string" && replay.includes("scheduled function")) {
    if (globalThis.console && globalThis.console.warn)
      globalThis.console.warn(
        "/api/dlq-retry is scheduled; falling back to /api/dlq-retry-http",
      );
    replay = await hit("/api/dlq-retry-http");
  }
  if (!replay || typeof replay.processed !== "number")
    throw new Error("Replay missing processed");
  if (replay.processed < 1) throw new Error("Replay processed 0 events");
  if (globalThis.console && globalThis.console.log)
    globalThis.console.log(
      "Reliability DLQ test passed. Processed",
      replay.processed,
    );
})().catch((e) => {
  if (globalThis.console && globalThis.console.error)
    globalThis.console.error("Reliability test failed:", e);
  if (globalThis.process && globalThis.process.exit) globalThis.process.exit(1);
});
