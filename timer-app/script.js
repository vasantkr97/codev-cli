// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const setBtn = document.getElementById('set-btn');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const timerEndSound = document.getElementById('timer-end-sound');

// Timer state variables
let timeLeft = 0; // Total seconds remaining
let initialTime = 0; // Stores the last set time in seconds for reset
let timerInterval = null; // Stores the setInterval ID
let isRunning = false;

/**
 * Formats a total number of seconds into a MM:SS string.
 * @param {number} totalSeconds - The total number of seconds.
 * @returns {string} Formatted time string (e.g., "05:30").
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // Pad with leading zeros if necessary
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Updates the timer display element with the current `timeLeft`.
 */
function updateDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
}

/**
 * Decrements `timeLeft` every second and handles timer completion.
 */
function startCountdown() {
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        timerEndSound.play(); // Play sound when timer ends
        alert("Time's up!"); // Simple notification
        updateButtonStates();
        return;
    }
    timeLeft--;
    updateDisplay();
}

/**
 * Starts or resumes the timer countdown.
 */
function startTimer() {
    if (isRunning || timeLeft <= 0) return; // Prevent starting if already running or no time set

    isRunning = true;
    timerInterval = setInterval(startCountdown, 1000);
    updateButtonStates();
}

/**
 * Pauses the timer countdown.
 */
function pauseTimer() {
    if (!isRunning) return; // Prevent pausing if not running

    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateButtonStates();
}

/**
 * Resets the timer to its initial set time or to 00:00 if no time was set.
 */
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    timeLeft = initialTime;
    updateDisplay();
    updateButtonStates();
}

/**
 * Sets the timer duration based on user input from minutes and seconds fields.
 * Validates inputs to ensure they are non-negative integers.
 */
function setTimer() {
    // Pause current timer if running before setting new time
    if (isRunning) {
        pauseTimer();
    }

    const minutes = parseInt(minutesInput.value, 10);
    const seconds = parseInt(secondsInput.value, 10);

    // Input validation
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
        alert('Please enter valid non-negative numbers for minutes (0-99) and seconds (0-59).');
        // Reset inputs to default values or last valid values
        minutesInput.value = Math.floor(initialTime / 60);
        secondsInput.value = initialTime % 60;
        return;
    }
    
    // Calculate total time in seconds
    const totalSetSeconds = (minutes * 60) + seconds;

    // Ensure at least 1 second is set
    if (totalSetSeconds === 0) {
        alert('Please set a time greater than 0 seconds.');
        return;
    }

    initialTime = totalSetSeconds; // Store for reset
    timeLeft = initialTime;
    updateDisplay();
    updateButtonStates();
}

/**
 * Updates the disabled state of buttons based on the current timer state.
 */
function updateButtonStates() {
    startBtn.disabled = isRunning || timeLeft === 0; // Disable start if running or no time left
    pauseBtn.disabled = !isRunning; // Disable pause if not running
    resetBtn.disabled = timeLeft === 0 && initialTime === 0; // Disable reset if nothing ever set or no time left
    setBtn.disabled = isRunning; // Disable set while timer is running
}

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
setBtn.addEventListener('click', setTimer);

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Set initial input values to 0
    minutesInput.value = 0;
    secondsInput.value = 0;
    updateDisplay(); // Display 00:00 initially
    updateButtonStates(); // Set initial button states
});
