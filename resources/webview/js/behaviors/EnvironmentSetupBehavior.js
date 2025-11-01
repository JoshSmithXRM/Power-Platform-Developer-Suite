/**
 * Environment Setup Webview Behavior
 *
 * Client-side JavaScript for the Environment Setup panel.
 * Handles form interactions, validation, and message passing to the extension host.
 */

import { WebviewLogger } from '../utils/WebviewLogger.js';

const vscode = acquireVsCodeApi();
const logger = new WebviewLogger(vscode, 'EnvironmentSetup');

// DOM elements
const form = document.getElementById('environmentForm');
const nameInput = document.getElementById('name');
const authMethodSelect = document.getElementById('authenticationMethod');
const saveButton = document.getElementById('saveButton');
const testButton = document.getElementById('testButton');
const discoverButton = document.getElementById('discoverButton');
const deleteButton = document.getElementById('deleteButton');

// Track last saved auth method to detect changes
let lastSavedAuthMethod = authMethodSelect.value;

// Event listeners for messages from extension host
window.addEventListener('message', event => {
	const message = event.data;

	switch (message.command) {
		case 'environment-loaded':
			loadEnvironmentData(message.data);
			break;

		case 'environment-saved':
			handleSaveComplete(message.data);
			break;

		case 'test-connection-result':
			handleTestResult(message.data);
			break;

		case 'discover-environment-id-result':
			handleDiscoverResult(message.data);
			break;

		case 'name-validation-result':
			handleNameValidation(message.data);
			break;
	}
});

// Save button click
saveButton.addEventListener('click', () => {
	logger.debug('Save button clicked');

	if (form.checkValidity()) {
		saveEnvironment();
	} else {
		logger.warn('Form validation failed on save attempt');
		form.reportValidity();
	}
});

// Test connection button click
testButton.addEventListener('click', () => {
	logger.debug('Test connection button clicked');

	if (form.checkValidity()) {
		testConnection();
	} else {
		logger.warn('Form validation failed on test connection attempt');
		form.reportValidity();
	}
});

// Discover Environment ID button click
discoverButton.addEventListener('click', () => {
	logger.debug('Discover environment ID button clicked');

	if (form.checkValidity()) {
		discoverEnvironmentId();
	} else {
		logger.warn('Form validation failed on discover ID attempt');
		form.reportValidity();
	}
});

// Delete button click
deleteButton.addEventListener('click', () => {
	logger.info('User initiated environment deletion');

	vscode.postMessage({
		command: 'delete-environment'
	});
});

// Auth method change - show/hide conditional fields
authMethodSelect.addEventListener('change', () => {
	updateConditionalFields();
});

// Name validation (debounced)
let nameValidationTimeout;
nameInput.addEventListener('input', () => {
	clearTimeout(nameValidationTimeout);
	nameValidationTimeout = setTimeout(() => {
		validateName();
	}, 500);
});

// Clear save validation errors when user starts typing in any field
// (name validation errors are managed separately and clear on their own)
form.addEventListener('input', () => {
	clearSaveValidationErrors();
});

/**
 * Loads environment data into the form.
 * Called when extension sends 'environment-loaded' message.
 */
function loadEnvironmentData(data) {
	if (!data) return;

	document.getElementById('name').value = data.name || '';
	document.getElementById('dataverseUrl').value = data.dataverseUrl || '';
	document.getElementById('tenantId').value = data.tenantId || '';
	document.getElementById('authenticationMethod').value = data.authenticationMethod || 'Interactive';
	document.getElementById('publicClientId').value = data.publicClientId || '';
	document.getElementById('environmentId').value = data.powerPlatformEnvironmentId || '';
	document.getElementById('clientId').value = data.clientId || '';
	document.getElementById('username').value = data.username || '';

	// Show credential placeholders for stored secrets
	if (data.hasStoredClientSecret && data.clientSecretPlaceholder) {
		document.getElementById('clientSecret').placeholder = data.clientSecretPlaceholder;
	}
	if (data.hasStoredPassword && data.passwordPlaceholder) {
		document.getElementById('password').placeholder = data.passwordPlaceholder;
	}

	// Track the loaded auth method
	lastSavedAuthMethod = data.authenticationMethod || 'Interactive';

	updateConditionalFields();
	deleteButton.style.display = 'inline-block';
}

/**
 * Saves the environment by sending form data to extension.
 */
function saveEnvironment() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	logger.info('User initiated save', {
		authMethod: data.authenticationMethod,
		hasDataverseUrl: !!data.dataverseUrl
	});

	vscode.postMessage({
		command: 'save-environment',
		data: data
	});
}

/**
 * Tests the connection by sending form data to extension.
 */
function testConnection() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	logger.info('User initiated connection test', {
		authMethod: data.authenticationMethod
	});

	testButton.disabled = true;
	testButton.textContent = 'Testing...';

	vscode.postMessage({
		command: 'test-connection',
		data: data
	});
}

/**
 * Discovers the Power Platform Environment ID from BAP API.
 */
