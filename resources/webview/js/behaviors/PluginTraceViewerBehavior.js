/**
 * Plugin Trace Viewer Behavior
 * Handles all client-side interactions for the Plugin Trace Viewer panel.
 */

window.createBehavior({
	initialize() {
		setupTraceLevelButton();
		setupDetailPanelTabs();
		setupDetailPanelVisibility();
		setupRowSelection();
		initializeDropdowns();
		setupFilterPanel();
	},
	handleMessage(message) {
		// Handle data-driven updates
		if (message.command === 'updateTableData') {
			updateTableData(message.data);
		} else if (message.command === 'updateDropdownState') {
			window.updateDropdownState(message.data.dropdownId, message.data.selectedId);
		} else if (message.command === 'updateDetailPanel') {
			updateDetailPanel(message.data);
		}
	}
});

/**
 * Updates table data without full page refresh.
 * Uses TableRenderer to update tbody only, preserving event listeners.
 *
 * @param {Object} data - Update data containing viewModels and columns
 */
function updateTableData(data) {
	const { viewModels, columns } = data;

	// Get table body
	const tbody = document.querySelector('tbody');
	if (!tbody) {
		console.warn('[PluginTraceViewer] No tbody found for table update');
		return;
	}

	// Render new rows using TableRenderer
	const rowsHtml = window.TableRenderer.renderTableRows(viewModels, columns);

	// Update tbody (preserves event listeners on other elements)
	tbody.innerHTML = rowsHtml;

	// Re-apply search filter if there's a search value
	const searchInput = document.getElementById('searchInput');
	if (searchInput && searchInput.value) {
		// Trigger input event to re-run search filter
		searchInput.dispatchEvent(new Event('input', { bubbles: true }));
	} else {
		// No search active - update footer with full count
		window.TableRenderer.updateTableFooter(viewModels.length);
	}

	// Re-apply row striping (handled by DataTableBehavior)
	const table = document.querySelector('table');
	if (table) {
		const event = new Event('tableUpdated', { bubbles: true });
		table.dispatchEvent(event);
	}
}

/**
 * Updates detail panel without full page refresh.
 * Uses DetailPanelRenderer to update detail section only.
 *
 * @param {Object} data - Detail trace ViewModel
 */
function updateDetailPanel(data) {
	const detailSection = document.querySelector('.detail-section');
	if (!detailSection) {
		console.warn('[PluginTraceViewer] No detail section found for panel update');
		return;
	}

	// Render new detail panel HTML using DetailPanelRenderer
	const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);

	// Update detail section (preserves event listeners on other elements)
	detailSection.innerHTML = detailHtml;

	// Re-apply tab event listeners (tabs are inside detail section)
	setupDetailPanelTabs();
}

/**
 * Sets up the trace level change button handler.
 */
function setupTraceLevelButton() {
	const changeLevelBtn = document.getElementById('changeLevelBtn');
	if (!changeLevelBtn) {
		return;
	}

	changeLevelBtn.addEventListener('click', () => {
		const levels = ['Off', 'Exception', 'All'];
		const currentLevelEl = document.getElementById('currentTraceLevel');
		if (!currentLevelEl) {
			return;
		}

		const currentLevel = currentLevelEl.textContent;
		const currentIndex = levels.indexOf(currentLevel);
		const nextIndex = (currentIndex + 1) % levels.length;
		const nextLevel = levels[nextIndex];

		vscode.postMessage({
			command: 'setTraceLevel',
			data: { level: nextLevel }
		});
	});
}

/**
 * Sets up tab switching in the detail panel.
 */
function setupDetailPanelTabs() {
	const tabButtons = document.querySelectorAll('.tab-btn');

	tabButtons.forEach(btn => {
		btn.addEventListener('click', (e) => {
			const targetTab = e.target.dataset.tab;

			// Update button states
			tabButtons.forEach(b => b.classList.remove('active'));
			e.target.classList.add('active');

			// Update tab content visibility
			document.querySelectorAll('.tab-content').forEach(content => {
				content.classList.remove('active');
			});

			const targetContent = document.getElementById('tab-' + targetTab);
			if (targetContent) {
				targetContent.classList.add('active');
			}
		});
	});
}

/**
 * Listens for show/hide detail panel commands from extension.
 */
