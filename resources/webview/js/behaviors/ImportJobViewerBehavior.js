/**
 * Import Job Viewer Behavior
 * Handles client-side interactions for the Import Job Viewer panel.
 */

window.createBehavior({
	initialize() {
		// Wire up click handlers for job links using event delegation
		// (handles dynamically added rows from virtual table updates)
		wireJobLinkClicks();
	},
	handleMessage(message) {
		// Handle data-driven updates
		if (message.command === 'updateTableData') {
			updateTableData(message.data);
		}
	}
});

/**
 * Wires up click handlers for import job links.
 * Uses event delegation on document body to handle dynamically added rows.
 */
function wireJobLinkClicks() {
	document.body.addEventListener('click', (event) => {
		const link = event.target.closest('.job-link');
		if (link) {
			event.preventDefault();
			const importJobId = link.getAttribute('data-id');
			if (importJobId) {
				window.vscode.postMessage({
					command: 'viewImportJob',
					data: { importJobId }
				});
			}
		}
	});
}

/**
 * Updates table data without full page refresh.
 * Uses TableRenderer to update tbody only, preserving event listeners.
 *
 * @param {Object} data - Update data containing viewModels, columns, and optional isLoading flag
 */
function updateTableData(data) {
	const { viewModels, columns, isLoading, noDataMessage } = data;

	// Get table body
	const tbody = document.querySelector('tbody');
	if (!tbody) {
		console.warn('[ImportJobViewer] No tbody found for table update');
		return;
	}

	// Show loading state if still loading
	if (isLoading) {
		// Pass tbody directly to showTableLoading
		window.TableRenderer.showTableLoading(tbody, 'Loading import jobs...');
		return;
	}

	// Render new rows using TableRenderer
	const rowsHtml = window.TableRenderer.renderTableRows(viewModels, columns, noDataMessage);

	// Update tbody (preserves event listeners on other elements)
	tbody.innerHTML = rowsHtml;

	// Re-apply search filter if there's a search value
	const searchInput = document.getElementById('searchInput');
	if (searchInput && searchInput.value) {
		// Trigger input event to re-run search filter
		searchInput.dispatchEvent(new Event('input', { bubbles: true }));
	} else {
		// No search active - update footer with full count
		window.TableRenderer.updateTableFooter(viewModels.length);
	}

	// Re-apply row striping (handled by DataTableBehavior)
	const table = document.querySelector('table');
	if (table) {
		const event = new Event('tableUpdated', { bubbles: true });
		table.dispatchEvent(event);
	}
}
