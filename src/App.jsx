import React, { useState, useEffect, useRef } from "react";
import Toolbar from "./components/Toolbar.jsx";

// Simple energy assignment function
const getEnergy = (word) => {
  const hotWords = ["amazing", "excited", "passion", "fire"];
  const coolWords = ["calm", "quiet", "soft", "peace"];
  if (hotWords.includes(word.toLowerCase())) return "hot";
  if (coolWords.includes(word.toLowerCase())) return "cool";
  return "neutral";
};

// Map energy to colors
const energyColors = {
  hot: "#FF4500",     // orange/red
  neutral: "#999999", // gray
  cool: "#1E90FF",    // blue
};

export default function App() {
  const [text, setText] = useState("");
  const [logs, setLogs] = useState([]);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackInterval = useRef(null);

  // Handle typing
  const handleChange = (e) => {
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    const prevChar = text[text.length - 1];

    let action = "insert";
    let charValue = lastChar;

    if (value.length < text.length) {
      // deletion
      action = "delete";
      charValue = text[text.length - 1];
    }

    // Log the action
    const newLog = {
      time: Date.now(),
      action,
      value: charValue,
      energy: action === "insert" ? getEnergy(lastChar || "") : null,
    };
    setLogs([...logs, newLog]);

    setText(value);
  };

  // Playback function
  const startPlayback = () => {
    setPlaybackMode(true);
    setPlaybackIndex(0);
    setText(""); // clear for playback

    if (playbackInterval.current) clearInterval(playbackInterval.current);

    let i = 0;
    playbackInterval.current = setInterval(() => {
      if (i >= logs.length) {
        clearInterval(playbackInterval.current);
        setPlaybackMode(false);
        return;
      }

      const log = logs[i];
      if (log.action === "insert") {
        setText((prev) => prev + log.value);
      } else if (log.action === "delete") {
        setText((prev) => prev.slice(0, -1));
      }
      i++;
    }, 50); // 5x speed (approx 50ms per event)
  };

  // Export logs as JSON
  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "infraread_session.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render thermal map
  const render
