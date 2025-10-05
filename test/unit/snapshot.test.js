import assert from "node:assert/strict";
import test from "node:test";

import { clamp, createSnapshot, wordCount } from "../../js/snapshot.js";

test("word count ignores extra whitespace", () => {
  assert.equal(wordCount("one   two\nthree"), 3);
});

test("snapshot clamps scores", () => {
  const snapshot = createSnapshot({
    summary:
      "Candidate championed collaborative planning and gave transparent updates on compensation, next steps, and expectations.",
    wentWell:
      "Communication stayed clear transparent and respectful while every question earned thoughtful context from the panel leads.",
    couldBeBetter:
      "Follow up could arrive sooner with scheduling clarity and a heads up on next review checkpoints for the candidate.",
    aspects: ["Communication", "Clarity", "Respect"],
    attention: "strongly-agree",
    consent: true,
    stage: "Final round",
    seed: "test-seed",
  });

  assert.ok(snapshot.nss >= -1 && snapshot.nss <= 1, "NSS should be normalised");
  assert.ok(snapshot.index >= 0 && snapshot.index <= 100, "Index should map to 0-100");
  assert.ok(snapshot.composite >= 0 && snapshot.composite <= 100, "Composite should stay in range");
  assert.equal(snapshot.eligible, true, "Submission should be incentive eligible");
});

test("clamp helper bounds values", () => {
  assert.equal(clamp(10, 0, 5), 5);
  assert.equal(clamp(-10, 0, 5), 0);
  assert.equal(clamp(3, 0, 5), 3);
});
