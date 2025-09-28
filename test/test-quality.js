/* Basic quality gating tests for score function.
 * Assumes local dev server or Netlify function accessible at /.netlify/functions/score
 */

import assert from "assert";

const BASE =
  (globalThis.process &&
    globalThis.process.env &&
    globalThis.process.env.BASE_URL) ||
  "http://localhost:8888";
const ENDPOINT = BASE + "/.netlify/functions/score";

async function post(body) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok)
    throw new Error("Non-200: " + r.status + " " + JSON.stringify(json));
  return json;
}

function fifteen(words) {
  return words.split(/\s+/).slice(0, 15).join(" ");
}

(async () => {
  // High quality payload (varied words, no repetition)
  const good = await post({
    candidate_token: "test_good",
    stage: "panel",
    role_family: "engineering",
    overall: 5,
    fairness: 5,
    attention: 5,
    aspects: ["clarity", "communication"],
    well: fifteen(
      "panel was engaging transparent respectful thoughtful inclusive collaborative pacing strong role clarity",
    ),
    better: fifteen(
      "faster follow up timeline compensation transparency feedback turnaround scheduling coordination more context",
    ),
    rant: "Great experience overall. Learned a lot.",
    consent: true,
  });
  assert.ok(
    good.incentive_eligible === true,
    "Expected good submission to be incentive eligible",
  );
  assert.ok(
    good.quality_score > 0.6,
    "Quality score should be > 0.6 for good sample",
  );

  // Low quality payload (heavy repetition + gibberish-like tokens)
  const bad = await post({
    candidate_token: "test_bad",
    stage: "panel",
    role_family: "engineering",
    overall: 5,
    fairness: 5,
    attention: 5,
    aspects: ["clarity"],
    well: fifteen(
      "good good good good good good good good good good good good good good good",
    ),
    better: fifteen(
      "asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv asdf qwer qqqq",
    ),
    rant: "meh",
    consent: true,
  });
  assert.ok(
    bad.incentive_eligible === false,
    "Expected bad submission to be ineligible",
  );
  assert.ok(
    bad.quality_flags && bad.quality_flags.length > 0,
    "Bad submission should have flags",
  );

  // Borderline case: some repetition but should remain eligible (diversity moderate)
  const borderline = await post({
    candidate_token: "test_borderline",
    stage: "panel",
    role_family: "engineering",
    overall: 4,
    fairness: 4,
    attention: 5,
    aspects: ["clarity"],
    well: fifteen(
      "interview process generally clear clear timing reasonable panel respectful focused conversations",
    ),
    better: fifteen(
      "could improve faster feedback cycle and add clearer outline of next steps",
    ),
    rant: "Decent overall",
    consent: true,
  });
  if (borderline.incentive_eligible === false) {
    console.warn(
      "Borderline case flagged ineligible; review heuristics thresholds",
    );
  }

  globalThis.console &&
    globalThis.console.log &&
    globalThis.console.log("Quality tests passed.");
})().catch((e) => {
  if (globalThis.console && globalThis.console.error) {
    globalThis.console.error("Quality tests failed:", e);
  }
  if (globalThis.process && globalThis.process.exit) {
    globalThis.process.exit(1);
  }
});
