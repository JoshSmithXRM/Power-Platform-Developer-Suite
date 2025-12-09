/**
 * Virtual Scroll Script Generator
 *
 * Generates inline JavaScript for virtual scrolling in contexts that can't
 * load external scripts (e.g., notebook output iframes).
 *
 * IMPORTANT: This uses the same spacer row approach as VirtualTableRenderer.js.
 * If you change the core algorithm here, update VirtualTableRenderer.js too.
 * See: resources/webview/js/renderers/VirtualTableRenderer.js
 */

/**
 * Configuration for virtual scroll script generation.
 */
export interface VirtualScrollConfig {
	/** Height of each row in pixels */
	rowHeight: number;
	/** Number of rows to render above/below visible area */
	overscan: number;
	/** ID of the scroll container element */
	scrollContainerId: string;
	/** ID of the tbody element */
	tbodyId: string;
	/** Number of columns (for spacer row colspan) */
	columnCount: number;
}

/**
 * Generates inline JavaScript for virtual scrolling.
 *
 * Uses spacer row approach (same as VirtualTableRenderer.js):
 * - Top spacer row with calculated height
 * - Visible rows in normal table flow
 * - Bottom spacer row with calculated height
 *
 * This keeps rows in normal flow so table columns auto-size properly.
 *
 * @param rowDataJson - JSON string of row data array (each row is array of cell HTML)
 * @param config - Virtual scroll configuration
 * @returns JavaScript code as a string (wrap in <script> tags)
 */
export function generateVirtualScrollScript(
	rowDataJson: string,
	config: VirtualScrollConfig
): string {
	return `
(function() {
	const ROW_HEIGHT = ${config.rowHeight};
	const OVERSCAN = ${config.overscan};
	const rowData = ${rowDataJson};
	const totalRows = rowData.length;
	const columnCount = ${config.columnCount};

	const container = document.getElementById('${config.scrollContainerId}');
	const tbody = document.getElementById('${config.tbodyId}');

	if (!container || !tbody) {
		console.error('VirtualScroll: Missing container or tbody element');
		return;
	}

	let lastStart = -1;
	let lastEnd = -1;

	function createSpacerRow(height) {
		if (height <= 0) return '';
		return '<tr class="virtual-spacer"><td colspan="' + columnCount + '" style="height:' + height + 'px;padding:0;border:none;"></td></tr>';
	}

	function renderVisibleRows() {
		const scrollTop = container.scrollTop;
		const containerHeight = container.clientHeight;

		// Calculate visible range
		const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
		const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);

		// Skip if range hasn't changed
		if (startRow === lastStart && endRow === lastEnd) return;
		lastStart = startRow;
		lastEnd = endRow;

		// Calculate spacer heights
		const topSpacerHeight = startRow * ROW_HEIGHT;
		const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * ROW_HEIGHT);

		// Build rows HTML with spacers (normal flow, not absolute positioning)
		let html = createSpacerRow(topSpacerHeight);
		for (let i = startRow; i < endRow; i++) {
			const row = rowData[i];
			const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd';
			html += '<tr class="data-row ' + rowClass + '">';
			for (let j = 0; j < row.length; j++) {
				html += '<td class="data-cell">' + row[j] + '</td>';
			}
			html += '</tr>';
		}
		html += createSpacerRow(bottomSpacerHeight);

		tbody.innerHTML = html;
	}

	// Initial render
	renderVisibleRows();

	// Re-render on scroll (using requestAnimationFrame for smooth rendering)
	let scrollTimer = null;
	container.addEventListener('scroll', function() {
		if (scrollTimer) {
			cancelAnimationFrame(scrollTimer);
		}
		scrollTimer = requestAnimationFrame(function() {
			renderVisibleRows();
			scrollTimer = null;
		});
	});
})();
`;
}
