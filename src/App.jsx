import { useState, useEffect, useRef } from "react";
import "./app.css";
import Dashboard from "./InfrareadDashboard.jsx";

export default function App() {
  const [text, setText] = useState("");
  const [heatMap, setHeatMap] = useState([]);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const textboxRef = useRef(null);

  // -----------------------------
  // Calculate typing speed per keystroke
  // -----------------------------
  function calculateSpeed(current, previous) {
    if (!previous) return 0;
    return current.time - previous.time; // time between keystrokes (ms)
  }

  // -----------------------------
  // Determine heat color based on typing speed
  // Lower = calm blue, medium = green, fast = orange/red
  // -----------------------------
  function getHeatColor(speed) {
    if (speed > 600) return "rgba(0, 140, 255, 0.25)";   // calm blue
    if (speed > 300) return "rgba(0, 255, 120, 0.30)";   // thoughtful green
    if (speed > 150) return "rgba(255, 165, 0, 0.35)";    // orange
    return "rgba(255, 0, 80, 0.45)";                      // intense pink/red
  }

  // -----------------------------
  // Handle typing + heat tracking
  // -----------------------------
  const handleChange = (e) => {
    const newValue = e.target.value;
    const time = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

    // Track history for replay (including deletions)
    setHistory((prev) => [...prev, { value: newValue, time }]);

    // Update heatmap only if a new character was added
    if (newValue.length > text.length) {
      const addedChar = newValue[newValue.length - 1];
      const prevEntry = heatMap[heatMap.length - 1];

      const speed = calculateSpeed(
        { char: addedChar, time },
        prevEntry
      );

      const color = getHeatColor(speed);

      setHeatMap((prev) => [...prev, { char: addedChar, color, time }]);
    }

    setText(newValue);
  };

  // -----------------------------
  // Render text with heat overlay
  // -----------------------------
  function renderHeatText() {
    return text.split("").map((char, i) => {
      const heat = heatMap[i];
      const bg = heat ? heat.color : "transparent";
      return (
        <span
          key={i}
          style={{
            backgroundColor: bg,
            transition: "background-color 0.25s ease",
            padding: "2px",
            borderRadius: "3px"
          }}
        >
          {char}
        </span>
      );
    });
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
  // Analysis tool: compute basic session metrics from history
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
    <div className="app-container" style={{ display: "flex", gap: 24 }}>
      <main style={{ flex: 1 }}>
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

        <button
          className="replay-button"
          onClick={startReplay}
          disabled={replaying || history.length === 0}
        >
          Replay
        </button>
      </main>

      {/* Right column: Dashboard */}
      <Dashboard
        history={history}
        setHistory={setHistory}
        heatMap={heatMap}
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
