// Simple scoring function used by tests to gate incentives
// Heuristics: word diversity in 'well' and 'better', repetition penalties, minimal field presence

function tokenize15(s) {
  s = s || "";
  return String(s)
    .trim()
    .split(/\s+/)
    .slice(0, 15)
    .map(function (w) {
      return w.toLowerCase().replace(/[^a-z0-9']/g, "");
    })
    .filter(Boolean);
}

function diversityScore(words) {
  if (!words.length) {
    return 0;
  }
  var uniq = new Set(words).size;
  return uniq / words.length; // 0..1
}

function repetitionPenalty(words) {
  if (!words.length) {
    return 0;
  }
  var freq = new Map();
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  var maxFreq = Math.max.apply(null, Array.from(freq.values()));
  return Math.max(0, (maxFreq - 1) / words.length); // 0..1 higher is worse
}

function textQualityBlock(text) {
  var words = tokenize15(text);
  var div = diversityScore(words);
  var rep = repetitionPenalty(words);
  var base = Math.max(0, div - rep); // 0..1
  return { score: base, words: words, div: div, rep: rep };
}

export default async function handler(request) {
  try {
    function bandFor(x) {
      var v = Number(x) || 0;
      if (v >= 0.75) {
        return "Success";
      }
      if (v >= 0.55) {
        return "Caution";
      }
      return "Risk";
    }
    var body =
      (await request.json().catch(function () {
        return {};
      })) || {};
    var candidate_token = body.candidate_token || "";
    var stage = body.stage || "";
    var role_family = body.role_family || "";
    var overall = Number(body.overall || 0);
    var fairness = Number(body.fairness || 0);
    var attention = Number(body.attention || 0);
    var aspects = Array.isArray(body.aspects) ? body.aspects : [];
    var well = body.well || "";
    var better = body.better || "";
    var _rant = body.rant || "";
    var consent = Boolean(body.consent);

    var wellQ = textQualityBlock(well);
    var betterQ = textQualityBlock(better);

    // Numeric composites (scaled to 0..1)
    var ratings = [overall, fairness, attention].map(function (v) {
      return Math.max(0, Math.min(5, Number(v))) / 5;
    });
    var ratingScore =
      ratings.reduce(function (a, b) {
        return a + b;
      }, 0) / (ratings.length || 1);

    // Aspect contribution (cap at 5 aspects)
    var aspectScore =
      Math.min(5, Array.isArray(aspects) ? aspects.length : 0) / 5;

    // Text composite
    var textScore = (wellQ.score + betterQ.score) / 2; // 0..1

    // Overall quality (weights tuned for tests)
    var quality_score = Number(
      (0.35 * textScore + 0.45 * ratingScore + 0.2 * aspectScore).toFixed(3)
    );

    // Flags
    var quality_flags = [];
    if (wellQ.rep > 0.25) {
      quality_flags.push("repetition_well");
    }
    if (betterQ.rep > 0.25) {
      quality_flags.push("repetition_better");
    }
    if (wellQ.div < 0.5) {
      quality_flags.push("low_diversity_well");
    }
    if (betterQ.div < 0.5) {
      quality_flags.push("low_diversity_better");
    }
    if (!consent) {
      quality_flags.push("no_consent");
    }

    // Gating: must have consent, decent text variety, and composite threshold
    var textGate = textScore >= 0.35;
    var compositeGate = quality_score >= 0.5;
    var incentive_eligible = Boolean(consent && textGate && compositeGate);

    // Provide stable fields for UI: composite_index and bands
    // Composite index mirrors quality notions; keep simple and stable 0..1
    var composite_index = Number(
      (0.6 * quality_score + 0.4 * textScore).toFixed(3)
    );

    // Derive bands with sane defaults so UI never sees nulls
    var bands = {
      overall: bandFor(composite_index),
      fairness: bandFor(fairness / 5),
      sentiment: bandFor(textScore), // proxy using text quality
      rigor: bandFor(1 - Math.max(wellQ.rep, betterQ.rep)),
      speed: bandFor(attention / 5), // proxy using attention rating
      clarity: bandFor((wellQ.div + betterQ.div) / 2),
      trust: bandFor(consent ? 1 : 0),
    };

    var resp = {
      candidate_token: candidate_token,
      stage: stage,
      role_family: role_family,
      quality_score: quality_score,
      incentive_eligible: incentive_eligible,
      composite_index: composite_index,
      bands: bands,
      quality_flags: quality_flags,
      diagnostics: {
        well: wellQ,
        better: betterQ,
        ratingScore: ratingScore,
        aspectScore: aspectScore,
        textScore: textScore,
      },
    };

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
