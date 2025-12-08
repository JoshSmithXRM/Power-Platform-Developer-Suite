import { SqlHighlighter } from '../utils/SqlHighlighter.js';
import { XmlHighlighter } from '../utils/XmlHighlighter.js';

/**
 * Data Explorer Behavior
 * Handles client-side interactions for the Data Explorer panel.
 * Manages SQL/FetchXML editors, previews, and query results.
 */

/** Tracks whether a query is currently executing to prevent queueing. */
let isExecuting = false;

/** Current query mode (sql or fetchxml). */
let currentMode = 'sql';

window.createBehavior({
	initialize() {
		injectHighlightingStyles();
		detectInitialMode();
		setupSqlEditorHighlighting();
		setupFetchXmlEditorHighlighting();
		highlightInitialPreviews();
		wireSqlEditor();
		wireFetchXmlEditor();
		wireExecuteButton();
		wireModeToggle();
		wireWarningModal();
	},
	handleMessage(message) {
		switch (message.command) {
			case 'queryResultsUpdated':
				isExecuting = false;
				setEditorEnabled(true);
				updateQueryResults(message.data);
				break;
			case 'fetchXmlPreviewUpdated':
				updateFetchXmlPreview(message.data.fetchXml);
				break;
			case 'sqlPreviewUpdated':
				updateSqlPreview(message.data.sql, message.data.warnings);
				break;
			case 'queryModeChanged':
				handleModeChange(message.data);
				break;
			case 'queryError':
				isExecuting = false;
				setEditorEnabled(true);
				showQueryError(message.data);
				break;
			case 'parseErrorPreview':
				showParseErrorPreview(message.data);
				break;
			case 'clearError':
				clearError();
				break;
			case 'clearResults':
				clearResults();
				break;
			case 'setLoadingState':
				setLoadingState(message.data.isLoading);
				break;
			case 'queryAborted':
				isExecuting = false;
				setEditorEnabled(true);
				break;
			case 'showWarningModal':
				showWarningModal(message.data);
				break;
			case 'hideWarningModal':
				hideWarningModal();
				break;
			case 'updateSqlEditor':
				updateSqlEditor(message.data.sql);
				break;
			case 'updateFetchXmlEditor':
				updateFetchXmlEditor(message.data.fetchXml);
				break;
		}
	}
});

/**
 * Debounce function to limit how often a function is called.
 */
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Wires up the SQL editor for live FetchXML preview.
 */
function wireSqlEditor() {
	const sqlEditor = document.getElementById('sql-editor');
	if (!sqlEditor) {
		return;
	}

	// Debounced update to avoid excessive messaging
	const debouncedUpdate = debounce((sql) => {
		window.vscode.postMessage({
			command: 'updateSqlQuery',
			data: { sql: sql }
		});
	}, 300);

	sqlEditor.addEventListener('input', (event) => {
		const sql = event.target.value;
		debouncedUpdate(sql);
	});

	// Handle Ctrl+Enter to execute query
	sqlEditor.addEventListener('keydown', (event) => {
		if (event.ctrlKey && event.key === 'Enter') {
			event.preventDefault();
			executeQuery();
		}
	});
}

/**
 * Wires up the execute button click handler.
 */
function wireExecuteButton() {
	// Action button events are handled by messaging.js
	// But we can also support direct button click
	const executeBtn = document.getElementById('executeQuery');
	if (executeBtn) {
		executeBtn.addEventListener('click', executeQuery);
	}
}

/**
 * Executes the current query.
 * Prevents queueing by checking isExecuting flag.
 */
function executeQuery() {
	// Prevent queueing multiple queries
	if (isExecuting) {
		return;
	}

	const sqlEditor = document.getElementById('sql-editor');
	if (!sqlEditor) {
		return;
	}

	const sql = sqlEditor.value.trim();
	if (!sql) {
		return;
	}

	// Mark as executing and disable editor
	isExecuting = true;
	setEditorEnabled(false);

	// Clear any previous error
	clearError();

	// Send SQL directly with execute command (don't rely on debounced update)
	window.vscode.postMessage({
		command: 'executeQuery',
		data: { sql: sql }
	});
}

/**
 * Enables or disables the SQL editor during query execution.
 */
function setEditorEnabled(enabled) {
	const sqlEditor = document.getElementById('sql-editor');
	if (sqlEditor) {
		sqlEditor.disabled = !enabled;
		sqlEditor.classList.toggle('editor-disabled', !enabled);
	}
}

/**
 * Updates the query results table.
 */
