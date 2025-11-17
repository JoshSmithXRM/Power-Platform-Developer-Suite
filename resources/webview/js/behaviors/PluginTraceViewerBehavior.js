/**
 * Plugin Trace Viewer Behavior
 * Handles all client-side interactions for the Plugin Trace Viewer panel.
 */

import { JsonHighlighter } from '../utils/JsonHighlighter.js';
import { renderTimeline } from './TimelineBehavior.js';

// Store current trace data for display
let currentTraceData = null;
let currentRawEntity = null; // Raw entity data from API (not the ViewModel)
let currentTraces = [];
let timelineData = null;

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
		} else if (message.command === 'clearFilterPanel') {
			clearFilterPanel();
		} else if (message.command === 'updateTimeline') {
			updateTimeline(message.data);
		} else if (message.command === 'updateODataPreview') {
			updateODataPreview(message.data.query);
		} else if (message.command === 'updateQuickFilterState') {
			updateQuickFilterState(message.data.quickFilterIds);
		}
	}
});

/**
 * Updates table data without full page refresh.
 * Uses TableRenderer to update tbody only, preserving event listeners.
 *
 * @param {Object} data - Update data containing viewModels, columns, and optional isLoading flag
 */
function updateTableData(data) {
	const { viewModels, columns, isLoading } = data;

	// Store current traces for related traces display
	currentTraces = viewModels || [];

	// Get table body
	const tbody = document.querySelector('tbody');
	if (!tbody) {
		console.warn('[PluginTraceViewer] No tbody found for table update');
		return;
	}

	// Show loading state if still loading
	if (isLoading) {
		// Pass tbody directly to showTableLoading
		window.TableRenderer.showTableLoading(tbody, 'Loading plugin traces...');
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
 * Data-driven architecture:
 * - Receives ViewModel data from extension host
 * - Renders HTML client-side (including empty state)
 * - Single source of truth for all detail panel rendering
 *
 * @param {Object} data - Detail trace ViewModel
 */
function updateDetailPanel(data) {
	const detailSection = document.querySelector('.detail-section');
	if (!detailSection) {
		console.warn('[PluginTraceViewer] No detail section found for panel update');
		return;
	}

	// Store current trace data (ViewModel for display)
	currentTraceData = data.trace;
	// Store raw entity data (actual API values for Raw Data tab)
	currentRawEntity = data.rawEntity;

	// Render detail panel HTML using DetailPanelRenderer
	// DetailPanelRenderer handles both empty state (null trace) and populated state
	const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);

	// Update detail section (preserves event listeners on other elements)
	detailSection.innerHTML = detailHtml;

	// Re-apply tab event listeners if detail panel has content
	if (data.trace) {
		setupDetailPanelTabs();
	}
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

			// Handle special tab activations
			if (targetTab === 'raw') {
				displayRawData();
			} else if (targetTab === 'related' && currentTraceData) {
				displayRelatedTraces(currentTraceData);
			} else if (targetTab === 'timeline' && currentTraceData) {
				displayTimeline(currentTraceData);
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
	// Filter toggle (expand/collapse) - make entire header clickable
	const filterHeader = document.getElementById('filterPanelHeader');
	const toggleBtn = document.getElementById('filterToggleBtn');
	const filterBody = document.getElementById('filterPanelBody');

	if (filterHeader && toggleBtn && filterBody) {
		const toggleCollapse = () => {
			filterBody.classList.toggle('collapsed');
			const icon = toggleBtn.querySelector('.codicon');
			if (icon) {
				icon.classList.toggle('codicon-chevron-down');
				icon.classList.toggle('codicon-chevron-up');
			}
		};

		// Make entire header clickable
		filterHeader.addEventListener('click', toggleCollapse);
	}

	// Add condition button
	const addConditionBtn = document.getElementById('addConditionBtn');
	if (addConditionBtn) {
		addConditionBtn.addEventListener('click', () => {
			addConditionRow();
			updateFilterCount();
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

	// Clear filters button - handled by data-command attribute

	// Set up quick filter checkboxes
	const quickFilterCheckboxes = document.querySelectorAll('.quick-filter-checkbox');
	quickFilterCheckboxes.forEach(checkbox => {
		checkbox.addEventListener('change', () => {
			// Auto-apply filters when checkbox changes
			if (applyBtn) {
				applyBtn.click();
			}
		});
	});

	// Set up OData query copy button
	const copyODataBtn = document.getElementById('copyODataQueryBtn');
	if (copyODataBtn) {
		copyODataBtn.addEventListener('click', (e) => {
			e.preventDefault();
			copyODataQueryToClipboard();
		});
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
			// Update count when checkbox or any field changes
			if (e.target.classList.contains('condition-enabled')) {
				updateFilterCount();
			}
		});

		// Update count when value inputs change
		filterConditions.addEventListener('input', (e) => {
			if (e.target.classList.contains('condition-value')) {
				updateFilterCount();
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

	// Initialize filter count on load
	updateFilterCount();
}

/**
 * Collects filter criteria from query builder.
 * Returns FilterCriteriaViewModel structure.
 *
 * Note: Logical operator is at the END of each row (except last),
 * but it logically belongs to the NEXT row for the domain model.
 */
function collectFilterCriteria() {
	// Collect quick filter checkbox states
	const quickFilterCheckboxes = document.querySelectorAll('.quick-filter-checkbox');
	const activeQuickFilters = Array.from(quickFilterCheckboxes)
		.filter(cb => cb.checked)
		.map(cb => cb.dataset.filterId);

	// Collect all advanced condition rows
	const conditionRows = document.querySelectorAll('.filter-condition-row');
	const conditions = Array.from(conditionRows).map((row, index) => {
		const id = row.dataset.conditionId;
		const enabled = row.querySelector('.condition-enabled')?.checked || false;
		const field = row.querySelector('.condition-field')?.value || '';
		const operator = row.querySelector('.condition-operator')?.value || '';
		const value = row.querySelector('.condition-value')?.value || '';

		// Note: Datetime conversion is now handled by presentation layer (TypeScript)
		// - Webview collects raw local datetime: "2025-11-10T16:46"
		// - Presentation layer converts to UTC ISO: "2025-11-11T00:46:00.000Z"
		// - Domain/Storage use canonical UTC ISO format
		// - When rendering, presentation layer converts back to local

		// Get logical operator from PREVIOUS row (since it's at the end of that row)
		let logicalOperator = 'and';
		if (index > 0) {
			const prevRow = conditionRows[index - 1];
			logicalOperator = prevRow?.querySelector('.condition-logical-operator')?.value || 'and';
		}

		return { id, enabled, field, operator, value, logicalOperator };
	});

	return {
		quickFilterIds: activeQuickFilters,
		conditions,
		top: 100
	};
}

/**
 * Copies the OData query text to clipboard.
 */
function copyODataQueryToClipboard() {
	const queryText = document.getElementById('odataQueryText');
	if (!queryText || !queryText.textContent) {
		return;
	}

	navigator.clipboard.writeText(queryText.textContent).then(
		() => {
			// Show success feedback
			const copyBtn = document.getElementById('copyODataQueryBtn');
			if (copyBtn) {
				const originalHtml = copyBtn.innerHTML;
				copyBtn.innerHTML = '<span class="codicon codicon-check"></span> Copied!';
				copyBtn.classList.add('success');

				setTimeout(() => {
					copyBtn.innerHTML = originalHtml;
					copyBtn.classList.remove('success');
				}, 2000);
			}
		},
		(err) => {
			console.error('Failed to copy OData query:', err);
		}
	);
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
	const isFirstRow = existingRows.length === 0;

	// Create new row HTML
	const newRowHtml = createConditionRowHtml({
		id: nextId,
		enabled: true,
		field: 'Plugin Name',
		operator: 'Contains',
		value: '',
		logicalOperator: 'and'
	}, isFirstRow);

	// If there's a previous last row, add operator dropdown to it
	if (existingRows.length > 0) {
		const prevLastRow = existingRows[existingRows.length - 1];
		const placeholder = prevLastRow?.querySelector('.logical-operator-placeholder');
		if (placeholder) {
			placeholder.outerHTML = `
				<select class="condition-logical-operator">
					<option value="and" selected>AND</option>
					<option value="or">OR</option>
				</select>
			`;
		}
	}

	// Append to container
	filterConditions.insertAdjacentHTML('beforeend', newRowHtml);
}

/**
 * Removes a condition row from the query builder.
 */
function removeConditionRow(row) {
	const filterConditions = document.getElementById('filterConditions');
	if (!filterConditions) {
		return;
	}

	row.remove();

	// If the new last row has an operator dropdown, replace it with placeholder
	const allRows = filterConditions.querySelectorAll('.filter-condition-row');
	if (allRows.length > 0) {
		const newLastRow = allRows[allRows.length - 1];
		const operatorDropdown = newLastRow?.querySelector('.condition-logical-operator');
		if (operatorDropdown) {
			operatorDropdown.outerHTML = '<span class="logical-operator-placeholder"></span>';
		}
	}

	updateFilterCount();
}

/**
 * Clears all filter conditions from the filter panel.
 */
function clearFilterPanel() {
	const filterConditions = document.getElementById('filterConditions');
	if (!filterConditions) {
		return;
	}

	// Remove all condition rows
	filterConditions.innerHTML = '';

	// Update count
	updateFilterCount();
}

/**
 * Updates the OData query preview display.
 * @param {string} query - The OData filter query string
 */
function updateODataPreview(query) {
	const queryText = document.getElementById('odataQueryText');
	if (queryText) {
		queryText.textContent = query || 'No filters applied';
	}
}

/**
 * Updates quick filter checkbox states (smart reconstruction after load).
 * @param {string[]} quickFilterIds - Array of quick filter IDs to check
 */
function updateQuickFilterState(quickFilterIds) {
	const checkboxes = document.querySelectorAll('.quick-filter-checkbox');
	checkboxes.forEach(checkbox => {
		const filterId = checkbox.dataset.filterId;
		checkbox.checked = quickFilterIds.includes(filterId);
	});

	// Update filter count after checkbox states change
	updateFilterCount();
}

/**
 * Formats a Date object for datetime-local input.
 */
function formatDateTimeLocal(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts UTC ISO datetime string to local datetime-local format.
 * Used when restoring filter from storage.
 * @param {string} utcIso - UTC ISO string (e.g., "2025-11-11T00:46:00.000Z")
 * @returns {string} Local datetime string (e.g., "2025-11-10T16:46")
 */
function convertUTCToLocalDateTime(utcIso) {
	const date = new Date(utcIso);
	return formatDateTimeLocal(date);
}

/**
 * Updates the filter count display in the header (active / total).
 */
function updateFilterCount() {
	const filterTitle = document.querySelector('.filter-panel-title');
	if (!filterTitle) {
		return;
	}

	// Count checked quick filter checkboxes
	const quickFilterCheckboxes = document.querySelectorAll('.quick-filter-checkbox:checked');
	const quickFilterCount = quickFilterCheckboxes.length;

	// Count enabled advanced filter rows
	const conditionRows = document.querySelectorAll('.filter-condition-row');
	let advancedFilterCount = 0;

	conditionRows.forEach(row => {
		const enabled = row.querySelector('.condition-enabled')?.checked || false;
		if (!enabled) {
			return;
		}

		// Check if operator is null/not null (doesn't require value)
		const operator = row.querySelector('.condition-operator')?.value || '';
		const isNullOperator = operator === 'Is Null' || operator === 'Is Not Null';
		// Equals/Not Equals allow empty string as a valid comparison value
		const allowsEmptyValue = operator === 'Equals' || operator === 'Not Equals';

		// For null operators, just check if enabled
		// For equals/not equals, empty value is valid
		// For other operators, check if value is non-empty
		if (isNullOperator || allowsEmptyValue) {
			advancedFilterCount++;
		} else {
			const value = row.querySelector('.condition-value')?.value || '';
			if (value.trim()) {
				advancedFilterCount++;
			}
		}
	});

	const totalCount = quickFilterCount + advancedFilterCount;
	const activeCount = totalCount; // All counted filters are active (enabled)

	// Update header text
	filterTitle.innerHTML = `
		<span class="codicon codicon-filter"></span>
		Filters (${activeCount} / ${totalCount})
	`;
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
 * @param {Object} condition - The condition data
 * @param {boolean} isLastRow - Whether this is the last row (no operator needed)
 */
function createConditionRowHtml(condition, isLastRow = true) {
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

			${!isLastRow ? `
				<select class="condition-logical-operator">
					<option value="and" ${condition.logicalOperator === 'and' ? 'selected' : ''}>AND</option>
					<option value="or" ${condition.logicalOperator === 'or' ? 'selected' : ''}>OR</option>
				</select>
			` : `
				<span class="logical-operator-placeholder"></span>
			`}

			<button class="icon-button remove-condition-btn" title="Remove condition">×</button>
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
			// Convert UTC ISO format back to local datetime-local format
			// Storage has UTC (e.g., "2025-11-11T00:46:00.000Z")
			// Input needs local (e.g., "2025-11-10T16:46")
			const localValue = value ? convertUTCToLocalDateTime(value) : '';
			return `<input type="datetime-local" class="condition-value" value="${escapeHtml(localValue)}" />`;
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

/**
 * Displays raw trace data with JSON syntax highlighting.
 * Uses currentRawEntity (actual API values), NOT the ViewModel.
 */
function displayRawData() {
	const container = document.getElementById('rawDataDisplay');
	if (!container) {
		console.warn('[PluginTraceViewer] rawDataDisplay container not found');
		return;
	}

	if (!currentRawEntity) {
		console.warn('[PluginTraceViewer] No raw entity data available');
		container.innerHTML = '<div style="padding: 16px; color: var(--vscode-errorForeground);">No raw data available</div>';
		return;
	}

	// Inject JSON highlighter styles if not already present
	if (!document.getElementById('json-highlighter-styles')) {
		const styleTag = document.createElement('style');
		styleTag.id = 'json-highlighter-styles';
		styleTag.textContent = JsonHighlighter.getStyles();
		document.head.appendChild(styleTag);
	}

	// Render syntax-highlighted JSON from raw entity (actual API values)
	container.innerHTML = JsonHighlighter.highlight(currentRawEntity);
}

/**
 * Displays related traces by correlation ID.
 * @param {Object} currentTrace - The current trace view model
 */
function displayRelatedTraces(currentTrace) {
	const container = document.getElementById('relatedTracesContainer');
	if (!container) {
		console.warn('[PluginTraceViewer] relatedTracesContainer not found');
		return;
	}

	// Filter traces by correlation ID
	const correlationId = currentTrace.correlationId;
	if (!correlationId || correlationId === 'N/A') {
		container.innerHTML = '<div class="related-traces-empty">No correlation ID available for this trace</div>';
		return;
	}

	// Find all traces with matching correlation ID
	const relatedTraces = currentTraces.filter(trace =>
		trace.correlationId === correlationId && trace.id !== currentTrace.id
	);

	if (relatedTraces.length === 0) {
		container.innerHTML = '<div class="related-traces-empty">No other traces found with this correlation ID</div>';
		return;
	}

	// Render related traces list
	const relatedHtml = relatedTraces.map(trace => {
		const statusClass = trace.status.toLowerCase().includes('exception') ? 'exception' : 'success';
		return `
			<div class="related-trace-item"
			     data-command="viewTrace"
			     data-trace-id="${escapeHtml(trace.id)}"
			     style="cursor: pointer;">
				<div class="related-trace-title">
					<span class="status-indicator ${statusClass}"></span>
					${escapeHtml(trace.pluginName)}
				</div>
				<div class="related-trace-meta">
					<span>${escapeHtml(trace.messageName)}</span>
					<span>Depth: ${escapeHtml(trace.depth)}</span>
					<span>${escapeHtml(trace.duration)}</span>
				</div>
			</div>
		`;
	}).join('');

	container.innerHTML = relatedHtml;

	// Add click handlers for related trace navigation
	container.querySelectorAll('.related-trace-item').forEach(item => {
		item.addEventListener('click', () => {
			const traceId = item.dataset.traceId;
			// Send message to extension to select and display this trace
			vscode.postMessage({
				command: 'viewTrace',
				data: { traceId }
			});
		});
	});
}

/**
 * Updates timeline data from extension.
 * @param {Object} data - Timeline view model data
 */
function updateTimeline(data) {
	timelineData = data;

	// If timeline tab is active, render immediately
	const timelineTab = document.querySelector('.tab-btn[data-tab="timeline"]');
	if (timelineTab && timelineTab.classList.contains('active')) {
		displayTimeline(currentTraceData);
	}
}

/**
 * Displays timeline for current trace.
 * @param {Object} currentTrace - Current trace view model
 */
function displayTimeline(currentTrace) {
	const container = document.getElementById('timelineContainer');
	if (!container) {
		console.warn('[PluginTraceViewer] timelineContainer not found');
		return;
	}

	if (!timelineData) {
		// Request timeline data from extension
		vscode.postMessage({
			command: 'loadTimeline',
			data: { correlationId: currentTrace.correlationId }
		});
		container.innerHTML = '<div class="timeline-loading">Loading timeline...</div>';
		return;
	}

	// Render timeline using TimelineBehavior
	renderTimeline(timelineData, 'timelineContainer');
}

/**
 * Helper function to render timeline from data (called by TimelineBehavior).
 * @param {Object} timeline - Timeline view model
 * @returns {string} HTML string
 */
window.renderTimelineFromData = function(timeline) {
	if (!timeline || !timeline.nodes || timeline.nodes.length === 0) {
		return `
			<div class="timeline-empty">
				<p>No timeline data available</p>
				<p class="timeline-empty-hint">Timeline requires traces with correlation ID</p>
			</div>
		`;
	}

	return `
		<div class="timeline-container">
			<div class="timeline-header">
				<h3>Execution Timeline</h3>
				<div class="timeline-meta">
					<span><strong>Correlation ID:</strong> ${escapeHtml(timeline.correlationId)}</span>
					<span><strong>Total Duration:</strong> ${escapeHtml(timeline.totalDuration)}</span>
					<span><strong>Traces:</strong> ${timeline.traceCount}</span>
				</div>
			</div>
			<div class="timeline-content">
				${timeline.nodes.map(node => renderTimelineNode(node)).join('')}
			</div>
			<div class="timeline-legend">
				<div class="timeline-legend-item">
					<div class="timeline-legend-bar timeline-bar-success"></div>
					<span>Success</span>
				</div>
				<div class="timeline-legend-item">
					<div class="timeline-legend-bar timeline-bar-exception"></div>
					<span>Exception</span>
				</div>
			</div>
		</div>
	`;
};

/**
 * Renders a timeline node recursively.
 * @param {Object} node - Timeline node view model
 * @returns {string} HTML string
 */
function renderTimelineNode(node) {
	const statusClass = node.hasException ? 'exception' : 'success';
	const depthClass = `timeline-item-depth-${Math.min(node.depth, 4)}`;
	const hasChildren = node.children && node.children.length > 0;
	const toggleIcon = hasChildren ? '▾' : '';

	return `
		<div class="timeline-item ${depthClass}" data-trace-id="${escapeHtml(node.id)}" data-depth="${node.depth}">
			<div class="timeline-item-header">
				${hasChildren ? `<span class="timeline-toggle">${toggleIcon}</span>` : '<span class="timeline-toggle-spacer"></span>'}
				<span class="timeline-item-title">${escapeHtml(node.pluginName)}</span>
				<span class="timeline-item-message">${escapeHtml(node.messageName)}</span>
				${node.entityName !== 'N/A' ? `<span class="timeline-item-entity">(${escapeHtml(node.entityName)})</span>` : ''}
			</div>
			<div class="timeline-bar-container">
				<div class="timeline-bar timeline-bar-${statusClass}"
				     style="left: ${node.offsetPercent}%; width: ${node.widthPercent}%;"
				     data-trace-id="${escapeHtml(node.id)}">
					<div class="timeline-bar-fill"></div>
				</div>
				<div class="timeline-item-metadata">
					<span class="timeline-time">${escapeHtml(node.time)}</span>
					<span class="timeline-duration">${escapeHtml(node.duration)}</span>
					<span class="timeline-mode-badge">${escapeHtml(node.mode)}</span>
					${node.hasException ? '<span class="timeline-exception-indicator" title="Exception occurred">⚠</span>' : ''}
				</div>
			</div>
			${hasChildren ? `<div class="timeline-children">${node.children.map(child => renderTimelineNode(child)).join('')}</div>` : ''}
		</div>
	`;
}
