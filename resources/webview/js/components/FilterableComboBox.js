/**
 * FilterableComboBox Component
 *
 * Type-to-filter dropdown for selecting from a list of options.
 * Supports keyboard navigation, highlighting matches, and dynamic options.
 *
 * @example
 * const combobox = createFilterableComboBox({
 *   id: 'message',
 *   options: [
 *     { value: 'Create', label: 'Create' },
 *     { value: 'Update', label: 'Update' },
 *   ],
 *   value: 'Create',
 *   placeholder: 'Type to search...',
 *   onChange: (value) => console.log('Selected:', value)
 * });
 * container.appendChild(combobox.element);
 */

/**
 * Creates a filterable combobox element.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.id - Unique ID for the combobox
 * @param {Array} options.options - Array of { value, label, description? } objects
 * @param {string} [options.value] - Initially selected value
 * @param {string} [options.placeholder] - Placeholder text
 * @param {boolean} [options.readonly] - Whether the input is read-only
 * @param {boolean} [options.disabled] - Whether the combobox is disabled
 * @param {Function} [options.onChange] - Callback when value changes
 * @param {Function} [options.onInputChange] - Callback when input text changes (for async loading)
 * @returns {{ element: HTMLElement, setValue: Function, setOptions: Function, getValue: Function, setLoading: Function }}
 */
