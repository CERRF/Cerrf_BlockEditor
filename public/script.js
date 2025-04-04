document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const bin = document.getElementById('bin');
    const runButton = document.getElementById('run-button');
    const outputTerminal = document.getElementById('output-terminal');
    const terminalInput = document.getElementById('terminal-input');
    const paletteContainer = document.getElementById('block-palette');
    let draggedElement = null;
    let blockDefinitions = {};  // key: blockType
    // Global variables for the workshop steps and the current index:
    let steps = [];
    let currentStepIndex = 0;

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

    // Handle file selection and read the content for workshop files.
    document.getElementById('workshop-file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file.name);
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.cerrf')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    console.log("Reading file as ArrayBuffer...");
                    JSZip.loadAsync(event.target.result)
                        .then(function(zip) {
                            console.log("Loading ZIP file...");
                            // Get all manifest.json files and ignore those in __MACOSX folders.
                            const manifestFiles = zip.file(/(?:^|\/)manifest\.json$/).filter(file => !file.name.startsWith("__MACOSX/"));
                            if (manifestFiles.length === 0) {
                                throw new Error("manifest.json not found in the workshop file.");
                            }
                            const manifestFile = manifestFiles[0];
                            return manifestFile.async("string")
                                .then(function(manifestStr) {
                                    console.log("Extracting manifest.json...");
                                    const manifest = JSON.parse(manifestStr);
                                    console.log("Manifest content:", manifest);
                                    let workshopHTML = `<h3>${manifest.title || 'Workshop'}</h3>`;
                                    if (Array.isArray(manifest.steps)) {
                                        const steps = [];
                                        let currentStepIndex = 0;

                                        // If manifest.stepCount isn’t provided, use steps length later.
                                        return Promise.all(
                                            manifest.steps.map(function(stepPath) {
                                                // Create a regex to match the step file in any folder wrapper.
                                                const regex = new RegExp('(?:^|\\/)' + stepPath.replace(/\//g, '\\/') + '$');
                                                const stepFiles = zip.file(regex).filter(file => !file.name.startsWith("__MACOSX/"));
                                                if (stepFiles.length === 0) {
                                                    throw new Error(`Step file ${stepPath} not found in the workshop.`);
                                                }
                                                return stepFiles[0].async("string")
                                                    .then(function(stepStr) {
                                                        const step = JSON.parse(stepStr);
                                                        return step;
                                                    });
                                            })
                                        ).then(function(stepsArray) {
                                            // Save steps in a global variable.
                                            steps.push(...stepsArray);
                                            // If manifest.stepCount is not provided, use the number of steps.
                                            manifest.stepCount = manifest.stepCount || steps.length;
                                            // Display the first step.
                                            displayStep(currentStepIndex, manifest);
                                        });
                                    }
                                    else {
                                        return workshopHTML;
                                    }
                                });
                        })
                        .then(function(workshopHTML) {
                            document.getElementById('workshop-content').innerHTML = workshopHTML;
                        })
                        .catch(function(err) {
                            console.error("Error loading CERRF file:", err.message);
                            alert(`Error loading workshop: ${err.message}`);
                        });
                };
                reader.readAsArrayBuffer(file);
            } else {
                console.error("Unsupported file type. Please upload a .cerrf file.");
            }
        }
    });

    // Add this function to create and show the popup.
    function showWorkshopSelectionPopup() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'workshop-popup-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = 1000;

        // Create popup container
        const popup = document.createElement('div');
        popup.id = 'workshop-popup';
        popup.style.background = '#fff';
        popup.style.padding = '20px';
        popup.style.borderRadius = '5px';
        popup.style.maxWidth = '400px';
        popup.style.width = '80%';
        popup.style.textAlign = 'center';

        const title = document.createElement('h3');
        title.textContent = 'Select a Workshop';
        popup.appendChild(title);

        // Create a container for buttons
        const listContainer = document.createElement('div');
        listContainer.id = 'workshop-popup-list';
        popup.appendChild(listContainer);

        // Append popup to overlay and overlay to document
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Fetch available workshops from the server
        fetch('/workshops')
            .then(response => response.json())
            .then(workshops => {
                // For each workshop, create a button.
                workshops.forEach(ws => {
                    const button = document.createElement('button');
                    button.textContent = ws.name;
                    button.style.margin = '5px';
                    button.addEventListener('click', () => {
                        // When a workshop is selected, download and load it.
                        fetch(ws.url)
                            .then(res => res.arrayBuffer())
                            .then(buffer => {
                                JSZip.loadAsync(buffer)
                                    .then(zip => {
                                        // Read manifest and then step files as before.
                                        return zip.file("manifest.json").async("string")
                                            .then(manifestStr => {
                                                const manifest = JSON.parse(manifestStr);
                                                let workshopHTML = `<h3>${manifest.title || 'Workshop'}</h3>`;
                                                if (Array.isArray(manifest.steps)) {
                                                    let stepPromises = manifest.steps.map(function(stepPath) {
                                                        // Create a regex that matches the expected step file (ignoring any parent directories)
                                                        const regex = new RegExp('(?:^|\\/)' + stepPath.replace(/\//g, '\\/') + '$');
                                                        const stepFiles = zip.file(regex).filter(file => !file.name.startsWith("__MACOSX/"));
                                                        if (stepFiles.length === 0) {
                                                            throw new Error(`Step file ${stepPath} not found in the workshop.`);
                                                        }
                                                        return stepFiles[0].async("string")
                                                            .then(stepStr => {
                                                                const step = JSON.parse(stepStr);
                                                                return `<div class="workshop-step">
                                                                    <h4>Step ${step.stepNumber || ''}: ${step.title}</h4>
                                                                    ${ step.image ? `<img src="${step.image}" alt="${step.title}" />` : '' }
                                                                    <p>${step.description}</p>
                                                                </div>`;
                                                            });
                                                    });
                                                    return Promise.all(stepPromises)
                                                        .then(stepsHTML => {
                                                            workshopHTML += stepsHTML.join("");
                                                            return workshopHTML;
                                                        });
                                                } else {
                                                    return workshopHTML;
                                                }
                                            });
                                    })
                                    .then(workshopHTML => {
                                        document.getElementById('workshop-content').innerHTML = workshopHTML;
                                        // Remove popup after loading
                                        document.body.removeChild(overlay);
                                    })
                                    .catch(err => {
                                        console.error("Error processing CERRF file:", err);
                                        document.body.removeChild(overlay);
                                    });
                            });
                    });
                    listContainer.appendChild(button);
                });
            })
            .catch(err => {
                console.error("Error fetching workshops:", err);
                // Remove overlay on error
                document.body.removeChild(overlay);
            });

        // Close popup if overlay is clicked (outside popup container)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    // Attach listener to the select-workshop button
    document.getElementById('select-workshop').addEventListener('click', showWorkshopSelectionPopup);

    function displayStep(index, manifest) {
        const workshopContent = document.getElementById('workshop-content');
        const step = steps[index];
        // Build the HTML for this step.
        let html = `<div class="workshop-step">
            <h4>Step ${step.stepNumber || index + 1}: ${step.title}</h4>
            ${ step.image ? `<img src="${step.image}" alt="${step.title}" />` : '' }
            <p>${step.description}</p>
            <button id="validate-step">Validate Step</button>
        </div>`;
        // Navigation buttons:
        html += `<div class="workshop-nav">`;
        if (index > 0) {
            html += `<button id="prev-step">Previous</button>`;
        }
        if (index < manifest.stepCount - 1) {
            html += `<button id="next-step">Next</button>`;
        }
        html += `</div>`;
        workshopContent.innerHTML = html;

        // Set up navigation event listeners.
        const prevBtn = document.getElementById('prev-step');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentStepIndex--;
                displayStep(currentStepIndex, manifest);
            });
        }
        const nextBtn = document.getElementById('next-step');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentStepIndex++;
                displayStep(currentStepIndex, manifest);
            });
        }
        // Validation button event.
        document.getElementById('validate-step').addEventListener('click', () => {
            if (validateStep(step)) {
                // Check for an award: either from the step's own award property or from the manifest awards mapping.
                const award = step.award || (manifest.awards ? manifest.awards[`step${step.stepNumber || index + 1}`] : "No award");
                alert("Step completed! Award: " + award);
                // Optionally mark the step visually as complete.
            } else {
                alert("Step not completed correctly. Please try again.");
            }
        });
    }
});