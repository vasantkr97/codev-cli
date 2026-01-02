# React Stopwatch Application

A clean, functional, and production-ready stopwatch application built with React. It features start, stop, reset, and lap functionalities with a modern user interface.

## Features

*   **Precise Timing**: Displays time down to centiseconds.
*   **Start/Stop Functionality**: Control the stopwatch with intuitive buttons.
*   **Reset Functionality**: Clear the timer and all recorded laps.
*   **Lap Times**: Record and display individual lap times along with the total time at that moment.
*   **Responsive Design**: Adapts to different screen sizes for a better user experience.
*   **Modern React Hooks**: Built using `useState`, `useRef`, and `useCallback` for efficient state management and performance.

## Technologies Used

*   React 18
*   JavaScript (ES6+)
*   CSS3

## Setup Instructions

Follow these steps to get the application up and running on your local machine.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or Yarn

### Installation

1.  **Create the project directory and navigate into it:**
    ```bash
    mkdir react-stopwatch-app
    cd react-stopwatch-app
    ```

2.  **Populate the directory with the provided files.**
    Place the `public` and `src` folders, `package.json`, `.gitignore`, and `README.md` into the `react-stopwatch-app` directory.

3.  **Install dependencies:**
    Once the files are in place, install the required npm packages:
    ```bash
    npm install
    ```

### Running the Application

After installing dependencies, you can start the development server:

```bash
npm start
```

This command runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload if you make edits.
Any lint errors or warnings will be displayed in the console.

### Building for Production

To build the application for production, use the following command:

```bash
npm run build
```

This command builds the app to the `build` folder. It optimizes the React build for the best performance, including minification and filename hashing. The `build` folder is ready for deployment to any static hosting service.
