/**
 * Generic messaging utilities for webview panels.
 * Wires up button clicks to send messages to the extension.
 *
 * Convention: Button ID = Command Name
 * Example: <button id="refresh"> sends {command: 'refresh'}
 */

(function() {
	// Get VS Code API (only call once per webview)
	const vscode = acquireVsCodeApi();

	// Make available globally for other scripts
	window.vscode = vscode;

	// Track original button content for restoration
	const buttonOriginalContent = new Map();

	/**
	 * Wires up all buttons to send messages when clicked.
	 * Buttons with id="commandName" will send {command: 'commandName'} messages.
	 */
	function wireButtons() {
		const buttons = document.querySelectorAll('button[id]');
		buttons.forEach(button => {
			const commandName = button.id;
			button.addEventListener('click', () => {
				vscode.postMessage({ command: commandName });
			});
		});
	}

	/**
	 * Converts kebab-case to camelCase.
	 * Example: 'solution-id' -> 'solutionId'
	 */
	function kebabToCamel(str) {
		return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
	}

	/**
	 * Wires up elements with data-command attribute to send messages.
	 * Uses event delegation to handle dynamically added elements.
	 * Example: <a data-command="open" data-id="123"> sends {command: 'open', data: {id: '123'}}
	 */
	function wireDataCommands() {
		// Use event delegation on document to catch clicks on dynamic elements
		document.addEventListener('click', (e) => {
			// Find the element with data-command (could be the target or a parent)
			const element = e.target.closest('[data-command]');
			if (!element) {
				return;
			}

			e.preventDefault();

			const commandName = element.getAttribute('data-command');

			// Collect all data-* attributes as payload
			const data = {};
			for (const attr of element.attributes) {
				if (attr.name.startsWith('data-') && attr.name !== 'data-command') {
					// Remove 'data-' prefix and convert to camelCase
					const key = kebabToCamel(attr.name.substring(5));
					data[key] = attr.value;
				}
			}

			console.log('DEBUG: Click on element', {
				tagName: element.tagName,
				command: commandName,
				attributes: Array.from(element.attributes).map(a => `${a.name}="${a.value}"`),
				data: data
			});

			vscode.postMessage({
				command: commandName,
				data: Object.keys(data).length > 0 ? data : undefined
			});
		});
	}

	/**
	 * Wires up search input for client-side filtering.
	 * NOTE: Search + striping logic moved to DataTableBehavior.js for data tables.
	 * This function remains for backward compatibility with non-table panels.
	 */
	function wireSearch() {
		// Search is now handled by DataTableBehavior.js for data tables
		// This stub remains for panels that don't use DataTableBehavior
	}

	/**
	 * Wires up environment selector dropdown.
	 */
	function wireEnvironmentSelector() {
		const environmentSelect = document.getElementById('environmentSelect');
		if (!environmentSelect) {
			return;
		}

		environmentSelect.addEventListener('change', () => {
			vscode.postMessage({
				command: 'environmentChange',
				data: {
					environmentId: environmentSelect.value
				}
			});
		});
	}

	/**
	 * Handles messages from extension to update button states.
	 */
	window.addEventListener('message', event => {
		const message = event.data;

		if (message.command === 'setButtonState') {
			const button = document.getElementById(message.buttonId);
			if (!button) {
				console.warn(`Button not found: ${message.buttonId}`);
				return;
			}

			// Save original content on first disable
			if (message.disabled && !buttonOriginalContent.has(message.buttonId)) {
				buttonOriginalContent.set(message.buttonId, button.innerHTML);
			}

			button.disabled = message.disabled;

			if (message.showSpinner) {
				button.innerHTML = (buttonOriginalContent.get(message.buttonId) || '') +
					' <span class="spinner"></span>';
			} else {
				// Restore original content
				const original = buttonOriginalContent.get(message.buttonId);
				if (original) {
					button.innerHTML = original;
					buttonOriginalContent.delete(message.buttonId);
				}
			}
		}
	});

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			wireButtons();
			wireDataCommands();
			wireEnvironmentSelector();
		});
	} else {
		wireButtons();
		wireDataCommands();
		wireEnvironmentSelector();
	}
})();
