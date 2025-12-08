/**
 * Cell Selection Behavior
 *
 * Provides Excel-style cell selection for data tables:
 * - Click cell to select single cell
 * - Click + drag to select rectangular range
 * - Shift+click to extend selection from anchor
 * - Ctrl+A to select all cells (via KeyboardSelectionBehavior)
 *
 * Copy behavior:
 * - Partial selection: TSV without headers
 * - Full table selection (Ctrl+A): TSV with headers
 *
 * Preserves link click behavior - clicking on .record-link or other
 * interactive elements does NOT trigger cell selection.
 *
 * Works with both regular tables (DataTableBehavior) and virtual tables
 * (VirtualTableRenderer) through a unified API.
 */

(function () {
	// Selection state (index-based for virtual table compatibility)
	let anchor = null; // { rowIndex, colIndex } - where selection started
	let focus = null; // { rowIndex, colIndex } - where selection ends
	let isDragging = false;
	let isFullTableSelected = false;

	// Table context (set when attaching to a table)
	let activeTable = null;
	let columns = [];
	let getRowData = null; // Function to get row data by index
	let getTotalRowCount = null; // Function to get total row count

	/**
	 * Gets the normalized rectangular selection range.
	 * @returns {{startRow: number, endRow: number, startCol: number, endCol: number}|null}
	 */
	function getRange() {
		if (!anchor || !focus) {
			return null;
		}
		return {
			startRow: Math.min(anchor.rowIndex, focus.rowIndex),
			endRow: Math.max(anchor.rowIndex, focus.rowIndex),
			startCol: Math.min(anchor.colIndex, focus.colIndex),
			endCol: Math.max(anchor.colIndex, focus.colIndex)
		};
	}

	/**
	 * Checks if a cell is within the current selection.
	 * @param {number} rowIndex - Row index
	 * @param {number} colIndex - Column index
	 * @returns {boolean}
	 */
	function isCellSelected(rowIndex, colIndex) {
		const range = getRange();
		if (!range) {
			return false;
		}
		return (
			rowIndex >= range.startRow &&
			rowIndex <= range.endRow &&
			colIndex >= range.startCol &&
			colIndex <= range.endCol
		);
	}

	/**
	 * Checks if the entire table is selected.
	 * @returns {boolean}
	 */
	function checkIsFullTableSelected() {
		return isFullTableSelected;
	}

	/**
	 * Checks if there is any cell selection.
	 * @returns {boolean}
	 */
	function hasSelection() {
		return anchor !== null && focus !== null;
	}

	/**
	 * Gets the count of selected cells.
	 * @returns {number}
	 */
	function getSelectionCount() {
		const range = getRange();
		if (!range) {
			return 0;
		}
		const rows = range.endRow - range.startRow + 1;
		const cols = range.endCol - range.startCol + 1;
		return rows * cols;
	}

	/**
	 * Gets cell coordinates from a TD element.
	 * @param {HTMLTableCellElement} cell - The TD element
	 * @returns {{rowIndex: number, colIndex: number}|null}
	 */
	function getCellCoords(cell) {
		if (!cell || cell.tagName !== 'TD') {
			return null;
		}

		const row = cell.closest('tr');
		if (!row) {
			return null;
		}

		// Skip spacer rows in virtual tables
		if (
			row.classList.contains('virtual-spacer-top') ||
			row.classList.contains('virtual-spacer-bottom')
		) {
			return null;
		}

		// Get row index - prefer data-index for virtual tables, fall back to DOM position
		let rowIndex = parseInt(row.getAttribute('data-index'), 10);
		if (isNaN(rowIndex)) {
			const tbody = row.closest('tbody');
			if (tbody) {
				const rows = Array.from(tbody.querySelectorAll('tr:not(.virtual-spacer-top):not(.virtual-spacer-bottom)'));
				rowIndex = rows.indexOf(row);
			}
		}

		// Get column index from cell position
		const colIndex = Array.from(row.cells).indexOf(cell);

		if (rowIndex < 0 || colIndex < 0) {
			return null;
		}

		return { rowIndex, colIndex };
	}

	/**
	 * Checks if a click target is an interactive element that should handle its own click.
	 * @param {EventTarget} target - The event target
	 * @returns {boolean}
	 */
	function isInteractiveElement(target) {
		if (!(target instanceof Element)) {
			return false;
		}

		// Check for links, buttons, and elements with click commands
		const interactive = target.closest(
			'a, button, .record-link, .record-copy-btn, [data-command], input, select, textarea'
		);
		return interactive !== null;
	}

	/**
	 * Starts a new selection at the given cell.
	 * @param {HTMLTableCellElement} cell - The starting cell
	 * @param {boolean} extendSelection - If true, extend from existing anchor (Shift+click)
	 */
	function startSelection(cell, extendSelection = false) {
		const coords = getCellCoords(cell);
		if (!coords) {
			return;
		}

		isFullTableSelected = false;

		if (extendSelection && anchor) {
			// Shift+click: extend from existing anchor
			focus = coords;
		} else {
			// New selection
			anchor = coords;
			focus = coords;
		}

		renderSelection();
	}

	/**
	 * Extends the selection to the given cell (during drag).
	 * @param {HTMLTableCellElement} cell - The target cell
	 */
	function extendSelection(cell) {
		const coords = getCellCoords(cell);
		if (!coords || !anchor) {
			return;
		}

		focus = coords;
		isFullTableSelected = false;
		renderSelection();
	}

	/**
	 * Selects all cells in the table.
	 * Called by KeyboardSelectionBehavior for Ctrl+A.
	 */
	function selectAll() {
		const totalRows = getTotalRowCount ? getTotalRowCount() : 0;
		const totalCols = columns.length;

		if (totalRows === 0 || totalCols === 0) {
			return;
		}

		anchor = { rowIndex: 0, colIndex: 0 };
		focus = { rowIndex: totalRows - 1, colIndex: totalCols - 1 };
		isFullTableSelected = true;

		renderSelection();
	}

	/**
	 * Clears the cell selection.
	 */
	function clearSelection() {
		anchor = null;
		focus = null;
		isDragging = false;
		isFullTableSelected = false;

		// Remove visual selection from all cells
		if (activeTable) {
			const cells = activeTable.querySelectorAll('td.cell-selected');
			cells.forEach(cell => {
				cell.classList.remove(
					'cell-selected',
					'cell-selected-top',
					'cell-selected-bottom',
					'cell-selected-left',
					'cell-selected-right'
				);
			});
		}
	}

	/**
	 * Renders the visual selection state on the table.
	 * Applies CSS classes to selected cells with border edges.
	 */
	function renderSelection() {
		if (!activeTable) {
			return;
		}

		const range = getRange();
		const tbody = activeTable.querySelector('tbody');
		if (!tbody) {
			return;
		}

		// Clear existing selection classes
		const cells = activeTable.querySelectorAll('td.cell-selected');
		cells.forEach(cell => {
			cell.classList.remove(
				'cell-selected',
				'cell-selected-top',
				'cell-selected-bottom',
				'cell-selected-left',
				'cell-selected-right'
			);
		});

		if (!range) {
			return;
		}

		// Apply selection classes to cells in range
		const rows = tbody.querySelectorAll('tr:not(.virtual-spacer-top):not(.virtual-spacer-bottom)');
		rows.forEach(row => {
			// Get row index - prefer data-index for virtual tables
			let rowIndex = parseInt(row.getAttribute('data-index'), 10);
			if (isNaN(rowIndex)) {
				rowIndex = Array.from(rows).indexOf(row);
			}

			if (rowIndex < range.startRow || rowIndex > range.endRow) {
				return;
			}

			const cellElements = row.querySelectorAll('td');
			cellElements.forEach((cell, colIndex) => {
				if (colIndex < range.startCol || colIndex > range.endCol) {
					return;
				}

				cell.classList.add('cell-selected');

				// Add edge classes for border styling
				if (rowIndex === range.startRow) {
					cell.classList.add('cell-selected-top');
				}
				if (rowIndex === range.endRow) {
					cell.classList.add('cell-selected-bottom');
				}
				if (colIndex === range.startCol) {
					cell.classList.add('cell-selected-left');
				}
				if (colIndex === range.endCol) {
					cell.classList.add('cell-selected-right');
				}
			});
		});
	}

	/**
	 * Gets selected cell data as TSV (tab-separated values).
	 * Headers are included when the entire table is selected (Ctrl+A OR manual full selection).
	 * @returns {string|null} TSV string or null if no selection
	 */
	function getSelectedDataAsTsv() {
		const range = getRange();
		if (!range || !getRowData) {
			return null;
		}

		const lines = [];

		// Check if entire table is selected (either via Ctrl+A or manual drag selection)
		const totalRows = getTotalRowCount ? getTotalRowCount() : 0;
		const totalCols = columns.length;
		const coversEntireTable =
			range.startRow === 0 &&
			range.endRow === totalRows - 1 &&
			range.startCol === 0 &&
			range.endCol === totalCols - 1;

		// Headers when full table is selected (by any means)
		if ((isFullTableSelected || coversEntireTable) && columns.length > 0) {
			const headers = columns
				.slice(range.startCol, range.endCol + 1)
				.map(c => c.header || c.label || c.key || '');
			lines.push(headers.join('\t'));
		}

		// Data rows
		for (let r = range.startRow; r <= range.endRow; r++) {
			const rowData = getRowData(r);
			if (!rowData) {
				continue;
			}

			const cells = [];
			for (let c = range.startCol; c <= range.endCol; c++) {
				const col = columns[c];
				if (!col) {
					cells.push('');
					continue;
				}

				const value = rowData[col.key];
				cells.push(value !== null && value !== undefined ? String(value) : '');
			}
			lines.push(cells.join('\t'));
		}

		return lines.length > 0 ? lines.join('\n') : null;
	}

	/**
	 * Handles mousedown on a cell.
	 * @param {MouseEvent} event
	 */
	function handleMouseDown(event) {
		// Don't intercept clicks on interactive elements
		if (isInteractiveElement(event.target)) {
			return;
		}

		const cell = /** @type {Element} */ (event.target).closest('td');
		if (!cell) {
			return;
		}

		// Shift+click extends selection
		const extendSelection = event.shiftKey && anchor !== null;

		startSelection(cell, extendSelection);
		isDragging = !extendSelection; // Only start drag for non-shift clicks

		if (isDragging) {
			// Add selecting class for cursor change
			const tbody = activeTable?.querySelector('tbody');
			if (tbody) {
				tbody.classList.add('selecting');
			}
		}

		// Prevent text selection during drag
		event.preventDefault();
	}

	/**
	 * Handles mousemove during drag selection.
	 * @param {MouseEvent} event
	 */
	function handleMouseMove(event) {
		if (!isDragging || !anchor) {
			return;
		}

		const cell = /** @type {Element} */ (event.target).closest('td');
		if (cell) {
			extendSelection(cell);
		}

		// Auto-scroll if near edges (for virtual tables)
		const scrollWrapper = document.getElementById('virtualScrollWrapper');
		if (scrollWrapper) {
			const rect = scrollWrapper.getBoundingClientRect();
			const scrollMargin = 40;

			if (event.clientY < rect.top + scrollMargin) {
				scrollWrapper.scrollTop -= 20;
			} else if (event.clientY > rect.bottom - scrollMargin) {
				scrollWrapper.scrollTop += 20;
			}
		}
	}

	/**
	 * Handles mouseup to end drag selection.
	 */
	function handleMouseUp() {
		if (isDragging) {
			isDragging = false;

			// Remove selecting class
			const tbody = activeTable?.querySelector('tbody');
			if (tbody) {
				tbody.classList.remove('selecting');
			}
		}
	}

	/**
	 * Attaches cell selection behavior to a table.
	 * @param {HTMLTableElement} table - The table element
	 * @param {Object} options - Configuration options
	 * @param {Array} options.columns - Column definitions [{key, header}]
	 * @param {Function} options.getRowData - Function(rowIndex) => rowData
	 * @param {Function} options.getTotalRowCount - Function() => number
	 */
	function attach(table, options = {}) {
		if (!table) {
			return;
		}

		// Detach from previous table
		detach();

		activeTable = table;
		columns = options.columns || [];
		getRowData = options.getRowData || null;
		getTotalRowCount = options.getTotalRowCount || null;

		// Add event listeners
		table.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	/**
	 * Detaches cell selection behavior from the current table.
	 */
	function detach() {
		if (activeTable) {
			activeTable.removeEventListener('mousedown', handleMouseDown);
		}
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);

		clearSelection();
		activeTable = null;
		columns = [];
		getRowData = null;
		getTotalRowCount = null;
	}

	/**
	 * Updates the column configuration (for dynamic tables).
	 * @param {Array} newColumns - New column definitions
	 */
	function updateColumns(newColumns) {
		columns = newColumns || [];
	}

	/**
	 * Re-renders the selection (call after virtual table scroll).
	 */
	function refresh() {
		renderSelection();
	}

	// Expose API globally
	window.CellSelectionBehavior = {
		attach: attach,
		detach: detach,
		selectAll: selectAll,
		clearSelection: clearSelection,
		hasSelection: hasSelection,
		getSelectionCount: getSelectionCount,
		getSelectedDataAsTsv: getSelectedDataAsTsv,
		isFullTableSelected: checkIsFullTableSelected,
		isCellSelected: isCellSelected,
		getRange: getRange,
		updateColumns: updateColumns,
		refresh: refresh
	};
})();
