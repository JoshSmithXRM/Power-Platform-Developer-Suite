import { SqlHighlighter } from '../utils/SqlHighlighter.js';
import { XmlHighlighter } from '../utils/XmlHighlighter.js';

/**
 * Data Explorer Behavior
 * Handles client-side interactions for the Data Explorer panel.
 * Manages SQL editor, FetchXML preview, and query results.
 */

window.createBehavior({
	initialize() {
		injectHighlightingStyles();
		setupSqlEditorHighlighting();
		wireSqlEditor();
		wireExecuteButton();
	},
	handleMessage(message) {
		switch (message.command) {
			case 'queryResultsUpdated':
				updateQueryResults(message.data);
				break;
			case 'fetchXmlPreviewUpdated':
				updateFetchXmlPreview(message.data.fetchXml);
				break;
			case 'queryError':
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
 */
function executeQuery() {
	const sqlEditor = document.getElementById('sql-editor');
	if (!sqlEditor) {
		return;
	}

	const sql = sqlEditor.value.trim();
	if (!sql) {
		return;
	}

	// Clear any previous error
	clearError();

	// Send SQL directly with execute command (don't rely on debounced update)
	window.vscode.postMessage({
		command: 'executeQuery',
		data: { sql: sql }
	});
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

	const { columns, rows, executionTimeMs, totalRecordCount, hasMoreRecords } = data;

	// Build table HTML
	let tableHtml = '<table class="data-table">';

	// Header
	tableHtml += '<thead><tr>';
	for (const col of columns) {
		tableHtml += `<th data-sort="${escapeHtml(col.name)}">${escapeHtml(col.header)}</th>`;
	}
	tableHtml += '</tr></thead>';

	// Body
	tableHtml += '<tbody>';
	for (const row of rows) {
		tableHtml += '<tr>';
		for (const col of columns) {
			const value = row[col.name] || '';
			tableHtml += `<td>${escapeHtml(value)}</td>`;
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
	}
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
	const { message, errorType, position, context } = errorData;

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
