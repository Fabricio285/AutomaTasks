
import React from 'react';
import ReactDOM from 'react-dom/client';
// Añadimos la extensión .tsx para ayudar al navegador en entornos estáticos
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
