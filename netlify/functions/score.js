import { getStore } from '@netlify/blobs';
import { assessQuality, isLikelyLowEffort } from './lib/quality.js';

export default async event => {
  try {
    const b = JSON.parse(event.body || '{}');

    // Basic validation
    if (
      !b.consent ||
      (b.well || '').split(/\s+/).length < 15 ||
      (b.better || '').split(/\s+/).length < 15
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'validation_failed' }),
      };
    }

    // NSS Calculation (-1..+1)
    const normalize = v => (v - 3) / 2; // Maps 1→-1.0, 3→0.0, 5→+1.0
    const nss = 0.7 * normalize(b.overall) + 0.3 * normalize(b.fairness);

    // Word count and richness
    const words =
      ((b.well || '').match(/\S+/g) || []).length + ((b.better || '').match(/\S+/g) || []).length;
    const richness = words + 20 * (b.aspects?.length || 0);

    // ABSA (Aspect-Based Sentiment Analysis) - Rules-first approach
    const LEX = {
      communication: [/clear comm|responsive|confusing|unresponsive|communication|unclear/gi],
      scheduling: [/reschedul|late|last minute|on time|scheduling|timing/gi],
      clarity: [/\bclear\b|\bunclear\b|ambig|clarity|confusing/gi],
      respect: [/respect|rude|dismiss|polite|courteous|disrespectful/gi],
      feedback_timeliness: [/feedback|weeks|fast|delay|quick|slow|timely/gi],
      conduct: [/friendly|hostile|inappropriate|professional|unprofessional/gi],
      logistics: [/logistics|location|setup|technical|issues|smooth/gi],
      difficulty: [/difficult|easy|hard|challenging|reasonable|unfair/gi],
      dei: [/diverse|inclusion|bias|fair|unfair|discrimination/gi],
      compensation: [/salary|pay|compensation|transparent|vague|clear/gi],
    };

    const absa = { positive: [], negative: [] };
    const text = (b.well + ' ' + b.better + ' ' + (b.rant || '')).toLowerCase();

    // Analyze aspects mentioned in text
    Object.entries(LEX).forEach(([aspect, patterns]) => {
      const hit = patterns.some(rx => rx.test(text));
      if (hit) {
        // Determine polarity by co-occurrence with negative/positive words
        const negativeWords =
          /rude|delay|unclear|hostile|weeks|last minute|unresponsive|inappropriate|confusing|slow|vague|unfair|bias|discrimination|issues|difficult|unprofessional/;
        const positiveWords =
          /clear|responsive|on time|timely|friendly|professional|smooth|easy|reasonable|transparent|polite|courteous|fair|diverse|quick/;

        if (negativeWords.test(text)) {
          absa.negative.push(aspect);
        } else if (positiveWords.test(text)) {
          absa.positive.push(aspect);
        } else {
          // Default to context of the text area
          if (text.includes(b.well.toLowerCase()) && positiveWords.test(b.well.toLowerCase())) {
            absa.positive.push(aspect);
          } else if (
            text.includes(b.better.toLowerCase()) &&
            negativeWords.test(b.better.toLowerCase())
          ) {
            absa.negative.push(aspect);
          }
        }
      }
    });

    // Calculate ABSA balance
    const totalAspects = absa.positive.length + absa.negative.length;
    const absa_balance =
      totalAspects > 0 ? (absa.positive.length - absa.negative.length) / totalAspects : 0;

    // Quality / anti-gaming assessment
    const quality = assessQuality([b.well || '', b.better || '', b.rant || '']);
    const lowEffort = isLikelyLowEffort(quality);

    // Index calculation (0..1 composite) – slightly penalize low quality
    const idx =
      0.55 * ((nss + 1) / 2) +
      0.3 * ((absa_balance + 1) / 2) +
      0.15 * (Math.min(200, richness) / 200) -
      (lowEffort ? 0.05 : 0);

    // Generate highlights (span-level analysis)
    const highlights = [];
    const positiveSpans =
      text.match(/clear communication|responsive|on time|friendly|professional|smooth setup/gi) ||
      [];
    const negativeSpans =
      text.match(/waited weeks|unresponsive|confusing|rude|delayed feedback|unclear process/gi) ||
      [];

    positiveSpans.forEach(span => {
      highlights.push({
        span: span,
        polarity: '+',
        aspect: 'positive_signal',
      });
    });

    negativeSpans.forEach(span => {
      highlights.push({
        span: span,
        polarity: '-',
        aspect: 'negative_signal',
      });
    });

    // Generate summary
    const summary = generateSummary(absa, nss, b.stage);

    // Generate coaching cue
    const coaching_cue = generateCoachingCue(absa, b.stage, nss);

    // Store response data (using Netlify Blobs)
    try {
      const responsesStore = getStore({ name: 'responses' });
      const responseData = {
        id: `response_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        candidate_token_hash: hashToken(b.candidate_token),
        stage: b.stage,
        role_family: b.role_family,
        overall: b.overall,
        fairness: b.fairness,
        aspects: b.aspects,
        well_word_count: ((b.well || '').match(/\S+/g) || []).length,
        better_word_count: ((b.better || '').match(/\S+/g) || []).length,
        rant_length: (b.rant || '').length,
        conflict_reschedule: b.conflict_reschedule,
        nss: Number(nss.toFixed(2)),
        index: Number(idx.toFixed(2)),
        richness: richness,
        absa_positive: absa.positive,
        absa_negative: absa.negative,
      };

      const key = `${new Date().toISOString().slice(0, 10)}.ndjson`;
      await responsesStore.append(key, JSON.stringify(responseData) + '\n');
    } catch (storageError) {
      console.error('Storage error:', storageError);
      // Continue even if storage fails
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        nss: Number(nss.toFixed(2)),
        composite_index: Number(idx.toFixed(2)),
        absa: {
          positive: absa.positive,
          negative: absa.negative,
        },
        richness: richness,
        highlights: highlights,
        summary: summary,
        coaching_cue: coaching_cue,
        band: getBand(idx),
        color: getBandColor(idx),
        rant_echo: b.rant || '',
        quality: quality.metrics,
        quality_flags: quality.flags,
        quality_score: quality.score,
        incentive_eligible: !lowEffort,
      }),
    };
  } catch (e) {
    console.error('Score function error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'server_error', message: e.message }),
    };
  }
};

// Helper functions
function generateSummary(absa, nss, stage) {
  const positiveAspects = absa.positive.join(', ');
  const negativeAspects = absa.negative.join(', ');

  if (nss > 0.3) {
    return `Positive experience at ${stage} stage. ${positiveAspects ? `Strengths: ${positiveAspects}.` : ''} ${negativeAspects ? `Areas for improvement: ${negativeAspects}.` : ''}`;
  } else if (nss > -0.3) {
    return `Mixed experience at ${stage} stage. ${positiveAspects ? `What worked: ${positiveAspects}.` : ''} ${negativeAspects ? `Concerns: ${negativeAspects}.` : ''}`;
  } else {
    return `Challenging experience at ${stage} stage. ${negativeAspects ? `Key issues: ${negativeAspects}.` : ''} ${positiveAspects ? `Some positives: ${positiveAspects}.` : ''}`;
  }
}

function generateCoachingCue(absa, stage, nss) {
  const negativeAspects = absa.negative;

  if (negativeAspects.includes('feedback_timeliness')) {
    return `Set feedback SLA ≤3 business days for ${stage} stage.`;
  }

  if (negativeAspects.includes('communication')) {
    return `Review communication clarity standards for ${stage} interviews.`;
  }

  if (negativeAspects.includes('scheduling')) {
    return `Improve scheduling flexibility and advance notice for ${stage}.`;
  }

  if (negativeAspects.includes('respect') || negativeAspects.includes('conduct')) {
    return `Provide interviewer training on professional conduct for ${stage}.`;
  }

  if (negativeAspects.includes('clarity')) {
    return `Clarify expectations and process steps for ${stage} interviews.`;
  }

  if (nss > 0.5) {
    return `Maintain current standards for ${stage}; process working well.`;
  }

  return `Review ${stage} process for consistency and candidate experience improvements.`;
}

function getBand(index) {
  if (index >= 0.6) return 'Success';
  if (index >= 0.4) return 'Caution';
  return 'Risk';
}

function getBandColor(index) {
  if (index >= 0.6) return '#16A34A'; // Success green
  if (index >= 0.4) return '#F59E0B'; // Warning amber
  return '#F43F5E'; // Risk rose
}

function hashToken(token) {
  // Simple hash for demo - in production use crypto.createHash
  if (!token) return 'anonymous';
  return (
    'hash_' +
    token
      .toString()
      .split('')
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0)
      .toString(36)
  );
}
