import React from 'react';
import Stopwatch from './Stopwatch';
import './index.css'; // Import general styles for the app structure

/**
 * Main application component. Renders the header, the Stopwatch component, and a footer.
 */
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React Stopwatch</h1>
      </header>
      <main>
        <Stopwatch />
      </main>
      <footer className="App-footer">
        <p>&copy; 2023 React Stopwatch App</p>
      </footer>
    </div>
  );
}

export default App;
