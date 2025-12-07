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
		}
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

		let positionText = '';
		if (position) {
			positionText = ` at line ${position.line}, column ${position.column}`;
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
	 * @param {MessageEvent} event
	 */
	function handleMessage(event) {
		const message = event.data;
		if (!message || !message.command) return;

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

			case 'showError':
				showError(message.data?.message ?? null);
				break;

			case 'clearError':
				showError(null);
				break;

			// Query results handling
			case 'queryResultsUpdated':
				updateQueryResults(message.data);
				break;

			case 'queryError':
				showQueryError(message.data);
				break;

			case 'clearResults':
				clearResults();
				break;

			case 'setLoadingState':
				setResultsLoadingState(message.data?.isLoading ?? false);
				break;

			case 'queryAborted':
				// Query was cancelled, nothing special to do
				break;
		}
	}

	/**
	 * Initializes the behavior when DOM is ready.
	 */
	function init() {
		console.log('VisualQueryBuilderBehavior initializing...');
		initEntityPicker();
		initPreviewTabs();
		initCopyButtons();
		initPreviewCollapse();
		window.addEventListener('message', handleMessage);
		console.log('VisualQueryBuilderBehavior initialized');

		// Signal to extension that webview is ready to receive data
		postMessage('webviewReady', {});
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
