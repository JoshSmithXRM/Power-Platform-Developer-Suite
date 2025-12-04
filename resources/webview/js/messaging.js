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

	/**
	 * Helper for creating behavior modules.
	 * Handles common boilerplate: vscode API access, DOM ready detection, message handling.
	 *
	 * @param {Object} config - Behavior configuration
	 * @param {Function} config.initialize - Called when DOM is ready
	 * @param {Function} [config.handleMessage] - Optional message handler
	 *
	 * @example
	 * window.createBehavior({
	 *   initialize() {
	 *     // Setup your behavior
	 *     const form = document.getElementById('myForm');
	 *   },
	 *   handleMessage(message) {
	 *     // Handle messages from extension
	 *     if (message.command === 'data-loaded') { ... }
	 *   }
	 * });
	 */
	window.createBehavior = function(config) {
		if (!config || typeof config.initialize !== 'function') {
			console.error('createBehavior requires an initialize function');
			return;
		}

		// Register message handler if provided
		if (typeof config.handleMessage === 'function') {
			window.addEventListener('message', event => {
				// VS Code webview security: messages from extension host have empty origin,
				// messages from webview context have vscode-webview:// scheme
				const origin = event.origin || '';
				if (origin !== '' && !origin.startsWith('vscode-webview://')) {
					console.warn('Rejected message from untrusted origin:', event.origin);
					return;
				}
				config.handleMessage.call(config, event.data);
			});
		}

		// Initialize when DOM is ready, binding config as 'this'
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => config.initialize.call(config));
		} else {
			config.initialize.call(config);
		}
	};

	// Track original button content for restoration
	const buttonOriginalContent = new Map();

	/**
	 * Wires up all buttons to send messages when clicked.
	 * Buttons with id="commandName" will send {command: 'commandName'} messages.
	 * Skips dropdown buttons (handled by DropdownComponent.js).
	 * Skips buttons with data-custom-handler (handled by behavior scripts).
	 */
	function wireButtons() {
		const buttons = document.querySelectorAll('button[id]');
		buttons.forEach(button => {
			// Skip dropdown triggers - they're handled by DropdownComponent
			if (button.hasAttribute('data-dropdown-trigger')) {
				return;
			}

			// Skip buttons with custom handlers - they're handled by behavior scripts
			if (button.hasAttribute('data-custom-handler')) {
				return;
			}

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

			vscode.postMessage({
				command: commandName,
				data: Object.keys(data).length > 0 ? data : undefined
			});
		});
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
	 * Wires up solution filter dropdown.
	 * Always sends a concrete solution ID (never undefined).
	 * Default Solution is always the first option with a concrete GUID.
	 */
	function wireSolutionSelector() {
		const solutionSelect = document.getElementById('solutionSelect');
		if (!solutionSelect) {
			return;
		}

		solutionSelect.addEventListener('change', () => {
			vscode.postMessage({
				command: 'solutionChange',
				data: {
					solutionId: solutionSelect.value
				}
			});
		});
	}

	/**
	 * Handles messages from extension to update button states.
	 */
	window.addEventListener('message', event => {
		// VS Code webview security: messages from extension host have empty origin,
		// messages from webview context have vscode-webview:// scheme
		const origin = event.origin || '';
		if (origin !== '' && !origin.startsWith('vscode-webview://')) {
			console.warn('Rejected message from untrusted origin:', event.origin);
			return;
		}

		const message = event.data;

		if (message.command === 'setButtonState') {
			console.debug('setButtonState received:', message.buttonId, 'disabled:', message.disabled, 'showSpinner:', message.showSpinner);
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
				// Restore original content or remove spinner if original wasn't saved
				const original = buttonOriginalContent.get(message.buttonId);
				if (original) {
					button.innerHTML = original;
					buttonOriginalContent.delete(message.buttonId);
				} else {
					// Defensive: remove spinner if present but original wasn't saved
					// This can happen if panel was refreshed during loading
					const spinner = button.querySelector('.spinner');
					if (spinner) {
						spinner.remove();
					}
				}
			}
		}

		if (message.command === 'setButtonLabel') {
			const button = document.getElementById(message.buttonId);
			if (!button) {
				console.warn(`Button not found: ${message.buttonId}`);
				return;
			}
			button.textContent = message.label;
			// Clear any stored original content since label is explicitly changing
			buttonOriginalContent.delete(message.buttonId);
		}

		// Handle solution selector update (on environment change)
		if (message.command === 'updateSolutionSelector') {
			const solutionSelect = document.getElementById('solutionSelect');
			if (!solutionSelect) {
				// Panel doesn't have a solution selector - that's OK
				return;
			}

			const data = message.data || {};
			const solutions = data.solutions || [];
			const currentSolutionId = data.currentSolutionId;

			// Clear existing options
			solutionSelect.innerHTML = '';

			// Add new options from the new environment's solutions
			solutions.forEach(solution => {
				const option = document.createElement('option');
				option.value = solution.id;
				option.textContent = solution.name;
				if (solution.id === currentSolutionId) {
					option.selected = true;
				}
				solutionSelect.appendChild(option);
			});

			console.debug('Solution selector updated', {
				count: solutions.length,
				currentSolutionId: currentSolutionId
			});
		}
	});

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			wireButtons();
			wireDataCommands();
			wireEnvironmentSelector();
			wireSolutionSelector();
		});
	} else {
		wireButtons();
		wireDataCommands();
		wireEnvironmentSelector();
		wireSolutionSelector();
	}
})();
