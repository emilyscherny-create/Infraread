import React, { useEffect, useState } from "react";
import { generateHeatMap } from "../engine/heatEngine";

interface PlaybackProps {
  text: string;
}

export default function Playback({ text }: PlaybackProps) {
  const [displayText, setDisplayText] = useState<string>("");

  useEffect(() => {
    // skeleton: for now just display the text with heat simulation placeholder
    const interval = setInterval(() => {
      setDisplayText(text); // Replace with animated playback logic
    }, 200);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="editor-container relative bg-white rounded shadow">
      <span className="absolute top-0 left-0 text-gray-400">
        {/* Placeholder for watercolor breathing overlay */}
        {generateHeatMap(text)}
      </span>
      {displayText}
    </div>
  );
}