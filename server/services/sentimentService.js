/**
 * sentimentService.js
 *
 * Pipeline:
 *   1. Language detection  (heuristic, instant)
 *   2. Translation         (NLLB-200 for Urdu/Roman Urdu → English)
 *   3. Lexicon pre-score   (Roman Urdu keyword sentiment — corrects bad translations)
 *   4. Sentiment ensemble  (two HF models + lexicon + rating bias)
 *   5. Fake detection      (heuristics + zero-shot NLI)
 */

const HF_API_KEY = process.env.HF_API_KEY;
const HF_BASE    = 'https://api-inference.huggingface.co/models';

const TRANSLATION_MODEL = 'facebook/nllb-200-distilled-600M';
const SENTIMENT_MODEL_1 = 'cardiffnlp/twitter-roberta-base-sentiment-latest';
const SENTIMENT_MODEL_2 = 'distilbert-base-uncased-finetuned-sst-2-english';
const ZEROSHOT_MODEL    = 'facebook/bart-large-mnli';

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function hfPost(model, payload, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      const waitMs = Math.min((body.estimated_time || 20) * 1000, 30000);
      console.log(`[HF] ${model} loading, waiting ${waitMs / 1000}s (attempt ${attempt})...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HF API error (${res.status}): ${err}`);
    }

    return res.json();
  }
  throw new Error(`[HF] ${model} failed after ${retries} retries`);
}

// ─── Roman Urdu / Urdu sentiment lexicon ─────────────────────────────────────
// score: +2 strongly positive, +1 mildly positive
//        -2 strongly negative, -1 mildly negative

