/**
 * Example Behavior - Modern Pattern
 *
 * This demonstrates the recommended pattern for new behavior files.
 * Uses window.createBehavior() helper from messaging.js to eliminate boilerplate.
 */

window.createBehavior({
	/**
	 * Initialize behavior when DOM is ready.
	 * Called automatically by createBehavior helper.
	 */
	initialize() {
		// ✅ Get VS Code API (already acquired by messaging.js)
		const vscode = window.vscode;

		// Get DOM elements
		const form = document.getElementById('myForm');
		const saveButton = document.getElementById('saveData');
		const nameInput = document.getElementById('name');

		// Register event handlers
		if (saveButton) {
			saveButton.addEventListener('click', () => handleSave());
		}

		if (nameInput) {
			nameInput.addEventListener('blur', () => validateName());
		}

		// Helper functions (closures have access to vscode, form, etc.)
		function handleSave() {
			if (!form || !form.checkValidity()) {
				if (form) form.reportValidity();
				return;
			}

			const formData = new FormData(form);
			const data = Object.fromEntries(formData.entries());

			vscode.postMessage({
				command: 'saveData',
				data: data
			});
		}

		function validateName() {
			if (!nameInput || !nameInput.value) return;

			vscode.postMessage({
				command: 'validateName',
				data: { name: nameInput.value }
			});
		}

		function populateForm(data) {
			if (!data || !nameInput) return;
			if (data.name) nameInput.value = data.name;
		}

		// Expose functions that need to be called from handleMessage
		return { populateForm };
	},

	/**
	 * Handle messages from extension.
	 * Called automatically for every message received.
	 */
	handleMessage(message) {
		// Access functions from initialize via returned object would require more work
		// For now, simpler to handle messages inline

		switch (message.command) {
			case 'data-loaded':
				// Populate form with data
				const nameInput = document.getElementById('name');
				if (nameInput && message.data && message.data.name) {
					nameInput.value = message.data.name;
				}
				break;

			case 'save-complete':
				if (message.data.success) {
					console.log('Save successful!');
				}
				break;
		}
	}
});

/**
 * Benefits of this pattern:
 *
 * ✅ No IIFE boilerplate
 * ✅ No window.vscode = acquireVsCodeApi() (caught by ESLint)
 * ✅ No manual DOM ready detection
 * ✅ No manual message handler registration
 * ✅ Clear separation of concerns (init vs message handling)
 * ✅ Consistent pattern across all behaviors
 *
 * Migration path for existing behaviors:
 * - Keep old behaviors as-is (they work fine)
 * - Use new pattern for NEW behaviors only
 * - Gradually migrate old behaviors during feature work (not as standalone refactor)
 */
