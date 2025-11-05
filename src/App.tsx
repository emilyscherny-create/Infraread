import React, { useState } from "react";
import Editor from "./components/Editor";
import Playback from "./components/Playback";
import DocumentModeSelector from "./components/DocumentModeSelector";

export type DocumentMode = "Manuscript" | "Essay" | "Journal" | "Poem";

export default function App() {
  const [mode, setMode] = useState<DocumentMode>("Manuscript");
  const [showPlayback, setShowPlayback] = useState(false);
  const [documentText, setDocumentText] = useState<string>("");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Infraread</h1>
        <DocumentModeSelector mode={mode} setMode={setMode} />
      </header>

      {!showPlayback ? (
        <Editor
          text={documentText}
          setText={setDocumentText}
          mode={mode}
        />
      ) : (
        <Playback text={documentText} />
      )}

      <footer className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => setShowPlayback(!showPlayback)}
          className="bg-sky-600 text-white px-3 py-1 rounded"
        >
          {showPlayback ? "Back to Writing" : "Playback"}
        </button>
      </footer>
    </div>
  );
}