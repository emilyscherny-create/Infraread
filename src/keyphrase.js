// Minimal client-side keyphrase extractor (n-gram + RAKE-like scoring).
// Exports: extractKeyPhrases(text, opts) => [{ phrase, score, count }]
//
// Lightweight, runs entirely in the browser. Tune maxN/minScore/minCount to adjust sensitivity.

const DEFAULT_STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","on","in","at","by","for","with","to","of",
  "is","are","was","were","be","been","it","this","that","these","those","as","from","i","you",
  "we","they","he","she","me","him","her","them","my","your","our","their"
]);

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\u2019/g, "'");
}

function tokenizeWords(text) {
  return normalizeText(text)
    .split(/[^a-z0-9'\u00C0-\u017F]+/i)
    .filter(Boolean);
}

function buildCandidates(words, maxN = 2, stopwords = DEFAULT_STOPWORDS) {
  const candidates = [];
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= maxN && i + n <= words.length; n++) {
      const slice = words.slice(i, i + n);
      // skip candidate if it begins/ends with a stopword
      if (stopwords.has(slice[0]) || stopwords.has(slice[slice.length - 1])) continue;
      candidates.push(slice.join(" "));
    }
  }
  return candidates;
}

// RAKE-like scoring: compute degree/ frequency and give phrase scores.
function scoreWithRake(candidates) {
  const wordFreq = new Map();
  const wordDegree = new Map();

  for (const phrase of candidates) {
    const parts = phrase.split(/\s+/);
    const deg = parts.length - 1;
    for (const w of parts) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      wordDegree.set(w, (wordDegree.get(w) || 0) + deg);
    }
  }

  // degree + freq
  for (const [w, freq] of wordFreq.entries()) {
    wordDegree.set(w, (wordDegree.get(w) || 0) + freq);
  }

  const wordScore = new Map();
  for (const [w, deg] of wordDegree.entries()) {
    const freq = wordFreq.get(w) || 1;
    wordScore.set(w, deg / freq);
  }

  const phraseScores = new Map();
  for (const phrase of candidates) {
    const parts = phrase.split(/\s+/);
    let score = 0;
    for (const w of parts) score += (wordScore.get(w) || 0);
    phraseScores.set(phrase, (phraseScores.get(phrase) || 0) + score);
  }

  return { phraseScores, wordFreq };
}

export function extractKeyPhrases(text, opts = {}) {
  const maxN = opts.maxN || 2;
  const stopwords = opts.stopwords || DEFAULT_STOPWORDS;
  const minScore = typeof opts.minScore === "number" ? opts.minScore : 0.5;
  const minCount = opts.minCount || 1;

  const words = tokenizeWords(text);
  if (words.length === 0) return [];

  const candidates = buildCandidates(words, maxN, stopwords);
  if (candidates.length === 0) return [];

  const { phraseScores, wordFreq } = scoreWithRake(candidates);

  const results = [];
  for (const [phrase, score] of phraseScores.entries()) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "gi");
    const count = (String(text || "").match(re) || []).length;
    if (count >= minCount && score >= minScore) {
      results.push({ phrase, score: Number(score.toFixed(3)), count });
    }
  }

  // sort by score desc, count desc, length desc
  results.sort((a, b) => b.score - a.score || b.count - a.count || b.phrase.length - a.phrase.length);
  return results;
}

export default { extractKeyPhrases };
