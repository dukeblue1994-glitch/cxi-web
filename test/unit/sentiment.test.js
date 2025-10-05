import assert from "node:assert/strict";
import test from "node:test";

import { computeSentiment, toneFromScore } from "../../js/sentiment.js";

test("handles classic negation flips", () => {
  const { compound, tone } = computeSentiment("not bad at all");
  assert.ok(compound > 0, "compound score should be positive for 'not bad'");
  assert.equal(tone, "positive");
});

test("boosters amplify intensity", () => {
  const basic = computeSentiment("fast follow up");
  const boosted = computeSentiment("very fast follow up");
  assert.ok(boosted.compound > basic.compound, "booster should increase sentiment value");
});

test("tone helper thresholds", () => {
  assert.equal(toneFromScore(0.2), "positive");
  assert.equal(toneFromScore(-0.2), "negative");
  assert.equal(toneFromScore(0), "neutral");
});
