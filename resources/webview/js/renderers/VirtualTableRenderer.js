/**
 * Virtual Table Renderer
 *
 * Handles virtual scrolling for large datasets.
 * Only renders visible rows to DOM for performance.
 *
 * Key features:
 * - Virtual scrolling (renders only visible rows)
 * - Client-side search filtering with server fallback
 * - Row striping for visible rows
 * - Scroll position tracking
 * - Server search indicator for large datasets
 *
 * Works with VirtualDataTableSection TypeScript component.
 *
 * IMPORTANT: The core spacer row algorithm is shared with notebook virtual scrolling.
 * If you change renderVisibleRows() or createSpacerRow(), also update:
 * src/shared/infrastructure/ui/virtualScroll/VirtualScrollScriptGenerator.ts
 */

(function () {
	// Configuration
	const OVERSCAN_COUNT = 5; // Extra rows to render above/below viewport
	const DEFAULT_ROW_HEIGHT = 36; // Must match CSS td height (36px)

	// State
	let allRows = [];
	let filteredRows = [];
	let columns = [];
	let rowHeight = DEFAULT_ROW_HEIGHT;
	let visibleStart = 0;
	let visibleEnd = 50;
	let scrollDebounceTimer = null;
	let selectedRowId = null; // Currently selected row ID for publish functionality
	let selectedRowIds = new Set(); // Multi-select state for Ctrl+A select all

	// Pagination state for server search fallback
	let paginationState = {
		isFullyCached: true, // Assume fully cached until told otherwise
		isServerSearching: false,
		lastSearchQuery: ''
	};

	// Sorting state
	let sortState = {
		column: null,
		direction: 'asc'
	};

	// Lookup context for lazy CellLink computation (Data Explorer)
	// This avoids creating CellLinks for all 5000 rows upfront
	let lookupContext = {
		rowLookups: null,        // Array of lookup info per row (same index as allRows)
		entityLogicalName: null, // For primary key column links
		primaryKeyColumn: null   // e.g., "accountid" for account entity
	};

	// WeakMap for O(1) row-to-index lookup (avoids O(n) indexOf calls)
	// Built once when data arrives, used during render for lookup context
	let rowToOriginalIndex = new WeakMap();

	/**
	 * Calculates how many visible rows fit in the container's data viewport.
	 * Accounts for sticky header taking space in the viewport.
	 *
	 * @param {HTMLElement} scrollContainer - The scroll container element
	 * @returns {number} Number of visible rows that fit in the data viewport
	 */
	function calculateVisibleRowCount(scrollContainer) {
		const containerHeight = scrollContainer.clientHeight || 600;
		const headerHeight = rowHeight; // Sticky header uses same height as data rows
		const dataViewportHeight = Math.max(containerHeight - headerHeight, rowHeight);
		return Math.ceil(dataViewportHeight / rowHeight);
	}

	/**
	 * Initializes the virtual table renderer.
	 * Reads row data from data attributes and sets up scroll handling.
	 */
	function initialize() {
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		if (!tbody) {
			return; // Not a virtual table
		}

		// Read configuration from data attributes (always needed)
		const columnsJson = tbody.getAttribute('data-columns');
		const heightAttr = tbody.getAttribute('data-row-height');

		if (columnsJson) {
			try {
				columns = JSON.parse(columnsJson);
			} catch (e) {
				console.error('VirtualTableRenderer: Failed to parse column data', e);
			}
		}

		if (heightAttr) {
			rowHeight = parseInt(heightAttr, 10) || DEFAULT_ROW_HEIGHT;
		}

		// Set up scroll handling on wrapper (handles both H and V scroll)
		const scrollContainer = scrollWrapper || tbody;
		setupScrollHandler(scrollContainer, tbody);

		// Set up other handlers
		setupSearchHandler();
		setupRowSelectionHandler(tbody);
		setupSortingHandler();

		// Initialize cell selection behavior
		initializeCellSelection(tbody);

		// Check if table is in loading state - don't overwrite loading row
		const isLoading = tbody.getAttribute('data-loading') === 'true';
		if (isLoading) {
			// Table is loading - skip initial render, wait for updateVirtualTable message
			// Handlers are set up, columns/rowHeight are initialized - ready for data
			return;
		}

		// Read row data from data attribute
		const rowsJson = tbody.getAttribute('data-rows');

		if (rowsJson) {
			try {
				allRows = JSON.parse(rowsJson);
				filteredRows = allRows; // Reference, not copy - sorting creates copy when needed
			} catch (e) {
				console.error('VirtualTableRenderer: Failed to parse row data', e);
			}
		}

		// Calculate visible range based on container height
		const visibleCount = calculateVisibleRowCount(scrollContainer);
		visibleStart = 0;
		visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);

		// Update container height for scrollbar
		updateContainerHeight(scrollContainer);

		// Recalculate visible range after container height update
		const finalVisibleCount = calculateVisibleRowCount(scrollContainer);
		visibleEnd = Math.min(filteredRows.length, finalVisibleCount + OVERSCAN_COUNT * 2);

		// Initial render
		renderVisibleRows(tbody);
	}

	/**
	 * Initializes cell selection behavior for Excel-style selection.
	 * @param {HTMLElement} tbody - The virtual table body element
	 */
	function initializeCellSelection(tbody) {
		const table = tbody.closest('table');
		if (!table || !window.CellSelectionBehavior) {
			return;
		}

		window.CellSelectionBehavior.attach(table, {
			columns: columns,
			getRowData: (rowIndex) => filteredRows[rowIndex] || null,
			getTotalRowCount: () => filteredRows.length
		});
	}

	/**
	 * Sets up scroll event handler with debouncing.
	 *
	 * @param {HTMLElement} scrollContainer - The element that handles scrolling (wrapper or tbody)
	 * @param {HTMLElement} tbody - The virtual table body element
	 */
	function setupScrollHandler(scrollContainer, tbody) {
		scrollContainer.addEventListener('scroll', () => {
			// Debounce scroll events
			if (scrollDebounceTimer) {
				cancelAnimationFrame(scrollDebounceTimer);
			}

			scrollDebounceTimer = requestAnimationFrame(() => {
				const scrollTop = scrollContainer.scrollTop;

				// Calculate visible range, accounting for sticky header
				const newStart = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_COUNT);
				const visibleCount = calculateVisibleRowCount(scrollContainer);
				const newEnd = Math.min(filteredRows.length, newStart + visibleCount + OVERSCAN_COUNT * 2);

				// Only re-render if range changed significantly
				if (newStart !== visibleStart || newEnd !== visibleEnd) {
					visibleStart = newStart;
					visibleEnd = newEnd;
					renderVisibleRows(tbody);
				}
			});
		});
	}

	/**
	 * Sets up search input handler for client-side filtering.
	 */
	function setupSearchHandler() {
		const searchInput = document.getElementById('searchInput');
		if (!searchInput) {
			return;
		}

		searchInput.addEventListener('input', () => {
			const query = searchInput.value.toLowerCase().trim();
			filterRows(query);
		});
	}

	/**
	 * Sets up row selection handling for publish functionality.
	 * Clicking a row (not a link) selects it and sends rowSelect message.
	 *
	 * @param {HTMLElement} tbody - The table body element
	 */
	function setupRowSelectionHandler(tbody) {
		tbody.addEventListener('click', (e) => {
			// Ignore clicks on links (those trigger their own commands)
			if (e.target.tagName === 'A' || e.target.closest('a')) {
				return;
			}

			// Find the clicked row
			const row = e.target.closest('tr');
			if (!row || row.classList.contains('virtual-spacer-top') || row.classList.contains('virtual-spacer-bottom')) {
				return;
			}

			const rowIndex = parseInt(row.getAttribute('data-index'), 10);
			if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= filteredRows.length) {
				return;
			}

			const rowData = filteredRows[rowIndex];
			if (!rowData) {
				return;
			}

			// Toggle selection: if clicking same row, deselect; otherwise select new row
			// Also clears multi-selection - clicking enters single-select mode
			const rowId = rowData.id;

			// Clear multi-selection when clicking (enter single-select mode)
			const hadMultiSelection = selectedRowIds.size > 0;
			if (hadMultiSelection) {
				selectedRowIds.clear();
				// Remove visual selection from all rows
				const allSelected = tbody.querySelectorAll('.row-selected');
				allSelected.forEach(r => r.classList.remove('row-selected'));
			}

			if (selectedRowId === rowId && !hadMultiSelection) {
				// Deselect (only if wasn't in multi-select mode)
				selectedRowId = null;
				row.classList.remove('row-selected');
				sendRowSelectMessage(null, null);
			} else {
				// Select new row
				// Remove selection from previously selected row (single-select)
				const previousSelected = tbody.querySelector('.row-selected');
				if (previousSelected) {
					previousSelected.classList.remove('row-selected');
				}

				selectedRowId = rowId;
				row.classList.add('row-selected');
				sendRowSelectMessage(rowId, rowData.name || rowData.displayName);
			}
		});
	}

	/**
	 * Sends rowSelect message to VS Code extension.
	 *
	 * @param {string|null} id - Selected row ID or null for deselection
	 * @param {string|null} name - Selected row name or null for deselection
	 */
	function sendRowSelectMessage(id, name) {
		if (typeof vscode !== 'undefined') {
			vscode.postMessage({
				command: 'rowSelect',
				data: { id, name }
			});
		}
	}

	/**
	 * Filters rows based on search query.
	 * If no results found and cache not fully loaded, triggers server search.
	 *
	 * @param {string} query - Search query (lowercase)
	 */
	function filterRows(query) {
		paginationState.lastSearchQuery = query;

		if (!query) {
			filteredRows = allRows; // Reference, not copy - sorting creates copy when needed
			paginationState.isServerSearching = false;
		} else {
			filteredRows = allRows.filter(row => {
				// Search all column values
				return columns.some(col => {
					const value = row[col.key];
					if (value === null || value === undefined) {
						return false;
					}
					return String(value).toLowerCase().includes(query);
				});
			});

			// Server search fallback: 0 results AND cache not fully loaded
			if (filteredRows.length === 0 && !paginationState.isFullyCached && !paginationState.isServerSearching) {
				triggerServerSearch(query);
				return; // Don't render yet - wait for server response
			}
		}

		// Reset scroll position and render
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		const scrollContainer = scrollWrapper || tbody;

		if (tbody) {
			const visibleCount = calculateVisibleRowCount(scrollContainer);
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);
			scrollContainer.scrollTop = 0;
			renderVisibleRows(tbody);              // Render FIRST
			updateContainerHeight(scrollContainer); // THEN measure actual height
			updateFooter();
		}
	}

	/**
	 * Triggers server-side search when client cache has no matches.
	 * Sends message to VS Code extension to perform server search.
	 *
	 * @param {string} query - Search query
	 */
	function triggerServerSearch(query) {
		paginationState.isServerSearching = true;

		// Show searching indicator
		showServerSearchIndicator();

		// Send message to backend
		if (typeof vscode !== 'undefined') {
			vscode.postMessage({
				command: 'searchServer',
				data: { query: query }
			});
		}
	}

	/**
	 * Shows loading indicator in the table.
	 * Called when switching solutions/environments.
	 *
	 * @param {string} [message='Loading...'] - Optional custom loading message
	 */
	function showLoadingIndicator(message = 'Loading...') {
		const tbody = document.getElementById('virtualTableBody');
		if (!tbody) {
			return;
		}

		// Clear internal state
		allRows = [];
		filteredRows = [];
		selectedRowId = null;

		// Clear existing content
		while (tbody.firstChild) {
			tbody.removeChild(tbody.firstChild);
		}

		// Create loading indicator row
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = columns.length || 5; // Fallback to 5 if columns not yet set
		td.style.textAlign = 'center';
		td.style.padding = '24px';
		td.style.color = 'var(--vscode-descriptionForeground)';
		td.innerHTML = '<span class="spinner" style="margin-right: 8px;"></span>' + escapeHtmlSimple(message);
		tr.appendChild(td);
		tbody.appendChild(tr);

		// Update footer to show loading state
		const footer = document.querySelector('.table-footer');
		if (footer) {
			footer.textContent = message;
		}
	}

	/**
	 * Simple HTML escape for loading messages.
	 *
	 * @param {string} text - Text to escape
	 * @returns {string} Escaped text
	 */
	function escapeHtmlSimple(text) {
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return String(text).replace(/[&<>"']/g, char => map[char] || char);
	}

	/**
	 * Shows "Searching server..." indicator in the table.
	 */
	function showServerSearchIndicator() {
		const tbody = document.getElementById('virtualTableBody');
		if (!tbody) {
			return;
		}

		// Clear existing content
		while (tbody.firstChild) {
			tbody.removeChild(tbody.firstChild);
		}

		// Create searching indicator row
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = columns.length;
		td.style.textAlign = 'center';
		td.style.padding = '24px';
		td.style.color = 'var(--vscode-descriptionForeground)';
		td.innerHTML = '<span class="spinner" style="margin-right: 8px;"></span>Searching server...';
		tr.appendChild(td);
		tbody.appendChild(tr);

		// Update footer to show searching state
		const footer = document.querySelector('.table-footer');
		if (footer) {
			footer.textContent = 'Searching server...';
		}
	}

	/**
	 * Handles server search results from backend.
	 *
	 * @param {Object} data - Server search response { results, source }
	 */
	function handleServerSearchResults(data) {
		paginationState.isServerSearching = false;

		if (!data || !data.results) {
			// No results - show empty state
			filteredRows = [];
		} else {
			// Use server results
			filteredRows = data.results;
		}

		// Render results
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		const scrollContainer = scrollWrapper || tbody;

		if (tbody) {
			const visibleCount = calculateVisibleRowCount(scrollContainer);
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);
			scrollContainer.scrollTop = 0;
			renderVisibleRows(tbody);
			updateContainerHeight(scrollContainer);
			updateFooterWithSource(data?.source || 'server');
		}
	}

	/**
	 * Updates footer with search source indicator.
	 *
	 * @param {string} source - 'cache' or 'server'
	 */
	function updateFooterWithSource(source) {
		const footer = document.querySelector('.table-footer');
		if (!footer) {
			return;
		}

		const totalCount = allRows.length;
		const visibleCount = filteredRows.length;
		const recordText = visibleCount === 1 ? 'record' : 'records';

		// Show source indicator for server results
		const sourceIndicator = source === 'server'
			? ' <span class="server-search-indicator" title="Results from server search">(from server)</span>'
			: '';

		if (visibleCount < totalCount) {
			footer.innerHTML = `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} ${recordText}${sourceIndicator}`;
		} else {
			footer.innerHTML = `${visibleCount.toLocaleString()} ${recordText}${sourceIndicator}`;
		}
	}

	/**
	 * Triggers a layout recalculation for the scroll container.
	 * The container height is now managed by CSS flexbox (fills available space).
	 * This function forces a reflow so JS can read accurate dimensions.
	 *
	 * @param {HTMLElement} scrollContainer - The scroll container element (wrapper or tbody)
	 */
	function updateContainerHeight(scrollContainer) {
		// Force browser to recalculate layout
		// Container height is managed by CSS (flex: 1), not JavaScript
		void scrollContainer.offsetHeight;
	}

	/**
	 * Creates a spacer row element for virtual scrolling.
	 *
	 * @param {string} className - CSS class for the spacer
	 * @param {number} height - Height in pixels
	 * @returns {HTMLTableRowElement} Spacer row element
	 */
	function createSpacerRow(className, height) {
		const tr = document.createElement('tr');
		tr.className = className;
		tr.style.height = `${height}px`;
		const td = document.createElement('td');
		td.colSpan = columns.length;
		tr.appendChild(td);
		return tr;
	}

	/**
	 * Renders only visible rows to the DOM using safe DOM manipulation.
	 *
	 * @param {HTMLElement} tbody - The virtual table body element
	 */
	function renderVisibleRows(tbody) {
		// Clear existing content safely
		while (tbody.firstChild) {
			tbody.removeChild(tbody.firstChild);
		}

		if (filteredRows.length === 0) {
			tbody.appendChild(createEmptyRow());
			return;
		}

		// Calculate spacer heights for virtual scrolling
		const topSpacerHeight = visibleStart * rowHeight;
		const bottomSpacerHeight = Math.max(0, (filteredRows.length - visibleEnd) * rowHeight);

		// Top spacer (invisible, for scroll position)
		if (topSpacerHeight > 0) {
			tbody.appendChild(createSpacerRow('virtual-spacer-top', topSpacerHeight));
		}

		// Visible rows
		for (let i = visibleStart; i < visibleEnd && i < filteredRows.length; i++) {
			const row = filteredRows[i];
			tbody.appendChild(createRowElement(row, i));
		}

		// Bottom spacer (invisible, for scroll position)
		if (bottomSpacerHeight > 0) {
			tbody.appendChild(createSpacerRow('virtual-spacer-bottom', bottomSpacerHeight));
		}

		applyRowStriping(tbody);

		// Refresh cell selection visuals after render
		window.CellSelectionBehavior?.refresh?.();
	}

	/**
	 * Creates a link element from structured CellLink data.
	 * No HTML parsing - builds DOM directly from data.
	 *
	 * @param {string} text - Link text content
	 * @param {Object} linkData - CellLink structure { command, commandData, className, title? }
	 * @returns {HTMLAnchorElement} Link element
	 */
	function createLinkElement(text, linkData) {
		const link = document.createElement('a');
		link.href = '#';
		link.className = linkData.className || '';
		link.textContent = text;
		link.title = linkData.title || text;

		// Set data-command attribute
		if (linkData.command) {
			link.setAttribute('data-command', linkData.command);
		}

		// Set additional data attributes from commandData
		if (linkData.commandData && typeof linkData.commandData === 'object') {
			Object.entries(linkData.commandData).forEach(([key, value]) => {
				link.setAttribute('data-' + key, String(value));
			});
		}

		return link;
	}

	/**
	 * Creates a copy button element from CellCopyAction data.
	 * Used for "copy record URL" functionality in Data Explorer results.
	 *
	 * @param {Object} copyAction - CellCopyAction structure { command, commandData, title? }
	 * @returns {HTMLButtonElement} Copy button element
	 */
	function createCopyButton(copyAction) {
		const button = document.createElement('button');
		button.className = 'record-copy-btn';
		button.title = copyAction.title || 'Copy';

		// Set data-command attribute
		if (copyAction.command) {
			button.setAttribute('data-command', copyAction.command);
		}

		// Set additional data attributes from commandData
		if (copyAction.commandData && typeof copyAction.commandData === 'object') {
			Object.entries(copyAction.commandData).forEach(([key, value]) => {
				button.setAttribute('data-' + key, String(value));
			});
		}

		// Create the icon span
		const icon = document.createElement('span');
		icon.className = 'codicon codicon-copy';
		button.appendChild(icon);

		return button;
	}

	/**
	 * Creates a record cell content container with link and optional copy button.
	 * Matches the Data Explorer record-cell-content pattern.
	 *
	 * @param {string} text - Display text
	 * @param {Object} linkData - CellLink data for the link
	 * @param {Object|undefined} copyAction - Optional CellCopyAction for copy button
	 * @returns {HTMLSpanElement} Container with link and optional copy button
	 */
	function createRecordCellContent(text, linkData, copyAction) {
		const container = document.createElement('span');
		container.className = 'record-cell-content';

		// Add the link
		container.appendChild(createLinkElement(text, linkData));

		// Add copy button if action data is provided
		if (copyAction && typeof copyAction === 'object') {
			container.appendChild(createCopyButton(copyAction));
		}

		return container;
	}

	/**
	 * Computes CellLink and CopyAction for a cell lazily from lookupContext.
	 * Only called during render for visible rows (~50) instead of all rows (5000+).
	 *
	 * @param {string} colKey - Column key
	 * @param {string} value - Cell value
	 * @param {number} rowIndex - Index in allRows (for lookupContext.rowLookups)
	 * @returns {{cellLink: Object|null, cellCopyAction: Object|null}}
	 */
	function computeCellLinkFromContext(colKey, value, rowIndex) {
		// If no lookup context, no links to compute
		if (!lookupContext.rowLookups && !lookupContext.primaryKeyColumn) {
			return { cellLink: null, cellCopyAction: null };
		}

		// Check for lookup in rowLookups
		const rowLookups = lookupContext.rowLookups?.[rowIndex];
		const lookup = rowLookups?.[colKey];

		if (lookup && lookup.entityType && lookup.id) {
			return {
				cellLink: {
					command: 'openRecord',
					commandData: { entity: lookup.entityType, id: lookup.id },
					className: 'record-link',
					title: 'Open in browser'
				},
				cellCopyAction: {
					command: 'copyRecordUrl',
					commandData: { entity: lookup.entityType, id: lookup.id },
					title: 'Copy record URL'
				}
			};
		}

		// Check for primary key column (e.g., accountid for account entity)
		if (lookupContext.primaryKeyColumn &&
			colKey.toLowerCase() === lookupContext.primaryKeyColumn.toLowerCase() &&
			value && isGuid(value)) {
			return {
				cellLink: {
					command: 'openRecord',
					commandData: { entity: lookupContext.entityLogicalName, id: value },
					className: 'record-link',
					title: 'Open in browser'
				},
				cellCopyAction: {
					command: 'copyRecordUrl',
					commandData: { entity: lookupContext.entityLogicalName, id: value },
					title: 'Copy record URL'
				}
			};
		}

		return { cellLink: null, cellCopyAction: null };
	}

	/**
	 * Checks if a string is a valid GUID format.
	 * @param {string} str - String to check
	 * @returns {boolean} True if valid GUID
	 */
	function isGuid(str) {
		if (!str || typeof str !== 'string') {
			return false;
		}
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
	}

	/**
	 * Creates a single row element using safe DOM manipulation.
	 *
	 * @param {Object} row - Row data object
	 * @param {number} index - Row index in filteredRows
	 * @returns {HTMLTableRowElement} Row element
	 */
	function createRowElement(row, index) {
		const tr = document.createElement('tr');
		tr.setAttribute('data-index', String(index));
		tr.style.height = `${rowHeight}px`;

		// Add data-id for selection tracking (use id or index as fallback)
		const rowId = row.id || String(index);
		tr.setAttribute('data-id', rowId);

		// Apply selection state - check both single-select and multi-select
		const isSingleSelected = row.id && row.id === selectedRowId;
		const isMultiSelected = selectedRowIds.has(rowId);
		if (isSingleSelected || isMultiSelected) {
			tr.classList.add('row-selected');
		}

		// Get original row index from WeakMap for O(1) lookup
		// (filteredRows may be filtered/sorted, but we need original index for lookupContext)
		const originalRowIndex = rowToOriginalIndex.get(row) ?? -1;

		columns.forEach(col => {
			const td = document.createElement('td');
			const value = row[col.key];
			const cellClass = row[col.key + 'Class'] || '';

			if (cellClass) {
				td.className = cellClass;
			}

			// Add title attribute for tooltip on truncated content
			const plainText = String(value !== null && value !== undefined ? value : '');
			if (plainText) {
				td.title = plainText;
			}

			// Add sort value if available (for date/numeric sorting)
			const sortValue = row[col.key + 'SortValue'];
			if (sortValue !== undefined) {
				td.setAttribute('data-sort-value', String(sortValue));
			}

			// Check for pre-computed link data first (Web Resources, other panels)
			let cellLink = row[col.key + 'Link'];
			let cellCopyAction = row[col.key + 'CopyAction'];

			// If no pre-computed links, compute lazily from context (Data Explorer)
			if (!cellLink && originalRowIndex >= 0) {
				const computed = computeCellLinkFromContext(col.key, plainText, originalRowIndex);
				cellLink = computed.cellLink;
				cellCopyAction = computed.cellCopyAction;
			}

			if (cellLink && typeof cellLink === 'object') {
				// If there's also a copy action, create record cell content with link + button
				if (cellCopyAction && typeof cellCopyAction === 'object') {
					td.appendChild(createRecordCellContent(plainText, cellLink, cellCopyAction));
				} else {
					// Create link from structured data - safe, no HTML parsing
					td.appendChild(createLinkElement(plainText, cellLink));
				}
			} else {
				// Plain text - use textContent for automatic escaping
				td.textContent = plainText;
			}

			tr.appendChild(td);
		});

		return tr;
	}

	/**
	 * Creates empty state row element.
	 *
	 * @returns {HTMLTableRowElement} Empty row element
	 */
	function createEmptyRow() {
		const searchInput = document.getElementById('searchInput');
		const message = searchInput && searchInput.value
			? 'No matching records found'
			: 'No data available';

		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = columns.length;
		td.style.textAlign = 'center';
		td.style.padding = '24px';
		td.style.color = 'var(--vscode-descriptionForeground)';
		td.textContent = message;
		tr.appendChild(td);
		return tr;
	}

	/**
	 * Applies striping classes to visible rows.
	 *
	 * @param {HTMLElement} tbody - The virtual table body element
	 */
	function applyRowStriping(tbody) {
		const rows = tbody.querySelectorAll('tr:not(.virtual-spacer-top):not(.virtual-spacer-bottom)');
		rows.forEach((row, index) => {
			row.classList.remove('row-even', 'row-odd');
			row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
		});
	}

	/**
	 * Sets up column header click handlers for sorting.
	 */
	function setupSortingHandler() {
		const table = document.querySelector('.virtual-table');
		if (!table) {
			return;
		}

		const headers = table.querySelectorAll('th[data-sort]');
		headers.forEach(header => {
			header.style.cursor = 'pointer';
			header.addEventListener('click', () => {
				const column = header.getAttribute('data-sort');

				// Toggle direction if same column, reset to asc if different
				if (sortState.column === column) {
					sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
				} else {
					sortState.column = column;
					sortState.direction = 'asc';
				}

				sortRows(column, sortState.direction);
				updateSortIndicators(table, column, sortState.direction);
			});
		});
	}

	/**
	 * Sorts the filtered rows by the specified column.
	 *
	 * @param {string} column - Column key to sort by
	 * @param {string} direction - Sort direction ('asc' or 'desc')
	 */
	function sortRows(column, direction) {
		// Find column config to get type
		const colConfig = columns.find(c => c.key === column);
		const columnType = colConfig?.type || 'text';

		// Create copy before sorting to avoid mutating allRows reference
		// This is the ONLY place we need to copy - filter() already creates new arrays
		filteredRows = [...filteredRows];

		filteredRows.sort((a, b) => {
			// Use sort value if available (for dates/numbers)
			const aSortValue = a[column + 'SortValue'];
			const bSortValue = b[column + 'SortValue'];

			let aVal, bVal;
			if (aSortValue !== undefined && bSortValue !== undefined) {
				aVal = aSortValue;
				bVal = bSortValue;
			} else {
				aVal = a[column];
				bVal = b[column];
			}

			// Handle null/undefined
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;

			let comparison;
			if (columnType === 'datetime' || columnType === 'date') {
				// Numeric comparison for dates (sort values are timestamps)
				const aTime = typeof aVal === 'number' ? aVal : new Date(aVal).getTime();
				const bTime = typeof bVal === 'number' ? bVal : new Date(bVal).getTime();
				comparison = aTime - bTime;
			} else if (columnType === 'numeric') {
				comparison = Number(aVal) - Number(bVal);
			} else {
				// Text comparison
				comparison = String(aVal).localeCompare(String(bVal));
			}

			return direction === 'asc' ? comparison : -comparison;
		});

		// Re-render with sorted data
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		const scrollContainer = scrollWrapper || tbody;

		if (tbody) {
			// Reset to top after sort
			scrollContainer.scrollTop = 0;
			const visibleCount = calculateVisibleRowCount(scrollContainer);
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);
			renderVisibleRows(tbody);
		}
	}

	/**
	 * Updates sort indicator arrows in column headers.
	 *
	 * @param {HTMLElement} table - The table element
	 * @param {string} activeColumn - Currently sorted column
	 * @param {string} direction - Sort direction
	 */
	function updateSortIndicators(table, activeColumn, direction) {
		const headers = table.querySelectorAll('th[data-sort]');
		headers.forEach(header => {
			const column = header.getAttribute('data-sort');
			// Remove existing indicator
			header.textContent = header.textContent.replace(/ [▲▼]$/, '');

			// Add indicator to active column
			if (column === activeColumn) {
				header.textContent += direction === 'asc' ? ' ▲' : ' ▼';
			}
		});
	}

	/**
	 * Updates the footer with current counts.
	 * Format matches regular DataTable: "X records" or "X of Y records" when filtered.
	 */
	function updateFooter() {
		const footer = document.querySelector('.table-footer');
		if (!footer) {
			return;
		}

		const totalCount = allRows.length;
		const visibleCount = filteredRows.length;
		const recordText = totalCount === 1 ? 'record' : 'records';

		// Preserve any loading indicator
		const loadingIndicator = footer.querySelector('.background-loading-indicator');
		const loadingHtml = loadingIndicator ? ` ${loadingIndicator.outerHTML}` : '';

		if (visibleCount < totalCount) {
			// Filter applied - show "X of Y records"
			footer.innerHTML = `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} ${recordText}${loadingHtml}`;
		} else {
			// No filter - show "X records"
			footer.innerHTML = `${totalCount.toLocaleString()} ${recordText}${loadingHtml}`;
		}
	}

	/**
	 * Updates the virtual table with new data.
	 * Called when backend sends new data via postMessage.
	 *
	 * @param {Object} data - Virtual table data from backend
	 * @param {Array} data.rows - Row data array
	 * @param {Array} data.columns - Column definitions
	 * @param {Array} [data.rowLookups] - Optional lookup info per row for lazy CellLink computation
	 * @param {string} [data.entityLogicalName] - Optional entity name for primary key links
	 */
	function updateVirtualTable(data) {
		if (!data) {
			return;
		}

		// Show loading spinner if rows is empty and isLoading is true
		if ((!data.rows || data.rows.length === 0) && data.pagination?.isLoading) {
			showLoadingIndicator('Loading...');
			return;
		}

		if (!data.rows) {
			return;
		}

		allRows = data.rows;
		filteredRows = allRows; // Reference, not copy - sorting creates copy when needed

		// Build row-to-index map for O(1) lookup (instead of O(n) indexOf)
		rowToOriginalIndex = new WeakMap();
		for (let i = 0; i < allRows.length; i++) {
			rowToOriginalIndex.set(allRows[i], i);
		}

		// Store lookup context for lazy CellLink computation
		// This avoids creating CellLinks for all rows upfront (major memory savings)
		lookupContext.rowLookups = data.rowLookups || null;
		lookupContext.entityLogicalName = data.entityLogicalName || null;
		lookupContext.primaryKeyColumn = data.entityLogicalName
			? `${data.entityLogicalName}id`
			: null;

		// Clear selection on new data (both single and multi-select)
		selectedRowId = null;
		selectedRowIds.clear();

		// Clear cell selection on new data
		window.CellSelectionBehavior?.clearSelection?.();

		// Update columns if provided
		if (data.columns) {
			columns = data.columns;
			// Update CellSelectionBehavior columns
			window.CellSelectionBehavior?.updateColumns?.(columns);
		}

		// Update pagination state for server search fallback
		if (data.pagination) {
			paginationState.isFullyCached = data.pagination.isFullyCached || false;
		}

		// Reset server search state on new data
		paginationState.isServerSearching = false;

		// Reset and re-render
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		const scrollContainer = scrollWrapper || tbody;

		if (tbody) {
			// Clear loading state now that data has arrived
			tbody.removeAttribute('data-loading');

			// NOTE: We intentionally do NOT store rows in data-rows attribute
			// Storing 5k+ rows as JSON in DOM attribute causes massive memory bloat
			// Row data lives only in JavaScript memory (allRows/filteredRows arrays)

			const visibleCount = calculateVisibleRowCount(scrollContainer);
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);
			updateContainerHeight(scrollContainer);
			renderVisibleRows(tbody);
		}

		// Update footer if pagination info provided
		if (data.pagination) {
			updatePaginationStatus(data.pagination);
		}

		// Re-apply search filter if there was an active search query
		const searchInput = document.getElementById('searchInput');
		if (searchInput && searchInput.value.trim()) {
			filterRows(searchInput.value.toLowerCase().trim());
		}
	}

	/**
	 * Updates pagination status in footer.
	 * Called when backend sends updated pagination state during background loading.
	 *
	 * @param {Object} pagination - Pagination state
	 */
	function updatePaginationStatus(pagination) {
		const footer = document.querySelector('.table-footer');
		if (!footer) {
			return;
		}

		const { cachedCount, totalCount, isLoading, isFullyCached } = pagination;

		// Track cache state for server search fallback decision
		paginationState.isFullyCached = isFullyCached;

		// Use available count (cached if loading, total if fully cached)
		const availableCount = isFullyCached ? totalCount : cachedCount;
		const visibleCount = filteredRows.length;
		const recordText = availableCount === 1 ? 'record' : 'records';

		// Loading indicator
		const loadingHtml = isLoading
			? ' <span class="background-loading-indicator" title="Loading more records...">⟳</span>'
			: '';

		if (visibleCount < availableCount) {
			// Filter applied - show "X of Y records"
			footer.innerHTML = `${visibleCount.toLocaleString()} of ${availableCount.toLocaleString()} ${recordText}${loadingHtml}`;
		} else {
			// No filter - show "X records"
			footer.innerHTML = `${availableCount.toLocaleString()} ${recordText}${loadingHtml}`;
		}
	}

	// ============================================
	// Multi-Selection Functions (Ctrl+A support)
	// ============================================

	/**
	 * Selects all rows in the current filtered view.
	 * Used by KeyboardSelectionBehavior for Ctrl+A.
	 */
	function selectAllRows() {
		// Clear single-select state
		selectedRowId = null;

		// Select all filtered rows
		selectedRowIds.clear();
		filteredRows.forEach((row, index) => {
			// Use row.id if available, fall back to index
			const id = row.id || String(index);
			selectedRowIds.add(id);
		});

		// Re-render to apply selection visuals
		const tbody = document.getElementById('virtualTableBody');
		if (tbody) {
			renderVisibleRows(tbody);
		}
	}

	/**
	 * Clears all multi-select selections.
	 * Used by KeyboardSelectionBehavior for Escape key.
	 */
	function clearSelection() {
		selectedRowIds.clear();
		// Also clear single-select for consistency
		selectedRowId = null;

		// Re-render to remove selection visuals
		const tbody = document.getElementById('virtualTableBody');
		if (tbody) {
			renderVisibleRows(tbody);
		}
	}

	/**
	 * Gets the count of currently selected rows.
	 * @returns {number} Number of selected rows
	 */
	function getSelectionCount() {
		return selectedRowIds.size;
	}

	/**
	 * Gets selected rows data as TSV (tab-separated values) for clipboard.
	 * Format: Header row + data rows, columns separated by tabs.
	 * @returns {string|null} TSV string or null if no selection
	 */
	function getSelectedDataAsTsv() {
		if (selectedRowIds.size === 0) {
			return null;
		}

		// Build header row from column config
		const headers = columns.map(c => c.header || c.label || c.key).join('\t');

		// Build data rows (only selected, in filtered order)
		const dataRows = filteredRows
			.filter((row, index) => {
				const id = row.id || String(index);
				return selectedRowIds.has(id);
			})
			.map(row =>
				columns
					.map(c => {
						const val = row[c.key];
						// Convert to string, handle null/undefined
						return val !== null && val !== undefined ? String(val) : '';
					})
					.join('\t')
			);

		return [headers, ...dataRows].join('\n');
	}

	// Expose update function globally for message handling
	window.VirtualTableRenderer = {
		// Initialize handlers (scroll, search, sort, selection) - call after dynamically creating table
		initialize: initialize,
		update: updateVirtualTable,
		refresh: function () {
			const tbody = document.getElementById('virtualTableBody');
			if (tbody) {
				renderVisibleRows(tbody);
			}
		},
		handleServerSearchResults: handleServerSearchResults,
		showLoading: showLoadingIndicator,
		// Multi-selection API for KeyboardSelectionBehavior
		selectAllRows: selectAllRows,
		clearSelection: clearSelection,
		getSelectionCount: getSelectionCount,
		getSelectedDataAsTsv: getSelectedDataAsTsv
	};

	// Listen for table update messages from VS Code webview API
	window.addEventListener('message', event => {
		// Verify origin - VS Code webviews use vscode-webview:// protocol
		// or the message comes from the same origin (self-posted)
		const origin = event.origin;
		const isVSCodeWebview = origin.startsWith('vscode-webview://');
		const isSameOrigin = origin === window.location.origin;
		const isNullOrigin = origin === 'null'; // VS Code webviews may report null origin

		if (!isVSCodeWebview && !isSameOrigin && !isNullOrigin) {
			// Reject messages from untrusted origins
			return;
		}

		const message = event.data;
		if (message) {
			switch (message.command) {
				case 'updateVirtualTable':
					updateVirtualTable(message.data);
					break;
				case 'serverSearchResults':
					handleServerSearchResults(message.data);
					break;
				case 'showLoading':
					showLoadingIndicator(message.message || 'Loading...');
					break;
			}
		}
	});

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();
