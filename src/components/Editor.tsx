import React, { useEffect, useRef } from "react";
import { recordKeystroke } from "../engine/keystrokeRecorder";
import "../styles/editor.css";

interface EditorProps {
  text: string;
  setText: (value: string) => void;
  mode: string;
}

export default function Editor({ text, setText }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = () => {
    if (editorRef.current) {
      const value = editorRef.current.innerText;
      setText(value);
      recordKeystroke(value);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerText = text;
    }
  }, [text]);

  return (
    <div
      ref={editorRef}
      className="editor-container bg-white rounded shadow"
      contentEditable
      onInput={handleInput}
      suppressContentEditableWarning={true}
    />
  );
}