// Combined English + Roman Urdu sentiment lexicon
const ROMAN_URDU_LEXICON = [
  // ── English strong negatives (phrases first for priority) ──
  ['very bad',        -2], ['so bad',         -2], ['really bad',     -2],
  ['very poor',       -2], ['so poor',        -2], ['really poor',    -2],
  ['very worst',      -2], ['not good',       -2], ['not at all',     -2],
  ['worst ever',      -2], ['never again',    -2], ['waste of money', -2],
  ['waste of time',   -2], ['do not recommend',-2],['not recommend',  -2],
  ['dont recommend',-2], ['very dirty',     -2], ['very rude',      -2],
  ['very slow',       -2], ['extremely bad',  -2], ['absolutely bad', -2],
  ['horrible experience',-2],['terrible food',-2], ['bad quality',    -2],
  ['bad experience',  -2], ['bad service',    -2], ['poor quality',   -2],
  ['poor service',    -2], ['poor food',      -2], ['worst food',     -2],
  ['worst service',   -2], ['worst place',    -2], ['worst experience',-2],

  // ── English single word strong negatives ──
  ['bad',         -2], ['horrible', -2], ['terrible', -2], ['awful',    -2],
  ['worst',       -2], ['disgusting',-2],['pathetic', -2], ['dreadful', -2],
  ['atrocious',   -2], ['appalling',-2], ['abysmal',  -2], ['filthy',   -2],
  ['rotten',      -2], ['nasty',    -2], ['vile',     -2], ['deplorable',-2],

  // ── English mild negatives ──
  ['poor',        -1], ['slow',     -1], ['late',     -1], ['cold',     -1],
  ['dirty',       -1], ['rude',     -1], ['stale',    -1], ['overpriced',-1],
  ['expensive',   -1], ['mediocre', -1], ['average',  -1], ['meh',      -1],
  ['disappointing',-1],['disappoint',-1],['problem',  -1], ['issue',    -1],
  ['complaint',   -1], ['unhappy',  -1], ['unsatisfied',-1],['lacking',  -1],

  // ── English strong positives (phrases) ──
  ['very good',       +2], ['so good',        +2], ['really good',    +2],
  ['very nice',       +2], ['really nice',    +2], ['very delicious', +2],
  ['highly recommend',+2], ['must visit',     +2], ['best ever',      +2],
  ['absolutely amazing',+2],['absolutely love',+2],['totally worth',  +2],
  ['loved it',        +2], ['love it',        +2], ['love this place',+2],
  ['great experience',+2], ['great food',     +2], ['great service',  +2],
  ['best food',       +2], ['best service',   +2], ['best place',     +2],

  // ── English single word strong positives ──
  ['excellent',   +2], ['amazing',  +2], ['awesome',   +2], ['outstanding',+2],
  ['fantastic',   +2], ['superb',   +2], ['brilliant', +2], ['perfect',   +2],
  ['wonderful',   +2], ['exceptional',+2],['magnificent',+2],['splendid', +2],
  ['best',        +2], ['loved',    +2], ['love',      +2],

  // ── English mild positives ──
  ['good',        +1], ['nice',     +1], ['great',     +1], ['tasty',    +1],
  ['delicious',   +1], ['fresh',    +1], ['clean',     +1], ['friendly', +1],
  ['helpful',     +1], ['fast',     +1], ['quick',     +1], ['recommend',+1],
  ['satisfied',   +1], ['happy',    +1], ['enjoyed',   +1], ['enjoy',    +1],
  ['liked',       +1], ['like',     +1], ['worth',     +1], ['decent',   +1],

  // ── Roman Urdu / Urdu strong negatives (phrases) ──
  ['bura laga',   -2], ['bura tha',    -2], ['buri thi',    -2],
  ['acha nahi tha',-2],['acha nahi thi',-2],['bilkul nahi', -2],
  ['bohat bura',  -2], ['bohat ganda', -2], ['bohat bekar', -2],

  // ── Roman Urdu / Urdu single word strong negatives ──
  ['buri',        -2], ['bura',     -2], ['bure',     -2], ['bekar',    -2],
  ['bakwas',      -2], ['ganda',    -2], ['gandi',    -2], ['kharab',   -2],
  ['wahiyat',     -2], ['faltu',    -2], ['bekaar',   -2], ['ghatiya',  -2],
  ['nikkamma',    -2], ['nafrat',   -2],

  // ── Roman Urdu mild negatives ──
  ['pasand nahi', -1], ['theek nahi', -1], ['mehnga',   -1],
  ['thanda',      -1], ['nahi',      -1], ['nahin',    -1],

  // ── Roman Urdu strong positives (phrases) ──
  ['bahut acha',  +2], ['bohat acha',  +2], ['bohat pasand',+2],
  ['wah wah',     +2], ['bohat zabardast',+2],

  // ── Roman Urdu single word strong positives ──
  ['zabardast',   +2], ['shandar',  +2], ['kamaal',   +2], ['lajawab',  +2],
  ['mast',        +2],

  // ── Roman Urdu mild positives ──
  ['acha',        +1], ['accha',    +1], ['theek',    +1], ['maza',     +1],
  ['mazza',       +1], ['khush',    +1], ['pasand',   +1], ['shukriya', +1],
];

const NEGATION_WORDS = [
  'nahi', 'nahin', 'na', 'not', 'no', 'never',
  'bilkul nahi', 'hargiz nahi', 'mat', 'bhi nahi',
];

