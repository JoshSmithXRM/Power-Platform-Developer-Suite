/**
 * FormModal Component
 *
 * Reusable modal dialog for forms with multiple fields.
 * Extends the InputDialog pattern to support various field types.
 *
 * @example
 * showFormModal({
 *   title: 'Register Plugin Package',
 *   fields: [
 *     { id: 'name', label: 'Package Name', type: 'text', value: 'MyPackage', required: true },
 *     { id: 'version', label: 'Version', type: 'text', value: '1.0.0', required: true },
 *   ],
 *   submitLabel: 'Register',
 *   onSubmit: (values) => console.log('Submitted:', values)
 * });
 */

/**
 * Shows a modal form dialog.
 *
 * @param {Object} options - Dialog configuration
 * @param {string} options.title - Dialog title
 * @param {Array} options.fields - Array of field configurations
 * @param {string} [options.submitLabel='Submit'] - Submit button label
 * @param {string} [options.cancelLabel='Cancel'] - Cancel button label
 * @param {Function} options.onSubmit - Callback when user submits (receives object with field values)
 * @param {Function} [options.onCancel] - Optional callback when user cancels
 * @param {Function} [options.onFieldChange] - Optional callback when a field value changes (fieldId, value, updateField)
 * @returns {Function} Cleanup function to remove dialog
 */
