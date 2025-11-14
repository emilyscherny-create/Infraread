import { useState, useEffect, useRef } from "react";
import "./app.css";
import Dashboard from "./InfrareadDashboard.jsx";
import { autoAnnotateText } from "./autoAnnotate";

export default function App() {
  const [text, setText] = useState("");
  const [heatMap, setHeatMap] = useState([]); // user-marked phrases
  const [autoAnnotations, setAutoAnnotations] = useState([]); // generated automatically
  const [autoAnnotateEnabled, setAutoAnnotateEnabled] = useState(false);

  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const textboxRef = useRef(null);

  // phrase marking UI state
  const [phraseToMark, setPhraseToMark] = useState("");
  const [phraseColor, setPhraseColor] = useState("#f58529"); // default warm gradient tone

  // -----------------------------
  // Handle typing + history tracking
  // -----------------------------
  const handleChange = (e) => {
    const newValue = e.target.value;
    const time = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    setHistory((prev) => [...prev, { value: newValue, time }]);
    setText(newValue);
  };

  // -----------------------------
  // Mark / unmark phrases (controls)
  // -----------------------------
  function markPhrase() {
    const phrase = phraseToMark.trim();
    if (!phrase) return;
    if (heatMap.some((a) => a.phrase.toLowerCase() === phrase.toLowerCase())) {
      setPhraseToMark("");
      return;
    }
    setHeatMap((prev) => [...prev, { phrase, color: phraseColor }]);
    setPhraseToMark("");
  }

  function removeAnnotation(idx) {
    setHeatMap((prev) => prev.filter((_, i) => i !== idx));
  }

  // -----------------------------
  // Auto-annotation: recompute when text, enabled, or user annotations change
  // -----------------------------
  useEffect(() => {
    if (!autoAnnotateEnabled) {
      setAutoAnnotations([]);
      return;
    }
    // compute autos based on current text and user annotations
    const autos = autoAnnotateText(text, heatMap);
    setAutoAnnotations(autos);
  }, [text, autoAnnotateEnabled, heatMap]);

  // -----------------------------
  // Render text with phrase overlays
  // - Uses longest-match-first and word-boundary checks
  // -----------------------------
  function renderHeatText() {
    if (!text) return null;

    const merged = [...heatMap.map(a => ({ ...a, source: "user" })), ...autoAnnotations.map(a => ({ ...a, source: "auto" }))];

    // build annotation lookup in lower-case for matching
    const annotations = merged.map((a) => ({ phrase: a.phrase, phraseLower: a.phrase.toLowerCase(), color: a.color, source: a.source }));

    const out = [];
    const src = text;
    const len = src.length;
    let i = 0;

    const isStartBoundary = (pos) => pos === 0 || /\s|[.,!?;:()"\u2014\u2013]/.test(src[pos - 1]);
    const isEndBoundary = (pos) => pos >= len || /\s|[.,!?;:()"\u2014\u2013]/.test(src[pos]);

    while (i < len) {
      if (/\s/.test(src[i])) {
        out.push(<span key={i} className="plain-char">{src[i]}</span>);
        i += 1;
        continue;
      }

      let best = null; // {annotation, matchLen}
      for (const ann of annotations) {
        const p = ann.phraseLower;
        const segment = src.substr(i, p.length).toLowerCase();
        if (segment === p) {
          const startOk = isStartBoundary(i);
          const endOk = isEndBoundary(i + p.length);
          if (startOk && endOk) {
            if (!best || p.length > best.matchLen || (p.length === best.matchLen && best.annotation.source === "auto" && ann.source === "user")) {
              // prefer longer match; in tie prefer user annotation over auto
              best = { annotation: ann, matchLen: p.length };
            }
          }
        }
      }

      if (best) {
        const matchedText = src.substr(i, best.matchLen);
        // add different outline if auto vs user (optional visual cue)
        const style = { backgroundColor: best.annotation.color };
        out.push(
          <span key={i} className={`phrase-highlight ${best.annotation.source === "auto" ? "auto" : "user"}`} style={style}>
            {matchedText}
          </span>
        );
        i += best.matchLen;
        continue;
      }

      let j = i;
      while (j < len && !/\s/.test(src[j])) j++;
      const piece = src.substring(i, j);
      out.push(<span key={i} className="plain-word">{piece}</span>);
      i = j;
    }

    return out;
  }

  // -----------------------------
  // Replay typing (with backspaces)
  // -----------------------------
  const startReplay = () => {
    if (history.length === 0) return;
    setReplaying(true);
    setReplayIndex(0);
    setText("");
  };

  useEffect(() => {
    if (!replaying) return;

    if (replayIndex >= history.length) {
      setReplaying(false);
      return;
    }

    const frame = history[replayIndex];
    const delay =
      replayIndex === 0
        ? 100
        : frame.time - history[replayIndex - 1].time;

    const timer = setTimeout(() => {
      setText(frame.value);
      setReplayIndex(replayIndex + 1);
    }, Math.min(delay, 200));

    return () => clearTimeout(timer);
  }, [replaying, replayIndex, history]);

  // -----------------------------
  // Analysis tool (unchanged)
  // -----------------------------
  function runAnalysis() {
    if (!history || history.length === 0) {
      setAnalysis(null);
      return null;
    }

    const times = history.map((h) => h.time || 0).filter(Boolean);
    const durationMs = times.length >= 2 ? times[times.length - 1] - times[0] : 0;

    const deltas = [];
    let deletions = 0;
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const cur = history[i];
      const dt = (cur.time || 0) - (prev.time || 0);
      deltas.push(dt || 0);
      if ((cur.value?.length || 0) < (prev.value?.length || 0)) deletions++;
    }

    const avgSpeed = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;
    const bursts = deltas.filter((d) => d < 120).length;
    const pauses = deltas.filter((d) => d > 600).length;

    const flowIndex = Math.max(0, Math.min(100, 100 - avgSpeed / 10));
    const stressIndex = Math.max(0, Math.min(100, (deletions / Math.max(1, history.length)) * 100));
    const energyIndex = Math.max(0, Math.min(100, (bursts / Math.max(1, history.length)) * 100));

    const result = { durationMs, avgSpeed, bursts, pauses, deletions, flowIndex, stressIndex, energyIndex };
    setAnalysis(result);
    return result;
  }

  // -----------------------------
  // UI Rendering
  // -----------------------------
  return (
    <div className="app-container">
      <main className="editor-column">
        <h1 className="infraread-title">Infraread</h1>

        <div className="editor-section">
          <textarea
            ref={textboxRef}
            className="editor-input"
            value={text}
            onChange={handleChange}
            disabled={replaying}
            placeholder="Start typing…"
          />

          <div className="heatmap-output">
            {renderHeatText()}
          </div>
        </div>

        <div className="controls-row">
          <div className="phrase-controls">
            <input
              className="phrase-input"
              placeholder="Enter word or phrase to mark"
              value={phraseToMark}
              onChange={(e) => setPhraseToMark(e.target.value)}
            />
            <input
              type="color"
              className="phrase-color"
              value={phraseColor}
              onChange={(e) => setPhraseColor(e.target.value)}
              title="Pick color for phrase highlight"
            />
            <button className="action-btn action-ig" onClick={markPhrase} disabled={!phraseToMark.trim()}>
              Mark Phrase
            </button>
          </div>

          <label className="auto-toggle">
            <input
              type="checkbox"
              checked={autoAnnotateEnabled}
              onChange={(e) => setAutoAnnotateEnabled(e.target.checked)}
            />{" "}
            Auto annotate (connotation)
          </label>

          <button
            className="action-btn action-ig"
            onClick={startReplay}
            disabled={replaying || history.length === 0}
          >
            Replay
          </button>

          <button
            className="action-btn action-warm-2"
            onClick={runAnalysis}
            disabled={history.length === 0}
          >
            Run Analysis
          </button>
        </div>

        {heatMap.length > 0 && (
          <div className="annotations-list">
            <strong>Marked phrases:</strong>
            <ul>
              {heatMap.map((a, i) => (
                <li key={i}>
                  <span className="legend-swatch" style={{ backgroundColor: a.color }} />{" "}
                  <span className="legend-text">{a.phrase}</span>{" "}
                  <button className="small-remove" onClick={() => removeAnnotation(i)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <Dashboard
        history={history}
        setHistory={setHistory}
        heatMap={[...heatMap, ...autoAnnotations]}
        setHeatMap={setHeatMap}
        text={text}
        setText={setText}
        analysis={analysis}
        setAnalysis={setAnalysis}
        runAnalysis={runAnalysis}
      />
    </div>
  );
}
