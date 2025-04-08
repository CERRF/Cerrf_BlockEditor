import { loadBlocks } from './loadblocks.js';

document.addEventListener('DOMContentLoaded', () => {
  const blockCategories = document.querySelectorAll('.block-category');
  const containerDetails = document.querySelector('.container-details');
  const blockContainer = document.querySelector('.block-container');
  const blockList = document.querySelector('.block-list');

  blockCategories.forEach(category => {
    category.addEventListener('click', () => {
      // Check if the clicked category is already selected
      if (category.classList.contains('category-selected')) {
        // Deselect the category
        category.classList.remove('category-selected');
        // Close the container: remove open class, add closed class
        blockContainer.classList.remove('container-open');
        blockContainer.classList.add('container-closed');
        // Remove custom properties from container details
        containerDetails.style.removeProperty('--theme');
        containerDetails.style.removeProperty('--icon');
        blockList.style.removeProperty('--theme');
      } else {
        // If another category is already selected, deselect it first
        blockCategories.forEach(cat => {
          if (cat !== category) {
            cat.classList.remove('category-selected');
          }
        });
        // Select the clicked category
        category.classList.add('category-selected');

        // Copy the style custom properties (--theme and --icon) from the clicked category
        const theme = category.style.getPropertyValue('--theme');
        const icon = category.style.getPropertyValue('--icon');

        // Apply these properties to the container-details element
        containerDetails.style.setProperty('--theme', theme);
        containerDetails.style.setProperty('--icon', icon);
        blockList.style.setProperty('--theme', theme);

        // Optionally, update the inner text of the container-details .name element
        const nameSpan = containerDetails.querySelector('.name');
        const categoryText = category.querySelector('span:nth-child(2)').textContent;
        if (nameSpan) {
          nameSpan.textContent = categoryText;
        }

        // Open the container: add open class, remove closed class
        loadBlocks(category.getAttribute('data-category')); // Load blocks for the selected category
        blockContainer.classList.add('container-open');
        blockContainer.classList.remove('container-closed');
      }
    });
  });
});