function discoverEnvironmentId() {
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	logger.info('User initiated environment ID discovery', {
		authMethod: data.authenticationMethod
	});

	discoverButton.disabled = true;
	discoverButton.textContent = 'Discovering...';

	vscode.postMessage({
		command: 'discover-environment-id',
		data: data
	});
}

/**
 * Validates the environment name is unique.
 */
function validateName() {
	const name = nameInput.value.trim();
	if (name.length === 0) return;

	vscode.postMessage({
		command: 'validate-name',
		data: { name }
	});
}

/**
 * Clears credential fields that are not relevant to the current auth method.
 * Called after successful save to clean up orphaned credentials.
 */
function clearOrphanedCredentials() {
	const authMethod = authMethodSelect.value;

	// Clear Service Principal credentials if not using Service Principal
	if (authMethod !== 'ServicePrincipal') {
		document.getElementById('clientId').value = '';
		document.getElementById('clientSecret').value = '';
		document.getElementById('clientSecret').placeholder = '';
	}

	// Clear Username/Password credentials if not using Username/Password
	if (authMethod !== 'UsernamePassword') {
		document.getElementById('username').value = '';
		document.getElementById('password').value = '';
		document.getElementById('password').placeholder = '';
	}
}

/**
 * Updates visibility of conditional fields based on auth method.
 */
function updateConditionalFields() {
	const authMethod = authMethodSelect.value;
	const conditionalFields = document.querySelectorAll('.conditional-field');

	conditionalFields.forEach(field => {
		const requiredMethod = field.dataset.authMethod;
		field.style.display = requiredMethod === authMethod ? 'block' : 'none';
	});
}

/**
 * Handles the save complete message from extension.
 */
function handleSaveComplete(data) {
	if (data.success) {
		logger.info('Environment saved successfully', {
			isNew: data.isNewEnvironment
		});

		// Clear any existing validation errors
		clearAllValidationErrors();

		// Clear credentials only if auth method changed
		const currentAuthMethod = authMethodSelect.value;
		if (currentAuthMethod !== lastSavedAuthMethod) {
			clearOrphanedCredentials();
			lastSavedAuthMethod = currentAuthMethod;
		}

		saveButton.textContent = 'Saved!';
		setTimeout(() => {
			saveButton.textContent = 'Save Environment';
		}, 2000);

		// Show delete button if newly created
		if (data.isNewEnvironment && data.environmentId) {
			deleteButton.style.display = 'inline-block';
		}
	} else if (data.errors && data.errors.length > 0) {
		logger.warn('Environment save validation failed', {
			errorCount: data.errors.length
		});

		// Display validation errors inline
		displayValidationErrors(data.errors);
	}
}

/**
 * Displays validation errors inline in the form.
 */
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

/**
 * Shows an error message below a specific field.
 */
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
	errorElement.className = 'validation-error save-error'; // Mark as save error
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

/**
 * Clears only save validation errors (not name validation errors).
 */
function clearSaveValidationErrors() {
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

/**
 * Clears all validation errors from the form.
 */
function clearAllValidationErrors() {
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

/**
 * Handles the test connection result from extension.
 */
function handleTestResult(data) {
	testButton.disabled = false;
	testButton.textContent = 'Test Connection';

	if (data.success) {
		logger.info('Connection test succeeded');

		testButton.classList.add('success');
		setTimeout(() => {
			testButton.classList.remove('success');
		}, 3000);
	} else {
		logger.warn('Connection test failed', {
			errorMessage: data.errorMessage
		});

		testButton.classList.add('error');
		setTimeout(() => {
			testButton.classList.remove('error');
		}, 3000);
	}
}

/**
 * Handles the discover environment ID result from extension.
 */
function handleDiscoverResult(data) {
	discoverButton.disabled = false;
	discoverButton.textContent = 'Discover ID';

	if (data.success && data.environmentId) {
		logger.info('Environment ID discovered successfully', {
			environmentId: data.environmentId
		});

		// Populate the environment ID field
		document.getElementById('environmentId').value = data.environmentId;
		discoverButton.classList.add('success');
		setTimeout(() => {
			discoverButton.classList.remove('success');
		}, 3000);
	} else {
		logger.warn('Environment ID discovery failed', {
			errorMessage: data.errorMessage
		});

		discoverButton.classList.add('error');
		setTimeout(() => {
			discoverButton.classList.remove('error');
		}, 3000);
	}
}

/**
 * Handles the name validation result from extension.
 */
function handleNameValidation(data) {
	const nameField = nameInput.parentElement;
	const existingError = nameField.querySelector('.validation-error');

	if (existingError) {
		existingError.remove();
	}

	if (!data.isUnique) {
		const error = document.createElement('div');
		error.className = 'validation-error';
		error.textContent = data.message;
		nameField.appendChild(error);
		nameInput.classList.add('invalid');
	} else {
		nameInput.classList.remove('invalid');
	}
}

// Initialize on load
updateConditionalFields();
