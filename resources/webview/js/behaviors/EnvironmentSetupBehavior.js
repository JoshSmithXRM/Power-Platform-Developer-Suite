/**
 * Environment Setup Webview Behavior
 *
 * Client-side JavaScript for the Environment Setup panel.
 * Handles form interactions, validation, and message passing to the extension host.
 */

// Module-level variables (accessed by helper functions)
let form;
let nameInput;
let authMethodSelect;
let saveButton;
let testButton;
let discoverButton;
let deleteButton;
let lastSavedAuthMethod;
let nameValidationTimeout;

window.createBehavior({
	initialize() {
		// Get DOM elements
		form = document.getElementById('environmentForm');
		nameInput = document.getElementById('name');
		authMethodSelect = document.getElementById('authenticationMethod');
		saveButton = document.getElementById('saveEnvironment');
		testButton = document.getElementById('testConnection');
		discoverButton = document.getElementById('discoverEnvironmentId');
		deleteButton = document.getElementById('deleteEnvironment');

		if (authMethodSelect) {
			lastSavedAuthMethod = authMethodSelect.value;
		}

		// Register event listeners in capture phase to prevent generic messaging.js handlers
		if (saveButton) {
			saveButton.addEventListener('click', (e) => {
				e.stopPropagation();
				if (form && form.checkValidity()) {
					saveEnvironment();
				} else if (form) {
					form.reportValidity();
				}
			}, true);
		}

		if (testButton) {
			testButton.addEventListener('click', (e) => {
				e.stopPropagation();
				if (form && form.checkValidity()) {
					testConnection();
				} else if (form) {
					form.reportValidity();
				}
			}, true);
		}

		if (discoverButton) {
			discoverButton.addEventListener('click', (e) => {
				e.stopPropagation();
				if (form && form.checkValidity()) {
					discoverEnvironmentId();
				} else if (form) {
					form.reportValidity();
				}
			}, true);
		}

		if (deleteButton) {
			deleteButton.addEventListener('click', (e) => {
				e.stopPropagation();
				window.vscode.postMessage({
					command: 'deleteEnvironment'
				});
			}, true);
		}

		if (authMethodSelect) {
			authMethodSelect.addEventListener('change', () => {
				updateConditionalFields();
			});
		}

		if (nameInput) {
			nameInput.addEventListener('input', () => {
				clearTimeout(nameValidationTimeout);
				nameValidationTimeout = setTimeout(() => {
					validateName();
				}, 500);
			});
		}

		if (form) {
			form.addEventListener('input', () => {
				clearSaveValidationErrors();
			});
		}

		// Initialize conditional fields
		updateConditionalFields();
	},

	handleMessage(message) {
		switch (message.command) {
			case 'environment-loaded':
				loadEnvironmentData(message.data);
				break;

			case 'environment-saved':
				handleSaveComplete(message.data);
				break;

			case 'test-connection-result':
				// VS Code shows notification, no UI update needed
				break;

			case 'discover-environment-id-result':
				if (message.data.success) {
					const envIdInput = document.getElementById('environmentId');
					if (envIdInput && message.data.environmentId) {
						envIdInput.value = message.data.environmentId;
					}
				}
				break;

			case 'name-validation-result':
				handleNameValidation(message.data);
				break;
		}
	}
});

function loadEnvironmentData(data) {
	if (!data) return;

	const nameInput = document.getElementById('name');
	const urlInput = document.getElementById('dataverseUrl');
	const tenantInput = document.getElementById('tenantId');
	const authSelect = document.getElementById('authenticationMethod');
	const publicClientInput = document.getElementById('publicClientId');
	const envIdInput = document.getElementById('environmentId');
	const clientIdInput = document.getElementById('clientId');
	const usernameInput = document.getElementById('username');
	const clientSecretInput = document.getElementById('clientSecret');
	const passwordInput = document.getElementById('password');

	if (nameInput) nameInput.value = data.name || '';
	if (urlInput) urlInput.value = data.dataverseUrl || '';
	if (tenantInput) tenantInput.value = data.tenantId || '';
	if (authSelect) authSelect.value = data.authenticationMethod || 'Interactive';
	if (publicClientInput) publicClientInput.value = data.publicClientId || '';
	if (envIdInput) envIdInput.value = data.powerPlatformEnvironmentId || '';
	if (clientIdInput) clientIdInput.value = data.clientId || '';
	if (usernameInput) usernameInput.value = data.username || '';

	// Show credential placeholders for stored secrets
	if (data.hasStoredClientSecret && data.clientSecretPlaceholder && clientSecretInput) {
		clientSecretInput.placeholder = data.clientSecretPlaceholder;
	}
	if (data.hasStoredPassword && data.passwordPlaceholder && passwordInput) {
		passwordInput.placeholder = data.passwordPlaceholder;
	}

	// Track the loaded auth method
	lastSavedAuthMethod = data.authenticationMethod || 'Interactive';

	updateConditionalFields();
	if (deleteButton) {
		deleteButton.style.display = 'inline-block';
	}
}

