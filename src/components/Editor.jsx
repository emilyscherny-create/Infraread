import React, { useState, useEffect } from "react";

export default function Editor({ format }) {
  const [text, setText] = useState("");

  const getEnergyColor = (word) => {
    const energy =
      word.length > 7 ? 0.8 : word.length > 4 ? 0.5 : 0.2; // placeholder "energy"
    const hue = 220 - energy * 180; // blue (calm) → red (intense)
    return `hsl(${hue}, 90%, 70%)`;
  };

  const renderText = () => {
    return text.split(/\s+/).map((word, i) => (
      <span key={i} style={{ color: getEnergyColor(word) }}>
        {word}{" "}
      </span>
    ));
  };

  return (
    <div
      className="editor"
      contentEditable
      suppressContentEditableWarning={true}
      style={{
        fontFamily: format.fontFamily,
        fontSize: `${format.fontSize}pt`,
        lineHeight: format.lineHeight,
        margin: `${format.margin}px`,
      }}
      onInput={(e) => setText(e.currentTarget.textContent)}
    >
      {text === "" && <span className="placeholder">Start writing here...</span>}
      {text && renderText()}
    </div>
  );
}
