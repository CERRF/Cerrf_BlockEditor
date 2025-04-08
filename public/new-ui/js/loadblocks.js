function loadBlocks(category) {
  const blockList = document.querySelector('.block-list');
  console.log(`Loading blocks for category: ${category}`);
  // Fetch blocks based on the selected category
  fetch(`/public/blocks/${category}.json`)
    .then(response => response.json())
    .then(blocks => {
      blockList.innerHTML = ''; // Clear previous blocks
      blocks.forEach(block => {
        if (block['data-category'] !== category) return; // Filter by category
        const blockElement = document.createElement('div');
        blockElement.className = 'block';
        blockElement.setAttribute('draggable', true);
        blockElement.dataset.blockType = block.blockType;

        const content = document.createElement('div');
        content.className = 'block-content';

        const name = document.createElement('span');
        name.textContent = block.name;
        content.appendChild(name);

        blockElement.appendChild(content);
        blockElement.dataset.template = block.innerHTML;

        blockElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            type: block.blockType,
            template: block.innerHTML
          }));
        });

        blockList.appendChild(blockElement);
      });
    })
    .catch(err => console.error('Error loading blocks:', err));
}

export { loadBlocks };