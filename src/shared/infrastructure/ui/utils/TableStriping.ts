/**
 * Table striping utility for data tables with filtered rows.
 * Applies alternating row colors only to visible rows.
 */

/**
 * Applies striping classes to visible table rows.
 * Removes existing striping classes first to ensure consistency.
 *
 * @param tableElement - The table element containing rows to stripe
 */
export function applyRowStriping(tableElement: HTMLTableElement): void {
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
