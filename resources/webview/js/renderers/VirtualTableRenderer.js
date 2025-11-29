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
 */

(function () {
	// Configuration
	const OVERSCAN_COUNT = 5; // Extra rows to render above/below viewport
	const DEFAULT_ROW_HEIGHT = 32;

	// State
	let allRows = [];
	let filteredRows = [];
	let columns = [];
	let rowHeight = DEFAULT_ROW_HEIGHT;
	let visibleStart = 0;
	let visibleEnd = 50;
	let scrollDebounceTimer = null;
	let selectedRowId = null; // Currently selected row ID for publish functionality

	// Pagination state for server search fallback
	let paginationState = {
		isFullyCached: true, // Assume fully cached until told otherwise
		isServerSearching: false,
		lastSearchQuery: ''
	};

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

		// Read row data from data attribute
		const rowsJson = tbody.getAttribute('data-rows');
		const columnsJson = tbody.getAttribute('data-columns');
		const heightAttr = tbody.getAttribute('data-row-height');

		if (rowsJson) {
			try {
				allRows = JSON.parse(rowsJson);
				filteredRows = [...allRows];
			} catch (e) {
				console.error('VirtualTableRenderer: Failed to parse row data', e);
			}
		}

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

		// Set up search handling
		setupSearchHandler();

		// Set up row selection handling
		setupRowSelectionHandler(tbody);

		// Calculate visible range based on container height
		const containerHeight = scrollContainer.clientHeight || 600;
		const visibleCount = Math.ceil(containerHeight / rowHeight);
		visibleStart = 0;
		visibleEnd = Math.min(filteredRows.length, visibleCount + OVERSCAN_COUNT * 2);

		// Initial render
		renderVisibleRows(tbody);

		// Update container height for scrollbar
		updateContainerHeight(scrollContainer);

		// Recalculate visible range after container height update
		const finalHeight = scrollContainer.clientHeight;
		const finalVisibleCount = Math.ceil(finalHeight / rowHeight);
		visibleEnd = Math.min(filteredRows.length, finalVisibleCount + OVERSCAN_COUNT * 2);
		renderVisibleRows(tbody);
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
				const containerHeight = scrollContainer.clientHeight;

				// Calculate visible range
				const newStart = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_COUNT);
				const visibleCount = Math.ceil(containerHeight / rowHeight);
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
			const rowId = rowData.id;
			if (selectedRowId === rowId) {
				// Deselect
				selectedRowId = null;
				row.classList.remove('row-selected');
				sendRowSelectMessage(null, null);
			} else {
				// Select new row
				// Remove selection from previously selected row
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
			filteredRows = [...allRows];
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
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, 50);
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
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, 50);
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
	 * Updates container height based on actual content that needs to be displayed.
	 * Uses scrollHeight measurement with large temporary height to avoid scrollbar influence.
	 * When content fits, use exact height (no scrollbar).
	 * When content exceeds max, cap at max height (enable scrollbar).
	 *
	 * @param {HTMLElement} scrollContainer - The scroll container element (wrapper or tbody)
	 */
	function updateContainerHeight(scrollContainer) {
		const MAX_HEIGHT = 600; // Cap at 600px to enable virtual scrolling for large datasets

		// Set very large height temporarily - ensures no scrollbar affects measurement
		// This makes the container bigger than any possible content
		scrollContainer.style.height = '10000px';

		// Force browser to recalculate layout
		void scrollContainer.offsetHeight;

		// scrollHeight now gives true content height (no scrollbar taking space)
		const contentHeight = scrollContainer.scrollHeight;

		// Set final height: exact content height, capped at MAX
		const finalHeight = Math.min(contentHeight, MAX_HEIGHT);

		scrollContainer.style.height = `${finalHeight}px`;
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
	 * Creates a single row element using safe DOM manipulation.
	 *
	 * @param {Object} row - Row data object
	 * @param {number} index - Row index
	 * @returns {HTMLTableRowElement} Row element
	 */
	function createRowElement(row, index) {
		const tr = document.createElement('tr');
		tr.setAttribute('data-index', String(index));
		tr.style.height = `${rowHeight}px`;

		// Apply selection state if this row is selected
		if (row.id && row.id === selectedRowId) {
			tr.classList.add('row-selected');
		}

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

			// Check for structured link data (preferred - no HTML parsing)
			const cellLink = row[col.key + 'Link'];
			if (cellLink && typeof cellLink === 'object') {
				// Create link from structured data - safe, no HTML parsing
				td.appendChild(createLinkElement(plainText, cellLink));
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
	 */
	function updateVirtualTable(data) {
		if (!data || !data.rows) {
			return;
		}

		allRows = data.rows;
		filteredRows = [...allRows];

		// Update columns if provided
		if (data.columns) {
			columns = data.columns;
		}

		// Update pagination state for server search fallback
		if (data.pagination) {
			paginationState.isFullyCached = data.pagination.isFullyCached || false;
		}

		// Reset server search state on new data
		paginationState.isServerSearching = false;

		// Reset and re-render
		const tbody = document.getElementById('virtualTableBody');
		if (tbody) {
			// Update data attributes
			tbody.setAttribute('data-rows', JSON.stringify(allRows));

			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, 50);
			updateContainerHeight(tbody);
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

	// Expose update function globally for message handling
	window.VirtualTableRenderer = {
		update: updateVirtualTable,
		refresh: function () {
			const tbody = document.getElementById('virtualTableBody');
			if (tbody) {
				renderVisibleRows(tbody);
			}
		},
		handleServerSearchResults: handleServerSearchResults,
		showLoading: showLoadingIndicator
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