function lexiconScore(text) {
  const lower = text.toLowerCase().trim();
  const words  = lower.split(/\s+/);
  let total    = 0;
  let hits     = 0;
  // Track which character positions have already been matched by a phrase
  // so single-word pass doesn't double-count
  const matchedRanges = [];

  // Sort phrases longest-first so "very bad quality" matches before "bad"
  const sortedLexicon = [...ROMAN_URDU_LEXICON].sort((a, b) => b[0].length - a[0].length);

  // Pass 1: multi-word phrases
  for (const [phrase, score] of sortedLexicon) {
    if (!phrase.includes(' ')) continue;
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(phrase, searchFrom);
      if (idx === -1) break;
      const end = idx + phrase.length;
      // Check not already matched
      const overlaps = matchedRanges.some(([s, e]) => idx < e && end > s);
      if (!overlaps) {
        const preceding = lower.slice(Math.max(0, idx - 25), idx);
        const negated   = NEGATION_WORDS.some(n => preceding.endsWith(n + ' ') || preceding.endsWith(n));
        total += negated ? -score : score;
        hits++;
        matchedRanges.push([idx, end]);
      }
      searchFrom = idx + 1;
    }
  }

  // Pass 2: single words (skip positions covered by phrases)
  let charPos = 0;
  for (let i = 0; i < words.length; i++) {
    const w   = words[i];
    const end = charPos + w.length;
    const covered = matchedRanges.some(([s, e]) => charPos >= s && end <= e);
    if (!covered) {
      const entry = sortedLexicon.find(([ph]) => !ph.includes(' ') && ph === w);
      if (entry) {
        const negated = i > 0 && NEGATION_WORDS.some(
          n => words[i - 1] === n || (i > 1 && words[i - 2] === n)
        );
        total += negated ? -entry[1] : entry[1];
        hits++;
      }
    }
    charPos += w.length + 1;
  }

  if (hits === 0) return { score: 0, confidence: 0 };

  const normalized = Math.max(-1, Math.min(1, total / (hits * 2)));
  const confidence = Math.min(1, hits / 2); // fewer hits needed for confidence

  return { score: normalized, confidence };
}

// ─── Stage 1: language detection ─────────────────────────────────────────────

function detectScript(text) {
  const urduChars  = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length || 1;
  if (urduChars / totalChars > 0.25) return 'urdu';

  const romanUrduWords = [
    'acha','accha','tha','hai','hain','nahi','nahin','bohat','bahut',
    'khana','khaana','maza','mazza','zabardast','shandar','mast','bekar',
    'bakwas','ganda','bura','bhi','aur','yeh','woh','kuch','sab',
    'wali','wala','bilkul','zaroor','theek','zyada','sahi','galat',
    'lakin','lekin','phir','abhi','sirf','bas','hogaya','lagta',
    'karna','karo','ghatiya','kharab','wahiyat','faltu','lajawab',
    'kamaal','wah','mehnga','khush','mili','thi','raha','rahi','service',
  ];
  const lower   = text.toLowerCase();
  const matches = romanUrduWords.filter(w => new RegExp(`\\b${w}\\b`).test(lower)).length;
  if (matches >= 2) return 'roman_urdu';
  return 'english';
}

// ─── Stage 2: translation ─────────────────────────────────────────────────────

async function translateToEnglish(text) {
  const script = detectScript(text);
  if (script === 'english') return { translated: text, original_language: 'english' };

  const src_lang = script === 'urdu' ? 'urd_Arab' : 'urd_Latn';

  try {
    const result = await hfPost(TRANSLATION_MODEL, {
      inputs: text,
      parameters: { src_lang, tgt_lang: 'eng_Latn' },
    });
    const translated = Array.isArray(result)
      ? result[0]?.translation_text
      : result?.translation_text;

    return { translated: translated || text, original_language: script };
  } catch (err) {
    console.error('[Translate] Error:', err.message);
    return { translated: text, original_language: script };
  }
}

// ─── Stage 3: sentiment ensemble ─────────────────────────────────────────────

function normaliseScores(raw) {
  const labelMap = {
    positive: 'positive', negative: 'negative', neutral: 'neutral',
    LABEL_0: 'negative',  LABEL_1: 'neutral',   LABEL_2: 'positive',
    POSITIVE: 'positive', NEGATIVE: 'negative',
  };

  const scores = Array.isArray(raw[0]) ? raw[0] : raw;
  const out = { positive: 0, negative: 0, neutral: 0 };

  for (const { label, score } of scores) {
    const key = labelMap[label] || label.toLowerCase();
    if (key in out) out[key] = score;
  }
  return out;
}

async function getSentimentFromModel(model, text) {
  try {
    const raw = await hfPost(model, { inputs: text });
    return normaliseScores(raw);
  } catch (err) {
    console.error(`[Sentiment] ${model} error:`, err.message);
    return null;
  }
}

