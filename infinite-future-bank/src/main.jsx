import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// This single line injects the entire IFB "Mission Blue & Alpha Glass" 
// design system into the application before anything else renders.
import './index.css'; 

// ----------------------------------------------------------------------
// 🚀 DEUS ARCHITECTURE IGNITION
// ----------------------------------------------------------------------
// We use React 18's createRoot to enable Concurrent Rendering. 
// This allows DEUS to process heavy AI data in the background 
// without freezing or slowing down the UI for the user.
// ----------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);