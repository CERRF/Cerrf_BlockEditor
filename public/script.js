document.addEventListener('DOMContentLoaded', () => {
  const sidebarContent = document.getElementById('sidebar-content');
  const dropArea = document.getElementById('drop-area');
  const runButton = document.getElementById('run-button');
  const workshopContent = document.getElementById('workshop-content');
  const loadWorkshopButton = document.getElementById('load-workshop');
  const selectWorkshopButton = document.getElementById('select-workshop');
  const restartWorkshopButton = document.getElementById('restart-workshop');
  const workshopFileInput = document.getElementById('workshop-file-input');

  let draggedElement = null;
  let blockDefinitions = {};  // key: blockType
  let steps = [];
  let currentStepIndex = 0;

  // ---------------------------
  // Initialize xterm.js Terminal
  // ---------------------------
  const termContainer = document.getElementById('output-terminal');
  const term = new Terminal({
    theme: {
      background: '#1d1f21',
      foreground: '#c5c8c6',
      cursor: '#f8f8f0'
    },
    fontFamily: '"Fira Code", "Source Code Pro", monospace',
    fontSize: 14,
    cursorBlink: true
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(termContainer);
  fitAddon.fit();
  // Command buffer for interactive input via the terminal.
  let currentCommand = '';
  term.write('$ ');

  // Capture interactive input from xterm.
  term.onData((data) => {
    if (data === '\r') {
      // When Enter is pressed, run the command
      term.write('\r\n');
      runCommand(currentCommand);
      currentCommand = '';
    } else if (data === '\u007F') {
      // Handle backspace
      if (currentCommand.length > 0) {
        currentCommand = currentCommand.slice(0, -1);
        term.write('\b \b');
      }
    } else {
      currentCommand += data;
      term.write(data);
    }
  });

  // ---------------------------
  // Run Button (for dropped block commands)
  // ---------------------------
  runButton.addEventListener('click', () => {
    // Build a single command string from dropped blocks
    const blocks = Array.from(dropArea.children).filter(el => el.classList.contains('block'));
    const commands = blocks.map(block => {
      const inputs = Array.from(block.querySelectorAll('input'))
        .map(input => input.value.trim())
        .filter(val => val);
      return `${block.dataset.blockType} ${inputs.join(' ')}`;
    });
    if (commands.length) {
      const cmdStr = commands.join(' && ');
      // Write the block command to the terminal and run it
      term.write('\r\n$ ' + cmdStr + '\r\n');
      runCommand(cmdStr);
    }
  });

  // ---------------------------
  // Function to run a command via the server and output to the terminal.
  // ---------------------------
  function runCommand(commandStr) {
    fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: commandStr
    })
      .then(response => response.text())
      .then(output => {
        // Directly write the raw output into the terminal.
        term.write(output + '\r\n$ ');
      })
      .catch(err => {
        term.write('\r\nError: ' + err.message + '\r\n$ ');
      });
  }

  // ---------------------------
  // Load Blocks from blocks.json according to category.
  // ---------------------------
  function loadBlocksByCategory(category) {
    fetch('/public/blocks/blocks.json')
      .then(response => response.json())
      .then(blocks => {
        sidebarContent.innerHTML = '';
        blocks.filter(block => block['data-category'] === category)
          .forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block';
            blockElement.setAttribute('draggable', true);
            blockElement.dataset.blockType = block.blockType;
            // Build a content container with icon, name and info button.
            const content = document.createElement('div');
            content.className = 'block-content';

            const name = document.createElement('span');
            name.textContent = block.name;
            content.appendChild(name);

            const infoBtn = document.createElement('button');
            infoBtn.className = 'info-btn';
            infoBtn.innerHTML = '<i class="fa fa-info-circle"></i>';
            infoBtn.onclick = (e) => {
              e.stopPropagation();
              showBlockInfo(block);
            };
            content.appendChild(infoBtn);

            blockElement.appendChild(content);
            // Save template for later when dropped.
            blockElement.dataset.template = block.innerHTML;
            // Set drag start.
            blockElement.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                type: block.blockType,
                template: block.innerHTML
              }));
            });
            sidebarContent.appendChild(blockElement);
          });
      })
      .catch(err => console.error('Error loading blocks:', err));
  }

  // ---------------------------
  // Show block info popup.
  // ---------------------------
  function showBlockInfo(block) {
    const match = block.innerHTML.match(/<p class="explanation">(.*?)<\/p>/);
    const explanationText = match ? match[1] : 'No explanation available';
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <h3>${block.name}</h3>
        <p>${explanationText}</p>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // ---------------------------
  // Drop area: allow blocks to be dropped.
  // ---------------------------
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const block = document.createElement('div');
      block.className = 'block';
      block.dataset.blockType = data.type;
      block.innerHTML = data.template;
      // Immediately reveal any input fields.
      const details = block.querySelector('.block-details');
      if (details) {
        details.style.display = 'block';
      }
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = () => block.remove();
      block.appendChild(deleteBtn);
      dropArea.appendChild(block);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  });

  // ---------------------------
  // Category selection handling.
  // ---------------------------
  document.querySelectorAll('.sidebar-category').forEach(category => {
    category.addEventListener('click', () => {
      const categoryType = category.dataset.category;
      if (categoryType === 'filesystem') {
        // You can implement file system loading here.
      } else {
        loadBlocksByCategory(categoryType);
      }
    });
  });

  // ---------------------------
  // Workshop Button Handlers (unchanged as before)
  // ---------------------------
  loadWorkshopButton.addEventListener('click', () => {
    workshopFileInput.click();
  });

  workshopFileInput.addEventListener('change', (e) => {
    // (Workshop file loading logic stays here as before)
    // ...
  });

  selectWorkshopButton.addEventListener('click', showWorkshopSelectionPopup);

  restartWorkshopButton.addEventListener('click', () => {
    steps = [];
    currentStepIndex = 0;
    workshopContent.innerHTML = '';
    restartWorkshopButton.disabled = true;
  });

  function showWorkshopSelectionPopup() {
    // (Workshop selection popup logic as before)
    // ...
  }

  // Initially load the "general" category blocks.
  loadBlocksByCategory('general');
});