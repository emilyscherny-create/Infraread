import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './components/Toolbar.jsx';
import './app.css';

function App() {
  // State for the writing area
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  // State for energy map (example: random values for now)
  const [energyData, setEnergyData] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => {
    // Generate dummy energy data
    const initialData = Array.from({ length: 50 }, () => Math.floor(Math.random() * 100));
    setEnergyData(initialData);
  }, []);

  // Replay logic
  useEffect(() => {
    if (!isReplaying) return;

    const interval = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev + 1 >= energyData.length) {
          clearInterval(interval);
          setIsReplaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 200); // 200ms per step

    return () => clearInterval(interval);
  }, [isReplaying, energyData]);

  const handleTextareaChange = (e) => setContent(e.target.value);

  const handleReplay = () => {
    setReplayIndex(0);
    setIsReplaying(true);
  };

  return (
    <div className="app-container">
      {/* Header with title */}
      <header className="app-header">
        <h1 className="app-title">
          Infra<span className="highlight-orange">read</span>
        </h1>
        <Toolbar />
      </header>

      {/* Main content area */}
      <main className="app-main">
        {/* Writing area */}
        <section className="writing-area">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            placeholder="Start writing..."
          />
        </section>

        {/* Side panel for Phase 3 features */}
        <aside className="side-panel">
          {/* Energy map */}
          <div className="energy-map">
            <h2>Energy Map</h2>
            <div className="energy-bars">
              {energyData.map((value, idx) => (
                <div
                  key={idx}
                  className="energy-bar"
                  style={{
                    height: `${value}%`,
                    background: idx <= replayIndex ? 'orange' : 'lightgray',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Replay controls */}
          <div className="replay-controls">
            <h2>Replay</h2>
            <button onClick={handleReplay} disabled={isReplaying}>
              {isReplaying ? 'Replaying...' : 'Start Replay'}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