function saveEnvironment() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	window.vscode.postMessage({
		command: 'saveEnvironment',
		data: data
	});
}

function testConnection() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	if (testButton) {
		testButton.disabled = true;
		testButton.textContent = 'Testing...';
	}

	window.vscode.postMessage({
		command: 'testConnection',
		data: data
	});
}

function discoverEnvironmentId() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	if (discoverButton) {
		discoverButton.disabled = true;
		discoverButton.textContent = 'Discovering...';
	}

	window.vscode.postMessage({
		command: 'discoverEnvironmentId',
		data: data
	});
}

function validateName() {
	const name = nameInput.value.trim();
	if (name.length === 0) return;

	window.vscode.postMessage({
		command: 'validateName',
		data: { name }
	});
}

/**
 * Clears credential fields that are not relevant to the current auth method.
 * Called after successful save to clean up orphaned credentials.
 */
function clearOrphanedCredentials() {
	if (!authMethodSelect) return;
	const authMethod = authMethodSelect.value;

	// Clear Service Principal credentials if not using Service Principal
	if (authMethod !== 'ServicePrincipal') {
		const clientIdInput = document.getElementById('clientId');
		const clientSecretInput = document.getElementById('clientSecret');
		if (clientIdInput) clientIdInput.value = '';
		if (clientSecretInput) {
			clientSecretInput.value = '';
			clientSecretInput.placeholder = '';
		}
	}

	// Clear Username/Password credentials if not using Username/Password
	if (authMethod !== 'UsernamePassword') {
		const usernameInput = document.getElementById('username');
		const passwordInput = document.getElementById('password');
		if (usernameInput) usernameInput.value = '';
		if (passwordInput) {
			passwordInput.value = '';
			passwordInput.placeholder = '';
		}
	}
}

function updateConditionalFields() {
	if (!authMethodSelect) return;
	const authMethod = authMethodSelect.value;
	const conditionalFields = document.querySelectorAll('.conditional-field');

	conditionalFields.forEach(field => {
		const requiredMethod = field.dataset.authMethod;
		field.style.display = requiredMethod === authMethod ? 'block' : 'none';
	});
}

function handleSaveComplete(data) {
	if (data.success) {
		// Clear any existing validation errors
		clearAllValidationErrors();

		// Clear credentials only if auth method changed
		if (authMethodSelect) {
			const currentAuthMethod = authMethodSelect.value;
			if (currentAuthMethod !== lastSavedAuthMethod) {
				clearOrphanedCredentials();
				lastSavedAuthMethod = currentAuthMethod;
			}
		}

		if (saveButton) {
			saveButton.textContent = 'Saved!';
			setTimeout(() => {
				saveButton.textContent = 'Save Environment';
			}, 2000);
		}

		// Show delete button if newly created
		if (data.isNewEnvironment && data.environmentId && deleteButton) {
			deleteButton.style.display = 'inline-block';
		}
	} else if (data.errors && data.errors.length > 0) {
		// Display validation errors inline
		displayValidationErrors(data.errors);
	}
}

function displayValidationErrors(errors) {
	// Don't clear name validation errors - they're managed separately
	// Only clear errors from previous save attempts
	clearSaveValidationErrors();

	// Display each error below its corresponding field
	errors.forEach(error => {
		const errorLower = error.toLowerCase();
		let fieldId = null;

		// Map error messages to field IDs
		if (errorLower.includes('tenant id')) {
			fieldId = 'tenantId';
		} else if (errorLower.includes('name') && !errorLower.includes('username')) {
			fieldId = 'name';
		} else if (errorLower.includes('dataverse url')) {
			fieldId = 'dataverseUrl';
		} else if (errorLower.includes('client id') && !errorLower.includes('public')) {
			fieldId = 'clientId';
		} else if (errorLower.includes('client secret')) {
			fieldId = 'clientSecret';
		} else if (errorLower.includes('username')) {
			fieldId = 'username';
		} else if (errorLower.includes('password')) {
			fieldId = 'password';
		}

		if (fieldId) {
			showFieldError(fieldId, error);
		}
	});
}

