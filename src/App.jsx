import React, { useState } from 'react'
import Toolbar from './components/Toolbar.jsx'
import Editor from './components/Editor.jsx'

export default function App() {
  // State for editor content
  const [content, setContent] = useState('')

  // Handle changes from Editor component
  const handleContentChange = (newContent) => {
    setContent(newContent)
  }

  return (
    <div className="app-container">
      <header>
        <h1>Infraread Phase 2</h1>
      </header>
      <Toolbar />
      <Editor content={content} onContentChange={handleContentChange} />
    </div>
  )
}
