import React, { useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import './app.css';

export default function App() {
  const [fontSize, setFontSize] = useState('12');

  return (
    <div className="app-container">
      <Toolbar fontSize={fontSize} setFontSize={setFontSize} />
      <div
        className="editor"
        contentEditable
        style={{ fontSize: `${fontSize}pt` }}
      >
        Start writing here...
      </div>
    </div>
  );
}
