// Simple offline auto-annotation helpers — maps words to connotation and colors.
// Uses ES module named exports so it can be imported with:
//   import { autoAnnotateText } from "./autoAnnotate";

let Sentiment = null;
try {
  // optional; install with `npm install sentiment` if you want improved coverage
  // and scoring. This try/catch keeps the module safe without the dependency.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Sentiment = require("sentiment");
} catch (e) {
  Sentiment = null;
}

// Tiny fallback lexicon (word -> score). Replace with AFINN/NRC for better results.
const FALLBACK_LEXICON = {
  great: 3,
  excellent: 4,
  good: 2,
  happy: 2,
  joy: 3,
  calm: 2,
  relaxed: 2,
  neutral: 0,
  meh: 0,
  bad: -2,
  sad: -2,
  angry: -3,
  hate: -4,
  panic: -3,
  anxious: -2,
  energetic: 2,
  focus: 1,
  tired: -1,
  bored: -1,
  love: 3,
  delightful: 3,
  frustrating: -2,
  stressful: -3,
};

// Map score to color — tweak to taste.
export function scoreToColor(score) {
  if (score >= 3) return "rgba(255, 195, 60, 0.85)"; // very positive -> gold
  if (score >= 1) return "rgba(16, 185, 129, 0.75)"; // positive -> green
  if (score === 0) return "rgba(148,163,184,0.12)"; // neutral -> subtle gray-blue
  if (score <= -3) return "rgba(255, 99, 92, 0.85)"; // very negative -> red
  return "rgba(255, 165, 0, 0.55)"; // slightly negative -> orange
}

// Compute a score for each token using the sentiment package if available, otherwise fallback.
export function computeConnotationScoresForWords(words) {
  const map = new Map();
  if (Sentiment) {
    const sentiment = new Sentiment();
    for (const w of words) {
      const r = sentiment.analyze(w);
      map.set(w.toLowerCase(), r.score || 0);
    }
  } else {
    for (const w of words) {
      const low = w.toLowerCase();
      let score = 0;
      if (Object.prototype.hasOwnProperty.call(FALLBACK_LEXICON, low)) {
        score = FALLBACK_LEXICON[low];
      } else {
        const stem = low.replace(/[^a-z0-9]/g, "").replace(/(ing|ed|s)$/, "");
        score = FALLBACK_LEXICON[stem] || 0;
      }
      map.set(low, score);
    }
  }
  return map;
}

// Build a set of distinct tokens from text (simple splitting/cleanup)
export function extractDistinctTokens(text) {
  if (!text) return [];
  const tokens = (text || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ""))
    .filter(Boolean);
  // Deduplicate preserving order
  return Array.from(new Set(tokens));
}

// Given text and existing user annotations, generate auto annotations.
// Returns array: [{ phrase, color, score }]
export function autoAnnotateText(text, existingAnnotations = []) {
  const tokens = extractDistinctTokens(text);
  if (tokens.length === 0) return [];

  const scores = computeConnotationScoresForWords(tokens);

  // Respect user annotations (do not override exact phrase matches)
  const userPhrasesLower = new Set((existingAnnotations || []).map((a) => a.phrase.toLowerCase()));

  const annotations = [];
  for (const token of tokens) {
    const low = token.toLowerCase();
    if (userPhrasesLower.has(low)) continue;
    const score = scores.get(low) || 0;
    const color = scoreToColor(score);
    annotations.push({ phrase: token, color, score });
  }
  return annotations;
}

// export fallback lexicon in case you want to reuse it elsewhere
export { FALLBACK_LEXICON };
