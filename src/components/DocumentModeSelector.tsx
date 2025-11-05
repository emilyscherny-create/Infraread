import React from "react";
import { DocumentMode } from "../App";

interface Props {
  mode: DocumentMode;
  setMode: (mode: DocumentMode) => void;
}

export default function DocumentModeSelector({ mode, setMode }: Props) {
  return (
    <select
      value={mode}
      onChange={(e) => setMode(e.target.value as DocumentMode)}
      className="border rounded px-2 py-1"
    >
      <option value="Manuscript">Manuscript</option>
      <option value="Essay">Essay</option>
      <option value="Journal">Journal</option>
      <option value="Poem">Poem</option>
    </select>
  );
}
