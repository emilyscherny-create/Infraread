// Serverless proxy for Google Cloud Translate (V2)
// - Put this file at /api/translate.js in your project root for Vercel.
// - Set the environment variable GOOGLE_TRANSLATE_API_KEY in Vercel (see below).
// 
// Security notes:
// - Keep the key server-side (DO NOT expose via client-side env).
// - In Google Cloud console, restrict the key (HTTP referrers or IPs) to your deployment domain.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { q, source = "auto", target = "en" } = req.body || {};
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({ error: "Missing text (q) to translate" });
    }

    // Basic guard: size limit to avoid abuse (adjust as needed)
    const MAX_LENGTH = 20000;
    if (q.length > MAX_LENGTH) {
      return res.status(413).json({ error: `Text too long, max ${MAX_LENGTH} characters` });
    }

    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "Server not configured: GOOGLE_TRANSLATE_API_KEY missing" });
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
    const body = {
      q,
      target,
      format: "text",
    };
    if (source && source !== "auto") {
      body.source = source;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return res.status(resp.status).json({ error: `Google API error: ${txt}` });
    }

    const json = await resp.json();
    // Google v2 returns { data: { translations: [ { translatedText, detectedSourceLanguage } ] } }
    const translatedText =
      json?.data?.translations && json.data.translations[0]?.translatedText
        ? json.data.translations[0].translatedText
        : (json?.data?.translations && json.data.translations[0]) || json;

    return res.status(200).json({ translatedText });
  } catch (err) {
    console.error("translate proxy error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}