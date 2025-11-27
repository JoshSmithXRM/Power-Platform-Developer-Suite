/**
 * Data Table Webview Behavior
 *
 * Handles client-side table interactions:
 * - Search filtering
 * - Row striping for visible rows
 * - Record count updates
 * - Column sorting via backend
 *
 * Note: Assumes vscode API is already acquired by messaging.js
 */

(function() {
	/**
	 * Applies striping classes to visible table rows.
	 * Removes existing striping classes first to ensure consistency.
	 *
	 * @param {HTMLTableElement} tableElement - The table element containing rows to stripe
	 */
	function applyRowStriping(tableElement) {
		const tbody = tableElement.querySelector('tbody');
		if (!tbody) {
			return;
		}

		const allRows = tbody.querySelectorAll('tr');
		const visibleRows = Array.from(allRows).filter(row => {
			const style = window.getComputedStyle(row);
			return style.display !== 'none';
		});

		// Remove existing classes
		allRows.forEach(row => {
			row.classList.remove('row-even', 'row-odd');
		});

		// Apply classes to visible rows only
		visibleRows.forEach((row, index) => {
			row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
		});
	}

	/**
	 * Wires up search input for client-side filtering.
	 */
	function wireSearch() {
		const searchInput = document.getElementById('searchInput');
		const table = document.querySelector('table');

		if (!searchInput || !table) {
			return;
		}

		searchInput.addEventListener('input', () => {
			const query = searchInput.value.toLowerCase();
			const rows = document.querySelectorAll('tbody tr');
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

			// Update record count with "X of Y" format when filtering
			const visibleCount = Array.from(rows).filter(row => row.style.display !== 'none').length;
			const footer = document.querySelector('.table-footer');
			if (footer) {
				const recordText = totalCount === 1 ? 'record' : 'records';
				if (visibleCount === totalCount) {
					// No filtering active
					footer.textContent = `${totalCount} ${recordText}`;
				} else {
					// Filtering active - show "X of Y records"
					footer.textContent = `${visibleCount} of ${totalCount} ${recordText}`;
				}
			}
		});

		// Apply initial striping on load
		applyRowStriping(table);
	}

	/**
	 * Sorts table rows by column (client-side).
	 * Uses data-type attribute to determine proper sorting (datetime, numeric, text).
	 * @param {HTMLTableElement} table - The table element
	 * @param {string} column - Column key to sort by
	 * @param {string} direction - Sort direction ('asc' or 'desc')
	 */
	function sortTable(table, column, direction) {
		const tbody = table.querySelector('tbody');
		if (!tbody) {
			return;
		}

		// Get all rows and convert to array
		const rows = Array.from(tbody.querySelectorAll('tr'));

		// Get column index and type from headers
		const headers = Array.from(table.querySelectorAll('th[data-sort]'));
		const columnIndex = headers.findIndex(h => h.getAttribute('data-sort') === column);

		if (columnIndex === -1) {
			return;
		}

		// Get column type for proper sorting
		const columnType = headers[columnIndex]?.getAttribute('data-type') || 'text';

		// Sort rows by column content
		rows.sort((a, b) => {
			const aCell = a.querySelectorAll('td')[columnIndex];
			const bCell = b.querySelectorAll('td')[columnIndex];

			if (!aCell || !bCell) {
				return 0;
			}

			const aText = aCell.textContent.trim();
			const bText = bCell.textContent.trim();

			// Handle empty values
			if (!aText && !bText) return 0;
			if (!aText) return 1;
			if (!bText) return -1;

			let comparison;
			if (columnType === 'datetime' || columnType === 'date') {
				// Parse dates for proper chronological sorting
				const aDate = new Date(aText);
				const bDate = new Date(bText);
				comparison = aDate.getTime() - bDate.getTime();
			} else if (columnType === 'numeric') {
				// Parse numbers for proper numeric sorting
				const aNum = parseFloat(aText.replace(/[^0-9.-]/g, '')) || 0;
				const bNum = parseFloat(bText.replace(/[^0-9.-]/g, '')) || 0;
				comparison = aNum - bNum;
			} else {
				// Locale-aware text comparison
				comparison = aText.localeCompare(bText);
			}

			return direction === 'asc' ? comparison : -comparison;
		});

		// Re-append rows in sorted order
		rows.forEach(row => tbody.appendChild(row));

		// Update sort indicators
		headers.forEach(h => {
			const headerColumn = h.getAttribute('data-sort');
			// Remove existing indicators
			h.textContent = h.textContent.replace(/ [▲▼]$/, '');

			// Add indicator to active column
			if (headerColumn === column) {
				h.textContent += direction === 'asc' ? ' ▲' : ' ▼';
			}
		});

		// Re-apply striping
		applyRowStriping(table);
	}

	/**
	 * Wires up column sorting (client-side).
	 * Sorts table in-place without backend round-trip.
	 */
	function wireSorting() {
		const table = document.querySelector('table');
		if (!table) {
			return;
		}

		// Track current sort state
		let currentColumn = null;
		let currentDirection = 'asc';

		// Get all sortable headers
		const headers = table.querySelectorAll('th[data-sort]');

		headers.forEach(header => {
			header.style.cursor = 'pointer';
			header.addEventListener('click', () => {
				const column = header.getAttribute('data-sort');

				// Toggle direction if same column, reset to asc if different
				if (currentColumn === column) {
					currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
				} else {
					currentColumn = column;
					currentDirection = 'asc';
				}

				sortTable(table, currentColumn, currentDirection);
			});
		});

		// Apply initial sort based on indicators in HTML
		headers.forEach(header => {
			const text = header.textContent;
			if (text.includes('▲')) {
				currentColumn = header.getAttribute('data-sort');
				currentDirection = 'asc';
			} else if (text.includes('▼')) {
				currentColumn = header.getAttribute('data-sort');
				currentDirection = 'desc';
			}
		});
	}

	/**
	 * Initialize all behaviors on DOM ready.
	 */
	function initialize() {
		wireSearch();
		wireSorting();
	}

	// Re-apply striping after table updates
	document.addEventListener('tableUpdated', () => {
		const table = document.querySelector('table');
		if (table) {
			applyRowStriping(table);
		}
	});

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();