async function analyzeSentiment(englishText, originalText, rating = 0) {
  if (!englishText || englishText.trim().length < 3) {
    return { sentiment: 'neutral', sentiment_score: 0.5, sentiment_confidence: 0 };
  }

  // Run both models in parallel
  const [m1, m2] = await Promise.all([
    getSentimentFromModel(SENTIMENT_MODEL_1, englishText),
    getSentimentFromModel(SENTIMENT_MODEL_2, englishText),
  ]);

  // Run lexicon on BOTH original text and english text — take the stronger signal
  const lexOriginal = lexiconScore(originalText || englishText);
  const lexEnglish  = lexiconScore(englishText);
  const lex = lexOriginal.confidence >= lexEnglish.confidence ? lexOriginal : lexEnglish;

  // For short reviews (≤ 6 words), the lexicon is more reliable than the models
  // because neural models are trained on longer text and misfire on short phrases
  const wordCount  = englishText.trim().split(/\s+/).length;
  const isShort    = wordCount <= 6;

  // Weights — lexicon gets more say for short text
  const maxLexWeight = isShort ? 0.60 : 0.30;
  const lexWeight    = lex.confidence * maxLexWeight;
  const modelPool    = 1 - lexWeight;
  const m1w = m1 ? modelPool * 0.53 : 0;
  const m2w = m2 ? modelPool * 0.47 : 0;

  const combined = { positive: 0, negative: 0, neutral: 0 };

  if (m1) {
    combined.positive += m1.positive * m1w;
    combined.negative += m1.negative * m1w;
    combined.neutral  += m1.neutral  * m1w;
  }
  if (m2) {
    combined.positive += m2.positive * m2w;
    combined.negative += m2.negative * m2w;
    combined.neutral  += m2.neutral  * m2w;
  }
  if (lex.confidence > 0) {
    const lexPos = Math.max(0, lex.score);
    const lexNeg = Math.max(0, -lex.score);
    const lexNeu = Math.max(0, 1 - lexPos - lexNeg);
    combined.positive += lexPos * lexWeight;
    combined.negative += lexNeg * lexWeight;
    combined.neutral  += lexNeu * lexWeight;
  }

  // Clamp
  for (const k of Object.keys(combined)) combined[k] = Math.max(0, combined[k]);

  const entries    = Object.entries(combined).sort((a, b) => b[1] - a[1]);
  const sentiment  = entries[0][0];
  const confidence = entries[0][1];
  const sentimentScore = 0.5 + (combined.positive - combined.negative) / 2;

  return {
    sentiment,
    sentiment_score:      parseFloat(Math.min(1, Math.max(0, sentimentScore)).toFixed(3)),
    sentiment_confidence: parseFloat((confidence * 100).toFixed(1)),
  };
}

// ─── Stage 4: fake review detection ──────────────────────────────────────────

function heuristicFakeCheck(text) {
  if (!text || text.trim().length === 0) return { fakeScore: 0, signals: [] };

  const trimmed = text.trim();
  const words   = trimmed.split(/\s+/).filter(Boolean);
  const signals = [];
  let fakeScore = 0;

  const genericPhrases = [
    'good','nice','great','awesome','ok','okay','fine','bad','worst','best',
    'excellent','perfect','amazing','terrible','horrible','love it','hate it',
    'good food','nice place','great food','very good','very bad','acha','bura','theek',
  ];
  // Single-phrase reviews with ≤ 3 words
  if (words.length <= 3 && genericPhrases.some(p => trimmed.toLowerCase() === p || trimmed.toLowerCase() === p + '!')) {
    fakeScore += 35;
    signals.push('Extremely short generic text');
  }

  if (/(.)\1{4,}/.test(trimmed)) {
    fakeScore += 20;
    signals.push('Repetitive characters');
  }

  const capsRatio = (trimmed.match(/[A-Z]/g) || []).length / (trimmed.replace(/\s/g, '').length || 1);
  if (capsRatio > 0.6 && trimmed.length > 8) {
    fakeScore += 15;
    signals.push('Excessive capitals');
  }

  if ((trimmed.match(/[!?]{2,}/g) || []).length >= 2) {
    fakeScore += 10;
    signals.push('Excessive punctuation');
  }

  return { fakeScore, signals };
}

