import React, { useMemo, useState } from "react";

/**
 * Recreated Dashboard component — standalone and self-contained so the app can
 * import it without requiring additional chart libraries.
 *
 * This recreates the original layout (session summary, timeline, speed chart,
 * and controls) using plain React and simple DOM elements so the build won't
 * fail due to missing dependencies or malformed JSX.
 */

function downloadJSON(data, filename = "infraread-session.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCSV(history = [], filename = "infraread-history.csv") {
  const rows = [];
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

  // header
  const header = ["time", "value"];
  rows.push(header.join(","));
  for (const item of history) {
    const time = item.time || "";
    // escape newlines and quotes in value
    const val = String(item.value || "")
      .replace(/"/g, '""')
      .replace(/\r?\n/g, "\\n");
    rows.push([time, `"${val}"`].join(","));
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
}

export default function InfrareadDashboard() {
  // Local standalone session state. The main app may already manage session,
  // but keeping local state allows this component to render sensibly.
  const [history, setHistory] = useState([]);
  const [heatMap] = useState([]);
  const [text, setText] = useState("");
  const [analysis] = useState(null);

  // Compute basic metrics similar to the original dashboard
  const computed = useMemo(() => {
    const result = {
      durationMs: 0,
      avgSpeed: 0,
      bursts: 0,
      pauses: 0,
      deletions: 0,
      flowIndex: 0,
      stressIndex: 0,
      energyIndex: 0,
    };

    if (!history || history.length < 2) return result;

    const times = history.map((h) => h.time || 0).filter(Boolean);
    if (times.length >= 2) {
      result.durationMs = times[times.length - 1] - times[0];
    }

    const deltas = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const cur = history[i];
      const dt = (cur.time || 0) - (prev.time || 0);
      deltas.push(dt || 0);
      if ((cur.value?.length || 0) < (prev.value?.length || 0)) result.deletions++;
    }

    if (deltas.length > 0) {
      const sum = deltas.reduce((a, b) => a + b, 0);
      result.avgSpeed = Math.round(sum / deltas.length);
      result.bursts = deltas.filter((d) => d < 120).length;
      result.pauses = deltas.filter((d) => d > 600).length;
      result.flowIndex = Math.max(0, Math.min(100, 100 - result.avgSpeed / 10));
      result.stressIndex = Math.max(0, Math.min(100, (result.deletions / Math.max(1, history.length)) * 100));
      result.energyIndex = Math.max(0, Math.min(100, (result.bursts / Math.max(1, history.length)) * 100));
    }

    return result;
  }, [history]);

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

  function handleDownloadJSON() {
    downloadJSON({ history, analysis: computed }, "infraread-session.json");
  }

  function handleDownloadCSV() {
    downloadCSV(history, "infraread-history.csv");
  }

  function handleClear() {
    setHistory([]);
    // heatMap is local and not used in this standalone component,
    // but keep consistent API with original.
    setText("");
  }

  // Simulate typing to demonstrate charts if no real history provided
  function simulateTypingSample() {
    const start = Date.now();
    const sample = ["H", "He", "Hel", "Hell", "Hello", "Hello ", "Hello W", "Hello Wo", "Hello Wor", "Hello Worl", "Hello World"];
    const newHistory = sample.map((v, i) => ({ value: v, time: start + i * (100 + Math.round(Math.random() * 200)) }));
    setHistory(newHistory);
    setText(sample[sample.length - 1]);
  }

  // Simple styles used inline so nothing external is required
  const containerStyle = { maxWidth: 420, fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" };
  const boxStyle = { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 8, padding: 12, boxShadow: "0 1px 2px rgba(15,23,42,0.04)", marginBottom: 12 };
  const headerStyle = { margin: 0, fontSize: 16 };

  // timeline bar calculations
  const firstTime = timelineData.length > 0 ? timelineData[0].time : 0;
  const maxDuration = computed.durationMs > 0 ? computed.durationMs : 1;

  return (
    <aside className="infraread-dashboard" style={containerStyle}>
      <div style={boxStyle}>
        <h3 style={headerStyle}>Session Summary</h3>
        {history && history.length > 0 ? (
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            <div>Duration: <strong>{Math.round(computed.durationMs)} ms</strong></div>
            <div>Avg speed: <strong>{Math.round(computed.avgSpeed)} ms</strong></div>
            <div>Bursts: <strong>{computed.bursts}</strong></div>
            <div>Pauses: <strong>{computed.pauses}</strong></div>
            <div>Deletions: <strong>{computed.deletions}</strong></div>
            <div>Flow: <strong>{computed.flowIndex.toFixed(1)}%</strong></div>
            <div>Stress: <strong>{computed.stressIndex.toFixed(1)}%</strong></div>
            <div>Energy: <strong>{computed.energyIndex.toFixed(1)}%</strong></div>
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
                    background: "#8884d8",
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
          <button style={{ padding: "8px 10px", borderRadius: 6, background: "#10b981", color: "#fff", border: "none", cursor: "pointer" }} onClick={handleDownloadJSON}>
            Download Report
          </button>

          <button style={{ padding: "8px 10px", borderRadius: 6, background: "#0ea5e9", color: "#fff", border: "none", cursor: "pointer" }} onClick={handleDownloadCSV}>
            Download CSV
          </button>

          <button style={{ padding: "8px 10px", borderRadius: 6, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer" }} onClick={handleClear}>
            Clear Session
          </button>

          <button style={{ padding: "8px 10px", borderRadius: 6, background: "#e2e8f0", color: "#0f172a", border: "none", cursor: "pointer" }} onClick={simulateTypingSample}>
            Simulate Typing
          </button>
        </div>
      </div>
    </aside>
  );
}