function updateQueryResults(data) {
	const container = document.getElementById('results-table-container');
	if (!container) {
		// Create results section if it doesn't exist
		createResultsSection();
		return updateQueryResults(data);
	}

	const { columns, rows, rowLookups, executionTimeMs, totalRecordCount, hasMoreRecords, entityLogicalName } = data;

	// Handle empty results
	if (!rows || rows.length === 0) {
		container.innerHTML = `
			<div class="empty-state">
				<p>No records found</p>
			</div>
		`;
		updateStatusBar(0, executionTimeMs, totalRecordCount, hasMoreRecords);
		return;
	}

	// Determine the primary key column name (entityname + "id")
	const primaryKeyColumn = entityLogicalName ? `${entityLogicalName}id` : null;

	// Build table HTML with search bar
	let tableHtml = `
		<div class="search-container" data-selection-zone="results-search">
			<input type="text" id="resultsSearchInput" placeholder="🔍 Filter results..." />
		</div>
	`;
	tableHtml += '<table class="data-table">';

	// Header
	tableHtml += '<thead><tr>';
	for (const col of columns) {
		tableHtml += `<th data-sort="${escapeHtml(col.name)}">${escapeHtml(col.header)}</th>`;
	}
	tableHtml += '</tr></thead>';

	// Body
	tableHtml += '<tbody>';
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		const row = rows[rowIndex];
		const lookups = rowLookups?.[rowIndex] || {};
		tableHtml += '<tr>';
		for (const col of columns) {
			const value = row[col.name] || '';
			const lookup = lookups[col.name];

			// Check if this is a lookup field (has entityType and id)
			if (lookup && lookup.entityType && lookup.id) {
				// Render as clickable link with copy button
				tableHtml += `<td><span class="record-cell-content">
					<a href="#" class="record-link" data-entity="${escapeHtml(lookup.entityType)}" data-id="${escapeHtml(lookup.id)}" title="Open in browser">${escapeHtml(value)}</a>
					<button class="record-copy-btn" data-entity="${escapeHtml(lookup.entityType)}" data-id="${escapeHtml(lookup.id)}" title="Copy record URL">
						<span class="codicon codicon-copy"></span>
					</button>
				</span></td>`;
			}
			// Check if this is the primary key column (e.g., contactid for contact entity)
			else if (primaryKeyColumn && col.name.toLowerCase() === primaryKeyColumn.toLowerCase() && value && isGuid(value)) {
				// Render primary key as clickable link to the record itself
				tableHtml += `<td><span class="record-cell-content">
					<a href="#" class="record-link" data-entity="${escapeHtml(entityLogicalName)}" data-id="${escapeHtml(value)}" title="Open in browser">${escapeHtml(value)}</a>
					<button class="record-copy-btn" data-entity="${escapeHtml(entityLogicalName)}" data-id="${escapeHtml(value)}" title="Copy record URL">
						<span class="codicon codicon-copy"></span>
					</button>
				</span></td>`;
			} else {
				tableHtml += `<td>${escapeHtml(value)}</td>`;
			}
		}
		tableHtml += '</tr>';
	}
	tableHtml += '</tbody>';

	tableHtml += '</table>';

	container.innerHTML = tableHtml;

	// Update status bar
	updateStatusBar(rows.length, executionTimeMs, totalRecordCount, hasMoreRecords);

	// Apply row striping
	const table = container.querySelector('table');
	if (table) {
		applyRowStriping(table);
		// Wire up sorting for the new table
		wireSorting(table);
		// Wire up record link clicks
		wireRecordLinks(table);
		// Wire up search filter
		wireResultsSearch(table);
		// Initialize cell selection for the dynamically created table
		initializeCellSelection(table, columns, rows);
	}
}

/**
 * Initializes cell selection behavior for the query results table.
 * @param {HTMLTableElement} table - The table element
 * @param {Array} columns - Column definitions from query results
 * @param {Array} rows - Row data from query results
 */
function initializeCellSelection(table, columns, rows) {
	if (!window.CellSelectionBehavior) {
		return;
	}

	// Map columns to the format CellSelectionBehavior expects
	const columnConfig = columns.map(col => ({
		key: col.name,
		header: col.header
	}));

	window.CellSelectionBehavior.attach(table, {
		columns: columnConfig,
		getRowData: (rowIndex) => {
			if (rowIndex < 0 || rowIndex >= rows.length) {
				return null;
			}
			return rows[rowIndex];
		},
		getTotalRowCount: () => rows.length
	});
}