window.createFilterableComboBox = function(options) {
	const {
		id,
		options: initialOptions = [],
		value: initialValue = '',
		placeholder = 'Type to filter...',
		readonly = false,
		disabled = false,
		onChange,
		onInputChange
	} = options;

	// State
	let currentOptions = [...initialOptions];
	let filteredOptions = [...initialOptions];
	let selectedValue = initialValue;
	let focusedIndex = -1;
	let isOpen = false;

	// Create elements
	const container = document.createElement('div');
	container.className = 'filterable-combobox';
	container.id = `filterable-combobox-${id}`;

	const inputWrapper = document.createElement('div');
	inputWrapper.className = 'filterable-combobox-input-wrapper';

	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'filterable-combobox-input';
	input.id = `filterable-combobox-input-${id}`;
	input.placeholder = placeholder;
	input.readOnly = readonly;
	input.disabled = disabled;
	input.autocomplete = 'off';
	input.setAttribute('role', 'combobox');
	input.setAttribute('aria-autocomplete', 'list');
	input.setAttribute('aria-expanded', 'false');
	input.setAttribute('aria-controls', `filterable-combobox-dropdown-${id}`);

	const toggleBtn = document.createElement('button');
	toggleBtn.type = 'button';
	toggleBtn.className = 'filterable-combobox-toggle';
	toggleBtn.disabled = disabled;
	toggleBtn.setAttribute('aria-label', 'Toggle dropdown');
	toggleBtn.setAttribute('tabindex', '-1');
	toggleBtn.innerHTML = '<span class="filterable-combobox-toggle-icon">▼</span>';

	const dropdown = document.createElement('div');
	dropdown.className = 'filterable-combobox-dropdown';
	dropdown.id = `filterable-combobox-dropdown-${id}`;
	dropdown.setAttribute('role', 'listbox');

	// Loading indicator
	const loadingEl = document.createElement('div');
	loadingEl.className = 'filterable-combobox-loading';
	loadingEl.innerHTML = '<span class="filterable-combobox-spinner"></span>Loading...';
	loadingEl.style.display = 'none';

	inputWrapper.appendChild(input);
	inputWrapper.appendChild(toggleBtn);
	container.appendChild(inputWrapper);
	container.appendChild(dropdown);
	container.appendChild(loadingEl);

	// Set initial display value
	const initialOption = currentOptions.find(opt => opt.value === initialValue);
	if (initialOption) {
		input.value = initialOption.label;
	}

	// Render dropdown options
	function renderOptions() {
		dropdown.innerHTML = '';

		if (filteredOptions.length === 0) {
			const noResults = document.createElement('div');
			noResults.className = 'filterable-combobox-no-results';
			noResults.textContent = 'No matches found';
			dropdown.appendChild(noResults);
			return;
		}

		filteredOptions.forEach((opt, index) => {
			const optionEl = document.createElement('div');
			optionEl.className = 'filterable-combobox-option';
			if (opt.value === selectedValue) {
				optionEl.classList.add('filterable-combobox-option--selected');
			}
			if (index === focusedIndex) {
				optionEl.classList.add('filterable-combobox-option--focused');
			}
			optionEl.setAttribute('role', 'option');
			optionEl.setAttribute('data-value', opt.value);
			optionEl.setAttribute('aria-selected', opt.value === selectedValue);

			// Highlight matching text
			const labelEl = document.createElement('span');
			labelEl.className = 'filterable-combobox-option-text';
			const filterText = input.value.toLowerCase();
			if (filterText && opt.label.toLowerCase().includes(filterText)) {
				const idx = opt.label.toLowerCase().indexOf(filterText);
				const before = opt.label.substring(0, idx);
				const match = opt.label.substring(idx, idx + filterText.length);
				const after = opt.label.substring(idx + filterText.length);
				labelEl.innerHTML = `${escapeHtml(before)}<span class="filterable-combobox-highlight">${escapeHtml(match)}</span>${escapeHtml(after)}`;
			} else {
				labelEl.textContent = opt.label;
			}
			optionEl.appendChild(labelEl);

			// Optional description
			if (opt.description) {
				const descEl = document.createElement('span');
				descEl.className = 'filterable-combobox-option-description';
				descEl.textContent = opt.description;
				optionEl.appendChild(descEl);
			}

			optionEl.addEventListener('click', () => {
				selectOption(opt);
			});

			dropdown.appendChild(optionEl);
		});
	}

	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function filterOptions(filterText) {
		if (!filterText) {
			filteredOptions = [...currentOptions];
		} else {
			const lower = filterText.toLowerCase();
			filteredOptions = currentOptions.filter(opt =>
				opt.label.toLowerCase().includes(lower) ||
				(opt.description && opt.description.toLowerCase().includes(lower))
			);
		}
		focusedIndex = -1;
		renderOptions();
	}

	function openDropdown() {
		if (disabled || readonly) return;
		isOpen = true;
		container.classList.add('filterable-combobox--open');
		input.setAttribute('aria-expanded', 'true');
		filterOptions(input.value);
		// Pre-select current value in dropdown
		const idx = filteredOptions.findIndex(opt => opt.value === selectedValue);
		if (idx >= 0) {
			focusedIndex = idx;
			renderOptions();
			scrollToFocused();
		}
	}

	function closeDropdown() {
		isOpen = false;
		container.classList.remove('filterable-combobox--open');
		input.setAttribute('aria-expanded', 'false');
		focusedIndex = -1;
		// Restore display value if nothing was typed
		const currentOption = currentOptions.find(opt => opt.value === selectedValue);
		if (currentOption && input.value !== currentOption.label) {
			// If user cleared or typed something different without selecting, restore
			if (!currentOptions.some(opt => opt.label.toLowerCase() === input.value.toLowerCase())) {
				input.value = currentOption.label;
			}
		}
	}

	function selectOption(opt) {
		selectedValue = opt.value;
		input.value = opt.label;
		closeDropdown();
		if (onChange) {
			onChange(opt.value, opt);
		}
	}

	function scrollToFocused() {
		const focusedEl = dropdown.querySelector('.filterable-combobox-option--focused');
		if (focusedEl) {
			focusedEl.scrollIntoView({ block: 'nearest' });
		}
	}

	function moveFocus(delta) {
		if (filteredOptions.length === 0) return;
		let newIndex = focusedIndex + delta;
		if (newIndex < 0) newIndex = filteredOptions.length - 1;
		if (newIndex >= filteredOptions.length) newIndex = 0;
		focusedIndex = newIndex;
		renderOptions();
		scrollToFocused();
	}

	// Event handlers
	input.addEventListener('input', () => {
		if (!isOpen) {
			openDropdown();
		}
		filterOptions(input.value);
		if (onInputChange) {
			onInputChange(input.value);
		}
	});

	input.addEventListener('focus', () => {
		// Don't auto-open on focus, wait for user to type or click toggle
	});

	input.addEventListener('blur', (e) => {
		// Delay close to allow click on option
		setTimeout(() => {
			if (!container.contains(document.activeElement)) {
				closeDropdown();
			}
		}, 150);
	});

	input.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!isOpen) {
				openDropdown();
			} else {
				moveFocus(1);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!isOpen) {
				openDropdown();
			} else {
				moveFocus(-1);
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
				selectOption(filteredOptions[focusedIndex]);
			} else if (!isOpen) {
				openDropdown();
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeDropdown();
		} else if (e.key === 'Tab') {
			closeDropdown();
		}
	});

	toggleBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (isOpen) {
			closeDropdown();
		} else {
			openDropdown();
			input.focus();
		}
	});

	// Close on click outside
	document.addEventListener('click', (e) => {
		if (!container.contains(e.target) && isOpen) {
			closeDropdown();
		}
	});

	// Public API
	return {
		element: container,

		/**
		 * Get the currently selected value.
		 */
		getValue: function() {
			return selectedValue;
		},

		/**
		 * Get the input element (for FormModal integration).
		 */
		getInput: function() {
			return input;
		},

		/**
		 * Set the selected value programmatically.
		 */
		setValue: function(value) {
			selectedValue = value;
			const opt = currentOptions.find(o => o.value === value);
			input.value = opt ? opt.label : '';
		},

		/**
		 * Update the available options.
		 */
		setOptions: function(newOptions) {
			currentOptions = [...newOptions];
			filteredOptions = [...newOptions];
			// Update display if selected value is still valid
			const opt = currentOptions.find(o => o.value === selectedValue);
			if (opt) {
				input.value = opt.label;
			}
			if (isOpen) {
				filterOptions(input.value);
			}
		},

		/**
		 * Show or hide loading indicator.
		 */
		setLoading: function(loading) {
			loadingEl.style.display = loading ? 'flex' : 'none';
			dropdown.style.display = loading ? 'none' : '';
		},

		/**
		 * Set error state.
		 */
		setError: function(hasError) {
			if (hasError) {
				input.classList.add('filterable-combobox-input--error');
			} else {
				input.classList.remove('filterable-combobox-input--error');
			}
		},

		/**
		 * Focus the input.
		 */
		focus: function() {
			input.focus();
		}
	};
};
