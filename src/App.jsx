import React, { useState, useEffect, useRef } from "react";
import "./app.css";

const getHeatColor = (speed) => {
  if (speed < 0.2) return "#4DA6FF"; // calm = blue
  if (speed < 0.5) return "#FFD166"; // medium = yellow
  return "#FF6B6B"; // high = red/pink
};

function App() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState([]);
  const [replaying, setReplaying] = useState(false);
  const inputRef = useRef(null);

  // Save text changes for replay
  const handleChange = (e) => {
    if (!replaying) {
      setText(e.target.value);
      setHistory((prev) => [...prev, e.target.value]);
    }
  };

  // Replay typing with edits/backspaces
  const handleReplay = () => {
    if (history.length === 0) return;
    setReplaying(true);
    let index = 0;
    const interval = setInterval(() => {
      setText(history[index]);
      index++;
      if (index >= history.length) {
        clearInterval(interval);
        setReplaying(false);
      }
    }, 50); // adjust typing speed
  };

  // Calculate typing speed (chars per second)
  const calculateSpeed = (currentText, prevText) => {
    if (!prevText) return 0;
    const diff = Math.abs(currentText.length - prevText.length);
    return diff / 1; // simple placeholder; you can refine with timestamps
  };

  // Render text with selective heat map
  const renderHeatText = () => {
    return text.split("").map((char, i) => {
      const prev = history[i - 1] || "";
      const speed = calculateSpeed(char, prev);
      const color = getHeatCo
