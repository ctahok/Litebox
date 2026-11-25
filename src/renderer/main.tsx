import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#4ade80' }}>Hello World</h1>
      <p style={{ color: '#e5e5e5' }}>If you see this, React is working!</p>
    </div>
  </React.StrictMode>,
);