# Simple Timer Application

A clean and functional timer application built with HTML, CSS, and vanilla JavaScript.

## Features

*   **Start/Pause Functionality**: Control the timer with ease.
*   **Reset**: Reset the timer to its last set value or to 00:00.
*   **Custom Time Setting**: Set custom durations (minutes and seconds) for your timer.
*   **Visual Appeal**: Modern and responsive design with a clear display.
*   **Sound Notification**: An alert sound plays when the timer reaches zero.
*   **Input Validation**: Ensures valid time inputs are entered.

## Setup and Run

This is a client-side application and does not require any backend or complex build tools. You can run it directly in your web browser.

1.  **Clone the repository (if applicable) or download the files:**
    If you have the files locally, proceed to step 2.

2.  **Navigate to the project folder:**
    Open your file explorer or terminal and go into the `timer-app` directory.

3.  **Open `index.html` in your web browser:**
    You can do this by:
    *   Double-clicking the `index.html` file.
    *   Right-clicking `index.html` and selecting "Open with" followed by your preferred web browser (e.g., Chrome, Firefox, Edge).

    The timer application will open in your browser.

## Usage

1.  **Set Time**: Enter the desired minutes (0-99) and seconds (0-59) in the input fields and click the "Set" button. The display will update to show your chosen time.
2.  **Start**: Click the "Start" button to begin the countdown.
3.  **Pause**: Click the "Pause" button to temporarily stop the timer.
4.  **Resume**: Click "Start" again to resume from where you left off.
5.  **Reset**: Click the "Reset" button to revert the timer to the last set time. If no time was explicitly set, it will reset to `00:00`.
6.  **Timer End**: When the timer reaches `00:00`, an alert will pop up, and a bell sound will play.

## Customization

*   **CSS (`style.css`)**: Modify the colors, fonts, layout, and overall appearance.
*   **JavaScript (`script.js`)**: Adjust the timer logic, add more features, or change the alert behavior.
*   **Sound**: To change the timer-end sound, replace the `src` attribute of the `<audio>` tag in `index.html` with a link to your desired `.mp3` file.

Enjoy your simple timer!
