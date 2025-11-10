import './Toolbar.css';
import React from 'react';

export default function Toolbar({ fontSize, setFontSize }) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="title">Infraread</span>
      </div>
      <div className="toolbar-right">
        <label htmlFor="fontSize">Font Size:</label>
        <select
          id="fontSize"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        >
          <option value="12">12pt</option>
          <option value="14">14pt</option>
          <option value="16">16pt</option>
          <option value="18">18pt</option>
        </select>
      </div>
    </div>
  );
}
