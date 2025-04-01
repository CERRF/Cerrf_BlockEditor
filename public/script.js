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
                let html = def.innerHTML.replace(/style\s*=\s*["']display\s*:\s*none;?["']/i, 'style="display:block;"');
                newBlock.innerHTML = html;
                makeDraggable(newBlock);
            } else if (info.from === 'canvas') {
                newBlock = draggedElement;
                if (newBlock.parentElement) {
                    newBlock.parentElement.removeChild(newBlock);
                }
            }
            container.appendChild(newBlock);
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

    bin.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    bin.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement) {
            draggedElement.remove();
            draggedElement = null;
        }
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

    runButton.addEventListener('click', () => {
        const blocks = Array.from(dropArea.children).filter(child => child.classList.contains('block'));
        const commands = [];

        blocks.forEach(block => {
            if (block.dataset.blockType === 'command') {
                const cmd = block.querySelector('.command-details input').value;
                if (cmd) {
                    commands.push(cmd);
                }
            }
        });
        if (commands.length === 0) return;
        const commandStr = commands.join(' && ');
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
});