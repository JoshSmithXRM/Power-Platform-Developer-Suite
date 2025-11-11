/**
 * Environment Variables Behavior
 * Handles client-side interactions for the Environment Variables panel.
 */

window.createBehavior({
	initialize() {
		// DataTableBehavior handles search and sorting
	},
	handleMessage(message) {
		// Handle data-driven updates
		if (message.command === 'updateTableData') {
			updateTableData(message.data);
		}
	}
});

/**
 * Updates table data without full page refresh.
 * Uses TableRenderer to update tbody only, preserving event listeners.
 *
 * @param {Object} data - Update data containing viewModels, columns, and optional isLoading flag
 */
function updateTableData(data) {
	const { viewModels, columns, isLoading } = data;

	// Get table body
	const tbody = document.querySelector('tbody');
	if (!tbody) {
		console.warn('[EnvironmentVariables] No tbody found for table update');
		return;
	}

	// Show loading state if still loading
	if (isLoading) {
		// Pass tbody directly to showTableLoading
		window.TableRenderer.showTableLoading(tbody, 'Loading environment variables...');
		return;
	}

	// Render new rows using TableRenderer
	const rowsHtml = window.TableRenderer.renderTableRows(viewModels, columns);

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
