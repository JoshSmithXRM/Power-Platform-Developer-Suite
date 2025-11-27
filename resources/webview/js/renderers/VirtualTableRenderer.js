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
			renderVisibleRows(tbody);              // Render FIRST
			updateContainerHeight(scrollContainer); // THEN measure actual height
			updateFooter();
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

			// Check for pre-rendered HTML content (from trusted backend)
			const cellHtml = row[col.key + 'Html'];
			if (cellHtml) {
				// Pre-rendered HTML from backend - use sanitized insertion
				td.innerHTML = sanitizeHtml(cellHtml);
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
	 * Sanitizes HTML content by allowing only safe tags and attributes.
	 * Used for pre-rendered HTML from trusted backend.
	 *
	 * @param {string} html - HTML string to sanitize
	 * @returns {string} Sanitized HTML string
	 */
	function sanitizeHtml(html) {
		// Allowed tags for cell content (badges, icons, links)
		const allowedTags = ['span', 'a', 'strong', 'em', 'i', 'b', 'code', 'br'];
		// Allowed attributes
		const allowedAttributes = ['class', 'title', 'href', 'target', 'rel'];

		const template = document.createElement('template');
		template.innerHTML = html;

		const sanitize = (element) => {
			const children = Array.from(element.childNodes);
			children.forEach(child => {
				if (child.nodeType === Node.ELEMENT_NODE) {
					const tagName = child.tagName.toLowerCase();
					if (!allowedTags.includes(tagName)) {
						// Replace disallowed tags with text content
						const text = document.createTextNode(child.textContent || '');
						element.replaceChild(text, child);
					} else {
						// Remove disallowed attributes
						Array.from(child.attributes).forEach(attr => {
							if (!allowedAttributes.includes(attr.name.toLowerCase())) {
								child.removeAttribute(attr.name);
							}
							// Sanitize href to prevent javascript: URLs
							if (attr.name.toLowerCase() === 'href') {
								const href = attr.value.toLowerCase().trim();
								if (href.startsWith('javascript:') || href.startsWith('data:')) {
									child.removeAttribute('href');
								}
							}
						});
						// Recursively sanitize children
						sanitize(child);
					}
				}
			});
		};

		sanitize(template.content);
		return template.innerHTML;
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
		if (message && message.command === 'updateVirtualTable') {
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
