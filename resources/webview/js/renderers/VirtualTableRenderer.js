/**
 * Virtual Table Renderer
 *
 * Handles virtual scrolling for large datasets.
 * Only renders visible rows to DOM for performance.
 *
 * Key features:
 * - Virtual scrolling (renders only visible rows)
 * - Client-side search filtering
 * - Row striping for visible rows
 * - Scroll position tracking
 *
 * Works with VirtualDataTableSection TypeScript component.
 */

(function () {
	// Configuration
	const OVERSCAN_COUNT = 5; // Extra rows to render above/below viewport
	const DEFAULT_ROW_HEIGHT = 32;
	const SCROLL_DEBOUNCE_MS = 16; // ~60fps

	// State
	let allRows = [];
	let filteredRows = [];
	let columns = [];
	let rowHeight = DEFAULT_ROW_HEIGHT;
	let visibleStart = 0;
	let visibleEnd = 50;
	let scrollDebounceTimer = null;

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

		// Initial render
		renderVisibleRows(tbody);

		// Update container height for scrollbar
		updateContainerHeight(scrollContainer);
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
	 * Filters rows based on search query.
	 *
	 * @param {string} query - Search query (lowercase)
	 */
	function filterRows(query) {
		if (!query) {
			filteredRows = [...allRows];
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
		}

		// Reset scroll position and render
		const tbody = document.getElementById('virtualTableBody');
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		const scrollContainer = scrollWrapper || tbody;

		if (tbody) {
			visibleStart = 0;
			visibleEnd = Math.min(filteredRows.length, 50);
			scrollContainer.scrollTop = 0;
			updateContainerHeight(scrollContainer);
			renderVisibleRows(tbody);
			updateFooter();
		}
	}

	/**
	 * Updates container height based on total filtered rows.
	 *
	 * @param {HTMLElement} scrollContainer - The scroll container element (wrapper or tbody)
	 */
	function updateContainerHeight(scrollContainer) {
		const totalHeight = filteredRows.length * rowHeight;
		const minHeight = Math.min(400, totalHeight); // Min 400px or total height
		const maxHeight = Math.min(600, totalHeight); // Max 600px

		scrollContainer.style.height = `${Math.max(minHeight, maxHeight)}px`;
	}

	/**
	 * Renders only visible rows to the DOM.
	 *
	 * @param {HTMLElement} tbody - The virtual table body element
	 */
	function renderVisibleRows(tbody) {
		if (filteredRows.length === 0) {
			// Show empty message
			tbody.innerHTML = renderEmptyRow();
			return;
		}

		// Calculate spacer heights for virtual scrolling
		const topSpacerHeight = visibleStart * rowHeight;
		const bottomSpacerHeight = Math.max(0, (filteredRows.length - visibleEnd) * rowHeight);

		// Build visible rows HTML
		const rowsHtml = [];

		// Top spacer (invisible, for scroll position)
		if (topSpacerHeight > 0) {
			rowsHtml.push(`<tr class="virtual-spacer-top" style="height: ${topSpacerHeight}px;"><td colspan="${columns.length}"></td></tr>`);
		}

		// Visible rows
		for (let i = visibleStart; i < visibleEnd && i < filteredRows.length; i++) {
			const row = filteredRows[i];
			rowsHtml.push(renderRow(row, i));
		}

		// Bottom spacer (invisible, for scroll position)
		if (bottomSpacerHeight > 0) {
			rowsHtml.push(`<tr class="virtual-spacer-bottom" style="height: ${bottomSpacerHeight}px;"><td colspan="${columns.length}"></td></tr>`);
		}

		tbody.innerHTML = rowsHtml.join('');
		applyRowStriping(tbody);
	}

	/**
	 * Renders a single row.
	 *
	 * @param {Object} row - Row data object
	 * @param {number} index - Row index
	 * @returns {string} HTML string for the row
	 */
	function renderRow(row, index) {
		const cells = columns.map(col => {
			const value = row[col.key];
			const cellClass = row[col.key + 'Class'] || '';
			const cellHtml = row[col.key + 'Html'] || escapeHtml(String(value || ''));
			// Add title attribute for tooltip on truncated content
			const plainText = String(value || '');
			const titleAttr = plainText ? ` title="${escapeHtml(plainText)}"` : '';
			return `<td class="${cellClass}"${titleAttr}>${cellHtml}</td>`;
		}).join('');

		return `<tr data-index="${index}" style="height: ${rowHeight}px;">${cells}</tr>`;
	}

	/**
	 * Renders empty state row.
	 *
	 * @returns {string} HTML string for empty row
	 */
	function renderEmptyRow() {
		const searchInput = document.getElementById('searchInput');
		const message = searchInput && searchInput.value
			? 'No matching records found'
			: 'No data available';

		return `
			<tr>
				<td colspan="${columns.length}" style="text-align: center; padding: 24px; color: var(--vscode-descriptionForeground);">
					${escapeHtml(message)}
				</td>
			</tr>
		`;
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
	 * Escapes HTML special characters.
	 *
	 * @param {string} str - String to escape
	 * @returns {string} Escaped string
	 */
	function escapeHtml(str) {
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
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
		}
	};

	// Listen for table update messages
	window.addEventListener('message', event => {
		const message = event.data;
		if (message.command === 'updateVirtualTable') {
			updateVirtualTable(message.data);
		}
	});

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();
