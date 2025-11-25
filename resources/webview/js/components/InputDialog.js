/**
 * InputDialog Component
 *
 * Reusable modal dialog for getting text input from users.
 * Replaces browser prompt() which doesn't work in sandboxed webviews.
 *
 * VS Code webviews run in a sandboxed iframe with CSP restrictions.
 * The browser prompt() method returns null immediately in this context.
 * See: https://code.visualstudio.com/api/extension-guides/webview#scripts-and-message-passing
 *
 * @example
 * showInputDialog({
 *   title: 'Enter Name',
 *   label: 'Please enter your name:',
 *   placeholder: 'John Doe',
 *   onSubmit: (value) => console.log('Submitted:', value)
 * });
 */

/**
 * Shows a modal input dialog.
 *
 * @param {Object} options - Dialog configuration
 * @param {string} options.title - Dialog title
 * @param {string} options.label - Input label text
 * @param {string} [options.placeholder=''] - Input placeholder
 * @param {Function} options.onSubmit - Callback when user submits (receives input value)
 * @returns {Function} Cleanup function to remove dialog
 */
window.showInputDialog = function(options) {
	const { title, label, placeholder = '', onSubmit } = options;

	// Create overlay
	const overlay = document.createElement('div');
	overlay.className = 'input-dialog-overlay';

	// Create dialog container
	const dialog = document.createElement('div');
	dialog.className = 'input-dialog-container';
	dialog.setAttribute('role', 'dialog');
	dialog.setAttribute('aria-labelledby', 'input-dialog-title');
	dialog.setAttribute('aria-modal', 'true');

	// Create title
	const titleElement = document.createElement('h3');
	titleElement.id = 'input-dialog-title';
	titleElement.className = 'input-dialog-title';
	titleElement.textContent = title;

	// Create label
	const labelElement = document.createElement('label');
	labelElement.className = 'input-dialog-label';
	labelElement.textContent = label;

	// Create input
	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'input-dialog-input';
	input.placeholder = placeholder;

	// Create button container
	const buttons = document.createElement('div');
	buttons.className = 'input-dialog-buttons';

	// Create OK button
	const okButton = document.createElement('button');
	okButton.className = 'input-dialog-button';
	okButton.textContent = 'OK';
	okButton.onclick = () => {
		const value = input.value.trim();
		if (value) {
			onSubmit(value);
		}
		removeDialog();
	};

	// Create Cancel button
	const cancelButton = document.createElement('button');
	cancelButton.className = 'input-dialog-button secondary';
	cancelButton.textContent = 'Cancel';
	cancelButton.onclick = () => {
		removeDialog();
	};

	// Function to remove dialog
	const removeDialog = () => {
		if (document.body && overlay.parentNode === document.body) {
			document.body.removeChild(overlay);
		}
	};

	// Assemble dialog
	buttons.appendChild(okButton);
	buttons.appendChild(cancelButton);
	dialog.appendChild(titleElement);
	dialog.appendChild(labelElement);
	dialog.appendChild(input);
	dialog.appendChild(buttons);
	overlay.appendChild(dialog);

	// Add to document
	if (document.body) {
		document.body.appendChild(overlay);
	} else {
		console.error('[InputDialog] document.body is not available');
		return () => {}; // Return no-op cleanup function
	}

	// Focus input and handle keyboard shortcuts
	input.focus();
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			okButton.click();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelButton.click();
		}
	});

	// Close on overlay click (outside dialog)
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			cancelButton.click();
		}
	});

	// Return cleanup function
	return removeDialog;
};
