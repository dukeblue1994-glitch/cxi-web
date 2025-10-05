import assert from "node:assert/strict";
import test from "node:test";

const TARGET = "http://localhost:8888/.netlify/functions/dev-webhook";

function isConnectionRefused(error) {
  return (
    error?.code === "ECONNREFUSED" ||
    error?.cause?.code === "ECONNREFUSED" ||
    /ECONNREFUSED/.test(error?.message ?? "")
  );
}

test("dev webhook responds when server is running", async (t) => {
  let response;
  try {
    response = await fetch(TARGET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ping: true }),
      signal: AbortSignal.timeout(1500),
    });
  } catch (error) {
    if (isConnectionRefused(error)) {
      t.skip("Start `npm run dev` before running reliability checks. Skipping.");
      return;
    }
    throw error;
  }

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
});
