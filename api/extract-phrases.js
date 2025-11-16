/**
 * Serverless endpoint that uses OpenAI Chat completions to extract key phrases
 * and assign each a connotation score between -1.0 and +1.0.
 *
 * Expects POST { text: "...", max_phrases?: number }
 * Returns JSON: { phrases: [ { phrase: string, score: number }, ... ] }
 *
 * IMPORTANT: set environment variable OPENAI_API_KEY in your deployment,
 * e.g. Vercel Environment Variables.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { text = "", max_phrases = 20 } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing or invalid 'text' in request body" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    return;
  }

  // Compose system + user messages with strict JSON-only instruction
  const system = `You are a JSON generator. Given an input text, return a JSON array of objects.
Each object must have:
- "phrase": the extracted phrase (string)
- "score": a number between -1.0 (very negative) and +1.0 (very positive)
Return ONLY a JSON array. Do NOT include any commentary, markdown, or explanation.
Prefer multi-word phrases where appropriate. Return at most ${max_phrases} items.`;

  const user = `Extract important phrases from the following text and give each a connotation score between -1.0 and +1.0 (negative=negative connotation, positive=positive connotation). Text:
---
${text}
---`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // change to a higher-tier model if you want better quality
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.0,
        max_tokens: 700,
        n: 1,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      res.status(502).json({ error: "OpenAI error", status: resp.status, body: txt });
      return;
    }

    const j = await resp.json();
    const content = j?.choices?.[0]?.message?.content ?? "";

    // Attempt to extract JSON array from the model output.
    let jsonText = content.trim();

    // If the model returned text with surrounding commentary, try to find the first '[' ... last ']'.
    if (!jsonText.startsWith("[")) {
      const first = jsonText.indexOf("[");
      const last = jsonText.lastIndexOf("]");
      if (first >= 0 && last >= 0 && last > first) {
        jsonText = jsonText.slice(first, last + 1);
      }
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      // second attempt: try to remove non-printables and reparse
      const cleaned = jsonText.replace(/[^ -~\t\n\r\[\]\{\}"0-9A-Za-z:.,-]/g, "");
      try {
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        // cannot parse; surface helpful debug info
        res.status(502).json({
          error: "Failed to parse JSON from model response",
          raw: content,
          cleaned: cleaned,
        });
        return;
      }
    }

    // Validate parsed shape: array of { phrase, score }
    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: "Model did not return a JSON array", raw: parsed });
      return;
    }

    // sanitize entries and coerce types
    const phrases = parsed
      .map((it) => {
        if (!it || typeof it !== "object") return null;
        const phrase = String(it.phrase || "").trim();
        let score = Number(it.score);
        if (!isFinite(score)) {
          const maybe = parseFloat(String(it.score || "0").replace(/[^\d.-]/g, ""));
          score = isFinite(maybe) ? maybe : 0;
        }
        // clamp score
        score = Math.max(-1, Math.min(1, score));
        return phrase ? { phrase, score } : null;
      })
      .filter(Boolean)
      .slice(0, max_phrases);

    res.status(200).json({ phrases });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
}