window.showFormModal = function(options) {
	const {
		title,
		fields,
		submitLabel = 'Submit',
		cancelLabel = 'Cancel',
		onSubmit,
		onCancel,
		onFieldChange
	} = options;

	// Create overlay
	const overlay = document.createElement('div');
	overlay.className = 'form-modal-overlay';

	// Create dialog container
	const dialog = document.createElement('div');
	dialog.className = 'form-modal-container';
	dialog.setAttribute('role', 'dialog');
	dialog.setAttribute('aria-labelledby', 'form-modal-title');
	dialog.setAttribute('aria-modal', 'true');

	// Create header with title and close button
	const header = document.createElement('div');
	header.className = 'form-modal-header';

	const titleElement = document.createElement('h3');
	titleElement.id = 'form-modal-title';
	titleElement.className = 'form-modal-title';
	titleElement.textContent = title;

	const closeButton = document.createElement('button');
	closeButton.className = 'form-modal-close';
	closeButton.innerHTML = '&times;';
	closeButton.title = 'Close';
	closeButton.onclick = () => {
		if (onCancel) onCancel();
		removeDialog();
	};

	header.appendChild(titleElement);
	header.appendChild(closeButton);

	// Create form body
	const body = document.createElement('div');
	body.className = 'form-modal-body';

	// Track input elements for value retrieval
	const inputElements = {};

	// Create fields
	fields.forEach(field => {
		const fieldContainer = document.createElement('div');
		fieldContainer.className = 'form-modal-field';

		const label = document.createElement('label');
		label.className = 'form-modal-label';
		label.setAttribute('for', `form-modal-${field.id}`);
		label.textContent = field.label;
		if (field.required) {
			const requiredSpan = document.createElement('span');
			requiredSpan.className = 'form-modal-required';
			requiredSpan.textContent = ' *';
			label.appendChild(requiredSpan);
		}

		let input;
		if (field.type === 'info') {
			// Info type: display-only text (no input element)
			input = document.createElement('div');
			input.className = 'form-modal-info';
			input.textContent = field.value || '';
			fieldContainer.appendChild(label);
			fieldContainer.appendChild(input);
			body.appendChild(fieldContainer);
			return; // Skip the rest of input setup
		} else if (field.type === 'checkboxGroup') {
			// Checkbox group: multiple checkboxes for multi-select
			const groupContainer = document.createElement('div');
			groupContainer.className = 'form-modal-checkbox-group' + (field.disabled ? ' form-modal-checkbox-group--disabled' : '');
			groupContainer.id = `form-modal-${field.id}`;

			const checkboxes = [];
			const isGroupDisabled = field.disabled === true;
			(field.options || []).forEach((opt, index) => {
				const checkboxWrapper = document.createElement('div');
				checkboxWrapper.className = 'form-modal-checkbox-item';

				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.id = `form-modal-${field.id}-${index}`;
				checkbox.value = opt.value;
				checkbox.checked = opt.checked !== false; // Default to checked unless explicitly false
				checkbox.className = 'form-modal-checkbox';
				if (isGroupDisabled) {
					checkbox.disabled = true;
				}

				const checkboxLabel = document.createElement('label');
				checkboxLabel.setAttribute('for', checkbox.id);
				checkboxLabel.className = 'form-modal-checkbox-label';

				// Create label content
				const labelText = document.createElement('span');
				labelText.className = 'form-modal-checkbox-label-text';
				labelText.textContent = opt.label;
				checkboxLabel.appendChild(labelText);

				// Add description if provided (e.g., "(Plugin)" or "(Workflow Activity)")
				if (opt.description) {
					const descText = document.createElement('span');
					descText.className = 'form-modal-checkbox-description';
					descText.textContent = ' ' + opt.description;
					checkboxLabel.appendChild(descText);
				}

				checkboxWrapper.appendChild(checkbox);
				checkboxWrapper.appendChild(checkboxLabel);
				groupContainer.appendChild(checkboxWrapper);
				checkboxes.push(checkbox);
			});

			// Store checkboxes array for later value retrieval
			inputElements[field.id] = { type: 'checkboxGroup', checkboxes };

			fieldContainer.appendChild(label);
			fieldContainer.appendChild(groupContainer);
			body.appendChild(fieldContainer);
			return; // Skip the rest of input setup
		} else if (field.type === 'textarea') {
			input = document.createElement('textarea');
			input.rows = field.rows || 3;
		} else if (field.type === 'select') {
			input = document.createElement('select');
			(field.options || []).forEach(opt => {
				const option = document.createElement('option');
				option.value = opt.value;
				option.textContent = opt.label;
				input.appendChild(option);
			});
		} else {
			input = document.createElement('input');
			input.type = field.type || 'text';
		}

		input.id = `form-modal-${field.id}`;
		input.className = 'form-modal-input';
		input.value = field.value || '';
		input.placeholder = field.placeholder || '';

		if (field.readonly) {
			input.readOnly = true;
			input.classList.add('form-modal-input--readonly');
		}

		if (field.disabled) {
			input.disabled = true;
		}

		// Add change listener for onFieldChange callback
		if (onFieldChange) {
			const eventType = field.type === 'select' ? 'change' : 'input';
			input.addEventListener(eventType, () => {
				const updateField = (targetFieldId, newValue) => {
					const targetInput = inputElements[targetFieldId];
					if (targetInput) {
						targetInput.value = newValue;
					}
				};
				onFieldChange(field.id, input.value, updateField);
			});
		}

		inputElements[field.id] = input;

		fieldContainer.appendChild(label);
		fieldContainer.appendChild(input);
		body.appendChild(fieldContainer);
	});

	// Create footer with buttons
	const footer = document.createElement('div');
	footer.className = 'form-modal-footer';

	const cancelBtn = document.createElement('button');
	cancelBtn.className = 'form-modal-button form-modal-button--secondary';
	cancelBtn.textContent = cancelLabel;
	cancelBtn.onclick = () => {
		if (onCancel) onCancel();
		removeDialog();
	};

	const submitBtn = document.createElement('button');
	submitBtn.className = 'form-modal-button form-modal-button--primary';
	submitBtn.textContent = submitLabel;
	submitBtn.onclick = () => {
		// Collect values
		const values = {};
		let isValid = true;

		fields.forEach(field => {
			// Skip info fields - they're display-only, not inputs
			if (field.type === 'info') {
				return;
			}

			const input = inputElements[field.id];

			// Handle checkboxGroup fields specially
			if (field.type === 'checkboxGroup') {
				const checkedValues = input.checkboxes
					.filter(cb => cb.checked)
					.map(cb => cb.value);
				values[field.id] = checkedValues;

				// Validation: if required, at least one must be checked
				if (field.required && checkedValues.length === 0) {
					// Add error styling to the group container
					const groupContainer = document.getElementById(`form-modal-${field.id}`);
					if (groupContainer) {
						groupContainer.classList.add('form-modal-checkbox-group--error');
					}
					isValid = false;
				} else {
					const groupContainer = document.getElementById(`form-modal-${field.id}`);
					if (groupContainer) {
						groupContainer.classList.remove('form-modal-checkbox-group--error');
					}
				}
				return;
			}

			const value = input.value.trim();
			values[field.id] = value;

			// Basic validation
			if (field.required && !value) {
				input.classList.add('form-modal-input--error');
				isValid = false;
			} else {
				input.classList.remove('form-modal-input--error');
			}
		});

		if (isValid) {
			onSubmit(values);
			removeDialog();
		}
	};

	footer.appendChild(cancelBtn);
	footer.appendChild(submitBtn);

	// Function to remove dialog
	const removeDialog = () => {
		if (document.body && overlay.parentNode === document.body) {
			document.body.removeChild(overlay);
		}
	};

	// Assemble dialog
	dialog.appendChild(header);
	dialog.appendChild(body);
	dialog.appendChild(footer);
	overlay.appendChild(dialog);

	// Add to document
	if (document.body) {
		document.body.appendChild(overlay);
	} else {
		console.error('[FormModal] document.body is not available');
		return () => {};
	}

	// Focus first non-readonly input
	const firstInput = fields.find(f => !f.readonly && !f.disabled);
	if (firstInput && inputElements[firstInput.id]) {
		inputElements[firstInput.id].focus();
	}

	// Keyboard shortcuts
	dialog.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submitBtn.click();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelBtn.click();
		}
	});

	// Close on overlay click (outside dialog)
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			cancelBtn.click();
		}
	});

	// Return cleanup function
	return removeDialog;
};
