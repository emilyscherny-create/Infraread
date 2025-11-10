import React, { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar.jsx';
import './components/Toolbar.css';
import './app.css';

function App() {
  // App state
  const [energyData, setEnergyData] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // Simulate fetching energy map data
  useEffect(() => {
    // Replace this with actual data fetch if needed
    const sampleData = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      energy: Math.floor(Math.random() * 100),
    }));
    setEnergyData(sampleData);
  }, []);

  // Replay functionality
  useEffect(() => {
    let interval;
    if (isReplaying) {
      interval = setInterval(() => {
        setReplayIndex((prev) => (prev + 1) % energyData.length);
      }, 1000); // advance every 1s
    } else if (!isReplaying && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isReplaying, energyData.length]);

  // Toggle replay
  const handleReplayToggle = () => {
    setIsReplaying(!isReplaying);
  };

  return (
    <div className="app-container">
      {/* Toolbar & App Title */}
      <header className="app-header">
        <h1 className="app-title">
          Infra<span className="title-accent">read</span>
        </h1>
        <Toolbar />
      </header>

      {/* Energy Map */}
      <section className="energy-map">
        <h2>Energy Map</h2>
        <div className="energy-grid">
          {energyData.map((item, index) => (
            <div
              key={item.id}
              className={`energy-cell ${
                index === replayIndex ? 'highlight' : ''
              }`}
              style={{ background: `rgba(255, 165, 0, ${item.energy / 100})` }}
            >
              {item.energy}
            </div>
          ))}
        </div>
      </section>

      {/* Replay Controls */}
      <section className="replay-controls">
        <button onClick={handleReplayToggle}>
          {isReplaying ? 'Pause Replay' : 'Start Replay'}
        </button>
      </section>
    </div>
  );
}

export default App;