/**
 * Wires up click handlers for record links and copy buttons.
 */
function wireRecordLinks(table) {
	// Wire open record links
	const links = table.querySelectorAll('.record-link');
	links.forEach(link => {
		link.addEventListener('click', (event) => {
			event.preventDefault();
			const entityType = link.getAttribute('data-entity');
			const recordId = link.getAttribute('data-id');
			if (entityType && recordId) {
				window.vscode.postMessage({
					command: 'openRecord',
					data: { entityType, recordId }
				});
			}
		});
	});

	// Wire copy URL buttons
	const copyButtons = table.querySelectorAll('.record-copy-btn');
	copyButtons.forEach(btn => {
		btn.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const entityType = btn.getAttribute('data-entity');
			const recordId = btn.getAttribute('data-id');
			if (entityType && recordId) {
				window.vscode.postMessage({
					command: 'copyRecordUrl',
					data: { entityType, recordId }
				});
			}
		});
	});
}

/**
 * Wires up search filter for results table.
 */
function wireResultsSearch(table) {
	const searchInput = document.getElementById('resultsSearchInput');
	if (!searchInput) {
		return;
	}

	searchInput.addEventListener('input', () => {
		const query = searchInput.value.toLowerCase();
		const rows = table.querySelectorAll('tbody tr');
		const totalCount = rows.length;

		// Filter rows
		rows.forEach(row => {
			const text = row.textContent.toLowerCase();
			if (text.includes(query)) {
				row.style.display = '';
			} else {
				row.style.display = 'none';
			}
		});

		// Re-apply striping to visible rows
		applyRowStriping(table);

		// Update status with filtered count
		const visibleCount = Array.from(rows).filter(row => row.style.display !== 'none').length;
		const resultsCount = document.getElementById('results-count');
		if (resultsCount) {
			if (visibleCount === totalCount) {
				resultsCount.textContent = `${totalCount} rows`;
			} else {
				resultsCount.textContent = `${visibleCount} of ${totalCount} rows`;
			}
		}
	});
}

/**
 * Creates the results section if it doesn't exist.
 */
function createResultsSection() {
	const mainSection = document.querySelector('.main-section');
	if (!mainSection) {
		return;
	}

	// Check if results section already exists
	let resultsSection = document.querySelector('.query-results-section');
	if (!resultsSection) {
		resultsSection = document.createElement('div');
		resultsSection.className = 'query-results-section';
		resultsSection.innerHTML = `
			<div id="results-table-container">
				<div class="empty-state">
					<p>Run a query to see results</p>
				</div>
			</div>
			<div class="results-status-bar">
				<span id="results-count">0 rows</span>
				<span id="execution-time">0ms</span>
			</div>
		`;
		mainSection.appendChild(resultsSection);
	}
}

/**
 * Updates the status bar with query results info.
 */
function updateStatusBar(rowCount, executionTimeMs, totalRecordCount, hasMoreRecords) {
	const countEl = document.getElementById('results-count');
	const timeEl = document.getElementById('execution-time');

	if (countEl) {
		let countText = `${rowCount} row${rowCount !== 1 ? 's' : ''}`;
		if (totalRecordCount && totalRecordCount > rowCount) {
			countText += ` of ${totalRecordCount}`;
		}
		if (hasMoreRecords) {
			countText += ' (more available)';
		}
		countEl.textContent = countText;
	}

	if (timeEl) {
		timeEl.textContent = `${executionTimeMs}ms`;
	}
}

/**
 * Updates the FetchXML preview panel with syntax highlighting.
 */
function updateFetchXmlPreview(fetchXml) {
	const previewContent = document.getElementById('fetchxml-preview-content');
	if (previewContent) {
		if (fetchXml) {
			previewContent.innerHTML = XmlHighlighter.highlight(fetchXml);
		} else {
			previewContent.textContent = '';
		}
	}
}

/**
 * Shows a query error in the UI.
 */
function showQueryError(errorData) {
	const { message, position } = errorData;

	// Create or find error banner
	let errorBanner = document.querySelector('.error-banner');
	const editorContainer = document.querySelector('.editor-container');

	if (!errorBanner && editorContainer) {
		errorBanner = document.createElement('div');
		errorBanner.className = 'error-banner';
		errorBanner.setAttribute('role', 'alert');

		// Insert after SQL editor wrapper
		const sqlWrapper = editorContainer.querySelector('.sql-editor-wrapper');
		if (sqlWrapper && sqlWrapper.nextSibling) {
			editorContainer.insertBefore(errorBanner, sqlWrapper.nextSibling);
		} else {
			editorContainer.appendChild(errorBanner);
		}
	}

	if (errorBanner) {
		let positionText = '';
		if (position) {
			positionText = ` at line ${position.line}, column ${position.column}`;
		}

		errorBanner.innerHTML = `
			<span class="error-icon">\u26A0\uFE0F</span>
			<span class="error-text">${escapeHtml(message)}${positionText}</span>
		`;
		errorBanner.style.display = 'flex';
	}

	// Clear results
	clearResults();
}

