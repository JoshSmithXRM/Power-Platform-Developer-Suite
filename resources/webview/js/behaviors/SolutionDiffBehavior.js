/**
 * Solution Diff Behavior
 * Handles client-side interactions for the Solution Diff panel.
 */

window.createBehavior({
  initialize() {
    // Set up event listeners for environment and solution selection
    this.setupEnvironmentListeners();
    this.setupSolutionListener();
  },

  handleMessage(message) {
    // Handle button state changes
    if (message.command === 'setButtonState') {
      this.setButtonState(message.buttonId, message.disabled);
    }
  },

  setupEnvironmentListeners() {
    // Source environment change
    const sourceSelect = document.getElementById('sourceEnvironmentSelect');
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        const environmentId = e.target.value;
        window.postMessage({
          command: 'sourceEnvironmentChange',
          environmentId: environmentId
        });
      });
    }

    // Target environment change
    const targetSelect = document.getElementById('targetEnvironmentSelect');
    if (targetSelect) {
      targetSelect.addEventListener('change', (e) => {
        const environmentId = e.target.value;
        window.postMessage({
          command: 'targetEnvironmentChange',
          environmentId: environmentId
        });
      });
    }
  },

  setupSolutionListener() {
    // Solution selection change
    const solutionSelect = document.getElementById('solutionSelect');
    if (solutionSelect) {
      solutionSelect.addEventListener('change', (e) => {
        const uniqueName = e.target.value;
        window.postMessage({
          command: 'solutionSelect',
          uniqueName: uniqueName
        });
      });
    }
  },

  setButtonState(buttonId, disabled) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = disabled;
      if (disabled) {
        button.classList.add('disabled');
      } else {
        button.classList.remove('disabled');
      }
    }
  }
});
