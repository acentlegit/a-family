import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress WebSocket connection errors from React dev server (HMR)
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filter out WebSocket connection errors from React dev server
    if (args[0]?.includes?.('WebSocket connection to') && args[0]?.includes?.('ws://localhost:3000/ws')) {
      // Silently ignore React dev server WebSocket errors
      return;
    }
    originalError.apply(console, args);
  };
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