/**
 * Shows a parse error preview (non-blocking, during typing).
 */
function showParseErrorPreview(errorData) {
	// For preview errors, we just update the FetchXML preview to show the error
	const previewContent = document.getElementById('fetchxml-preview-content');
	if (previewContent) {
		previewContent.textContent = `Parse error: ${errorData.message}`;
	}
}

/**
 * Clears any displayed error.
 */
function clearError() {
	const errorBanner = document.querySelector('.error-banner');
	if (errorBanner) {
		errorBanner.style.display = 'none';
	}
}

/**
 * Clears the results table.
 */
function clearResults() {
	const container = document.getElementById('results-table-container');
	if (container) {
		container.innerHTML = `
			<div class="empty-state">
				<p>Run a query to see results</p>
			</div>
		`;
	}

	// Reset status bar
	const countEl = document.getElementById('results-count');
	const timeEl = document.getElementById('execution-time');
	if (countEl) countEl.textContent = '0 rows';
	if (timeEl) timeEl.textContent = '0ms';
}

/**
 * Sets the loading state for the results section.
 */
function setLoadingState(isLoading) {
	const container = document.getElementById('results-table-container');
	if (!container) {
		return;
	}

	// Remove existing loading overlay
	const existingOverlay = container.querySelector('.loading-overlay');
	if (existingOverlay) {
		existingOverlay.remove();
	}

	if (isLoading) {
		const overlay = document.createElement('div');
		overlay.className = 'loading-overlay';
		overlay.innerHTML = '<div class="loading-spinner"></div>';
		container.style.position = 'relative';
		container.appendChild(overlay);
	}
}

/**
 * Applies striping classes to visible table rows.
 */
function applyRowStriping(tableElement) {
	const tbody = tableElement.querySelector('tbody');
	if (!tbody) {
		return;
	}

	const rows = tbody.querySelectorAll('tr');
	rows.forEach((row, index) => {
		row.classList.remove('row-even', 'row-odd');
		row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
	});
}

/**
 * Sorts table rows by column (client-side).
 */
function sortTable(table, column, direction) {
	const tbody = table.querySelector('tbody');
	if (!tbody) {
		return;
	}

	const rows = Array.from(tbody.querySelectorAll('tr'));
	const headers = Array.from(table.querySelectorAll('th[data-sort]'));
	const columnIndex = headers.findIndex(h => h.getAttribute('data-sort') === column);

	if (columnIndex === -1) {
		return;
	}

	rows.sort((a, b) => {
		const aCell = a.querySelectorAll('td')[columnIndex];
		const bCell = b.querySelectorAll('td')[columnIndex];

		if (!aCell || !bCell) {
			return 0;
		}

		const aText = aCell.textContent.trim();
		const bText = bCell.textContent.trim();

		if (!aText && !bText) return 0;
		if (!aText) return 1;
		if (!bText) return -1;

		const comparison = aText.localeCompare(bText);
		return direction === 'asc' ? comparison : -comparison;
	});

	rows.forEach(row => tbody.appendChild(row));

	// Update sort indicators
	headers.forEach(h => {
		h.textContent = h.textContent.replace(/ [▲▼]$/, '');
		if (h.getAttribute('data-sort') === column) {
			h.textContent += direction === 'asc' ? ' ▲' : ' ▼';
		}
	});

	applyRowStriping(table);
}

/**
 * Wires up column sorting for a table.
 */
function wireSorting(table) {
	let currentColumn = null;
	let currentDirection = 'asc';

	const headers = table.querySelectorAll('th[data-sort]');

	headers.forEach(header => {
		// Remove existing listeners by cloning
		const newHeader = header.cloneNode(true);
		header.parentNode.replaceChild(newHeader, header);

		newHeader.addEventListener('click', () => {
			const column = newHeader.getAttribute('data-sort');

			if (currentColumn === column) {
				currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
			} else {
				currentColumn = column;
				currentDirection = 'asc';
			}

			sortTable(table, currentColumn, currentDirection);
		});
	});
}

