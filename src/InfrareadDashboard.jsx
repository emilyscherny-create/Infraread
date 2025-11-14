import React, { useMemo, useState } from "react";

/**
 * Robust Dashboard component that works when:
 * - the parent App passes history/setHistory/runAnalysis/analysis props
 * - or when no props are passed (falls back to internal state)
 *
 * Controls buttons use CSS classes so they match the app theme.
 */

/* Small download helpers */
function downloadJSON(data, filename = "infraread-session.json") {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    // ignore in SSR environments
  }
}

function downloadCSV(history = [], filename = "infraread-history.csv") {
  try {
    if (!history || history.length === 0) {
      const blobEmpty = new Blob([""], { type: "text/csv" });
      const urlEmpty = URL.createObjectURL(blobEmpty);
      const aEmpty = document.createElement("a");
      aEmpty.href = urlEmpty;
      aEmpty.download = filename;
      document.body.appendChild(aEmpty);
      aEmpty.click();
      aEmpty.remove();
      URL.revokeObjectURL(urlEmpty);
      return;
    }

    const rows = [];
    rows.push(["time", "value"].join(","));
    for (const item of history) {
      const time = item.time || "";
      const value = String(item.value || "").replace(/"/g, '""').replace(/\r?\n/g, "\\n");
      rows.push([time, `"${value}"`].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {}
}

export default function InfrareadDashboard(props) {
  // Accept optional props from App; fallback to internal state otherwise
  const {
    history: historyProp,
    setHistory: setHistoryProp,
    heatMap: heatMapProp,
    setHeatMap: setHeatMapProp,
    text: textProp,
    setText: setTextProp,
    analysis: analysisProp,
    setAnalysis: setAnalysisProp,
    runAnalysis: runAnalysisProp,
  } = props || {};

  // Local fallbacks
  const [localHistory, setLocalHistory] = useState([]);
  const [localHeatMap, setLocalHeatMap] = useState([]);
  const [localText, setLocalText] = useState("");
  const [localAnalysis, setLocalAnalysis] = useState(null);

  // Which history/setHistory to use
  const history = typeof historyProp !== "undefined" ? historyProp : localHistory;
  const setHistory = typeof setHistoryProp === "function" ? setHistoryProp : setLocalHistory;
  const heatMap = typeof heatMapProp !== "undefined" ? heatMapProp : localHeatMap;
  const setHeatMap = typeof setHeatMapProp === "function" ? setHeatMapProp : setLocalHeatMap;
  const text = typeof textProp !== "undefined" ? textProp : localText;
  const setText = typeof setTextProp === "function" ? setTextProp : setLocalText;
  const analysis = typeof analysisProp !== "undefined" ? analysisProp : localAnalysis;
  const setAnalysis = typeof setAnalysisProp === "function" ? setAnalysisProp : setLocalAnalysis;

  // Internal analyzer (used if parent doesn't provide runAnalysis)
  function internalRunAnalysis() {
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

  // Public runner: call parent-provided runAnalysis if present, otherwise internal
  function handleRunAnalysis() {
    if (typeof runAnalysisProp === "function") {
      const maybe = runAnalysisProp();
      if (!setAnalysisProp) {
        setTimeout(() => {
          internalRunAnalysis();
        }, 50);
      }
      return maybe;
    } else {
      return internalRunAnalysis();
    }
  }

  function handleDownloadReport() {
    downloadJSON({ history, analysis }, "infraread-session.json");
  }

  function handleDownloadCSV() {
    downloadCSV(history, "infraread-history.csv");
  }

  function handleClearSession() {
    setHistory([]);
    setHeatMap([]);
    setText("");
    setAnalysis(null);
  }

  function simulateTypingSample() {
    const start = Date.now();
    const sample = ["H", "He", "Hel", "Hell", "Hello", "Hello ", "Hello W", "Hello Wo", "Hello Wor", "Hello Worl", "Hello World"];
    const newHistory = sample.map((v, i) => ({ value: v, time: start + i * (100 + Math.round(Math.random() * 200)) }));
    setHistory(newHistory);
    setText(sample[sample.length - 1]);
    setTimeout(() => {
      if (!runAnalysisProp) internalRunAnalysis();
      else runAnalysisProp();
    }, 50);
  }

  // Computed data for timeline/speed visuals (small, inline charts)
  const timelineData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((h, i) => ({ idx: i, time: h.time || 0, value: h.value }));
  }, [history]);

  const speedData = useMemo(() => {
    if (!history || history.length < 2) return [];
    const out = [];
    for (let i = 1; i < history.length; i++) {
      const dt = (history[i].time || 0) - (history[i - 1].time || 0);
      out.push({ idx: i - 1, delta: dt });
    }
    return out;
  }, [history]);

  // Basic inline styles so buttons are visible regardless of external CSS
  const containerStyle = { maxWidth: 420, fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" };
  const boxStyle = { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 8, padding: 12, boxShadow: "0 1px 2px rgba(15,23,42,0.04)", marginBottom: 12 };
  const headerStyle = { margin: 0, fontSize: 16 };

  // timeline bar calculations
  const firstTime = timelineData.length > 0 ? timelineData[0].time : 0;
  const maxDuration = (analysis && analysis.durationMs > 0) ? analysis.durationMs : Math.max(1, timelineData.length > 1 ? (timelineData[timelineData.length - 1].time - firstTime) : 1);

  return (
    <aside className="infraread-dashboard" style={containerStyle}>
      <div style={boxStyle}>
        <h3 style={headerStyle}>Session Summary</h3>
        {history && history.length > 0 ? (
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            <div>Duration: <strong>{Math.round((analysis && analysis.durationMs) || 0)} ms</strong></div>
            <div>Avg speed: <strong>{Math.round((analysis && analysis.avgSpeed) || 0)} ms</strong></div>
            <div>Bursts: <strong>{(analysis && analysis.bursts) || 0}</strong></div>
            <div>Pauses: <strong>{(analysis && analysis.pauses) || 0}</strong></div>
            <div>Deletions: <strong>{(analysis && analysis.deletions) || 0}</strong></div>
            <div>Flow: <strong>{((analysis && analysis.flowIndex) || 0).toFixed(1)}%</strong></div>
            <div>Stress: <strong>{((analysis && analysis.stressIndex) || 0).toFixed(1)}%</strong></div>
            <div>Energy: <strong>{((analysis && analysis.energyIndex) || 0).toFixed(1)}%</strong></div>
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>No analysis run yet.</div>
        )}
      </div>

      <div style={boxStyle}>
        <h3 style={headerStyle}>Typing Timeline</h3>
        <div style={{ width: "100%", height: 120, display: "flex", alignItems: "flex-end", gap: 6, marginTop: 8 }}>
          {timelineData.length === 0 ? (
            <div style={{ width: "100%", textAlign: "center", color: "#94a3b8" }}>No data</div>
          ) : (
            timelineData.map((d, i) => {
              const rel = Math.max(0, (d.time - firstTime) / maxDuration);
              const heightPct = 8 + rel * 92; // keep minimum visible height
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${Math.min(100, heightPct)}%`,
                    background: "linear-gradient(180deg,#ffd6b3,#ff8a3d)",
                    borderRadius: 4,
                  }}
                  title={`time: ${d.time}`}
                />
              );
            })
          )}
        </div>
      </div>

      <div style={boxStyle}>
        <h3 style={headerStyle}>Speed Chart</h3>
        <div style={{ width: "100%", height: 120, display: "flex", alignItems: "flex-end", gap: 6, marginTop: 8 }}>
          {speedData.length === 0 ? (
            <div style={{ width: "100%", textAlign: "center", color: "#94a3b8" }}>No speed data</div>
          ) : (
            speedData.map((d, i) => {
              const h = Math.min(100, Math.max(6, (d.delta || 0) / 10));
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: "#b36ab6",
                    borderRadius: 4,
                  }}
                  title={`delta: ${d.delta}ms`}
                />
              );
            })
          )}
        </div>
      </div>

      <div style={boxStyle}>
        <h3 style={headerStyle}>Controls</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <button
            className="action-btn action-ig"
            onClick={handleRunAnalysis}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Run Analysis
          </button>

          <button
            className="action-btn action-warm-1"
            onClick={handleDownloadReport}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Download Report
          </button>

          <button
            className="action-btn action-warm-2"
            onClick={handleDownloadCSV}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Download CSV
          </button>

          <button
            className="secondary-btn"
            onClick={handleClearSession}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Clear Session
          </button>

          <button
            className="secondary-btn"
            onClick={simulateTypingSample}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Simulate Typing
          </button>
        </div>
      </div>
    </aside>
  );
}