async function detectFakeReview(text, restaurantRating, sentiment, restaurantReviewCount = 0) {
  const { fakeScore: heuristicScore, signals } = heuristicFakeCheck(text);

  // Compare review sentiment against the restaurant's OVERALL rating.
  // The more reviews a restaurant has, the more established its rating is,
  // so a mismatch is a stronger fake signal.
  // e.g. 5★ from 277 people + one negative review = very suspicious
  // e.g. 5★ from 2 people  + one negative review = less suspicious (rating not stable)
  let mismatchBoost = 0;
  if (restaurantRating > 0 && text && text.trim().split(/\s+/).length >= 3) {
    // Weight mismatch by how established the restaurant rating is
    // 0–10 reviews: low confidence (weight 0.5)
    // 11–50 reviews: medium (weight 0.75)
    // 51–200 reviews: high (weight 1.0)
    // 200+ reviews: very high (weight 1.25)
    const ratingWeight =
      restaurantReviewCount >= 200 ? 1.25 :
      restaurantReviewCount >= 51  ? 1.0  :
      restaurantReviewCount >= 11  ? 0.75 : 0.5;

    if (restaurantRating >= 4.0 && sentiment === 'negative') {
      const base = restaurantRating >= 4.5 ? 45 : 35;
      mismatchBoost = Math.round(base * ratingWeight);
      signals.push(`Negative review on a ${restaurantRating}★ restaurant (${restaurantReviewCount} reviews)`);
    } else if (restaurantRating <= 2.5 && sentiment === 'positive') {
      const base = restaurantRating <= 2.0 ? 45 : 35;
      mismatchBoost = Math.round(base * ratingWeight);
      signals.push(`Positive review on a ${restaurantRating}★ restaurant (${restaurantReviewCount} reviews)`);
    }
  }

  let aiScore = 0;
  if (text && text.trim().split(/\s+/).length >= 6) {
    try {
      const result = await hfPost(ZEROSHOT_MODEL, {
        inputs: text,
        parameters: {
          candidate_labels: ['genuine customer review', 'fake or spam review', 'promotional content'],
        },
      });
      const labels    = result.labels || [];
      const scores    = result.scores || [];
      const fakeProb  = scores[labels.indexOf('fake or spam review')]  || 0;
      const promoProb = scores[labels.indexOf('promotional content')]  || 0;
      aiScore = (fakeProb * 60) + (promoProb * 30);
      if (fakeProb  > 0.45) signals.push('AI: likely fake or spam');
      if (promoProb > 0.45) signals.push('AI: likely promotional');
    } catch (err) {
      console.error('[FakeDetect] Zero-shot error:', err.message);
    }
  }

  const totalScore = Math.min(100, heuristicScore + mismatchBoost + Math.round(aiScore));

  return {
    is_fake_suspected: totalScore >= 50,
    fake_score:        totalScore,
    fake_signals:      signals,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function analyzeReview(text, restaurantRating = 0, restaurantReviewCount = 0) {
  if (!text || text.trim().length === 0) {
    return {
      original_language:    'unknown',
      translated_text:      '',
      sentiment:            'neutral',
      sentiment_score:      0.5,
      sentiment_confidence: 0,
      is_fake_suspected:    false,
      fake_score:           0,
      fake_signals:         [],
      ai_analyzed:          false,
    };
  }

  const { translated, original_language } = await translateToEnglish(text);
  // Pass ORIGINAL text to sentiment so the lexicon scores it in Roman Urdu/Urdu
  // No rating bias in sentiment — we analyse text purely
  const sentimentResult = await analyzeSentiment(translated, text, 0);
  const fakeResult      = await detectFakeReview(text, restaurantRating, sentimentResult.sentiment, restaurantReviewCount);

  return {
    original_language,
    translated_text: translated,
    ...sentimentResult,
    ...fakeResult,
    ai_analyzed: true,
  };
}

module.exports = { analyzeReview };