/**
 * Injects CSS styles for syntax highlighting.
 */
function injectHighlightingStyles() {
	const styleId = 'syntax-highlighting-styles';
	if (document.getElementById(styleId)) {
		return;
	}

	const style = document.createElement('style');
	style.id = styleId;
	style.textContent = `
		${SqlHighlighter.getStyles()}
		${XmlHighlighter.getStyles()}

		/* SQL Editor with highlighting overlay */
		.sql-editor-container {
			position: relative;
			width: 100%;
		}

		.sql-editor-highlight {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			padding: 12px;
			margin: 0;
			font-family: var(--vscode-editor-font-family);
			font-size: 13px;
			line-height: 1.5;
			white-space: pre-wrap;
			word-wrap: break-word;
			overflow: hidden;
			pointer-events: none;
			border: 1px solid transparent;
			border-radius: 4px;
			box-sizing: border-box;
			background: transparent;
			color: transparent;
		}

		.sql-editor-container .sql-editor {
			position: relative;
			background: transparent;
			caret-color: var(--vscode-editor-foreground);
			color: transparent;
			z-index: 1;
		}

		.sql-editor-container .sql-editor::selection {
			background: var(--vscode-editor-selectionBackground);
		}

		/* Make highlight layer visible */
		.sql-editor-highlight {
			color: inherit;
			background: var(--vscode-input-background);
			z-index: 0;
		}
	`;
	document.head.appendChild(style);
}

/**
 * Sets up the SQL editor with syntax highlighting overlay.
 */
function setupSqlEditorHighlighting() {
	const sqlEditor = document.getElementById('sql-editor');
	if (!sqlEditor) {
		return;
	}

	// Check if already set up
	if (sqlEditor.parentElement.classList.contains('sql-editor-container')) {
		return;
	}

	// Wrap the textarea in a container
	const container = document.createElement('div');
	container.className = 'sql-editor-container';

	// Create the highlight overlay
	const highlightLayer = document.createElement('pre');
	highlightLayer.className = 'sql-editor-highlight';
	highlightLayer.setAttribute('aria-hidden', 'true');

	// Insert container and move textarea into it
	sqlEditor.parentNode.insertBefore(container, sqlEditor);
	container.appendChild(highlightLayer);
	container.appendChild(sqlEditor);

	// Initial highlight
	updateSqlHighlighting(sqlEditor.value);

	// Update highlighting on input
	sqlEditor.addEventListener('input', () => {
		updateSqlHighlighting(sqlEditor.value);
	});

	// Sync scroll position
	sqlEditor.addEventListener('scroll', () => {
		highlightLayer.scrollTop = sqlEditor.scrollTop;
		highlightLayer.scrollLeft = sqlEditor.scrollLeft;
	});
}

/**
 * Updates the SQL highlighting layer.
 */
function updateSqlHighlighting(sql) {
	const highlightLayer = document.querySelector('.sql-editor-highlight');
	if (!highlightLayer) {
		return;
	}

	if (sql) {
		// Add a space at the end to ensure the highlight layer matches textarea height
		highlightLayer.innerHTML = SqlHighlighter.highlight(sql) + '\n';
	} else {
		highlightLayer.innerHTML = '';
	}
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(str) {
	if (str === null || str === undefined) {
		return '';
	}
	const text = String(str);
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Checks if a string is a valid GUID format.
 */
function isGuid(str) {
	if (typeof str !== 'string') {
		return false;
	}
	const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return guidPattern.test(str);
}

// ============================================
// WARNING MODAL FUNCTIONS
// ============================================

/**
 * Wires up the warning modal button handlers.
 * Uses data-action attributes on buttons to avoid storing state.
 */
function wireWarningModal() {
	const modal = document.getElementById('warning-modal');
	if (!modal) {
		return;
	}

	const cancelBtn = document.getElementById('modal-btn-cancel');
	const secondaryBtn = document.getElementById('modal-btn-secondary');
	const primaryBtn = document.getElementById('modal-btn-primary');

	// Cancel button always closes modal with 'cancel' action
	if (cancelBtn) {
		cancelBtn.addEventListener('click', () => {
			sendModalResponse('cancel');
		});
	}

	// Secondary button reads action from data attribute
	if (secondaryBtn) {
		secondaryBtn.addEventListener('click', () => {
			const action = secondaryBtn.dataset.action;
			if (action) {
				sendModalResponse(action);
			}
		});
	}

	// Primary button reads action from data attribute
	if (primaryBtn) {
		primaryBtn.addEventListener('click', () => {
			const action = primaryBtn.dataset.action;
			if (action) {
				sendModalResponse(action);
			}
		});
	}

	// Close on Escape key
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && modal.classList.contains('visible')) {
			sendModalResponse('cancel');
		}
	});

	// Close on overlay click (outside dialog)
	modal.addEventListener('click', (event) => {
		if (event.target === modal) {
			sendModalResponse('cancel');
		}
	});
}

