import React, { useState } from "react";
import Toolbar from "./components/Toolbar.jsx";
import "./app.css";

const energyColors = {
  low: "#A2D5F2",
  medium: "#F2E394",
  high: "#F28C8C",
};

const getEnergy = (word) => {
  // Simple AI placeholder: you can expand this later
  const length = word.length;
  if (length <= 3) return "low";
  if (length <= 6) return "medium";
  return "high";
};

function App() {
  const [text, setText] = useState("");
  const [playbackMode, setPlaybackMode] = useState(false);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const togglePlayback = () => {
    setPlaybackMode(!playbackMode);
  };

  // Render thermal map
  const renderThermalText = () => {
    return text.split(" ").map((word, idx) => {
      const energy = getEnergy(word);
      return (
        <span
          key={idx}
          style={{
            backgroundColor: playbackMode ? energyColors[energy] : "transparent",
            marginRight: "4px",
            padding: "0 2px",
            borderRadius: "3px",
          }}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          Infraread <span style={{ color: "#FF7F50" }}>Phase 3</span>
        </h1>
      </header>

      <Toolbar togglePlayback={togglePlayback} />

      <main className="editor-container">
        {!playbackMode && (
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Type your text here..."
          />
        )}
        {playbackMode && <div className="thermal-text">{renderThermalText()}</div>}
      </main>
    </div>
  );
}

export default App;
