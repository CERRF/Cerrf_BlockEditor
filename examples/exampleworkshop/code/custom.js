// custom.js
// This file can include workshop-specific JavaScript.
// For example, you could add step animations or progressive highlights.
console.log("Custom workshop JS loaded.");

/**
 * Update visualization for the ping step.
 * For example, this function updates the ping block and the second PC's IP addresses.
 */
function updatePingVisualization(ip1, ip2) {
  // Update the IP address in the Ping block.
  const pingElem = document.getElementById('ping-ip');
  if (pingElem) {
    pingElem.textContent = ip1;
  }
  
  // Update the IP address near the second PC.
  const secondPcElem = document.getElementById('second-pc-ip');
  if (secondPcElem) {
    secondPcElem.textContent = ip2;
  }
}

// Example usage: updatePingVisualization('192.168.1.1', '192.168.1.2');
// (In your actual application, call this when the user runs the ping command.)

/**
 * Validate a workshop step.
 * For demonstration purposes, this function assumes that the step contains an "expectedBlock" property.
 * It looks in the drop area for a block element with a matching data-block-type attribute.
 * If found, we assume the step is complete.
 */
function validateWorkshopStep(step) {
  if (step.expectedBlock) {
    // The drop area should contain blocks inserted by the user.
    // For example, a block's HTML might include: <div class="block" data-block-type="ping">...</div>
    let blockElem = document.querySelector(`#drop-area .block[data-block-type="${step.expectedBlock}"]`);
    return blockElem !== null;
  }
  // If no expectedBlock is provided, assume the step validates by default.
  return true;
}

// Expose the validation function globally so that script.js can call it.
window.validateWorkshopStep = validateWorkshopStep;

/**
 * Attaches the event listener for the "Validate Step" button.
 * This should be called from your displayStep function after the step HTML is inserted.
 *
 * @param {object} step - The currently displayed step object.
 * @param {object} manifest - The workshop manifest object.
 * @param {number} currentStepIndex - The current step index.
 */
function attachValidateEvent(step, manifest, currentStepIndex) {
  let validateButton = document.getElementById('validate-step');
  if (validateButton) {
    validateButton.addEventListener('click', () => {
      if (window.validateWorkshopStep && window.validateWorkshopStep(step)) {
        // Check for an award defined directly on the step, or look it up in the manifest awards.
        const award = step.award || (manifest.awards ? manifest.awards[`step${step.stepNumber || currentStepIndex + 1}`] : "No award");
        alert("Step completed! Award: " + award);
        // Optionally, you can update the UI here to mark the step as completed.
      } else {
        alert("Step not completed correctly. Please try again.");
      }
    });
  }
}

// Expose the attachValidateEvent function so displayStep can call it.
window.attachValidateEvent = attachValidateEvent;