/**
 * Shows the warning modal with the given configuration.
 * Sets data-action attributes on buttons for stateless response handling.
 * @param {Object} config - Modal configuration
 * @param {string} config.message - The warning message to display
 * @param {string} config.primaryLabel - Label for primary button
 * @param {string} config.primaryAction - Action identifier for primary button
 * @param {string} config.secondaryLabel - Label for secondary button
 * @param {string} config.secondaryAction - Action identifier for secondary button
 */
function showWarningModal(config) {
	const modal = document.getElementById('warning-modal');
	const messageEl = document.getElementById('modal-message');
	const primaryBtn = document.getElementById('modal-btn-primary');
	const secondaryBtn = document.getElementById('modal-btn-secondary');

	if (!modal || !messageEl) {
		// Modal not found, send cancel response
		sendModalResponse('cancel');
		return;
	}

	// Set message
	messageEl.textContent = config.message;

	// Set button labels and data-action attributes (stateless approach)
	if (primaryBtn) {
		primaryBtn.textContent = config.primaryLabel || 'OK';
		primaryBtn.dataset.action = config.primaryAction || '';
		primaryBtn.style.display = config.primaryLabel ? 'block' : 'none';
	}

	if (secondaryBtn) {
		secondaryBtn.textContent = config.secondaryLabel || '';
		secondaryBtn.dataset.action = config.secondaryAction || '';
		secondaryBtn.style.display = config.secondaryLabel ? 'block' : 'none';
	}

	// Show modal
	modal.classList.add('visible');

	// Focus primary button for keyboard accessibility
	if (primaryBtn && config.primaryLabel) {
		primaryBtn.focus();
	}
}

/**
 * Hides the warning modal.
 */
function hideWarningModal() {
	const modal = document.getElementById('warning-modal');
	if (modal) {
		modal.classList.remove('visible');
	}
}

/**
 * Sends the modal response back to the extension.
 * @param {string} action - The action taken (cancel, primary action, or secondary action)
 */
function sendModalResponse(action) {
	hideWarningModal();

	window.vscode.postMessage({
		command: 'warningModalResponse',
		data: { action }
	});
}

/**
 * Updates the SQL editor content (e.g., after adding TOP clause).
 * @param {string} sql - The new SQL content
 */
function updateSqlEditor(sql) {
	const sqlEditor = document.getElementById('sql-editor');
	if (sqlEditor) {
		sqlEditor.value = sql;
		// Trigger input event to update highlighting
		sqlEditor.dispatchEvent(new Event('input'));
	}
}

// ============================================
// MODE TOGGLE FUNCTIONS
// ============================================

/**
 * Detects the initial mode from the DOM.
 */
function detectInitialMode() {
	const sqlTab = document.getElementById('mode-sql');
	const fetchXmlTab = document.getElementById('mode-fetchxml');

	if (fetchXmlTab && fetchXmlTab.classList.contains('active')) {
		currentMode = 'fetchxml';
	} else if (sqlTab && sqlTab.classList.contains('active')) {
		currentMode = 'sql';
	}
}

/**
 * Wires up the mode toggle buttons.
 */
function wireModeToggle() {
	const sqlTab = document.getElementById('mode-sql');
	const fetchXmlTab = document.getElementById('mode-fetchxml');

	if (sqlTab) {
		sqlTab.addEventListener('click', () => {
			if (currentMode !== 'sql') {
				switchMode('sql');
			}
		});
	}

	if (fetchXmlTab) {
		fetchXmlTab.addEventListener('click', () => {
			if (currentMode !== 'fetchxml') {
				switchMode('fetchxml');
			}
		});
	}
}

/**
 * Switches to a new mode and notifies the extension.
 * @param {string} mode - The mode to switch to ('sql' or 'fetchxml')
 */
