/**
 * Solution Diff Behavior
 * Handles client-side interactions for the Solution Diff panel.
 *
 * Uses event delegation to handle elements that get replaced on scaffold refresh.
 */

window.createBehavior({
  initialize() {
    // Use event delegation on document so listeners survive HTML replacement
    this.setupEventDelegation();
  },

  handleMessage(message) {
    // Handle button state changes
    if (message.command === 'setButtonState') {
      this.setButtonState(message.buttonId, message.disabled);
    }
  },

  setupEventDelegation() {
    // Single delegated change listener for all dropdowns
    document.addEventListener('change', (e) => {
      const target = e.target;

      // Source environment change
      if (target.id === 'sourceEnvironmentSelect') {
        window.vscode.postMessage({
          command: 'sourceEnvironmentChange',
          data: { environmentId: target.value }
        });
        return;
      }

      // Target environment change
      if (target.id === 'targetEnvironmentSelect') {
        window.vscode.postMessage({
          command: 'targetEnvironmentChange',
          data: { environmentId: target.value }
        });
        return;
      }

      // Solution selection change
      if (target.id === 'solutionSelect') {
        window.vscode.postMessage({
          command: 'solutionSelect',
          data: { uniqueName: target.value }
        });
        return;
      }
    });
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
