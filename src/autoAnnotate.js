// Lightweight client-side connotation annotator (no external deps).
// Exports:
// - computeConnotationScoresForWords(words: string[]) => Map(lowercase -> score in [-1,1])
// - scoreToColor(score: number) => CSS color string
// - autoAnnotateText(text: string, userHeatMap: Array<{phrase,color}>) => Array<{phrase,color}>
//
// This file is intentionally small and self-contained. It focuses on stronger,
// higher-contrast background colors so highlights are visible on the current theme.

const LEXICON = {
  // Positive
  happy: 0.85,
  joy: 0.85,
  love: 0.95,
  excellent: 0.9,
  good: 0.65,
  great: 0.75,
  success: 0.65,
  celebrate: 0.6,
  // Neutral
  the: 0,
  and: 0,
  // Negative
  sad: -0.85,
  anger: -0.85,
  angry: -0.85,
  hate: -0.95,
  bad: -0.6,
  failure: -0.75,
  worried: -0.55,
  anxious: -0.6,
  // Multi-word examples
  "not good": -0.6,
  "very happy": 0.9,
};

function normalizeScore(raw) {
  if (Number.isNaN(raw) || !isFinite(raw)) return 0;
  return Math.max(-1, Math.min(1, raw));
}

// Stronger, higher-contrast palette so backgrounds are visible on the app panel.
// Negative => reds/oranges, Neutral => transparent (no highlight), Positive => warm golds.
export function scoreToColor(score) {
  const s = normalizeScore(score);
  if (s <= -0.75) return "#ff3b2e"; // very negative (bright red)
  if (s <= -0.35) return "#ff7a5f"; // negative
  if (s < 0) return "#ffc9b8"; // mild negative
  if (s === 0) return "transparent"; // neutral -> no background
  if (s < 0.35) return "#fff0c9"; // mild positive (pale warm)
  if (s < 0.75) return "#ffd66b"; // positive
  return "#ffbf3b"; // very positive (warm gold)
}

function hexToRgb(hex) {
  const hx = hex.replace("#", "");
  const bigint = parseInt(hx, 16);
  if (hx.length === 6) {
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  return { r: 255, g: 255, b: 255 };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return rgbToHex(r, g, bl);
}

// Compute connotation scores for an array of words/phrases.
// Returns Map(lowercase -> score in [-1,1])
export function computeConnotationScoresForWords(words) {
  const out = new Map();
  if (!words || words.length === 0) return out;
  for (const raw of words) {
    const w = String(raw || "").trim().toLowerCase();
    if (!w) continue;
    if (Object.prototype.hasOwnProperty.call(LEXICON, w)) {
      out.set(w, normalizeScore(LEXICON[w]));
      continue;
    }
    // Fallback: split and average known token scores
    const parts = w.split(/\s+/).filter(Boolean);
    let total = 0;
    let count = 0;
    for (const p of parts) {
      if (Object.prototype.hasOwnProperty.call(LEXICON, p)) {
        total += LEXICON[p];
        count += 1;
      }
    }
    const score = count > 0 ? total / count : 0;
    out.set(w, normalizeScore(score));
  }
  return out;
}

// Scan text and return auto-annotations
// - text: the whole editor text
// - userHeatMap: array of user-marked phrases {phrase,color}
export function autoAnnotateText(text = "", userHeatMap = []) {
  if (!text || typeof text !== "string") return [];
  const userSet = new Set((userHeatMap || []).map((u) => (u.phrase || "").toLowerCase()));

  // Tokenization: get words (alphanumeric) and build unigram + bigram candidates
  const reWord = /\w+/g;
  const wordList = [];
  let m;
  while ((m = reWord.exec(text)) !== null) {
    wordList.push(m[0]);
  }

  const candidates = [];
  for (let i = 0; i < wordList.length; i++) {
    candidates.push(wordList[i]);
    if (i + 1 < wordList.length) candidates.push(`${wordList[i]} ${wordList[i + 1]}`);
  }

  const candidateSet = Array.from(new Set(candidates.map((w) => w.trim().toLowerCase()))).filter(Boolean);
  const scores = computeConnotationScoresForWords(candidateSet);

  const THRESHOLD = 0.18; // tuneable threshold for visibility
  const out = [];
  for (const [phrase, score] of scores.entries()) {
    if (!phrase) continue;
    if (userSet.has(phrase)) continue;
    if (Math.abs(score) >= THRESHOLD) {
      out.push({ phrase, color: scoreToColor(score), score });
    }
  }

  // Sort longer phrases first to help longest-match-first rendering
  out.sort((a, b) => b.phrase.length - a.phrase.length);
  return out;
}

// default export for convenience
export default {
  computeConnotationScoresForWords,
  scoreToColor,
  autoAnnotateText,
};