function switchMode(mode) {
	currentMode = mode;

	// Update tab active state
	const sqlTab = document.getElementById('mode-sql');
	const fetchXmlTab = document.getElementById('mode-fetchxml');

	if (sqlTab) {
		sqlTab.classList.toggle('active', mode === 'sql');
		sqlTab.setAttribute('aria-selected', mode === 'sql');
	}
	if (fetchXmlTab) {
		fetchXmlTab.classList.toggle('active', mode === 'fetchxml');
		fetchXmlTab.setAttribute('aria-selected', mode === 'fetchxml');
	}

	// Notify extension about mode change
	window.vscode.postMessage({
		command: 'switchQueryMode',
		data: { mode }
	});
}

/**
 * Handles mode change from extension (e.g., when restoring state).
 * @param {Object} data - Mode change data
 * @param {string} data.mode - The new mode
 * @param {string} data.sql - SQL content
 * @param {string} data.fetchXml - FetchXML content
 * @param {Array} data.transpilationWarnings - Warnings from FetchXML to SQL transpilation
 */
function handleModeChange(data) {
	currentMode = data.mode;

	// Update tab active state
	const sqlTab = document.getElementById('mode-sql');
	const fetchXmlTab = document.getElementById('mode-fetchxml');
	const sqlPanel = document.getElementById('sql-editor-panel');
	const fetchXmlPanel = document.getElementById('fetchxml-editor-panel');

	if (sqlTab) {
		sqlTab.classList.toggle('active', data.mode === 'sql');
		sqlTab.setAttribute('aria-selected', data.mode === 'sql');
	}
	if (fetchXmlTab) {
		fetchXmlTab.classList.toggle('active', data.mode === 'fetchxml');
		fetchXmlTab.setAttribute('aria-selected', data.mode === 'fetchxml');
	}

	// Show/hide panels
	if (sqlPanel) {
		sqlPanel.hidden = data.mode !== 'sql';
	}
	if (fetchXmlPanel) {
		fetchXmlPanel.hidden = data.mode !== 'fetchxml';
	}

	// Update editor content based on mode
	if (data.mode === 'sql') {
		updateSqlEditor(data.sql || '');
		updateFetchXmlPreview(data.fetchXml || '');
	} else {
		updateFetchXmlEditor(data.fetchXml || '');
		updateSqlPreview(data.sql || '', data.transpilationWarnings || []);
	}

	// Re-setup highlighting for new elements
	setupSqlEditorHighlighting();
	setupFetchXmlEditorHighlighting();
}

// ============================================
// FETCHXML EDITOR FUNCTIONS
// ============================================

/**
 * Wires up the FetchXML editor for live SQL preview.
 */
function wireFetchXmlEditor() {
	const fetchXmlEditor = document.getElementById('fetchxml-editor');
	if (!fetchXmlEditor) {
		return;
	}

	// Debounced update to avoid excessive messaging
	const debouncedUpdate = debounce((fetchXml) => {
		window.vscode.postMessage({
			command: 'updateFetchXmlQuery',
			data: { fetchXml }
		});
	}, 300);

	fetchXmlEditor.addEventListener('input', (event) => {
		const fetchXml = event.target.value;
		debouncedUpdate(fetchXml);
	});

	// Handle Ctrl+Enter to execute query
	fetchXmlEditor.addEventListener('keydown', (event) => {
		if (event.ctrlKey && event.key === 'Enter') {
			event.preventDefault();
			executeQuery();
		}
	});
}

/**
 * Sets up FetchXML editor with syntax highlighting overlay.
 */
function setupFetchXmlEditorHighlighting() {
	const fetchXmlEditor = document.getElementById('fetchxml-editor');
	if (!fetchXmlEditor) {
		return;
	}

	// Check if already set up
	if (fetchXmlEditor.parentElement.classList.contains('fetchxml-editor-container')) {
		return;
	}

	// Wrap the textarea in a container
	const container = document.createElement('div');
	container.className = 'fetchxml-editor-container';

	// Create the highlight overlay
	const highlightLayer = document.createElement('pre');
	highlightLayer.className = 'fetchxml-editor-highlight';
	highlightLayer.setAttribute('aria-hidden', 'true');

	// Insert container and move textarea into it
	fetchXmlEditor.parentNode.insertBefore(container, fetchXmlEditor);
	container.appendChild(highlightLayer);
	container.appendChild(fetchXmlEditor);

	// Initial highlight
	updateFetchXmlHighlighting(fetchXmlEditor.value);

	// Update highlighting on input
	fetchXmlEditor.addEventListener('input', () => {
		updateFetchXmlHighlighting(fetchXmlEditor.value);
	});

	// Sync scroll position
	fetchXmlEditor.addEventListener('scroll', () => {
		highlightLayer.scrollTop = fetchXmlEditor.scrollTop;
		highlightLayer.scrollLeft = fetchXmlEditor.scrollLeft;
	});
}

