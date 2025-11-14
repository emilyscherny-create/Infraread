import { useState } from "react";

/**
 * Translator component (serverless proxy to Google Translate)
 *
 * Props:
 * - textboxRef: ref to the main textarea (used to get selection and insert translation)
 * - text: whole editor text
 * - setText: setter to write back translation if user chooses to insert
 *
 * Behavior:
 * - Calls the serverless endpoint /api/translate which proxies to Google Cloud Translate
 * - Falls back to a client-side LibreTranslate call or tiny offline dictionary if proxy unavailable
 */

const DEFAULT_LIBRE = import.meta.env.VITE_TRANSLATE_API_URL || "https://libretranslate.de/translate";

const FALLBACK = {
  hello: "hola",
  world: "mundo",
  love: "amor",
  happy: "feliz",
  sad: "triste",
  good: "bueno",
  bad: "malo",
};

export default function Translator({ textboxRef, text, setText }) {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [useSelection, setUseSelection] = useState(true);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState(null);

  const languages = [
    { code: "auto", name: "Auto" },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "pt", name: "Portuguese" },
    { code: "it", name: "Italian" },
    { code: "nl", name: "Dutch" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
  ];

  function getSelectedText() {
    try {
      if (!textboxRef || !textboxRef.current) return "";
      const el = textboxRef.current;
      return el.value.substring(el.selectionStart, el.selectionEnd);
    } catch (e) {
      return "";
    }
  }

  async function callProxyTranslate(q, source = "auto", target = "es") {
    // call local serverless proxy first
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, source, target }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Proxy error ${res.status}: ${txt}`);
      }
      const body = await res.json();
      if (body.translatedText) return body.translatedText;
      if (body.translation) return body.translation;
      return body.translated || JSON.stringify(body);
    } catch (err) {
      throw err;
    }
  }

  async function callLibreTranslate(q, source = "auto", target = "es") {
    const payload = { q, source: source === "auto" ? "auto" : source, target, format: "text" };
    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(DEFAULT_LIBRE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`LibreTranslate error ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json();
      if (body.translatedText) return body.translatedText;
      if (body.translation) return body.translation;
      if (typeof body === "string") return body;
      return JSON.stringify(body);
    } catch (err) {
      throw err;
    }
  }

  function fallbackTranslate(q) {
    if (!q) return "";
    const tokens = q.split(/\b/);
    const mapped = tokens.map((t) => {
      const low = t.toLowerCase();
      if (FALLBACK[low]) return FALLBACK[low];
      return t;
    });
    return mapped.join("");
  }

  async function handleTranslate() {
    setError(null);
    setTranslated("");
    const source = sourceLang;
    const target = targetLang;
    const q = useSelection ? getSelectedText() || text : text;
    if (!q) {
      setError("Nothing to translate (select text or disable 'Selection only').");
      return;
    }

    setLoading(true);
    try {
      // try proxy (serverless) first
      try {
        const out = await callProxyTranslate(q, source, target);
        setTranslated(out);
        setLoading(false);
        return;
      } catch (proxyErr) {
        // proxy not available or failed; fall through
        console.warn("Proxy translate failed, falling back:", proxyErr);
      }

      // next try LibreTranslate directly from client
      try {
        const out = await callLibreTranslate(q, source, target);
        setTranslated(out);
        setLoading(false);
        return;
      } catch (libErr) {
        console.warn("LibreTranslate failed, falling back:", libErr);
      }

      // final fallback: tiny offline map
      const out = fallbackTranslate(q);
      setTranslated(out);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function handleInsert() {
    if (!textboxRef || !textboxRef.current) return;
    const el = textboxRef.current;
    el.focus();
    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;
    if (useSelection && selStart !== selEnd) {
      const newValue = el.value.substring(0, selStart) + translated + el.value.substring(selEnd);
      setText(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selStart + translated.length;
      });
    } else {
      setText(translated);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = translated.length;
      });
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(translated);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = translated;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  return (
    <div className="translator-panel">
      <div className="translator-row">
        <label>
          From
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          To
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            {languages
              .filter((l) => l.code !== "auto")
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
          </select>
        </label>

        <label className="translator-toggle">
          <input type="checkbox" checked={useSelection} onChange={(e) => setUseSelection(e.target.checked)} />
          Selection only
        </label>

        <button className="action-btn action-ig" onClick={handleTranslate} disabled={loading}>
          {loading ? "Translating…" : "Translate"}
        </button>
      </div>

      {error && <div className="translator-error">{error}</div>}

      <div className="translator-output">
        <div className="translator-output-label">Translation</div>
        <div className="translator-output-body">{translated || <em>No translation yet</em>}</div>

        <div className="translator-actions">
          <button className="action-btn action-warm-1" onClick={handleInsert} disabled={!translated}>
            Insert
          </button>
          <button className="action-btn action-warm-2" onClick={handleCopy} disabled={!translated}>
            Copy
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#5b4b66" }}>
        Proxy: <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 6 }}>{"/api/translate"}</code>
      </div>
    </div>
  );
}