const LEXICON = new Map(
  Object.entries({
    amazing: 3.2,
    attentive: 2.4,
    balanced: 1.6,
    blocked: -2.4,
    chaotic: -2.6,
    clear: 1.8,
    confused: -2.1,
    courteous: 1.4,
    delighted: 2.6,
    disengaged: -2.2,
    energizing: 2.2,
    fair: 1.7,
    fairness: 1.4,
    fast: 1.5,
    flexible: 1.6,
    frictionless: 2.2,
    frustrated: -2.8,
    helpful: 2.1,
    hostile: -3.2,
    inclusive: 2.4,
    late: -1.6,
    messy: -2.1,
    neutral: 0,
    outstanding: 3.4,
    professional: 1.8,
    respectful: 2.2,
    rushed: -1.8,
    smooth: 1.9,
    stressful: -2.4,
    supportive: 2.5,
    terrible: -3.4,
    unclear: -2.1,
    waiting: -1.4,
    warm: 1.6,
    wonderful: 3.1,
    "well-prepared": 2.3,
    thoughtful: 2.2,
    thorough: 1.8,
    transparent: 2.0,
    slow: -1.6,
    brilliant: 2.8,
    confident: 1.7,
    considerate: 1.8,
    respectful: 2.1,
    generous: 1.4,
    awkward: -1.8,
    impatient: -2.2,
    "not bad": 1.8, // explicitly encourage classic valence shifter case
  }),
);

const NEGATORS = new Set([
  "not",
  "hardly",
  "never",
  "no",
  "without",
  "rarely",
]);

const BOOSTERS = new Map(
  Object.entries({
    very: 0.6,
    extremely: 0.8,
    incredibly: 0.8,
    slightly: -0.2,
    somewhat: -0.15,
    really: 0.4,
    super: 0.5,
    exceptionally: 0.9,
  }),
);

const DAMPENERS = new Map(
  Object.entries({
    barely: -0.4,
    somewhat: -0.15,
    mildly: -0.2,
  }),
);

function normaliseToken(token) {
  return token
    .toLowerCase()
    .replace(/[^a-z+-\s]/g, "")
    .trim();
}

function tokenize(text) {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map(normaliseToken)
    .filter(Boolean);
}

export function toneFromScore(score) {
  if (score > 0.15) return "positive";
  if (score < -0.15) return "negative";
  return "neutral";
}

export function computeSentiment(text) {
  const tokens = tokenize(text);
  let total = 0;
  let magnitude = 0;
  let prevNegation = false;
  let booster = 0;
  const contributions = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const twoGram = tokens[i + 1] ? `${token} ${tokens[i + 1]}` : null;
    let score = 0;
    let original = token;

    if (twoGram && LEXICON.has(twoGram)) {
      score = LEXICON.get(twoGram);
      original = twoGram;
      i += 1; // consume the next token as part of the bigram
    } else if (LEXICON.has(token)) {
      score = LEXICON.get(token);
    }

    if (score === 0) {
      if (NEGATORS.has(token)) {
        prevNegation = true;
        booster = 0;
        continue;
      }
      if (BOOSTERS.has(token)) {
        booster = Math.max(booster, BOOSTERS.get(token));
        continue;
      }
      if (DAMPENERS.has(token)) {
        booster = Math.min(booster, DAMPENERS.get(token));
        continue;
      }
      prevNegation = false;
      booster = 0;
      continue;
    }

    let adjusted = score;
    if (prevNegation) {
      adjusted = -score * 0.6;
    }
    if (booster) {
      adjusted *= 1 + booster;
    }

    total += adjusted;
    magnitude += Math.abs(adjusted);
    const label = score === adjusted ? original : `${original}*`;
    contributions.push({ token: label, score: adjusted });
    prevNegation = false;
    booster = 0;
  }

  const divisor = contributions.length > 0 ? contributions.length : 1;
  const average = total / divisor;
  const normalized = average / 3.2; // keep within [-1, 1] for typical scale
  const compound = Math.max(-1, Math.min(1, normalized));

  return {
    compound: Number(compound.toFixed(3)),
    magnitude: Number(magnitude.toFixed(3)),
    tone: toneFromScore(compound),
    contributions,
  };
}

export function summarizeSentiments(parts) {
  const entries = Object.entries(parts).map(([key, value]) => [key, computeSentiment(value)]);
  return Object.fromEntries(entries);
}

export const SENTIMENT_LEXICON = LEXICON;
