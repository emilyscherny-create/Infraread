import React, { useState } from "react";
import Toolbar from "./components/Toolbar.jsx";
import Editor from "./components/Editor.jsx";
import "./styles/app.css";

export default function App() {
  const [format, setFormat] = useState({
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: "serif",
    margin: 60,
  });

  return (
    <div className="app-container">
      <Toolbar format={format} setFormat={setFormat} />
      <Editor format={format} />
    </div>
  );
}