function setupDetailPanelVisibility() {
	window.addEventListener('message', event => {
		const message = event.data;
		const detailSection = document.querySelector('.detail-section');

		if (message.command === 'showDetailPanel' && detailSection) {
			detailSection.classList.remove('hidden');
		} else if (message.command === 'hideDetailPanel' && detailSection) {
			detailSection.classList.add('hidden');
			// Clear row selection when closing detail panel
			clearRowSelection();
		} else if (message.command === 'selectRow' && message.traceId) {
			// Find and select the row with the matching trace ID
			selectRowByTraceId(message.traceId);
		}
	});
}

/**
 * Sets up row selection highlighting when viewing trace details.
 */
function setupRowSelection() {
	// Listen for clicks on trace links - use capture phase to run before messaging.js
	document.addEventListener('click', (e) => {
		// Check if clicked element has viewDetail command
		const target = e.target.closest('[data-command="viewDetail"]');
		if (target) {
			// Find the parent row
			const row = target.closest('tr');
			if (row) {
				// Remove selected class from all rows
				clearRowSelection();
				// Add selected class to clicked row
				row.classList.add('selected');
			}
		}

		// Check if clicked element is close button
		const closeBtn = e.target.closest('[data-command="closeDetail"]');
		if (closeBtn) {
			clearRowSelection();
		}
	}, true); // Use capture phase to run before other handlers
}

/**
 * Removes selection highlighting from all table rows.
 */
function clearRowSelection() {
	const rows = document.querySelectorAll('tbody tr');
	rows.forEach(row => row.classList.remove('selected'));
}

/**
 * Selects a row by finding the element with matching trace ID.
 */
function selectRowByTraceId(traceId) {
	// Clear existing selection
	clearRowSelection();

	// Find the link with matching data-trace-id
	const link = document.querySelector(`[data-trace-id="${traceId}"]`);
	if (link) {
		const row = link.closest('tr');
		if (row) {
			row.classList.add('selected');
		}
	}
}

/**
 * Sets up filter panel event listeners for query builder.
 */
function setupFilterPanel() {
	// Filter toggle (expand/collapse)
	const toggleBtn = document.getElementById('filterToggleBtn');
	const filterBody = document.getElementById('filterPanelBody');
	if (toggleBtn && filterBody) {
		toggleBtn.addEventListener('click', () => {
			filterBody.classList.toggle('collapsed');
			const icon = toggleBtn.querySelector('.codicon');
			if (icon) {
				icon.classList.toggle('codicon-chevron-down');
				icon.classList.toggle('codicon-chevron-up');
			}
		});
	}

	// Add condition button
	const addConditionBtn = document.getElementById('addConditionBtn');
	if (addConditionBtn) {
		addConditionBtn.addEventListener('click', () => {
			addConditionRow();
		});
	}

	// Apply filters button
	const applyBtn = document.getElementById('applyFiltersBtn');
	if (applyBtn) {
		applyBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();

			// Collect and send filter criteria
			const filterCriteria = collectFilterCriteria();
			vscode.postMessage({
				command: 'applyFilters',
				data: filterCriteria
			});
		}, true);
	}

	// Clear filters button
	const clearBtn = document.getElementById('clearFiltersBtn');
	if (clearBtn) {
		clearBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();

			// Send clear command
			vscode.postMessage({
				command: 'clearFilters'
			});
		}, true);
	}

	// Set up event delegation for dynamic rows
	const filterConditions = document.getElementById('filterConditions');
	if (filterConditions) {
		// Handle remove button clicks
		filterConditions.addEventListener('click', (e) => {
			const removeBtn = e.target.closest('.remove-condition-btn');
			if (removeBtn) {
				const row = removeBtn.closest('.filter-condition-row');
				if (row) {
					removeConditionRow(row);
				}
			}
		});

		// Handle field dropdown changes - update operators
		filterConditions.addEventListener('change', (e) => {
			if (e.target.classList.contains('condition-field')) {
				updateOperatorsForField(e.target);
			}
		});

		// Enter key in value inputs triggers apply
		filterConditions.addEventListener('keypress', (e) => {
			if (e.target.classList.contains('condition-value') && e.key === 'Enter') {
				e.preventDefault();
				if (applyBtn) {
					applyBtn.click();
				}
			}
		});
	}
}

/**
 * Collects filter criteria from query builder.
 * Returns FilterCriteriaViewModel structure.
 */
