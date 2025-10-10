// DLQ retry tests - validates that the DLQ replay function properly archives and clears the dead-letter queue

const BASE =
  (globalThis.process &&
    globalThis.process.env &&
    globalThis.process.env.BASE_URL) ||
  "http://localhost:8888";

async function get(path) {
  const res = await fetch(BASE + path);
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
  console.log("DLQ retry tests start");

  // 1. Get baseline DLQ count
  const baseline = await post("/api/ats-dlq-stats");
  const baselineCount = baseline.count || 0;
  console.log("✓ Baseline DLQ count:", baselineCount);

  // 2. Add a test item to DLQ by simulating a failure
  const failEvent = await post(
    "/api/atsWebhook",
    { 
      event: "test_dlq_retry", 
      candidate_token: "tok_dlq_test_" + Date.now(),
      stage: "test_stage"
    },
    { "x-ats-test-fail": "1" },
  );
  if (!failEvent.ok) throw new Error("Failed to seed DLQ");
  console.log("✓ Seeded DLQ with test event");

  // 3. Verify DLQ count increased
  const afterSeed = await post("/api/ats-dlq-stats");
  if (afterSeed.count <= baselineCount) {
    throw new Error("DLQ count did not increment after seeding");
  }
  console.log("✓ DLQ count increased to:", afterSeed.count);

  // 4. Call dlq-retry to replay/archive the queue
  const replayResult = await get("/api/dlq-retry");
  if (!replayResult.ok) throw new Error("DLQ retry failed");
  if (typeof replayResult.processed !== "number") {
    throw new Error("DLQ retry did not return processed count");
  }
  console.log("✓ DLQ replay processed", replayResult.processed, "entries");

  // 5. Verify DLQ is now empty (or back to baseline)
  const afterReplay = await post("/api/ats-dlq-stats");
  if (afterReplay.count > baselineCount) {
    throw new Error(
      "DLQ count did not decrease after replay. Expected <= " +
        baselineCount +
        ", got " +
        afterReplay.count
    );
  }
  console.log("✓ DLQ count after replay:", afterReplay.count);

  // 6. Verify response structure
  if (!replayResult.hasOwnProperty("ok")) {
    throw new Error("Response missing 'ok' field");
  }
  if (!replayResult.hasOwnProperty("processed")) {
    throw new Error("Response missing 'processed' field");
  }
  console.log("✓ Response structure valid");

  console.log("DLQ retry tests complete ✓");
}

run().catch((e) => {
  console.error("DLQ retry tests failed:", e.message);
  if (globalThis.process && globalThis.process.exit) globalThis.process.exit(1);
});
