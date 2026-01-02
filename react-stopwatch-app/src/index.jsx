import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Global styles for the application
import App from './App'; // The root component of our application

/**
 * Entry point for the React application.
 * Renders the App component into the 'root' DOM element.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
