import React, { useState, useEffect, useRef } from "react";
import "./App.css";

export default function App() {
  const [text, setText] = useState("");
  const [replaying, setReplaying] = useState(false);
  const [replayText, setReplayText] = useState("");
  const [energyMap, setEnergyMap] = useState([]);
  const textareaRef = useRef(null);

  // Track writing energy (speed/intensity)
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
