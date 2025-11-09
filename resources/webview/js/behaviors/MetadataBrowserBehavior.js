/**
 * Metadata Browser webview behavior.
 * Handles dynamic updates to the attributes detail table.
 */

(function () {
	const vscode = acquireVsCodeApi();

	/**
	 * Handles messages from the extension
	 */
	window.addEventListener('message', event => {
		const message = event.data;

		switch (message.command) {
			case 'updateAttributesTable':
				updateAttributesTable(message.data.attributes);
				break;
			case 'htmlUpdated':
				// Re-attach event listeners after HTML refresh
				attachTableClickHandlers();
				break;
		}
	});

	/**
	 * Updates the attributes table with new data
	 */
	function updateAttributesTable(attributes) {
		const tableBody = document.querySelector('#attributesTable tbody');
		if (!tableBody) {
			console.error('Attributes table body not found');
			return;
		}

		if (!attributes || attributes.length === 0) {
			tableBody.innerHTML = `
				<tr class="empty-message">
					<td colspan="5">Select an entity to view attributes</td>
				</tr>
			`;
			return;
		}

		// Generate table rows
		const rows = attributes.map(attr => `
			<tr>
				<td>${escapeHtml(attr.displayName)}</td>
				<td>${escapeHtml(attr.logicalName)}</td>
				<td>${escapeHtml(attr.attributeTypeDisplay)}</td>
				<td>${escapeHtml(attr.requiredLevelDisplay)}</td>
				<td>${attr.isCustomAttribute ? 'Yes' : 'No'}</td>
			</tr>
		`).join('');

		tableBody.innerHTML = rows;
	}

	/**
	 * Attaches click handlers to entity table rows
	 */
	function attachTableClickHandlers() {
		// Main entity table click handler (handled by DataTableBehavior.js)
		// This function is called after HTML refresh to ensure handlers are attached
		const table = document.querySelector('.data-table');
		if (table) {
			table.addEventListener('click', handleTableClick);
		}
	}

	/**
	 * Handles row clicks in the entity table
	 */
	function handleTableClick(event) {
		const row = event.target.closest('tr');
		if (!row || !row.dataset.id) {
			return;
		}

		const logicalName = row.dataset.id;
		vscode.postMessage({
			command: 'selectEntity',
			logicalName: logicalName
		});
	}

	/**
	 * Escapes HTML to prevent XSS
	 */
	function escapeHtml(text) {
		if (text === null || text === undefined) {
			return '';
		}
		const div = document.createElement('div');
		div.textContent = String(text);
		return div.innerHTML;
	}

	// Initial setup
	attachTableClickHandlers();
})();
