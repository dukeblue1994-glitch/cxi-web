// test/test-reliability.js
// Reliability test with auto-check for Netlify Dev

const BASE = process.env.BASE_URL || "http://localhost:8888";

async function isServerUp(url = BASE) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function hit(path, body = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function run() {
  console.log(`Reliability test starting → ${BASE}`);

  const up = await isServerUp(BASE);
  if (!up) {
    console.warn(`
⚠️  Netlify Dev is not running at ${BASE}
Start it first with:
    npx netlify dev --port 8888
or set BASE_URL to your deployed endpoint:
    export BASE_URL=https://cxis.today
Skipping reliability test.
    `);
    process.exit(0);
  }

  try {
    const baseline = await hit("/api/ats-dlq-stats");
    console.log("Baseline DLQ count:", baseline.count);

    const retry = await hit("/api/dlq-retry");
    console.log("DLQ retry status:", retry.status);

    console.log("✅ Reliability test complete.");
  } catch (err) {
    console.error("Reliability test failed:", err);
    process.exit(1);
  }
}

run();
