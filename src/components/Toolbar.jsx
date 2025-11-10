import React from "react";
import "./Toolbar.css";

function Toolbar({ togglePlayback }) {
  return (
    <div className="toolbar">
      <button onClick={togglePlayback} className="toolbar-button">
        Toggle Playback
      </button>
      {/* You can add more buttons here for Phase 4 features */}
    </div>
  );
}

export default Toolbar;
