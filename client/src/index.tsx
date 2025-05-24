import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';  // .tsx 확장자 제거

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);