/**
 * Environment Setup Webview Behavior
 *
 * Client-side JavaScript for the Environment Setup panel.
 * Handles form interactions, validation, and message passing to the extension host.
 */

(function() {
	'use strict';

	const vscode = acquireVsCodeApi();

	// DOM elements
	const form = document.getElementById('environmentForm');
	const nameInput = document.getElementById('name');
	const authMethodSelect = document.getElementById('authenticationMethod');
	const saveButton = document.getElementById('saveButton');
	const testButton = document.getElementById('testButton');
	const discoverButton = document.getElementById('discoverButton');
	const deleteButton = document.getElementById('deleteButton');

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
		if (form.checkValidity()) {
			saveEnvironment();
		} else {
			form.reportValidity();
		}
	});

	// Test connection button click
	testButton.addEventListener('click', () => {
		if (form.checkValidity()) {
			testConnection();
		} else {
			form.reportValidity();
		}
	});

	// Discover Environment ID button click
	discoverButton.addEventListener('click', () => {
		if (form.checkValidity()) {
			discoverEnvironmentId();
		} else {
			form.reportValidity();
		}
	});

	// Delete button click
	deleteButton.addEventListener('click', () => {
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

		updateConditionalFields();
		deleteButton.style.display = 'inline-block';
	}

	/**
	 * Saves the environment by sending form data to extension.
	 */
	function saveEnvironment() {
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

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
			saveButton.textContent = 'Saved!';
			setTimeout(() => {
				saveButton.textContent = 'Save Environment';
			}, 2000);

			// Show delete button if newly created
			if (data.isNewEnvironment && data.environmentId) {
				deleteButton.style.display = 'inline-block';
			}
		}
	}

	/**
	 * Handles the test connection result from extension.
	 */
	function handleTestResult(data) {
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

	/**
	 * Handles the discover environment ID result from extension.
	 */
	function handleDiscoverResult(data) {
		discoverButton.disabled = false;
		discoverButton.textContent = 'Discover ID';

		if (data.success && data.environmentId) {
			// Populate the environment ID field
			document.getElementById('environmentId').value = data.environmentId;
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
})();
