import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Register AFR Network Node service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(() => {}); // silent — SW is enhancement, not requirement
  });
}

const hideSplash = () => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('hide');
  setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 550);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App onReady={hideSplash} />
  </React.StrictMode>,
);