/**
 * Highlights any preview content that was rendered server-side.
 * Called on page load to ensure syntax highlighting is applied immediately.
 */
function highlightInitialPreviews() {
	// Highlight FetchXML preview if it has content
	const fetchXmlPreview = document.getElementById('fetchxml-preview-content');
	if (fetchXmlPreview && fetchXmlPreview.textContent.trim()) {
		fetchXmlPreview.innerHTML = XmlHighlighter.highlight(fetchXmlPreview.textContent);
	}

	// Highlight SQL preview if it has content
	const sqlPreview = document.getElementById('sql-preview-content');
	if (sqlPreview && sqlPreview.textContent.trim()) {
		sqlPreview.innerHTML = SqlHighlighter.highlight(sqlPreview.textContent);
	}
}

/**
 * Updates the FetchXML highlighting layer.
 * @param {string} fetchXml - The FetchXML content to highlight
 */
function updateFetchXmlHighlighting(fetchXml) {
	const highlightLayer = document.querySelector('.fetchxml-editor-highlight');
	if (!highlightLayer) {
		return;
	}

	if (fetchXml) {
		// Add a space at the end to ensure the highlight layer matches textarea height
		highlightLayer.innerHTML = XmlHighlighter.highlight(fetchXml) + '\n';
	} else {
		highlightLayer.innerHTML = '';
	}
}

/**
 * Updates the FetchXML editor content.
 * @param {string} fetchXml - The new FetchXML content
 */
function updateFetchXmlEditor(fetchXml) {
	const fetchXmlEditor = document.getElementById('fetchxml-editor');
	if (fetchXmlEditor) {
		fetchXmlEditor.value = fetchXml;
		// Trigger input event to update highlighting
		fetchXmlEditor.dispatchEvent(new Event('input'));
	}
}

/**
 * Updates the SQL preview panel (in FetchXML mode) with syntax highlighting.
 * @param {string} sql - The SQL content
 * @param {Array} warnings - Transpilation warnings
 */
function updateSqlPreview(sql, warnings) {
	const previewContent = document.getElementById('sql-preview-content');
	if (previewContent) {
		if (sql) {
			previewContent.innerHTML = SqlHighlighter.highlight(sql);
		} else {
			previewContent.textContent = '';
		}
	}

	// Update warnings banner
	updateWarningsBanner(warnings);
}

/**
 * Updates the transpilation warnings banner.
 * @param {Array} warnings - Array of warning objects with message and feature properties
 */
function updateWarningsBanner(warnings) {
	const warningsContainer = document.getElementById('transpilation-warnings');

	if (!warningsContainer) {
		// Create warnings container if it doesn't exist and we have warnings
		if (warnings && warnings.length > 0) {
			createWarningsBanner(warnings);
		}
		return;
	}

	if (!warnings || warnings.length === 0) {
		warningsContainer.style.display = 'none';
		return;
	}

	// Update warnings content
	const listElement = warningsContainer.querySelector('.warnings-list');
	if (listElement) {
		listElement.innerHTML = warnings.map(w =>
			`<li><strong>${escapeHtml(w.feature)}:</strong> ${escapeHtml(w.message)}</li>`
		).join('');
	}
	warningsContainer.style.display = 'block';
}

/**
 * Creates a new warnings banner and inserts it into the DOM.
 * @param {Array} warnings - Array of warning objects
 */
function createWarningsBanner(warnings) {
	const fetchXmlPanel = document.getElementById('fetchxml-editor-panel');
	const sqlPreviewWrapper = fetchXmlPanel?.querySelector('.sql-preview-wrapper');

	if (!sqlPreviewWrapper) {
		return;
	}

	const banner = document.createElement('div');
	banner.className = 'warnings-banner';
	banner.id = 'transpilation-warnings';
	banner.setAttribute('role', 'status');
	banner.innerHTML = `
		<div class="warnings-header">
			<span class="warning-icon">⚠️</span>
			<span class="warning-title">Transpilation Warnings</span>
		</div>
		<ul class="warnings-list">
			${warnings.map(w => `<li><strong>${escapeHtml(w.feature)}:</strong> ${escapeHtml(w.message)}</li>`).join('')}
		</ul>
	`;

	sqlPreviewWrapper.parentNode.insertBefore(banner, sqlPreviewWrapper);
}
