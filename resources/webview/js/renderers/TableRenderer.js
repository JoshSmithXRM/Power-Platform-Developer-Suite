/**
 * Table Renderer
 * Frontend rendering functions for data tables.
 * Receives ViewModels from backend and generates HTML.
 */

/**
 * HTML escape utility (copied from backend escapeHtml)
 */
function escapeHtml(text) {
	if (text === null || text === undefined) {
		return '';
	}
	const str = String(text);
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return str.replace(/[&<>"']/g, char => map[char] || char);
}

/**
 * Renders table rows from ViewModels.
 *
 * @param {Array} viewModels - Array of PluginTraceTableRowViewModel objects
 * @param {Array} columns - Column configuration [{key, label, width}]
 * @returns {string} HTML string for table rows
 */
function renderTableRows(viewModels, columns) {
	if (!viewModels || viewModels.length === 0) {
		return renderNoDataRow(columns.length, 'No plugin traces found. Adjust your trace level to start logging.');
	}

	return viewModels.map(row => renderTableRow(row, columns)).join('');
}

/**
 * Renders single table row.
 *
 * @param {Object} row - PluginTraceTableRowViewModel
 * @param {Array} columns - Column configuration
 * @returns {string} HTML for <tr>
 */
function renderTableRow(row, columns) {
	const cells = columns.map(col => {
		const value = row[col.key];
		const cellClass = row[col.key + 'Class'] || '';
		const cellHtml = row[col.key + 'Html'] || escapeHtml(value || '');
		return `<td class="${cellClass}">${cellHtml}</td>`;
	}).join('');

	return `<tr>${cells}</tr>`;
}

/**
 * Renders "No data" message row.
 *
 * @param {number} columnCount - Number of columns
 * @param {string} message - Message to display
 * @returns {string} HTML for "no data" row
 */
function renderNoDataRow(columnCount, message) {
	return `
		<tr>
			<td colspan="${columnCount}" style="text-align: center; padding: 24px; color: var(--vscode-descriptionForeground);">
				${escapeHtml(message)}
			</td>
		</tr>
	`;
}

/**
 * Updates table footer with record count.
 *
 * @param {number} count - Number of records
 */
function updateTableFooter(count) {
	const footer = document.querySelector('.table-footer');
	if (footer) {
		const recordText = count === 1 ? 'record' : 'records';
		footer.textContent = `${count} ${recordText}`;
	}
}

// Make functions available globally
window.TableRenderer = {
	renderTableRows,
	renderTableRow,
	renderNoDataRow,
	updateTableFooter
};