function collectFilterCriteria() {
	// Get logical operator
	const logicalOperator = document.querySelector('input[name="logicalOperator"]:checked')?.value || 'and';

	// Collect all condition rows
	const conditionRows = document.querySelectorAll('.filter-condition-row');
	const conditions = Array.from(conditionRows).map(row => {
		const id = row.dataset.conditionId;
		const enabled = row.querySelector('.condition-enabled')?.checked || false;
		const field = row.querySelector('.condition-field')?.value || '';
		const operator = row.querySelector('.condition-operator')?.value || '';
		const value = row.querySelector('.condition-value')?.value || '';

		return { id, enabled, field, operator, value };
	});

	return {
		conditions,
		logicalOperator,
		top: 100
	};
}

/**
 * Adds a new condition row to the query builder.
 */
function addConditionRow() {
	const filterConditions = document.getElementById('filterConditions');
	if (!filterConditions) {
		return;
	}

	// Generate unique ID
	const existingRows = filterConditions.querySelectorAll('.filter-condition-row');
	const nextId = `condition-${existingRows.length}`;

	// Create new row HTML
	const newRowHtml = createConditionRowHtml({
		id: nextId,
		enabled: true,
		field: 'Plugin Name',
		operator: 'Contains',
		value: ''
	});

	// Append to container
	filterConditions.insertAdjacentHTML('beforeend', newRowHtml);
}

/**
 * Removes a condition row from the query builder.
 * Keeps at least one row.
 */
function removeConditionRow(row) {
	const filterConditions = document.getElementById('filterConditions');
	if (!filterConditions) {
		return;
	}

	const allRows = filterConditions.querySelectorAll('.filter-condition-row');

	// Keep at least one row
	if (allRows.length <= 1) {
		return;
	}

	row.remove();
}

/**
 * Updates operators dropdown and value input when field changes.
 * Filters operators based on field type and renders appropriate input.
 */
