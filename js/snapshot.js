import { computeSentiment } from "./sentiment.js";

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function createSnapshot({
  summary,
  wentWell,
  couldBeBetter,
  aspects,
  attention,
  consent,
  stage = "Final round",
  seed,
}) {
  const sentiments = {
    summary: computeSentiment(summary),
    wentWell: computeSentiment(wentWell),
    couldBeBetter: computeSentiment(couldBeBetter),
  };

  const wcWell = wordCount(wentWell);
  const wcBetter = wordCount(couldBeBetter);
  const summaryLength = summary ? summary.trim().length : 0;

  const attentionPassed = attention === "strongly-agree";
  const summaryValid = summaryLength >= 90 && summaryLength <= 120;
  const wellValid = wcWell >= 15;
  const betterValid = wcBetter >= 15;

  const nssRaw =
    sentiments.summary.compound * 0.55 +
    sentiments.wentWell.compound * 0.3 +
    sentiments.couldBeBetter.compound * 0.15;
  const nss = Number(clamp(nssRaw, -1, 1).toFixed(3));
  const index = Math.round(clamp((nss + 1) / 2, 0, 1) * 100);

  const hygiene = attentionPassed && consent && summaryValid && wellValid && betterValid ? 1 : 0.55;
  const aspectLift = aspects.length / 7;
  const composite = Math.round(
    clamp(0.65 * index + 0.2 * hygiene * 100 + 0.15 * aspectLift * 100, 0, 100),
  );

  const eligible = hygiene === 1;

  const payload = {
    stage,
    summary,
    wentWell,
    couldBeBetter,
    aspects,
    sentiments,
    seed,
    nss,
    index,
    composite,
    eligible,
    attentionPassed,
    summaryLength,
    words: { well: wcWell, better: wcBetter },
    consent,
    submittedAt: new Date().toISOString(),
  };

  return payload;
}

export function describeBand(score) {
  if (score >= 80) return "Green — meeting expectations";
  if (score >= 60) return "Amber — coach for momentum";
  return "Red — prioritize follow-up";
}
