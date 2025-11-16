// Lightweight client-side connotation annotator (no external deps).
// Exports:
// - computeConnotationScoresForWords(words: string[]) => Map(lowercase -> score in [-1,1])
// - scoreToColor(score: number) => CSS color string (rgba) — GOLD <-> INDIGO scale
// - autoAnnotateText(text: string, userHeatMap: Array<{phrase,color}>) => Array<{phrase,color,score}>
//
// Notes:
// - This version produces higher-contrast RGBA background colors that go from
//   warm gold (positive) to indigo (negative). It also applies a small placement
//   boost: phrases earlier in the text get a slight intensity boost (tunable).
// - The returned objects include `score` as well as `color` so you can debug or
//   tune the UI.

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

// Helpers: hex <-> rgb, lerp color
function hexToRgb(hex) {
  const hx = hex.replace("#", "");
  const bigint = parseInt(hx, 16);
  if (hx.length === 6) {
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  return { r: 255, g: 255, b: 255 };
}
function rgbToRgbaString({ r, g, b }, a = 1) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
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

// Score -> RGBA color on GOLD <-> INDIGO scale
// Positive scores -> warm golds; Negative scores -> indigo shades.
// Neutral -> transparent (no background).
export function scoreToColor(score) {
  const s = normalizeScore(score);
  if (s === 0) return "transparent";

  // Positive scale: pale warm -> deep gold
  const goldStart = "#fff9e6"; // very pale warm
  const goldEnd = "#ffbf3b"; // warm gold

  // Negative scale: pale cool -> deep indigo
  const indigoStart = "#eef2ff"; // very pale indigo
  const indigoEnd = "#4f46e5"; // indigo

  if (s > 0) {
    // map (0..1) to (goldStart..goldEnd) and return a visible alpha
    const hex = lerpColor(goldStart, goldEnd, s);
    // use slightly lower alpha for small scores, stronger for high scores
    const alpha = 0.6 + 0.35 * s; // range ~0.6..0.95
    return rgbToRgbaString(hexToRgb(hex), alpha);
  } else {
    const t = -s; // 0..1
    const hex = lerpColor(indigoStart, indigoEnd, t);
    const alpha = 0.6 + 0.3 * t; // range ~0.6..0.9
    return rgbToRgbaString(hexToRgb(hex), alpha);
  }
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
// returns array of { phrase, color, score }
export function autoAnnotateText(text = "", userHeatMap = []) {
  if (!text || typeof text !== "string") return [];
  const userSet = new Set((userHeatMap || []).map((u) => (u.phrase || "").toLowerCase()));

  // Tokenization: capture words and build unigram + bigram candidates
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
  const baseScores = computeConnotationScoresForWords(candidateSet);

  const THRESHOLD = 0.12; // lower threshold to pick up more candidates
  const out = [];

  for (const [phrase, baseScore] of baseScores.entries()) {
    if (!phrase) continue;
    if (userSet.has(phrase)) continue;

    // placement/position boost: phrases earlier in the text get a slight boost.
    // find first occurrence index (fallback to -1)
    const idx = text.toLowerCase().indexOf(phrase);
    let posBoost = 0;
    if (idx >= 0 && text.length > 0) {
      const normalizedPos = idx / Math.max(1, text.length); // 0..1
      // earlier phrases -> boost up to +12%, later phrases no boost
      posBoost = 0.12 * (1 - normalizedPos);
    }

    const finalScore = normalizeScore(baseScore * (1 + posBoost));

    if (Math.abs(finalScore) >= THRESHOLD) {
      out.push({ phrase, color: scoreToColor(finalScore), score: finalScore });
    }
  }

  // Sort longer phrases first to help longest-match-first rendering
  out.sort((a, b) => b.phrase.length - a.phrase.length);
  return out;
}

export default {
  computeConnotationScoresForWords,
  scoreToColor,
  autoAnnotateText,
};
