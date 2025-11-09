import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import import './assets/styles/app.css';  // Corrected import path

// This mounts the Infraread app into index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

