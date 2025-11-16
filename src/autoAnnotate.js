// autoAnnotate — integrates LLM-based extractor (server) as an option.
// Exports:
// - computeConnotationScoresForWords(words)
// - scoreToColor(score)
// - autoAnnotateText(text, userHeatMap)  // synchronous fallback/local annotator
// - fetchLLMAnnotations(text)             // async: calls server /api/extract-phrases

// NOTE: keep this file client-side only. The server endpoint (api/extract-phrases.js)
// makes the external OpenAI call so your API key stays server-side.

import { extractKeyPhrases } from "./keyphrase"; // optional local fallback

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

// Synchronous local annotator (fallback) — similar to before.
export function autoAnnotateText(text = "", userHeatMap = []) {
  if (!text || typeof text !== "string") return [];
  const userSet = new Set((userHeatMap || []).map((u) => (u.phrase || "").toLowerCase()));

  // Prefer candidate phrases from keyphrase extractor (local)
  const kp = extractKeyPhrases ? extractKeyPhrases(text, { maxN: 3, minScore: 0.35, minCount: 1 }) : [];
  let candidates = kp.map((p) => p.phrase.toLowerCase());

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

  const scores = computeConnotationScoresForWords(candidates);
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

  out.sort((a, b) => b.phrase.length - a.phrase.length);
  return out;
}

// Async: call server /api/extract-phrases and map to the same shape
export async function fetchLLMAnnotations(text = "", userHeatMap = []) {
  if (!text || typeof text !== "string") return [];
  try {
    const resp = await fetch("/api/extract-phrases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, max_phrases: 30 }),
    });
    if (!resp.ok) {
      // fallback to local annotator
      return autoAnnotateText(text, userHeatMap);
    }
    const j = await resp.json();
    const phrases = Array.isArray(j?.phrases) ? j.phrases : [];
    // remove user-set phrases
    const userSet = new Set((userHeatMap || []).map((u) => (u.phrase || "").toLowerCase()));
    const result = phrases
      .map((p) => {
        const phrase = String(p.phrase || "").trim().toLowerCase();
        const score = typeof p.score === "number" ? normalizeScore(p.score) : 0;
        if (!phrase || userSet.has(phrase)) return null;
        return { phrase, score, color: scoreToColor(score) };
      })
      .filter(Boolean);
    // sort longer phrases first
    result.sort((a, b) => b.phrase.length - a.phrase.length);
    return result;
  } catch (e) {
    // on error, fallback to client-only annotator
    return autoAnnotateText(text, userHeatMap);
  }
}

export default {
  computeConnotationScoresForWords,
  scoreToColor,
  autoAnnotateText,
  fetchLLMAnnotations,
};
