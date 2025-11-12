import React, { useState, useEffect, useRef } from "react";
import "./app.css";

export default function App() {
  const [text, setText] = useState("");
  const [replaying, setReplaying] = useState(false);
  const [replayText, setReplayText] = useState("");
  const [energyMap, setEnergyMap] = useState([]);
  const textareaRef = useRef(null);

  const [lastTime, setLastTime] = useState(Date.now());
  const [lastLength, setLastLength] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const timeDiff = now - lastTime;
    const charDiff = Math.abs(text.length - lastLength);

    if (charDiff > 0 && timeDiff > 0) {
      const energy = Math.min(1, charDiff / (timeDiff / 1000) / 10);
      setEnergyMap((prev) => [...prev, { index: text.length, energy }]);
      setLastTime(now);
      setLastLength(text.length);
    }
  }, [text]);

  const handleChange = (e) => {
    if (!replaying) setText(e.target.value);
  };

  const replayTyping = () => {
    if (!text) return;
    setReplaying(true);
    setReplayText("");
    let i = 0;

    const replayInterval = setInterval(() => {
      if (i < text.length) {
        setReplayText((prev) => prev + text[i]);
        i++;
      } else {
        clearInterval(replayInterval);
        setReplaying(false);
      }
    }, 50);
  };

  const getEnergyColor = (index) => {
    const match = energyMap.find((m) => m.index === index);
    if (!match) return "rgba(255,255,255,0)";
    const energy = match.energy;
    const r = Math.floor(255 * energy);
    const g = Math.floor(200 * (1 - energy));
    const b = 255 - r * 0.4;
    return `rgba(${r},${g},${b},0.25)`;
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <button onClick={replayTyping} disabled={replaying}>
          {replaying ? "Replaying..." : "Replay Typing"}
        </button>
      </div>

      <div className="writing-area">
        <div className="overlay">
          {Array.from(text).map((char, i) => (
            <span key={i} style={{ backgroundColor: getEnergyColor(i) }}>
              {replaying ? replayText[i] || "" : char}
            </span>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          placeholder="Start writing..."
          disabled={replaying}
        />
      </div>
    </div>
  );
}
