// autoAnnotate — updated to use keyphrase extraction (client-side) as primary
// source of candidate phrases. Keeps the connotation lexicon and color mapping.
// Exports: computeConnotationScoresForWords, scoreToColor, autoAnnotateText

import { extractKeyPhrases } from "./keyphrase";

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

// GOLD <-> INDIGO scale (RGBA)
export function scoreToColor(score) {
  const s = normalizeScore(score);
  if (s === 0) return "transparent";

  const goldStart = "#fff9e6";
  const goldEnd = "#ffbf3b";
  const indigoStart = "#eef2ff";
  const indigoEnd = "#4f46e5";

  if (s > 0) {
    const hex = lerpColor(goldStart, goldEnd, s);
    const alpha = 0.6 + 0.35 * s;
    return rgbToRgbaString(hexToRgb(hex), alpha);
  } else {
    const t = -s;
    const hex = lerpColor(indigoStart, indigoEnd, t);
    const alpha = 0.6 + 0.3 * t;
    return rgbToRgbaString(hexToRgb(hex), alpha);
  }
}

// Compute connotation scores for words/phrases using LEXICON (exact-match or average)
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

// Main: auto-annotate text
// Strategy:
// 1) Run keyphrase extractor to find salient phrases (unigrams/bigrams/trigrams).
// 2) Score those phrases with computeConnotationScoresForWords (fallback to 0).
// 3) If extractor finds nothing, fall back to previous simple unigram+bigram scan.
export function autoAnnotateText(text = "", userHeatMap = []) {
  if (!text || typeof text !== "string") return [];
  const userSet = new Set((userHeatMap || []).map((u) => (u.phrase || "").toLowerCase()));

  // 1) extract candidate phrases using keyphrase module
  const kp = extractKeyPhrases(text, { maxN: 3, minScore: 0.35, minCount: 1 });
  let candidates = kp.map((p) => p.phrase.toLowerCase());

  // fallback: if keyphrase extractor produced no candidates, build simple candidates
  if (candidates.length === 0) {
    const reWord = /\w+/g;
    const wordList = [];
    let m;
    while ((m = reWord.exec(text)) !== null) {
      wordList.push(m[0]);
    }
    const temp = [];
    for (let i = 0; i < wordList.length; i++) {
      temp.push(wordList[i]);
      if (i + 1 < wordList.length) temp.push(`${wordList[i]} ${wordList[i + 1]}`);
    }
    candidates = Array.from(new Set(temp.map((w) => w.trim().toLowerCase()))).filter(Boolean);
  }

  // compute connotation scores for candidates
  const scores = computeConnotationScoresForWords(candidates);

  // placement/position boost for early phrases, and thresholding
  const THRESHOLD = 0.12;
  const out = [];
  for (const phrase of candidates) {
    if (!phrase) continue;
    if (userSet.has(phrase)) continue;
    const baseScore = scores.get(phrase) || 0;

    // placement boost
    const idx = text.toLowerCase().indexOf(phrase);
    let posBoost = 0;
    if (idx >= 0 && text.length > 0) {
      const normalizedPos = idx / Math.max(1, text.length);
      posBoost = 0.12 * (1 - normalizedPos);
    }
    const finalScore = normalizeScore(baseScore * (1 + posBoost));
    if (Math.abs(finalScore) >= THRESHOLD) {
      out.push({ phrase, color: scoreToColor(finalScore), score: finalScore });
    }
  }

  // sort longer phrases first for longest-match-first rendering
  out.sort((a, b) => b.phrase.length - a.phrase.length);
  return out;
}

export default {
  computeConnotationScoresForWords,
  scoreToColor,
  autoAnnotateText,
};
