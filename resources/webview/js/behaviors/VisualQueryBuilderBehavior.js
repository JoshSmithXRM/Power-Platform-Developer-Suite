/**
 * VisualQueryBuilderBehavior.js
 *
 * Webview behavior for the Visual Query Builder panel.
 * Handles entity picker, preview tabs, and copy functionality.
 *
 * NOTE: This file works with messaging.js which provides the vscode API.
 * Do NOT call acquireVsCodeApi() here - it's already called by messaging.js.
 */
import { SqlHighlighter } from '../utils/SqlHighlighter.js';
import { XmlHighlighter } from '../utils/XmlHighlighter.js';

(function () {
	'use strict';

	/**
	 * Sends a message to the extension.
	 * Uses the global postMessage function set up by messaging.js
	 * @param {string} command - The command name
	 * @param {object} data - Additional data to send (wrapped in 'data' property for WebviewMessage format)
	 */
	function postMessage(command, data = {}) {
		// messaging.js sets up window.vscode
		if (window.vscode) {
			// WebviewMessage format: { command, data } - NOT { command, ...data }
			window.vscode.postMessage({ command, data });
		} else {
			console.warn('vscode API not available');
		}
	}

	/**
	 * Initializes the entity picker behavior.
	 */
	function initEntityPicker() {
		const picker = document.getElementById('entity-picker');
		if (!picker) {
			console.warn('Entity picker not found');
			return;
		}

		picker.addEventListener('change', (e) => {
			const selectedEntity = e.target.value;
			console.log('Entity picker change event:', selectedEntity, 'disabled:', picker.disabled);

			// Only send message if picker is enabled and has a real value
			if (!picker.disabled && selectedEntity) {
				console.log('Sending selectEntity message:', selectedEntity);
				postMessage('selectEntity', { entityLogicalName: selectedEntity });
			} else if (!selectedEntity) {
				console.log('Empty selection, sending null');
				postMessage('selectEntity', { entityLogicalName: null });
			}
		});
	}

	/**
	 * Initializes the preview tab switching behavior.
	 */
	function initPreviewTabs() {
		const tabs = document.querySelectorAll('.preview-tab');
		tabs.forEach((tab) => {
			tab.addEventListener('click', () => {
				const targetTab = tab.dataset.previewTab;
				switchPreviewTab(targetTab);
			});
		});
	}

	/**
	 * Switches the active preview tab.
	 * @param {string} tabName - 'fetchxml' or 'sql'
	 */
	function switchPreviewTab(tabName) {
		// Update tab buttons
		const tabs = document.querySelectorAll('.preview-tab');
		tabs.forEach((tab) => {
			const isActive = tab.dataset.previewTab === tabName;
			tab.classList.toggle('active', isActive);
			tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
		});

		// Update panels
		const panels = document.querySelectorAll('.preview-panel');
		panels.forEach((panel) => {
			const panelTab = panel.id.replace('preview-panel-', '');
			const isVisible = panelTab === tabName;
			if (isVisible) {
				panel.removeAttribute('hidden');
			} else {
				panel.setAttribute('hidden', '');
			}
		});
	}

	/**
	 * Initializes the copy buttons for preview content.
	 */
	function initCopyButtons() {
		document.addEventListener('click', (e) => {
			const btn = e.target.closest('.copy-preview-btn');
			if (!btn) return;

			const target = btn.dataset.copyTarget;
			copyPreviewContent(target, btn);
		});
	}

	/**
	 * Copies preview content to clipboard.
	 * @param {string} type - 'fetchxml' or 'sql'
	 * @param {HTMLElement} btn - The button element for feedback
	 */
	async function copyPreviewContent(type, btn) {
		const contentId = type === 'fetchxml' ? 'fetchxml-preview-content' : 'sql-preview-content';
		const contentEl = document.getElementById(contentId);
		if (!contentEl) return;

		const text = contentEl.textContent || '';
		if (!text) return;

		try {
			await navigator.clipboard.writeText(text);
			showCopyFeedback(btn, true);
		} catch (err) {
			console.error('Failed to copy:', err);
			showCopyFeedback(btn, false);
		}
	}

	/**
	 * Shows visual feedback after copy action.
	 * @param {HTMLElement} btn - The button element
	 * @param {boolean} success - Whether the copy succeeded
	 */
	function showCopyFeedback(btn, success) {
		const originalHtml = btn.innerHTML;
		btn.innerHTML = success
			? '<span class="codicon codicon-check"></span>'
			: '<span class="codicon codicon-error"></span>';
		btn.classList.add(success ? 'copy-success' : 'copy-error');

		setTimeout(() => {
			btn.innerHTML = originalHtml;
			btn.classList.remove('copy-success', 'copy-error');
		}, 1500);
	}

	/**
	 * Updates the entity picker with new options.
	 * @param {Array} entities - Array of entity options
	 * @param {string|null} selectedEntity - Currently selected entity
	 */
	function updateEntityPicker(entities, selectedEntity) {
		const picker = document.getElementById('entity-picker');
		if (!picker) {
			console.warn('Entity picker not found for update');
			return;
		}

		console.log('Updating entity picker with', entities?.length || 0, 'entities');

		// Clear existing options
		picker.innerHTML = '';

		// Add placeholder
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = '-- Select an entity --';
		picker.appendChild(placeholder);

		if (!entities || entities.length === 0) {
			return;
		}

		// Group entities
		const standardEntities = entities.filter((e) => !e.isCustomEntity);
		const customEntities = entities.filter((e) => e.isCustomEntity);

		if (standardEntities.length > 0) {
			const group = document.createElement('optgroup');
			group.label = 'Standard Entities';
			standardEntities.forEach((entity) => {
				group.appendChild(createEntityOption(entity, selectedEntity));
			});
			picker.appendChild(group);
		}

		if (customEntities.length > 0) {
			const group = document.createElement('optgroup');
			group.label = 'Custom Entities';
			customEntities.forEach((entity) => {
				group.appendChild(createEntityOption(entity, selectedEntity));
			});
			picker.appendChild(group);
		}

		// Enable the picker
		picker.disabled = false;

		// Hide loading indicator
		const loadingIndicator = document.querySelector('.loading-indicator');
		if (loadingIndicator) {
			loadingIndicator.style.display = 'none';
		}
	}

	/**
	 * Creates an option element for an entity.
	 * @param {object} entity - Entity object with logicalName, displayName, isCustomEntity
	 * @param {string|null} selectedEntity - Currently selected entity
	 * @returns {HTMLOptionElement}
	 */
	function createEntityOption(entity, selectedEntity) {
		const option = document.createElement('option');
		option.value = entity.logicalName;
		option.textContent = `${entity.displayName} (${entity.logicalName})`;
		if (entity.logicalName === selectedEntity) {
			option.selected = true;
		}
		return option;
	}

	/**
	 * Updates the preview content with syntax highlighting.
	 * @param {string} type - 'fetchxml' or 'sql'
	 * @param {string} content - The content to display
	 */
	function updatePreviewContent(type, content) {
		const contentId = type === 'fetchxml' ? 'fetchxml-preview-content' : 'sql-preview-content';
		const panelId = type === 'fetchxml' ? 'preview-panel-fetchxml' : 'preview-panel-sql';

		const contentEl = document.getElementById(contentId);
		const panelEl = document.getElementById(panelId);

		if (contentEl) {
			if (content) {
				// Apply syntax highlighting using shared highlighters
				contentEl.innerHTML = type === 'fetchxml'
					? XmlHighlighter.highlight(content)
					: SqlHighlighter.highlight(content);
			} else {
				contentEl.textContent = '';
			}
		}

		// Show/hide empty state vs content
		if (panelEl) {
			const preEl = panelEl.querySelector('.preview-content');
			const emptyEl = panelEl.querySelector('.preview-empty');
			const copyBtn = panelEl.querySelector('.copy-preview-btn');

			if (content) {
				if (preEl) preEl.style.display = '';
				if (emptyEl) emptyEl.style.display = 'none';
				if (copyBtn) copyBtn.style.display = '';
			} else {
				if (preEl) preEl.style.display = 'none';
				if (emptyEl) emptyEl.style.display = '';
				if (copyBtn) copyBtn.style.display = 'none';
			}
		}
	}

	/**
	 * Sets loading state for the entity picker.
	 * @param {boolean} isLoading
	 */
	function setEntityPickerLoading(isLoading) {
		const picker = document.getElementById('entity-picker');
		const loadingIndicator = document.querySelector('.loading-indicator');

		if (picker) {
			picker.disabled = isLoading;
		}
		if (loadingIndicator) {
			loadingIndicator.style.display = isLoading ? '' : 'none';
		}
	}

	/**
	 * Shows or hides error message.
	 * @param {string|null} message - Error message or null to clear
	 */
	function showError(message) {
		const existingBanner = document.querySelector('.entity-picker-section .error-banner');
		if (existingBanner) {
			existingBanner.remove();
		}

		if (message) {
			const section = document.querySelector('.entity-picker-section');
			if (section) {
				const banner = document.createElement('div');
				banner.className = 'error-banner';
				banner.setAttribute('role', 'alert');
				banner.innerHTML = `
					<span class="error-icon">&#9888;</span>
					<span class="error-text">${escapeHtml(message)}</span>
				`;
				section.appendChild(banner);
			}
		}
	}

	/**
	 * Escapes HTML special characters.
	 * @param {string} text
	 * @returns {string}
	 */
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// ============================================
	// QUERY RESULTS FUNCTIONS
	// ============================================

	/**
	 * Updates the query results table.
	 * @param {object} data - Query results data
	 */
	function updateQueryResults(data) {
		const container = document.getElementById('results-table-container');
		if (!container) {
			console.warn('Results table container not found');
			return;
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
				<input type="text" id="resultsSearchInput" placeholder="Filter results..." />
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
					tableHtml += `<td><span class="record-cell-content">
						<a href="#" class="record-link" data-entity="${escapeHtml(lookup.entityType)}" data-id="${escapeHtml(lookup.id)}" title="Open in browser">${escapeHtml(value)}</a>
						<button class="record-copy-btn" data-entity="${escapeHtml(lookup.entityType)}" data-id="${escapeHtml(lookup.id)}" title="Copy record URL">
							<span class="codicon codicon-copy"></span>
						</button>
					</span></td>`;
				}
				// Check if this is the primary key column
				else if (primaryKeyColumn && col.name.toLowerCase() === primaryKeyColumn.toLowerCase() && value && isGuid(value)) {
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

		// Apply row striping and wire up interactions
		const table = container.querySelector('table');
		if (table) {
			applyRowStriping(table);
			wireSorting(table);
			wireRecordLinks(table);
			wireResultsSearch(table);
			// Initialize cell selection for Excel-style selection and copy
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
	 * Updates the status bar with query results info.
	 * @param {number} rowCount
	 * @param {number} executionTimeMs
	 * @param {number} totalRecordCount
	 * @param {boolean} hasMoreRecords
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
	 * Applies striping classes to visible table rows.
	 * @param {HTMLTableElement} table
	 */
	function applyRowStriping(table) {
		const tbody = table.querySelector('tbody');
		if (!tbody) return;

		const rows = tbody.querySelectorAll('tr');
		rows.forEach((row, index) => {
			row.classList.remove('row-even', 'row-odd');
			row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
		});
	}

	/**
	 * Wires up column sorting for the results table.
	 * @param {HTMLTableElement} table
	 */
	function wireSorting(table) {
		let currentColumn = null;
		let currentDirection = 'asc';

		const headers = table.querySelectorAll('th[data-sort]');
		headers.forEach((header) => {
			header.style.cursor = 'pointer';
			header.addEventListener('click', () => {
				const column = header.getAttribute('data-sort');

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
	 * Sorts table rows by column.
	 * @param {HTMLTableElement} table
	 * @param {string} column
	 * @param {string} direction
	 */
	function sortTable(table, column, direction) {
		const tbody = table.querySelector('tbody');
		if (!tbody) return;

		const rows = Array.from(tbody.querySelectorAll('tr'));
		const headers = Array.from(table.querySelectorAll('th[data-sort]'));
		const columnIndex = headers.findIndex((h) => h.getAttribute('data-sort') === column);

		if (columnIndex === -1) return;

		rows.sort((a, b) => {
			const aCell = a.querySelectorAll('td')[columnIndex];
			const bCell = b.querySelectorAll('td')[columnIndex];

			if (!aCell || !bCell) return 0;

			const aText = aCell.textContent.trim();
			const bText = bCell.textContent.trim();

			if (!aText && !bText) return 0;
			if (!aText) return 1;
			if (!bText) return -1;

			const comparison = aText.localeCompare(bText);
			return direction === 'asc' ? comparison : -comparison;
		});

		rows.forEach((row) => tbody.appendChild(row));

		// Update sort indicators
		headers.forEach((h) => {
			h.textContent = h.textContent.replace(/ [▲▼]$/, '');
			if (h.getAttribute('data-sort') === column) {
				h.textContent += direction === 'asc' ? ' ▲' : ' ▼';
			}
		});

		applyRowStriping(table);
	}

	/**
	 * Wires up click handlers for record links and copy buttons.
	 * @param {HTMLTableElement} table
	 */
	function wireRecordLinks(table) {
		// Wire open record links
		const links = table.querySelectorAll('.record-link');
		links.forEach((link) => {
			link.addEventListener('click', (event) => {
				event.preventDefault();
				const entityType = link.getAttribute('data-entity');
				const recordId = link.getAttribute('data-id');
				if (entityType && recordId) {
					postMessage('openRecord', { entityType, recordId });
				}
			});
		});

		// Wire copy URL buttons
		const copyButtons = table.querySelectorAll('.record-copy-btn');
		copyButtons.forEach((btn) => {
			btn.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const entityType = btn.getAttribute('data-entity');
				const recordId = btn.getAttribute('data-id');
				if (entityType && recordId) {
					postMessage('copyRecordUrl', { entityType, recordId });
				}
			});
		});
	}

	/**
	 * Wires up search filter for results table.
	 * @param {HTMLTableElement} table
	 */
	function wireResultsSearch(table) {
		const searchInput = document.getElementById('resultsSearchInput');
		if (!searchInput) return;

		searchInput.addEventListener('input', () => {
			const query = searchInput.value.toLowerCase();
			const rows = table.querySelectorAll('tbody tr');
			const totalCount = rows.length;

			// Filter rows
			rows.forEach((row) => {
				const text = row.textContent.toLowerCase();
				row.style.display = text.includes(query) ? '' : 'none';
			});

			// Re-apply striping
			applyRowStriping(table);

			// Update status with filtered count
			const visibleCount = Array.from(rows).filter((row) => row.style.display !== 'none').length;
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
	 * Checks if a string is a valid GUID format.
	 * @param {string} str
	 * @returns {boolean}
	 */
	function isGuid(str) {
		if (typeof str !== 'string') return false;
		const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return guidPattern.test(str);
	}

	/**
	 * Shows a query error in the results area.
	 * @param {object} errorData
	 */
	function showQueryError(errorData) {
		const { message, position } = errorData;
		const container = document.getElementById('results-table-container');
		if (!container) return;

		// Build position text safely - escape individual values for CodeQL data flow analysis
		let positionText = '';
		if (position && typeof position.line === 'number' && typeof position.column === 'number') {
			const lineEscaped = escapeHtml(String(position.line));
			const columnEscaped = escapeHtml(String(position.column));
			positionText = ` at line ${lineEscaped}, column ${columnEscaped}`;
		}

		container.innerHTML = `
			<div class="error-state">
				<div class="error-banner" role="alert">
					<span class="error-icon">&#9888;</span>
					<span class="error-text">${escapeHtml(message)}${positionText}</span>
				</div>
			</div>
		`;

		// Reset status bar
		const countEl = document.getElementById('results-count');
		const timeEl = document.getElementById('execution-time');
		if (countEl) countEl.textContent = '0 rows';
		if (timeEl) timeEl.textContent = '0ms';
	}

	/**
	 * Clears the results table.
	 */
	function clearResults() {
		const container = document.getElementById('results-table-container');
		if (container) {
			container.innerHTML = `
				<div class="empty-state">
					<p>Select an entity and run a query to see results</p>
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
	 * @param {boolean} isLoading
	 */
	function setResultsLoadingState(isLoading) {
		const container = document.getElementById('results-table-container');
		if (!container) return;

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
	 * Handles messages from the extension.
	 * VS Code webview messages come from the extension host with no origin.
	 * @param {MessageEvent} event
	 */
	function handleMessage(event) {
		// VS Code webview security: messages from extension host have empty origin,
		// messages from webview context have vscode-webview:// scheme
		const origin = event.origin || '';
		if (origin !== '' && !origin.startsWith('vscode-webview://')) {
			console.warn('Rejected message from untrusted origin:', event.origin);
			return;
		}

		const message = event.data;
		if (!message || typeof message.command !== 'string') return;

		console.log('VisualQueryBuilder received message:', message.command);

		switch (message.command) {
			case 'entitiesLoaded':
				console.log('Processing entitiesLoaded:', message.data?.entities?.length || 0, 'entities');
				updateEntityPicker(message.data?.entities, message.data?.selectedEntity);
				setEntityPickerLoading(false);
				break;

			case 'entitySelected':
				// Update picker if needed (for programmatic selection)
				const picker = document.getElementById('entity-picker');
				if (picker && message.data?.entityLogicalName !== undefined) {
					picker.value = message.data.entityLogicalName || '';
				}
				break;

			case 'queryPreviewUpdated':
				if (message.data?.fetchXml !== undefined) {
					updatePreviewContent('fetchxml', message.data.fetchXml);
				}
				if (message.data?.sql !== undefined) {
					updatePreviewContent('sql', message.data.sql);
				}
				break;

			case 'setLoadingEntities':
				setEntityPickerLoading(message.data?.isLoading ?? false);
				break;

			// Column picker messages
			case 'attributesLoaded':
				updateColumnPicker(message.data?.columns, message.data?.isSelectAll ?? true);
				updateSortDropdownOptions(message.data?.columns ?? []);
				setColumnPickerLoading(false);
				break;

			case 'setLoadingColumns':
				setColumnPickerLoading(message.data?.isLoading ?? false);
				break;

			case 'showError':
				showError(message.data?.message ?? null);
				break;

			case 'clearError':
				showError(null);
				break;

			// NOTE: queryResultsUpdated is handled by DataExplorerBehavior with virtual scrolling
			// Do NOT handle it here - VisualQueryBuilderBehavior was building full HTML tables
			// for ALL rows which caused massive memory usage with large datasets

			case 'queryError':
				showQueryError(message.data);
				break;

			case 'clearResults':
				clearResults();
				break;

			case 'setLoadingState':
				setResultsLoadingState(message.data?.isLoading ?? false);
				setExecuteButtonLoading(message.data?.isLoading ?? false);
				break;

			case 'queryAborted':
				// Query was cancelled, nothing special to do
				break;

			// Filter section messages
			case 'filtersUpdated':
				// Show filter section and update filter list
				setFilterSectionVisible(true);
				updateFilterConditions(
					message.data?.filterConditions ?? [],
					message.data?.availableColumns ?? []
				);
				updateFilterCountBadge(message.data?.filterCount ?? 0);
				// Also show sort and query options when filters are shown
				setSortSectionVisible(true);
				setQueryOptionsSectionVisible(true);
				break;

			// Sort section messages
			case 'sortUpdated':
				updateSortUI(message.data);
				break;

			// Query options messages
			case 'queryOptionsUpdated':
				updateQueryOptionsUI(message.data);
				break;

			// Query cleared - reset UI elements
			case 'queryCleared':
				handleQueryClearedUI(message.data);
				break;
		}
	}

	/**
	 * Handles UI updates when query is cleared.
	 * Resets column picker, filters, sort, options, and results.
	 * @param {Object} data - Clear data { columns, isSelectAll }
	 */
	function handleQueryClearedUI(data) {
		// Reset column picker
		updateColumnPicker(data?.columns ?? [], data?.isSelectAll ?? true);

		// Reset filter count badge
		updateFilterCountBadge(0);

		// Reset filter list to empty state
		const filterList = document.getElementById('filter-conditions-list');
		if (filterList) {
			filterList.innerHTML = '<div class="filter-empty-state">No filters applied. Click "Add Condition" to filter results.</div>';
		}

		// Reset sort UI
		updateSortUI({ sortAttribute: null, sortDescending: false });

		// Reset query options UI
		updateQueryOptionsUI({ topN: null, distinct: false });

		// Clear results
		clearResults();
	}

	/**
	 * Updates the sort UI with new sort state.
	 * @param {Object} data - Sort data { sortAttribute, sortDescending }
	 */
	function updateSortUI(data) {
		const { sortAttribute, sortDescending } = data;

		// Update attribute dropdown
		const attrSelect = document.getElementById('sort-attribute-select');
		if (attrSelect) {
			attrSelect.value = sortAttribute || '';
		}

		// Update direction dropdown
		const dirSelect = document.getElementById('sort-direction-select');
		if (dirSelect) {
			dirSelect.value = sortDescending ? 'desc' : 'asc';
			dirSelect.disabled = !sortAttribute;
		}

		// Update badge
		updateSortCountBadge(sortAttribute);
	}

	/**
	 * Updates the query options UI with new state.
	 * @param {Object} data - Options data { topN, distinct }
	 */
	function updateQueryOptionsUI(data) {
		const { topN, distinct } = data;

		// Update Top N input
		const topNInput = document.getElementById('top-n-input');
		if (topNInput) {
			topNInput.value = topN !== null && topN !== undefined ? topN.toString() : '';
		}

		// Update Distinct checkbox
		const distinctCheckbox = document.getElementById('distinct-checkbox');
		if (distinctCheckbox) {
			distinctCheckbox.checked = distinct === true;
		}

		// Update header summary
		updateQueryOptionsSummary(topN, distinct);
	}

	/**
	 * Updates the query options header summary text.
	 * @param {number|null} topN
	 * @param {boolean} distinct
	 */
	function updateQueryOptionsSummary(topN, distinct) {
		const titleEl = document.querySelector('.query-options-title');
		if (!titleEl) {
			return;
		}

		// Build summary parts - values are controlled (number and boolean)
		const parts = [];
		if (topN !== null && topN !== undefined && typeof topN === 'number') {
			parts.push(`Top ${String(topN)}`);
		}
		if (distinct === true) {
			parts.push('Distinct');
		}

		// Update title with or without summary
		if (parts.length > 0) {
			// Use DOM methods to avoid innerHTML XSS concerns
			titleEl.textContent = '';
			titleEl.appendChild(document.createTextNode('Options '));
			const span = document.createElement('span');
			span.style.color = 'var(--vscode-descriptionForeground)';
			span.textContent = `(${parts.join(', ')})`;
			titleEl.appendChild(span);
		} else {
			titleEl.textContent = 'Options';
		}
	}

	// ============================================
	// COLUMN PICKER FUNCTIONS
	// ============================================

	/** Storage key for column picker collapse state */
	const COLUMN_PICKER_COLLAPSED_KEY = 'dataExplorer.columnPickerCollapsed';

	/**
	 * Initializes the column picker behavior using event delegation.
	 */
	function initColumnPicker() {
		// Use event delegation since column picker is dynamically rendered
		document.addEventListener('change', (e) => {
			// Handle "Select All" checkbox
			if (e.target.id === 'select-all-columns') {
				handleSelectAllToggle(e.target.checked);
				return;
			}

			// Handle individual column checkboxes
			if (e.target.classList.contains('column-checkbox')) {
				handleColumnToggle();
			}
		});

		// Collapse toggle
		document.addEventListener('click', (e) => {
			if (e.target.closest('#column-picker-toggle')) {
				toggleColumnPickerCollapse();
			}
			// Clear button removed for consistency with data table search
		});

		// Search input
		document.addEventListener('input', (e) => {
			if (e.target.id === 'column-search-input') {
				handleColumnSearch(e.target.value);
			}
		});

		// Restore collapse state
		const savedState = localStorage.getItem(COLUMN_PICKER_COLLAPSED_KEY);
		if (savedState === 'true') {
			setColumnPickerCollapsed(true);
		}
	}

	/**
	 * Toggles the column picker collapse state.
	 */
	function toggleColumnPickerCollapse() {
		const toggleBtn = document.getElementById('column-picker-toggle');
		if (!toggleBtn) return;

		const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
		setColumnPickerCollapsed(isExpanded);
	}

	/**
	 * Sets the column picker collapsed state.
	 * @param {boolean} collapsed
	 */
	function setColumnPickerCollapsed(collapsed) {
		const toggleBtn = document.getElementById('column-picker-toggle');
		const content = document.getElementById('column-picker-content');

		if (!toggleBtn || !content) return;

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			content.classList.add('collapsed');
		} else {
			content.classList.remove('collapsed');
		}

		localStorage.setItem(COLUMN_PICKER_COLLAPSED_KEY, collapsed.toString());
	}

	/**
	 * Handles column search/filter.
	 * @param {string} query
	 */
	function handleColumnSearch(query) {
		const clearBtn = document.getElementById('column-search-clear');
		const filterStatus = document.getElementById('column-filter-status');
		const filterCount = document.getElementById('column-filter-count');
		const options = document.querySelectorAll('.column-option');

		const lowerQuery = query.toLowerCase().trim();

		// Show/hide clear button
		if (clearBtn) {
			clearBtn.style.display = lowerQuery ? '' : 'none';
		}

		let visibleCount = 0;
		options.forEach((option) => {
			const displayName = option.querySelector('.column-display-name')?.textContent || '';
			const logicalName = option.querySelector('.column-logical-name')?.textContent || '';
			const matches =
				!lowerQuery ||
				displayName.toLowerCase().includes(lowerQuery) ||
				logicalName.toLowerCase().includes(lowerQuery);

			if (matches) {
				option.classList.remove('hidden');
				visibleCount++;
			} else {
				option.classList.add('hidden');
			}
		});

		// Show filter status when filtering
		if (filterStatus && filterCount) {
			if (lowerQuery && visibleCount < options.length) {
				filterCount.textContent = visibleCount.toString();
				filterStatus.style.display = '';
			} else {
				filterStatus.style.display = 'none';
			}
		}
	}

	/**
	 * Handles the "Select All" checkbox toggle.
	 * @param {boolean} isSelectAll - Whether select all is checked
	 */
	function handleSelectAllToggle(isSelectAll) {
		if (isSelectAll) {
			// SELECT * mode - send empty columns array
			postMessage('selectColumns', { selectAll: true, columns: [] });
			// Update all checkboxes visually
			const checkboxes = document.querySelectorAll('.column-checkbox');
			checkboxes.forEach((cb) => (cb.checked = true));
			updateColumnCountBadge(true, 0);
		} else {
			// Unchecking select all - clear all columns
			const checkboxes = document.querySelectorAll('.column-checkbox');
			checkboxes.forEach((cb) => (cb.checked = false));
			postMessage('selectColumns', { selectAll: false, columns: [] });
			updateColumnCountBadge(false, 0);
		}
	}

	/**
	 * Handles individual column checkbox toggle.
	 * Gathers all selected columns and sends to extension.
	 */
	function handleColumnToggle() {
		// Gather all selected columns
		const checkboxes = document.querySelectorAll('.column-checkbox:checked');
		const selectedColumns = Array.from(checkboxes).map((cb) => cb.dataset.column);

		// Uncheck "Select All" when individual columns are selected
		const selectAllCheckbox = document.getElementById('select-all-columns');
		if (selectAllCheckbox) {
			selectAllCheckbox.checked = false;
		}

		postMessage('selectColumns', { selectAll: false, columns: selectedColumns });
		updateColumnCountBadge(false, selectedColumns.length);
	}

	/**
	 * Updates the column count badge in the header.
	 * @param {boolean} isSelectAll
	 * @param {number} selectedCount
	 */
	function updateColumnCountBadge(isSelectAll, selectedCount) {
		const badge = document.getElementById('column-count-badge');
		const totalColumns = document.querySelectorAll('.column-checkbox').length;

		if (!badge) return;

		if (isSelectAll) {
			badge.textContent = '(All)';
		} else if (selectedCount === 0) {
			badge.textContent = `(0 of ${totalColumns})`;
		} else {
			badge.textContent = `(${selectedCount} of ${totalColumns})`;
		}
	}

	/**
	 * Updates the column picker with new column options.
	 * @param {Array} columns - Array of column option view models
	 * @param {boolean} isSelectAll - Whether SELECT * mode is active
	 */
	function updateColumnPicker(columns, isSelectAll) {
		const section = document.getElementById('column-picker-section');
		const container = document.querySelector('.column-picker-list');
		const selectAllCheckbox = document.getElementById('select-all-columns');
		const searchInput = document.getElementById('column-search-input');
		const totalCountEl = document.getElementById('column-total-count');

		// Show the column picker section
		if (section) {
			section.classList.remove('column-picker-hidden');
		}

		if (selectAllCheckbox) {
			selectAllCheckbox.checked = isSelectAll;
			selectAllCheckbox.disabled = false;
		}

		// Clear any existing search
		if (searchInput) {
			searchInput.value = '';
		}
		const clearBtn = document.getElementById('column-search-clear');
		if (clearBtn) {
			clearBtn.style.display = 'none';
		}
		const filterStatus = document.getElementById('column-filter-status');
		if (filterStatus) {
			filterStatus.style.display = 'none';
		}

		if (!container) {
			console.warn('Column picker list not found');
			return;
		}

		if (!columns || columns.length === 0) {
			container.innerHTML =
				'<div class="column-picker-empty">No columns available</div>';
			updateColumnCountBadge(true, 0);
			return;
		}

		// Update total count
		if (totalCountEl) {
			totalCountEl.textContent = columns.length.toString();
		}

		container.innerHTML = columns
			.map(
				(col) => {
					// Ensure isSelected is a boolean for safe attribute value
					const isSelected = col.isSelected === true;
					return `
			<label class="column-option" role="option" aria-selected="${isSelected ? 'true' : 'false'}">
				<input type="checkbox" class="column-checkbox"
					data-column="${escapeHtml(col.logicalName)}"
					${isSelected ? 'checked' : ''} />
				<span class="column-logical-name">${escapeHtml(col.logicalName)}</span>
				<span class="column-display-name">${escapeHtml(col.displayName)}</span>
				<span class="column-type">${escapeHtml(col.attributeType)}</span>
			</label>
		`;
				}
			)
			.join('');

		// Update badge
		const selectedCount = columns.filter((c) => c.isSelected).length;
		updateColumnCountBadge(isSelectAll, selectedCount);
	}

	/**
	 * Sets the loading state for the column picker.
	 * @param {boolean} isLoading
	 */
	function setColumnPickerLoading(isLoading) {
		const section = document.getElementById('column-picker-section');
		const container = document.querySelector('.column-picker-list');

		if (!container) return;

		if (isLoading) {
			// Show the section when loading starts
			if (section) {
				section.classList.remove('column-picker-hidden');
			}
			container.innerHTML =
				'<div class="column-picker-loading">Loading columns...</div>';
			// Disable select all while loading
			const selectAllCheckbox = document.getElementById('select-all-columns');
			if (selectAllCheckbox) {
				selectAllCheckbox.disabled = true;
			}
		} else {
			const selectAllCheckbox = document.getElementById('select-all-columns');
			if (selectAllCheckbox) {
				selectAllCheckbox.disabled = false;
			}
		}
	}

	// ============================================
	// FILTER SECTION FUNCTIONS
	// ============================================

	/** Storage key for filter section collapse state */
	const FILTER_SECTION_COLLAPSED_KEY = 'dataExplorer.filterSectionCollapsed';

	/**
	 * Initializes the filter section behavior using event delegation.
	 */
	function initFilterSection() {
		// Add filter button
		document.addEventListener('click', (e) => {
			if (e.target.closest('#add-filter-btn')) {
				handleAddFilter();
			}

			// Remove filter button
			if (e.target.closest('.remove-filter-btn')) {
				const btn = e.target.closest('.remove-filter-btn');
				const conditionId = btn.dataset.conditionId;
				if (conditionId) {
					handleRemoveFilter(conditionId);
				}
			}

			// Filter section toggle
			if (e.target.closest('#filter-section-toggle')) {
				toggleFilterSectionCollapse();
			}
		});

		// Field dropdown change
		document.addEventListener('change', (e) => {
			if (e.target.classList.contains('filter-field-select')) {
				const conditionId = e.target.dataset.conditionId;
				const attribute = e.target.value;
				const selectedOption = e.target.options[e.target.selectedIndex];
				const attributeType = selectedOption?.dataset?.type || 'String';
				if (conditionId) {
					handleFilterFieldChange(conditionId, attribute, attributeType);
				}
			}

			// Operator dropdown change
			if (e.target.classList.contains('filter-operator-select')) {
				const conditionId = e.target.dataset.conditionId;
				const operator = e.target.value;
				if (conditionId) {
					handleFilterOperatorChange(conditionId, operator);
				}
			}

			// Value input change (for select inputs)
			if (e.target.classList.contains('filter-value-input') && e.target.tagName === 'SELECT') {
				const conditionId = e.target.dataset.conditionId;
				const value = e.target.value;
				if (conditionId) {
					handleFilterValueChange(conditionId, value);
				}
			}
		});

		// Value input change (for text/number/date inputs) - use input event for real-time updates
		document.addEventListener('input', (e) => {
			if (e.target.classList.contains('filter-value-input') && e.target.tagName === 'INPUT') {
				const conditionId = e.target.dataset.conditionId;
				const value = e.target.value;
				if (conditionId) {
					// Debounce value changes to avoid too many messages
					clearTimeout(e.target._valueChangeTimeout);
					e.target._valueChangeTimeout = setTimeout(() => {
						handleFilterValueChange(conditionId, value);
					}, 300);
				}
			}
		});

		// Restore collapse state
		const savedState = localStorage.getItem(FILTER_SECTION_COLLAPSED_KEY);
		if (savedState === 'true') {
			setFilterSectionCollapsed(true);
		}
	}

	/**
	 * Handles adding a new filter condition.
	 */
	function handleAddFilter() {
		postMessage('addFilterCondition', {});
	}

	/**
	 * Handles removing a filter condition.
	 * @param {string} conditionId
	 */
	function handleRemoveFilter(conditionId) {
		postMessage('removeFilterCondition', { conditionId });
	}

	/**
	 * Handles field selection change.
	 * @param {string} conditionId
	 * @param {string} attribute
	 * @param {string} attributeType
	 */
	function handleFilterFieldChange(conditionId, attribute, attributeType) {
		postMessage('updateFilterCondition', {
			conditionId,
			field: 'attribute',
			attribute,
			attributeType
		});
	}

	/**
	 * Handles operator selection change.
	 * @param {string} conditionId
	 * @param {string} operator
	 */
	function handleFilterOperatorChange(conditionId, operator) {
		postMessage('updateFilterCondition', {
			conditionId,
			field: 'operator',
			operator
		});
	}

	/**
	 * Handles value input change.
	 * @param {string} conditionId
	 * @param {string} value
	 */
	function handleFilterValueChange(conditionId, value) {
		postMessage('updateFilterCondition', {
			conditionId,
			field: 'value',
			value
		});
	}

	/**
	 * Toggles the filter section collapse state.
	 */
	function toggleFilterSectionCollapse() {
		const toggleBtn = document.getElementById('filter-section-toggle');
		if (!toggleBtn) return;

		const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
		setFilterSectionCollapsed(isExpanded);
	}

	/**
	 * Sets the filter section collapsed state.
	 * @param {boolean} collapsed
	 */
	function setFilterSectionCollapsed(collapsed) {
		const toggleBtn = document.getElementById('filter-section-toggle');
		const content = document.getElementById('filter-section-content');

		if (!toggleBtn || !content) return;

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			content.classList.add('collapsed');
		} else {
			content.classList.remove('collapsed');
		}

		localStorage.setItem(FILTER_SECTION_COLLAPSED_KEY, collapsed.toString());
	}

	/**
	 * Updates the filter count badge.
	 * @param {number} count
	 */
	function updateFilterCountBadge(count) {
		const badge = document.getElementById('filter-count-badge');
		if (badge) {
			badge.textContent = count > 0 ? `(${count})` : '';
		}
	}

	/**
	 * Updates the filter conditions list with new data.
	 * @param {Array} filterConditions - Array of filter condition view models
	 * @param {Array} availableColumns - Array of available columns for field dropdown
	 */
	function updateFilterConditions(filterConditions, availableColumns) {
		const container = document.getElementById('filter-conditions-list');
		if (!container) {
			console.warn('Filter conditions list container not found');
			return;
		}

		if (!filterConditions || filterConditions.length === 0) {
			container.innerHTML = '<div class="filter-empty-state">No filters applied. Click "Add Condition" to filter results.</div>';
			return;
		}

		// Render all filter condition rows
		container.innerHTML = filterConditions
			.map((condition, index) => renderFilterConditionRow(condition, index, availableColumns))
			.join('');
	}

	/**
	 * Renders a single filter condition row.
	 * @param {Object} condition - Filter condition view model
	 * @param {number} index - Index for logical label (WHERE vs AND)
	 * @param {Array} availableColumns - Available columns for field dropdown
	 * @returns {string} HTML string for the filter row
	 */
	function renderFilterConditionRow(condition, index, availableColumns) {
		const logicalLabel = index === 0 ? 'WHERE' : 'AND';
		const conditionId = escapeHtml(condition.id);

		return `
			<div class="filter-condition-row" data-condition-id="${conditionId}">
				<span class="filter-logical-label">${logicalLabel}</span>
				${renderFieldDropdown(condition, availableColumns)}
				${renderOperatorDropdown(condition)}
				${renderValueInput(condition)}
				<button
					class="remove-filter-btn"
					type="button"
					data-condition-id="${conditionId}"
					title="Remove condition"
					aria-label="Remove filter condition"
				>
					<span class="codicon codicon-close"></span>
				</button>
			</div>
		`;
	}

	/**
	 * Renders the field dropdown for a filter condition.
	 * @param {Object} condition - Filter condition
	 * @param {Array} availableColumns - Available columns
	 * @returns {string} HTML string
	 */
	function renderFieldDropdown(condition, availableColumns) {
		const options = availableColumns.map(col => {
			const selected = col.logicalName === condition.attribute ? 'selected' : '';
			return `<option value="${escapeHtml(col.logicalName)}" data-type="${escapeHtml(col.attributeType)}" ${selected}>${escapeHtml(col.logicalName)} (${escapeHtml(col.displayName)})</option>`;
		}).join('');

		return `
			<select
				class="filter-field-select"
				data-condition-id="${escapeHtml(condition.id)}"
				aria-label="Select field"
			>
				<option value="">-- Select field --</option>
				${options}
			</select>
		`;
	}

	/**
	 * Operator configurations by attribute type.
	 */
	const OPERATORS_BY_TYPE = {
		'String': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'like', displayName: 'Contains' },
			{ operator: 'not-like', displayName: 'Does Not Contain' },
			{ operator: 'begins-with', displayName: 'Begins With' },
			{ operator: 'ends-with', displayName: 'Ends With' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Memo': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'like', displayName: 'Contains' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Integer': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'lt', displayName: 'Less Than' },
			{ operator: 'le', displayName: 'Less Than or Equal' },
			{ operator: 'gt', displayName: 'Greater Than' },
			{ operator: 'ge', displayName: 'Greater Than or Equal' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Decimal': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'lt', displayName: 'Less Than' },
			{ operator: 'le', displayName: 'Less Than or Equal' },
			{ operator: 'gt', displayName: 'Greater Than' },
			{ operator: 'ge', displayName: 'Greater Than or Equal' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Money': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'lt', displayName: 'Less Than' },
			{ operator: 'le', displayName: 'Less Than or Equal' },
			{ operator: 'gt', displayName: 'Greater Than' },
			{ operator: 'ge', displayName: 'Greater Than or Equal' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'DateTime': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'lt', displayName: 'Before' },
			{ operator: 'le', displayName: 'On or Before' },
			{ operator: 'gt', displayName: 'After' },
			{ operator: 'ge', displayName: 'On or After' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Boolean': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Lookup': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Picklist': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'UniqueIdentifier': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
		'Other': [
			{ operator: 'eq', displayName: 'Equals' },
			{ operator: 'ne', displayName: 'Not Equals' },
			{ operator: 'null', displayName: 'Is Null' },
			{ operator: 'not-null', displayName: 'Is Not Null' },
		],
	};

	/**
	 * Gets operators for an attribute type.
	 * @param {string} attributeType
	 * @returns {Array} Array of operator objects
	 */
	function getOperatorsForType(attributeType) {
		return OPERATORS_BY_TYPE[attributeType] || OPERATORS_BY_TYPE['Other'];
	}

	/**
	 * Renders the operator dropdown for a filter condition.
	 * @param {Object} condition - Filter condition
	 * @returns {string} HTML string
	 */
	function renderOperatorDropdown(condition) {
		const attributeType = condition.attributeType || 'String';
		const operators = getOperatorsForType(attributeType);

		const options = operators.map(op => {
			const selected = op.operator === condition.operator ? 'selected' : '';
			return `<option value="${escapeHtml(op.operator)}" ${selected}>${escapeHtml(op.displayName)}</option>`;
		}).join('');

		return `
			<select
				class="filter-operator-select"
				data-condition-id="${escapeHtml(condition.id)}"
				aria-label="Select operator"
			>
				${options}
			</select>
		`;
	}

	/**
	 * Renders the value input for a filter condition.
	 * @param {Object} condition - Filter condition
	 * @returns {string} HTML string
	 */
	function renderValueInput(condition) {
		const nullOperators = ['null', 'not-null'];
		if (nullOperators.includes(condition.operator)) {
			return `<span class="filter-value-placeholder">(no value needed)</span>`;
		}

		const conditionId = escapeHtml(condition.id);
		const value = condition.value !== null ? escapeHtml(condition.value) : '';
		const attributeType = condition.attributeType || 'String';

		switch (attributeType) {
			case 'Integer':
			case 'Decimal':
			case 'Money':
				return `
					<input
						type="number"
						class="filter-value-input"
						data-condition-id="${conditionId}"
						value="${value}"
						placeholder="Enter value..."
						aria-label="Filter value"
					/>
				`;

			case 'DateTime':
				return `
					<input
						type="datetime-local"
						class="filter-value-input"
						data-condition-id="${conditionId}"
						value="${value}"
						aria-label="Filter value"
					/>
				`;

			case 'Boolean':
				const trueSelected = condition.value === 'true' ? 'selected' : '';
				const falseSelected = condition.value === 'false' ? 'selected' : '';
				return `
					<select
						class="filter-value-input"
						data-condition-id="${conditionId}"
						aria-label="Filter value"
					>
						<option value="">-- Select --</option>
						<option value="true" ${trueSelected}>Yes</option>
						<option value="false" ${falseSelected}>No</option>
					</select>
				`;

			default:
				return `
					<input
						type="text"
						class="filter-value-input"
						data-condition-id="${conditionId}"
						value="${value}"
						placeholder="Enter value..."
						aria-label="Filter value"
					/>
				`;
		}
	}

	/**
	 * Shows or hides the filter section.
	 * @param {boolean} visible
	 */
	function setFilterSectionVisible(visible) {
		const section = document.getElementById('filter-section');
		if (section) {
			if (visible) {
				section.classList.remove('filter-section-hidden');
			} else {
				section.classList.add('filter-section-hidden');
			}
		}
	}

	// ============================================
	// SORT SECTION FUNCTIONS
	// ============================================

	/** Storage key for sort section collapse state */
	const SORT_SECTION_COLLAPSED_KEY = 'dataExplorer.sortSectionCollapsed';

	/**
	 * Initializes the sort section behavior using event delegation.
	 */
	function initSortSection() {
		// Sort section toggle
		document.addEventListener('click', (e) => {
			if (e.target.closest('#sort-section-toggle')) {
				toggleSortSectionCollapse();
			}

			// Clear sort button
			if (e.target.closest('#clear-sort-btn')) {
				handleClearSort();
			}
		});

		// Sort attribute dropdown change
		document.addEventListener('change', (e) => {
			if (e.target.id === 'sort-attribute-select') {
				handleSortAttributeChange(e.target.value);
			}

			// Sort direction dropdown change
			if (e.target.id === 'sort-direction-select') {
				handleSortDirectionChange(e.target.value);
			}
		});

		// Restore collapse state
		const savedState = localStorage.getItem(SORT_SECTION_COLLAPSED_KEY);
		if (savedState === 'true') {
			setSortSectionCollapsed(true);
		}
	}

	/**
	 * Handles sort attribute selection change.
	 * @param {string} attribute
	 */
	function handleSortAttributeChange(attribute) {
		postMessage('updateSort', { attribute });
	}

	/**
	 * Handles sort direction change.
	 * @param {string} direction - 'asc' or 'desc'
	 */
	function handleSortDirectionChange(direction) {
		postMessage('updateSort', { descending: direction === 'desc' });
	}

	/**
	 * Handles clearing the sort.
	 */
	function handleClearSort() {
		postMessage('clearSort', {});
	}

	/**
	 * Toggles the sort section collapse state.
	 */
	function toggleSortSectionCollapse() {
		const toggleBtn = document.getElementById('sort-section-toggle');
		if (!toggleBtn) return;

		const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
		setSortSectionCollapsed(isExpanded);
	}

	/**
	 * Sets the sort section collapsed state.
	 * @param {boolean} collapsed
	 */
	function setSortSectionCollapsed(collapsed) {
		const toggleBtn = document.getElementById('sort-section-toggle');
		const content = document.getElementById('sort-section-content');

		if (!toggleBtn || !content) return;

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			content.classList.add('collapsed');
		} else {
			content.classList.remove('collapsed');
		}

		localStorage.setItem(SORT_SECTION_COLLAPSED_KEY, collapsed.toString());
	}

	/**
	 * Updates the sort count badge.
	 * @param {string|null} sortAttribute
	 */
	function updateSortCountBadge(sortAttribute) {
		const badge = document.getElementById('sort-count-badge');
		if (badge) {
			badge.textContent = sortAttribute ? '(1)' : '';
		}
	}

	/**
	 * Shows or hides the sort section.
	 * @param {boolean} visible
	 */
	function setSortSectionVisible(visible) {
		const section = document.getElementById('sort-section');
		if (section) {
			if (visible) {
				section.classList.remove('sort-section-hidden');
			} else {
				section.classList.add('sort-section-hidden');
			}
		}
	}

	/**
	 * Updates the sort dropdown options when columns are loaded.
	 * @param {Array} columns - Column definitions [{logicalName, displayName}]
	 */
	function updateSortDropdownOptions(columns) {
		const select = document.getElementById('sort-attribute-select');
		if (!select) {
			return;
		}

		// Get current selected value to preserve it
		const currentValue = select.value;

		// Clear existing options except the first one (-- No sorting --)
		while (select.options.length > 1) {
			select.remove(1);
		}

		// Sort columns by logical name and add options
		const sortedColumns = [...columns].sort((a, b) =>
			(a.logicalName || '').localeCompare(b.logicalName || '')
		);

		for (const col of sortedColumns) {
			const option = document.createElement('option');
			option.value = col.logicalName;
			option.textContent = `${col.logicalName} (${col.displayName})`;
			select.appendChild(option);
		}

		// Restore selected value if it still exists
		if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
			select.value = currentValue;
		}

		// Show the sort section now that we have columns
		setSortSectionVisible(true);
		// Also show query options section
		setQueryOptionsSectionVisible(true);
	}

	// ============================================
	// QUERY OPTIONS SECTION FUNCTIONS
	// ============================================

	/** Storage key for query options section collapse state */
	const QUERY_OPTIONS_COLLAPSED_KEY = 'dataExplorer.queryOptionsCollapsed';

	/**
	 * Initializes the query options section behavior using event delegation.
	 */
	function initQueryOptions() {
		// Query options toggle
		document.addEventListener('click', (e) => {
			if (e.target.closest('#query-options-toggle')) {
				toggleQueryOptionsCollapse();
			}
		});

		// Top N input change
		document.addEventListener('input', (e) => {
			if (e.target.id === 'top-n-input') {
				// Debounce value changes
				clearTimeout(e.target._topNChangeTimeout);
				e.target._topNChangeTimeout = setTimeout(() => {
					handleTopNChange(e.target.value);
				}, 300);
			}
		});

		// Distinct checkbox change
		document.addEventListener('change', (e) => {
			if (e.target.id === 'distinct-checkbox') {
				handleDistinctChange(e.target.checked);
			}
		});

		// Restore collapse state
		const savedState = localStorage.getItem(QUERY_OPTIONS_COLLAPSED_KEY);
		if (savedState === 'true') {
			setQueryOptionsCollapsed(true);
		}
	}

	/**
	 * Handles Top N value change.
	 * @param {string} value
	 */
	function handleTopNChange(value) {
		const numValue = value ? parseInt(value, 10) : null;
		if (numValue === null || (numValue > 0 && numValue <= 5000)) {
			postMessage('updateQueryOptions', { topN: numValue });
		}
	}

	/**
	 * Handles distinct checkbox change.
	 * @param {boolean} checked
	 */
	function handleDistinctChange(checked) {
		postMessage('updateQueryOptions', { distinct: checked });
	}

	/**
	 * Toggles the query options section collapse state.
	 */
	function toggleQueryOptionsCollapse() {
		const toggleBtn = document.getElementById('query-options-toggle');
		if (!toggleBtn) return;

		const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
		setQueryOptionsCollapsed(isExpanded);
	}

	/**
	 * Sets the query options section collapsed state.
	 * @param {boolean} collapsed
	 */
	function setQueryOptionsCollapsed(collapsed) {
		const toggleBtn = document.getElementById('query-options-toggle');
		const content = document.getElementById('query-options-content');

		if (!toggleBtn || !content) return;

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			content.classList.add('collapsed');
		} else {
			content.classList.remove('collapsed');
		}

		localStorage.setItem(QUERY_OPTIONS_COLLAPSED_KEY, collapsed.toString());
	}

	/**
	 * Shows or hides the query options section.
	 * @param {boolean} visible
	 */
	function setQueryOptionsSectionVisible(visible) {
		const section = document.getElementById('query-options-section');
		if (section) {
			if (visible) {
				section.classList.remove('query-options-hidden');
			} else {
				section.classList.add('query-options-hidden');
			}
		}
	}

	/**
	 * Initializes the behavior when DOM is ready.
	 */
	function init() {
		console.log('VisualQueryBuilderBehavior initializing...');
		initEntityPicker();
		initColumnPicker();
		initFilterSection();
		initSortSection();
		initQueryOptions();
		initPreviewTabs();
		initCopyButtons();
		initPreviewCollapse();
		initQueryBuilderCollapse();
		initKeyboardShortcuts();
		// Initialize shared dropdown component (from DropdownComponent.js)
		if (typeof initializeDropdowns === 'function') {
			initializeDropdowns();
		}
		window.addEventListener('message', handleMessage);
		console.log('VisualQueryBuilderBehavior initialized');

		// Signal to extension that webview is ready to receive data
		postMessage('webviewReady', {});
	}

	// ============================================
	// KEYBOARD SHORTCUTS
	// ============================================

	/**
	 * Initializes keyboard shortcuts for the query builder.
	 * Ctrl+Enter executes the query.
	 */
	function initKeyboardShortcuts() {
		document.addEventListener('keydown', (e) => {
			// Ctrl+Enter to execute query
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault();
				postMessage('executeQuery', {});
			}
		});
	}

	// ============================================
	// COLLAPSIBLE QUERY BUILDER SECTION
	// ============================================

	/** Storage key for query builder collapse state */
	const QUERY_BUILDER_COLLAPSED_KEY = 'dataExplorer.queryBuilderCollapsed';

	/**
	 * Initializes the collapsible query builder section.
	 */
	function initQueryBuilderCollapse() {
		const toggleBtn = document.getElementById('query-builder-toggle');
		const container = document.getElementById('query-builder-container');
		const section = document.getElementById('query-builder-section');

		if (!toggleBtn || !container || !section) {
			return;
		}

		// Restore saved state
		const savedState = localStorage.getItem(QUERY_BUILDER_COLLAPSED_KEY);
		if (savedState === 'true') {
			setQueryBuilderCollapsed(true);
		}

		// Handle toggle click
		toggleBtn.addEventListener('click', () => {
			const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
			setQueryBuilderCollapsed(isExpanded); // Toggle: if expanded, collapse it
		});

		// Handle keyboard
		toggleBtn.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggleBtn.click();
			}
		});
	}

	/**
	 * Sets the collapsed state of the query builder section.
	 * @param {boolean} collapsed - True to collapse, false to expand
	 */
	function setQueryBuilderCollapsed(collapsed) {
		const toggleBtn = document.getElementById('query-builder-toggle');
		const container = document.getElementById('query-builder-container');
		const section = document.getElementById('query-builder-section');

		if (!toggleBtn || !container || !section) {
			return;
		}

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			container.classList.add('collapsed');
			section.classList.add('collapsed');
		} else {
			container.classList.remove('collapsed');
			section.classList.remove('collapsed');
		}

		// Persist state
		localStorage.setItem(QUERY_BUILDER_COLLAPSED_KEY, collapsed.toString());
	}

	// ============================================
	// COLLAPSIBLE PREVIEW SECTION
	// ============================================

	/** Storage key for preview collapse state */
	const PREVIEW_COLLAPSED_KEY = 'dataExplorer.previewCollapsed';

	/**
	 * Initializes the collapsible preview section.
	 */
	function initPreviewCollapse() {
		const toggleBtn = document.getElementById('preview-toggle');
		const contentWrapper = document.getElementById('preview-content-wrapper');

		if (!toggleBtn || !contentWrapper) {
			return;
		}

		// Restore saved state
		const savedState = localStorage.getItem(PREVIEW_COLLAPSED_KEY);
		if (savedState === 'true') {
			setPreviewCollapsed(true);
		}

		// Handle toggle click
		toggleBtn.addEventListener('click', () => {
			const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
			setPreviewCollapsed(isExpanded); // Toggle: if expanded, collapse it
		});

		// Handle keyboard
		toggleBtn.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggleBtn.click();
			}
		});
	}

	/**
	 * Sets the collapsed state of the preview section.
	 * @param {boolean} collapsed - True to collapse, false to expand
	 */
	function setPreviewCollapsed(collapsed) {
		const toggleBtn = document.getElementById('preview-toggle');
		const contentWrapper = document.getElementById('preview-content-wrapper');

		if (!toggleBtn || !contentWrapper) {
			return;
		}

		toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

		if (collapsed) {
			contentWrapper.classList.add('collapsed');
		} else {
			contentWrapper.classList.remove('collapsed');
		}

		// Persist state
		localStorage.setItem(PREVIEW_COLLAPSED_KEY, collapsed.toString());
	}

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	// Expose for external use if needed
	window.VisualQueryBuilderBehavior = {
		updateEntityPicker,
		updatePreviewContent,
		setEntityPickerLoading,
		showError,
		switchPreviewTab,
	};
})();
