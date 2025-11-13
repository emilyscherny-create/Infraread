import React, { useEffect, useMemo, useRef, useState } from "react";
</div>
</section>

{/* Right column: Dashboard */}
<aside className="col-span-1 space-y-4">
<div className="bg-white border rounded p-4 shadow-sm">
<h3 className="font-semibold">Session Summary</h3>
{analysis ? (
<div className="mt-2 text-sm space-y-1">
<div>Duration: <strong>{Math.round(analysis.durationMs)} ms</strong></div>
<div>Avg speed: <strong>{Math.round(analysis.avgSpeed)} ms</strong></div>
<div>Bursts: <strong>{analysis.bursts}</strong></div>
<div>Pauses: <strong>{analysis.pauses}</strong></div>
<div>Deletions: <strong>{analysis.deletions}</strong></div>
<div>Flow: <strong>{analysis.flowIndex.toFixed(1)}%</strong></div>
<div>Stress: <strong>{analysis.stressIndex.toFixed(1)}%</strong></div>
<div>Energy: <strong>{analysis.energyIndex.toFixed(1)}%</strong></div>
</div>
) : (
<div className="mt-2 text-sm text-slate-500">No analysis run yet.</div>
)}
</div>

<div className="bg-white border rounded p-4 shadow-sm">
<h3 className="font-semibold mb-2">Typing Timeline</h3>
<div style={{ width: "100%", height: 160 }}>
<ResponsiveContainer width="100%" height={160}>
<AreaChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
<defs>
<linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#8884d8'" stopOpacity={0.8} />
<stop offset="95%" stopColor="#8884d8'" stopOpacity={0} />
</linearGradient>
</defs>
<XAxis dataKey="timeLabel" />
<YAxis />
<Tooltip />
<Area type="monotone" dataKey="count" stroke="#ff8a3d" fill="#ffd6b3" />
</AreaChart>
</ResponsiveContainer>
</div>
</div>

<div className="bg-white border rounded p-4 shadow-sm">
<h3 className="font-semibold mb-2">Speed Chart</h3>
<div style={{ width: "100%", height: 160 }}>
<ResponsiveContainer width="100%" height={160}>
<LineChart data={speedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="idx" />
<YAxis />
<Tooltip />
<Line type="monotone" dataKey="delta" stroke="#8884d8" dot={false} />
</LineChart>
</ResponsiveContainer>
</div>
</div>

<div className="bg-white border rounded p-4 shadow-sm">
<h3 className="font-semibold mb-2">Controls</h3>
<div className="flex flex-col gap-2">
<button className="px-3 py-2 rounded bg-green-500 text-white" onClick={() => { downloadJSON({ history, analysis }, "infraread-session.json"); }}>Download Report</button>
<button className="px-3 py-2 rounded bg-sky-500 text-white" onClick={() => { downloadCSV(history, "infraread-history.csv"); }}>Download CSV</button>
<button className="px-3 py-2 rounded bg-indigo-500 text-white" onClick={() => { setHistory([]); setHeatMap([]); setText(""); setAnalysis(null); }}>Clear Session</button>
</div>
</div>
</aside>
</main>
</div>
</div>
);
}
