document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const bin = document.getElementById('bin');
    const runButton = document.getElementById('run-button');
    const outputTerminal = document.getElementById('output-terminal');
    const terminalInput = document.getElementById('terminal-input');
    const paletteContainer = document.getElementById('block-palette');
    let draggedElement = null;
    let blockDefinitions = {};  // key: blockType

    // Fetch block definitions from JSON file and build the palette.
    fetch('/public/blocks/blocks.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(def => {
                // Save definition by blockType.
                blockDefinitions[def.blockType] = def;
                // Create palette element.
                const el = document.createElement('div');
                el.className = def.class;
                el.setAttribute('draggable', def.draggable);
                el.dataset.blockType = def.blockType;
                el.innerHTML = def.innerHTML;
                // Attach dragstart event.
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: def.blockType,
                        from: 'palette'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                });
                paletteContainer.appendChild(el);
            });
        })
        .catch(err => {
            console.error('Error loading block definitions:', err);
        });

    function makeDraggable(el) {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: el.dataset.blockType,
                from: 'canvas'
            }));
            e.dataTransfer.effectAllowed = 'move';
            draggedElement = el;
        });
    }

    function handleDrop(e, container) {
        e.preventDefault();
        let data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        try {
            let info = JSON.parse(data);
            let newBlock;
            if (info.from === 'palette') {
                // Clone the block definition from our stored definitions.
                const def = blockDefinitions[info.type];
                if (!def) {
                    console.error('No block definition for:', info.type);
                    return;
                }
                newBlock = document.createElement('div');
                newBlock.className = def.class;
                newBlock.dataset.blockType = def.blockType;
                newBlock.id = 'block-' + Date.now();
                newBlock.setAttribute('draggable', 'true');
                newBlock.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: def.blockType,
                        from: 'canvas'
                    }));
                    e.dataTransfer.effectAllowed = 'move';
                    draggedElement = newBlock;
                });
                newBlock.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });
                // Create the icon element using Font Awesome classes if provided.
                if (def.icon) {
                  const iconElement = document.createElement('i');
                  iconElement.className = def.icon;
                  newBlock.prepend(iconElement);
                }
                // Replace any hidden elements in innerHTML (if applicable)
                let html = def.innerHTML.replace(/style\s*=\s*["']display\s*:\s*none;?["']/i, 'style="display:block;"');
                newBlock.innerHTML += html;
                makeDraggable(newBlock);
            } else if (info.from === 'canvas') {
                newBlock = draggedElement;
                if (newBlock.parentElement) {
                    newBlock.parentElement.removeChild(newBlock);
                }
            }
            container.appendChild(newBlock);

            // Add delete button to block if dropped in drop-area.
            if (container.id === 'drop-area') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    newBlock.remove();
                });
                newBlock.style.position = 'relative';
                deleteBtn.style.position = 'absolute';
                deleteBtn.style.top = '2px';
                deleteBtn.style.right = '2px';
                deleteBtn.style.background = '#ff6666';
                deleteBtn.style.border = 'none';
                deleteBtn.style.color = '#fff';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.padding = '2px 6px';
                newBlock.appendChild(deleteBtn);
            }
        } catch (error) {
            console.error('Drop error:', error);
        }
    }

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    dropArea.addEventListener('drop', (e) => {
        handleDrop(e, dropArea);
    });

    // Function to send a command string to the server and process output.
    function runCommand(commandStr) {
        appendToTerminal(`\n$ ${commandStr}\n`);
        fetch('/run', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: commandStr
        })
            .then(response => response.text())
            .then(output => {
                appendToTerminal(output);
                console.log('Command output:', output);
                appendToTerminal(`\n$ `);
            })
            .catch(err => {
                appendToTerminal(`\nError: ${err.message}\n$ `);
            });
    }

    function appendToTerminal(text) {
        outputTerminal.textContent += text;
        outputTerminal.scrollTop = outputTerminal.scrollHeight;
    }

    // Helper to extract a command string from a block by concatenating its non‑empty input values.
    function getBlockCommand(block) {
        const inputs = block.querySelectorAll('input');
        const values = [];
        inputs.forEach(input => {
            const val = input.value.trim();
            if (val) values.push(val);
        });

        // Prefix the blockType to the command string
        const blockType = block.dataset.blockType;
        if (blockType) {
            return `${blockType} ${values.join(' ')}`;
        }

        return values.join(' ');
    }

    // Run button event: iterates over top-level dropped blocks and builds the command string.
    runButton.addEventListener('click', () => {
        // Get only top-level blocks in the drop area.
        const topBlocks = Array.from(dropArea.children).filter(child => child.classList.contains('block'));
        const commands = [];

        topBlocks.forEach(block => {
            if (block.dataset.blockType === 'sudo') {
                // Handle sudo blocks
                const nestedBlocks = Array.from(block.querySelectorAll('.block'));
                let nestedCommands = [];
                if (nestedBlocks.length > 0) {
                    nestedBlocks.forEach(nested => {
                        const cmd = getBlockCommand(nested);
                        if (cmd) nestedCommands.push(cmd);
                    });
                } else {
                    const cmd = getBlockCommand(block);
                    if (cmd) nestedCommands.push(cmd);
                }
                if (nestedCommands.length > 0) {
                    // Prepend "sudo" to every nested command
                    commands.push(nestedCommands.map(c => `sudo ${c}`).join(' && '));
                }
            } else {
                // For all other block types, simply extract the command inputs
                const cmd = getBlockCommand(block);
                if (cmd) {
                    commands.push(cmd);
                }
            }
        });

        if (commands.length === 0) {
            console.log("No commands entered");
            return;
        }

        const commandStr = commands.join(' && ');
        console.log('Run button pressed. Command string:', commandStr);
        runCommand(commandStr);
    });

    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = terminalInput.value.trim();
            if (cmd) {
                runCommand(cmd);
                terminalInput.value = '';
            }
        }
    });

    appendToTerminal('$ ');

    document.getElementById('load-workshop').addEventListener('click', () => {
        // Show a popup to select a workshop
        showWorkshopPopup();
    });

    document.getElementById('restart-workshop').addEventListener('click', () => {
        // Reset the workshop to its initial state
        resetWorkshop();
    });

    function showWorkshopPopup() {
        // Display a list of available workshops
        // Load the selected workshop into the #workshop-content area
    }

    function resetWorkshop() {
        // Clear the workshop content and reset progress
        const workshopContent = document.getElementById('workshop-content');
        workshopContent.innerHTML = '';
    }

    // Trigger file input when "Load Workshop" button is clicked
    document.getElementById('load-workshop').addEventListener('click', function() {
        document.getElementById('workshop-file-input').click();
    });

    // Handle file selection and read the content
    document.getElementById('workshop-file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const content = event.target.result;
                // If the file is JSON, parse it and generate HTML
                if (file.name.endsWith('.json')) {
                    try {
                        const workshop = JSON.parse(content);
                        let workshopHTML = `<h3>${workshop.title || 'Workshop'}</h3>`;
                        if (Array.isArray(workshop.steps)) {
                            workshop.steps.forEach((step, index) => {
                                workshopHTML += `<div class="workshop-step">
                                    <h4>Step ${index+1}: ${step.title}</h4>
                                    ${ step.image ? `<img src="${step.image}" alt="${step.title}" />` : '' }
                                    <p>${step.description}</p>
                                </div>`;
                            });
                        }
                        document.getElementById('workshop-content').innerHTML = workshopHTML;
                    } catch (error) {
                        console.error('Error parsing workshop JSON:', error);
                    }
                } else {
                    // Otherwise treat it as an HTML snippet and load directly
                    document.getElementById('workshop-content').innerHTML = content;
                }
            };
            reader.readAsText(file);
        }
    });
});