function updateOperatorsForField(fieldSelect) {
	const row = fieldSelect.closest('.filter-condition-row');
	if (!row) {
		return;
	}

	const operatorSelect = row.querySelector('.condition-operator');
	const valueInput = row.querySelector('.condition-value');
	if (!operatorSelect || !valueInput) {
		return;
	}

	const selectedField = fieldSelect.value;
	const fieldType = getFieldType(selectedField);
	const applicableOperators = getApplicableOperators(selectedField);

	// Rebuild operator options
	operatorSelect.innerHTML = applicableOperators
		.map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`)
		.join('');

	// Update field type on row
	row.setAttribute('data-field-type', fieldType);

	// Replace value input with appropriate type
	const newValueInput = createValueInput(fieldType, selectedField, '');
	valueInput.replaceWith(newValueInput);
}

/**
 * Gets field type for a field name.
 */
function getFieldType(fieldDisplayName) {
	const fieldTypes = {
		'Plugin Name': 'text',
		'Entity Name': 'text',
		'Message Name': 'text',
		'Operation Type': 'enum',
		'Execution Mode': 'enum',
		'Status': 'enum',
		'Created On': 'date',
		'Duration (ms)': 'number'
	};

	return fieldTypes[fieldDisplayName] || 'text';
}

/**
 * Gets applicable operators for a field type.
 */
function getApplicableOperators(fieldDisplayName) {
	// Operator applicability
	const operatorsByType = {
		text: ['Contains', 'Equals', 'Not Equals', 'Starts With', 'Ends With'],
		enum: ['Equals', 'Not Equals'],
		date: ['Equals', 'Greater Than', 'Less Than', 'Greater Than or Equal', 'Less Than or Equal'],
		number: ['Equals', 'Greater Than', 'Less Than', 'Greater Than or Equal', 'Less Than or Equal']
	};

	const fieldType = getFieldType(fieldDisplayName);
	return operatorsByType[fieldType] || operatorsByType.text;
}

/**
 * Creates value input element based on field type.
 */
function createValueInput(fieldType, fieldName, value) {
	switch (fieldType) {
		case 'enum':
			return createEnumInput(fieldName, value);
		case 'date':
			return createDateInput(value);
		case 'number':
			return createNumberInput(fieldName, value);
		case 'text':
		default:
			return createTextInput(value);
	}
}

/**
 * Creates text input element.
 */
function createTextInput(value) {
	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'condition-value';
	input.placeholder = 'Enter value...';
	input.value = value;
	return input;
}

/**
 * Creates enum dropdown element.
 */
function createEnumInput(fieldName, value) {
	const enumOptions = {
		'Operation Type': ['Plugin', 'Workflow'],
		'Execution Mode': ['Synchronous', 'Asynchronous'],
		'Status': ['Success', 'Exception']
	};

	const options = enumOptions[fieldName] || [];

	const select = document.createElement('select');
	select.className = 'condition-value';

	// Add empty option
	const emptyOption = document.createElement('option');
	emptyOption.value = '';
	emptyOption.textContent = 'Select...';
	select.appendChild(emptyOption);

	// Add enum options
	options.forEach(opt => {
		const option = document.createElement('option');
		option.value = opt;
		option.textContent = opt;
		if (opt === value) {
			option.selected = true;
		}
		select.appendChild(option);
	});

	return select;
}

/**
 * Creates date input element.
 */
function createDateInput(value) {
	const input = document.createElement('input');
	input.type = 'datetime-local';
	input.className = 'condition-value';
	input.value = value;
	return input;
}

/**
 * Creates number input element.
 */
function createNumberInput(fieldName, value) {
	const input = document.createElement('input');
	input.type = 'number';
	input.className = 'condition-value';
	input.placeholder = fieldName === 'Duration (ms)' ? 'Duration in ms' : 'Enter number...';
	input.value = value;
	input.min = '0';
	return input;
}

/**
 * Creates HTML for a single condition row.
 */
function createConditionRowHtml(condition) {
	const applicableOperators = getApplicableOperators(condition.field);
	const allFields = ['Plugin Name', 'Entity Name', 'Message Name', 'Operation Type', 'Execution Mode', 'Status', 'Created On', 'Duration (ms)'];
	const fieldType = getFieldType(condition.field);
	const valueInputHtml = createValueInputHtml(fieldType, condition.field, condition.value);

	return `
		<div class="filter-condition-row" data-condition-id="${escapeHtml(condition.id)}" data-field-type="${fieldType}">
			<input
				type="checkbox"
				class="condition-enabled"
				${condition.enabled ? 'checked' : ''}
				title="Enable/Disable this condition"
			/>

			<select class="condition-field">
				${allFields.map(field => `
					<option value="${escapeHtml(field)}" ${field === condition.field ? 'selected' : ''}>
						${escapeHtml(field)}
					</option>
				`).join('')}
			</select>

			<select class="condition-operator">
				${applicableOperators.map(op => `
					<option value="${escapeHtml(op)}" ${op === condition.operator ? 'selected' : ''}>
						${escapeHtml(op)}
					</option>
				`).join('')}
			</select>

			${valueInputHtml}

			<button class="icon-button remove-condition-btn" title="Remove condition">
				<span class="codicon codicon-trash"></span>
			</button>
		</div>
	`;
}

/**
 * Creates HTML string for value input based on field type.
 */
function createValueInputHtml(fieldType, fieldName, value) {
	switch (fieldType) {
		case 'enum':
			return createEnumInputHtml(fieldName, value);
		case 'date':
			return `<input type="datetime-local" class="condition-value" value="${escapeHtml(value)}" />`;
		case 'number':
			const placeholder = fieldName === 'Duration (ms)' ? 'Duration in ms' : 'Enter number...';
			return `<input type="number" class="condition-value" placeholder="${placeholder}" value="${escapeHtml(value)}" min="0" />`;
		case 'text':
		default:
			return `<input type="text" class="condition-value" placeholder="Enter value..." value="${escapeHtml(value)}" />`;
	}
}

/**
 * Creates HTML string for enum dropdown.
 */
function createEnumInputHtml(fieldName, value) {
	const enumOptions = {
		'Operation Type': ['Plugin', 'Workflow'],
		'Execution Mode': ['Synchronous', 'Asynchronous'],
		'Status': ['Success', 'Exception']
	};

	const options = enumOptions[fieldName] || [];

	return `
		<select class="condition-value">
			<option value="">Select...</option>
			${options.map(opt => `
				<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>
					${escapeHtml(opt)}
				</option>
			`).join('')}
		</select>
	`;
}

/**
 * Escapes HTML to prevent XSS.
 */
function escapeHtml(str) {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}
