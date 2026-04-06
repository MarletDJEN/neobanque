// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Force CSS reload with timestamp
import('./styles/index.css?t=' + Date.now());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
