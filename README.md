# Cerrf_BlockEditor


# CERRF Drag-and-Drop Terminal Executor

This project is a browser-based terminal command executor that uses a drag-and-drop interface to build and run terminal commands. It is designed to help users visually construct command sequences (including SSH, ping, FTP, nano, and sudo commands) and see the output in an interactive web terminal.

## Features

- **Drag-and-Drop Interface:**Build command sequences by dragging command blocks from the populated block palette.
- **Dynamic Block Definitions:**Block definitions (for commands like SSH, ping, FTP, nano, and sudo) are loaded from a JSON file (`/public/blocks/blocks.json`).
- **Interactive Terminal:**The output section mimics a Linux terminal. Commands are immediately shown as they are executed, and their outputs are appended to the terminal window. A text input allows for interactive online command execution.
- **Server-Side Execution:**
  Commands submitted through the interface are executed on the server using Node.js' `child_process.spawn` with `{ shell: true }`. The output is then sent back and displayed in the browser.

## Project Structure

```
cerrf-drag-n-drop/
├── index.js                # Main server file
├── package.json            # Node.js project metadata and dependencies
├── README.md               # This file
└── public
    ├── index.html          # Main HTML file
    ├── script.js           # Client-side JavaScript for handling drag-and-drop and terminal
    ├── style.css           # CSS for styling the UI
    └── blocks
         └── blocks.json    # JSON file containing block definitions for commands
```

## Setup

1. **Install Dependencies**

   From the project's root directory, run:

   ```bash
   npm install
   ```
2. **Start the Server**

   Launch the application by running:

   ```bash
   node index.js
   ```

   You should see a message similar to:

   ```
   server is listening on port 3000
   ```
3. **Access the Application**

   Open your browser and navigate to:

   ```
   http://localhost:3000/
   ```

   (Replace `localhost` with your server's IP if running remotely.)

## Usage

1. **Building Commands:**

   - **Drag-and-Drop:**Drag command blocks from the "Block Palette" into the drop area. Each block corresponds to a terminal command (Custom, SSH, Ping, FTP, Nano, Sudo).
   - **Interactive Commands:**
     You can also type commands directly into the terminal input box.
2. **Running Commands:**

   - Click the **Run** button to execute the commands built from the dropped command blocks.
   - The full command string (commands joined with `&&`) is sent to the server, executed, and the output is appended to the terminal display.
   - Any output (or errors) are shown with a `$` prompt, mimicking a standard shell.

## Block Definitions

Command blocks are defined in `/public/blocks/blocks.json`. This file includes the block's name, CSS class, draggable flag, block type, and inner HTML. The inner HTML defines input fields for each command's parameters (e.g., SSH commands require host, user, and command fields). The sudo block is a container block; any commands nested inside it will be executed with `sudo`.

## Server Execution

When a command is sent via the client:

- The server (in `index.js`) collects the full command string.
- It uses Node.js' `child_process.spawn` with the shell enabled to execute the command.
- Standard output and error are collected and sent back to the client, where they are displayed in the terminal.

## Notes & Considerations

- **Security:**Running shell commands from a web interface can be dangerous. This project is intended for controlled demo/educational environments only. In a production setting, always sandbox and secure command execution appropriately.
- **Development:**
  Make sure your file paths referenced in HTML/JS match the structure of your project. The application serves static files from the `public` folder.

## License

This project is provided for educational and demonstration purposes under the ISC License.
