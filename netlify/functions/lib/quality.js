// Response quality heuristics for anti-gaming (low-effort / gibberish) detection
// Exported function: assessQuality(textParts: string[]) -> { flags: string[], score: number, metrics: {...} }

const COMMON_ENGLISH = new Set([
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
]);

// Basic English-ish pattern (letters, apostrophes, hyphen) 2+ letters
const WORD_PATTERN = /^[a-zA-Z][a-zA-Z'-]{1,}$/;

export function assessQuality(parts) {
  const text = parts.filter(Boolean).join(' ').trim();
  const lowered = text.toLowerCase();
  const tokens = lowered.split(/\s+/).filter(Boolean);
  const totalWords = tokens.length;
  const uniqueWordsSet = new Set(tokens);
  const uniqueWords = uniqueWordsSet.size;
  const typeTokenRatio = totalWords ? uniqueWords / totalWords : 0;

  // Repetition: longest repeated token run
  let longestRun = 1;
  let currentRun = 1;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) {
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else currentRun = 1;
  }

  // Count non-lexical (non-english-ish) tokens
  let nonLexical = 0;
  let shortCount = 0;
  let gibberishCount = 0;
  tokens.forEach(w => {
    if (w.length <= 2) shortCount++;
    if (!WORD_PATTERN.test(w)) nonLexical++;
    // gibberish heuristic: 4+ consonants in a row OR no vowels
    if (/(?:[^aeiou]{4,})/.test(w) || !/[aeiou]/.test(w)) gibberishCount++;
  });

  // Common words coverage ratio
  const commonHits = tokens.filter(w => COMMON_ENGLISH.has(w)).length;
  const commonRatio = totalWords ? commonHits / totalWords : 0;

  // Entropy (character distribution) – very low entropy can indicate repeated nonsense
  const freq = {};
  for (const ch of lowered.replace(/[^a-z]/g, '')) freq[ch] = (freq[ch] || 0) + 1;
  const charTotal = Object.values(freq).reduce((a, b) => a + b, 0);
  const entropy = charTotal
    ? Object.values(freq)
        .map(c => {
          const p = c / charTotal;
          return -p * Math.log2(p);
        })
        .reduce((a, b) => a + b, 0)
    : 0;

  const flags = [];

  if (typeTokenRatio < 0.45 && totalWords >= 20) flags.push('low_diversity');
  if (longestRun >= 3) flags.push('repetition');
  if (gibberishCount / Math.max(1, totalWords) > 0.15) flags.push('gibberish_tokens');
  if (nonLexical / Math.max(1, totalWords) > 0.2) flags.push('non_lexical_excess');
  if (commonRatio < 0.2 && totalWords >= 20) flags.push('low_common_word_ratio');
  if (entropy < 3.2 && totalWords >= 20) flags.push('low_entropy');

  // Composite quality score (1.0 good -> 0.0 bad)
  const penalty = flags.length * 0.12 + Math.max(0, 0.5 - typeTokenRatio) * 0.4;
  const qualityScore = Math.max(0, 1 - penalty);

  return {
    flags,
    score: Number(qualityScore.toFixed(3)),
    metrics: {
      totalWords,
      uniqueWords,
      typeTokenRatio: Number(typeTokenRatio.toFixed(3)),
      longestRun,
      nonLexical,
      gibberishCount,
      shortCount,
      commonRatio: Number(commonRatio.toFixed(3)),
      entropy: Number(entropy.toFixed(3)),
    },
  };
}

export function isLikelyLowEffort(result) {
  // Define threshold logic for incentive gating
  if (result.score < 0.55) return true;
  const severe = ['gibberish_tokens', 'non_lexical_excess'];
  if (result.flags.some(f => severe.includes(f))) return true;
  if (result.flags.length >= 3 && result.score < 0.7) return true;
  return false;
}
