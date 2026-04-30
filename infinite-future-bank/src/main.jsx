import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

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
