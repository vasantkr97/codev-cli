import React, { useState, useRef, useCallback, useEffect } from 'react';
import './index.css'; // Re-using the same CSS for simplicity and shared styles

/**
 * Formats a given number of milliseconds into a human-readable HH:MM:SS.ff string.
 * @param {number} totalMilliseconds - The total time in milliseconds.
 * @returns {string} Formatted time string.
 */
const formatTime = (totalMilliseconds) => {
  const milliseconds = totalMilliseconds % 1000;
  const seconds = Math.floor((totalMilliseconds / 1000) % 60);
  const minutes = Math.floor((totalMilliseconds / (1000 * 60)) % 60);
  const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));

  return (
    String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0') + '.' +
    String(Math.floor(milliseconds / 10)).padStart(2, '0') // show centiseconds
  );
};

/**
 * Stopwatch component providing start, stop, reset, and lap functionalities.
 */
function Stopwatch() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // Time in milliseconds
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null); // Ref to hold the interval ID for cleanup
  const lastLapTimeRef = useRef(0); // Stores the total time at the moment of the last lap

  /**
   * Starts the stopwatch. Sets the running state and initializes a setInterval.
   * Uses useCallback for memoization to prevent unnecessary re-renders and ensure stable function reference.
   */
  const startStopwatch = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      // Calculate the initial offset to ensure accurate time display if resumed from a stopped state
      const startTime = Date.now() - time;
      intervalRef.current = setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10); // Update every 10 milliseconds for smooth centisecond display
    }
  }, [isRunning, time]);

  /**
   * Stops the stopwatch. Clears the interval and updates the running state.
   * Uses useCallback for memoization.
   */
  const stopStopwatch = useCallback(() => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    }
  }, [isRunning]);

  /**
   * Resets the stopwatch to its initial state: time to 0, not running, and clears all laps.
   * Uses useCallback for memoization.
   */
  const resetStopwatch = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    lastLapTimeRef.current = 0; // Reset last lap time marker as well
  }, []);

  /**
   * Records a lap time. Calculates the segment time since the last lap or start.
   * Uses useCallback for memoization.
   */
  const recordLap = useCallback(() => {
    if (isRunning) {
      const currentLapTime = time - lastLapTimeRef.current; // Time elapsed since last lap/start
      setLaps((prevLaps) => [
        { id: prevLaps.length + 1, total: time, lap: currentLapTime },
        ...prevLaps, // Add new laps to the beginning for chronological order in display
      ]);
      lastLapTimeRef.current = time; // Update the last lap time marker
    }
  }, [isRunning, time]);

  /**
   * Effect hook to clean up the interval when the component unmounts.
   * Prevents memory leaks.
   */
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return (
    <div className="stopwatch-container">
      <div className="display" aria-live="polite">{formatTime(time)}</div>
      <div className="controls">
        {/* Conditional rendering for Start/Stop button */}
        {!isRunning ? (
          <button className="button start-button" onClick={startStopwatch} aria-label="Start stopwatch">Start</button>
        ) : (
          <button className="button stop-button" onClick={stopStopwatch} aria-label="Stop stopwatch">Stop</button>
        )}
        <button
          className="button reset-button"
          onClick={resetStopwatch}
          disabled={time === 0 && laps.length === 0} // Disable if stopwatch is at zero and no laps recorded
          aria-label="Reset stopwatch"
        >
          Reset
        </button>
        <button
          className="button lap-button"
          onClick={recordLap}
          disabled={!isRunning} // Disable if stopwatch is not running
          aria-label="Record lap time"
        >
          Lap
        </button>
      </div>
      {laps.length > 0 && (
        <div className="laps-container" role="region" aria-labelledby="lap-times-heading">
          <h3 id="lap-times-heading">Lap Times</h3>
          <ul className="lap-list">
            {laps.map((lapItem) => (
              <li key={lapItem.id} className="lap-item">
                <span className="lap-number">Lap {lapItem.id}:</span>
                <span className="lap-time-total">Total: {formatTime(lapItem.total)}</span>
                <span className="lap-time-segment">Segment: {formatTime(lapItem.lap)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Stopwatch;
