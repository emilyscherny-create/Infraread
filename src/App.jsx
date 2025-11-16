import { useState, useEffect, useRef } from "react";
import "./app.css";
import Dashboard from "./InfrareadDashboard.jsx";
import Translator from "./Translator.jsx";
import { autoAnnotateText, computeConnotationScoresForWords, scoreToColor, fetchLLMAnnotations } from "./autoAnnotate";

export default function App() {
  const [text, setText] = useState("");
  const [heatMap, setHeatMap] = useState([]); // user-marked phrases
  const [autoAnnotations, setAutoAnnotations] = useState([]); // generated automatically
  const [autoAnnotateEnabled, setAutoAnnotateEnabled] = useState(false);
  const [autoLiveEnabled, setAutoLiveEnabled] = useState(true); // live updates while typing
  const [useLLMExtractor, setUseLLMExtractor] = useState(true); // new toggle: use server LLM extractor

  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const textboxRef = useRef(null);
  const overlayRef = useRef(null);

  // phrase marking UI state
  const [phraseToMark, setPhraseToMark] = useState("");
  const [phraseColor, setPhraseColor] = useState("#f58529"); // warm default

  // debounce timer for live annotation
  const liveTimerRef = useRef(null);

  // -----------------------------
  // Handle typing + history tracking
  // -----------------------------
  const handleChange = (e) => {
    const newValue = e.target.value;
    const time = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    setHistory((prev) => [...prev, { value: newValue, time }]);
    setText(newValue);
  };

  function handleScroll(e) {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
      overlayRef.current.scrollLeft = e.target.scrollLeft;
    }
  }

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
  // Auto-annotation: recompute when text, enabled, user annotations change
  // Debounced for live typing; can use LLM extractor if enabled
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    async function computeAnnotationsNow() {
      if (!autoAnnotateEnabled) {
        setAutoAnnotations([]);
        return;
      }

      // If live mode is off and LLM is disabled, compute once synchronously
      if (!autoLiveEnabled && !useLLMExtractor) {
        const autos = autoAnnotateText(text, heatMap);
        if (!cancelled) setAutoAnnotations(autos);
        return;
      }

      // Live mode or LLM usage: debounce and compute
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);

      liveTimerRef.current = setTimeout(async () => {
        try {
          let autos = [];
          if (useLLMExtractor) {
            // fetch phrases from server LLM endpoint (async)
            autos = await fetchLLMAnnotations(text, heatMap);
          } else {
            autos = autoAnnotateText(text, heatMap);
          }
          if (!cancelled) setAutoAnnotations(autos);
        } catch (e) {
          // on error, fallback to local annotator
          const autos = autoAnnotateText(text, heatMap);
          if (!cancelled) setAutoAnnotations(autos);
        } finally {
          liveTimerRef.current = null;
        }
      }, 180); // ~180ms debounce
    }

    computeAnnotationsNow();

    return () => {
      cancelled = true;
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [text, autoAnnotateEnabled, autoLiveEnabled, heatMap, useLLMExtractor]);

  // -----------------------------
  // Render text with phrase overlays (same as earlier)
  // -----------------------------
  function renderHeatText() {
    if (!text) return null;

    const src = text;
    const len = src.length;

    const userAnns = heatMap.map((a) => ({ phrase: a.phrase, phraseLower: a.phrase.toLowerCase(), color: a.color, source: "user" }));

    const autoAnns = (autoAnnotations || []).map((a) => ({
      phrase: a.phrase,
      phraseLower: a.phrase.toLowerCase(),
      color: a.color,
      source: "auto",
    }));

    let liveAnn = null;
    try {
      const caret = textboxRef.current?.selectionStart ?? -1;
      if (autoAnnotateEnabled && autoLiveEnabled && caret >= 0) {
        let s = caret;
        while (s > 0 && !/\s/.test(src[s - 1])) s -= 1;
        let e = caret;
        while (e < len && !/\s/.test(src[e])) e += 1;
        const current = src.substring(s, e).trim();
        if (current) {
          const low = current.toLowerCase();
          const userPhrasesLower = new Set(userAnns.map((u) => u.phraseLower));
          if (!userPhrasesLower.has(low)) {
            const scoreMap = computeConnotationScoresForWords([current]);
            const score = scoreMap.get(low) || 0;
            const color = scoreToColor(score);
            liveAnn = { phrase: current, phraseLower: low, color, source: "live" };
          }
        }
      }
    } catch (e) {
      // ignore caret errors
    }

    const mergedOrdered = [...userAnns, ...(liveAnn ? [liveAnn] : []), ...autoAnns];
    const annotations = mergedOrdered;

    const out = [];
    let i = 0;

    const isStartBoundary = (pos) => pos === 0 || /\s|[.,!?;:()"\u2014\u2013]/.test(src[pos - 1]);
    const isEndBoundary = (pos) => pos >= len || /\s|[.,!?;:()"\u2014\u2013]/.test(src[pos]);

    const precedence = { user: 3, live: 2, auto: 1 };

    while (i < len) {
      if (/\s/.test(src[i])) {
        out.push(<span key={i} className="plain-char">{src[i]}</span>);
        i += 1;
        continue;
      }

      let best = null;
      for (const ann of annotations) {
        const p = ann.phraseLower;
        if (!p) continue;
        const segment = src.substr(i, p.length).toLowerCase();
        if (segment === p) {
          const startOk = isStartBoundary(i);
          const endOk = isEndBoundary(i + p.length);
          if (!startOk || !endOk) continue;
          const matchLen = p.length;
          if (!best) {
            best = { annotation: ann, matchLen };
          } else {
            if (matchLen > best.matchLen) {
              best = { annotation: ann, matchLen };
            } else if (matchLen === best.matchLen) {
              const curP = precedence[ann.source] || 0;
              const bestP = precedence[best.annotation.source] || 0;
              if (curP > bestP) best = { annotation: ann, matchLen };
            }
          }
        }
      }

      if (best) {
        const matchedText = src.substr(i, best.matchLen);
        const style = { backgroundColor: best.annotation.color };
        const cls = `phrase-highlight ${best.annotation.source === "auto" ? "auto" : best.annotation.source === "live" ? "live" : "user"}`;
        out.push(
          <span key={i} className={cls} style={style}>
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

  // Replay and analysis code left unchanged...
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
    const delay = replayIndex === 0 ? 100 : frame.time - history[replayIndex - 1].time;
    const timer = setTimeout(() => {
      setText(frame.value);
      setReplayIndex(replayIndex + 1);
    }, Math.min(delay, 200));
    return () => clearTimeout(timer);
  }, [replaying, replayIndex, history]);

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
          <div ref={overlayRef} className="heatmap-overlay" aria-hidden="true">
            {renderHeatText()}
          </div>

          <textarea
            ref={textboxRef}
            className="editor-input"
            value={text}
            onChange={handleChange}
            onScroll={handleScroll}
            disabled={replaying}
            placeholder="Start typing…"
          />
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
            <input type="checkbox" checked={autoAnnotateEnabled} onChange={(e) => setAutoAnnotateEnabled(e.target.checked)} />{" "}
            Auto annotate (connotation)
          </label>

          <label className="auto-toggle">
            <input type="checkbox" checked={autoLiveEnabled} onChange={(e) => setAutoLiveEnabled(e.target.checked)} />{" "}
            Live updates
          </label>

          <label className="auto-toggle" title="Use server LLM to extract multi-word phrases">
            <input type="checkbox" checked={useLLMExtractor} onChange={(e) => setUseLLMExtractor(e.target.checked)} />{" "}
            Use LLM extractor
          </label>

          <button className="action-btn action-ig" onClick={startReplay} disabled={replaying || history.length === 0}>
            Replay
          </button>

          <button className="action-btn action-warm-2" onClick={runAnalysis} disabled={history.length === 0}>
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
                  <button className="small-remove" onClick={() => removeAnnotation(i)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <Translator textboxRef={textboxRef} text={text} setText={setText} />
        </div>
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
