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

// Catches any uncaught React render error → shows a recovery screen instead of blank white
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err, info) { console.error('[DEUS] render crash:', err, info?.componentStack); }
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div style={{
        minHeight: '100dvh', background: '#f8fafc',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Something went wrong</p>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 32, maxWidth: 280 }}>
          The app encountered an error. Tap below to reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 16,
            padding: '14px 32px', fontWeight: 900, fontSize: 14,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer'
          }}
        >
          Reload DEUS
        </button>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