function showFieldError(fieldId, errorMessage) {
	const field = document.getElementById(fieldId);
	if (!field) return;

	// Highlight the field
	field.classList.add('invalid');
	field.style.borderColor = 'var(--vscode-inputValidation-errorBorder)';

	// Find the field's parent container (form-group)
	const fieldContainer = field.closest('.form-group') || field.parentElement;
	if (!fieldContainer) return;

	// Check if error message already exists for this field
	const existingError = fieldContainer.querySelector('.validation-error.save-error');
	if (existingError) {
		existingError.textContent = errorMessage;
		return;
	}

	// Create error message element
	const errorElement = document.createElement('div');
	errorElement.className = 'validation-error save-error';
	errorElement.textContent = errorMessage;
	errorElement.style.cssText = 'color: var(--vscode-inputValidation-errorForeground); background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); padding: 4px 8px; margin-top: 4px; font-size: 12px; border-radius: 2px;';

	// Insert after the field (or after help text if it exists)
	const helpText = fieldContainer.querySelector('.help-text');
	if (helpText) {
		helpText.insertAdjacentElement('afterend', errorElement);
	} else {
		field.insertAdjacentElement('afterend', errorElement);
	}
}

function clearSaveValidationErrors() {
	if (!form) return;
	// Remove only save-generated error messages
	const errorMessages = form.querySelectorAll('.validation-error.save-error');
	errorMessages.forEach(error => error.remove());

	// Remove field highlighting only for fields that don't have other errors
	const invalidFields = form.querySelectorAll('.invalid');
	invalidFields.forEach(field => {
		const fieldContainer = field.closest('.form-group') || field.parentElement;
		// Only remove highlighting if there are no remaining validation errors for this field
		if (fieldContainer && !fieldContainer.querySelector('.validation-error')) {
			field.classList.remove('invalid');
			field.style.borderColor = '';
		}
	});
}

function clearAllValidationErrors() {
	if (!form) return;
	// Remove all field error messages
	const errorMessages = form.querySelectorAll('.validation-error');
	errorMessages.forEach(error => error.remove());

	// Remove field highlighting
	const invalidFields = form.querySelectorAll('.invalid');
	invalidFields.forEach(field => {
		field.classList.remove('invalid');
		field.style.borderColor = '';
	});
}

function handleTestResult(data) {
	if (testButton) {
		testButton.disabled = false;
		testButton.textContent = 'Test Connection';

		if (data.success) {
			testButton.classList.add('success');
			setTimeout(() => {
				testButton.classList.remove('success');
			}, 3000);
		} else {
			testButton.classList.add('error');
			setTimeout(() => {
				testButton.classList.remove('error');
			}, 3000);
		}
	}
}

function handleDiscoverResult(data) {
	if (discoverButton) {
		discoverButton.disabled = false;
		discoverButton.textContent = 'Discover ID';

		if (data.success && data.environmentId) {
			// Populate the environment ID field
			const envIdInput = document.getElementById('environmentId');
			if (envIdInput) {
				envIdInput.value = data.environmentId;
			}
			discoverButton.classList.add('success');
			setTimeout(() => {
				discoverButton.classList.remove('success');
			}, 3000);
		} else {
			discoverButton.classList.add('error');
			setTimeout(() => {
				discoverButton.classList.remove('error');
			}, 3000);
		}
	}
}

function handleNameValidation(data) {
	if (!nameInput) return;
	const nameField = nameInput.parentElement;
	if (!nameField) return;
	const existingError = nameField.querySelector('.validation-error');

	if (existingError) {
		existingError.remove();
	}

	if (!data.isValid) {
		const error = document.createElement('div');
		error.className = 'validation-error';
		error.textContent = data.message || 'Name must be unique';
		nameField.appendChild(error);
		nameInput.classList.add('invalid');
	} else {
		nameInput.classList.remove('invalid');
	}
}
