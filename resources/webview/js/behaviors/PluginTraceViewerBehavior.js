/**
 * Plugin Trace Viewer Behavior
 * Handles all client-side interactions for the Plugin Trace Viewer panel.
 */

window.createBehavior({
	initialize() {
		setupTraceLevelButton();
		setupDetailPanelTabs();
		setupDetailPanelVisibility();
		setupRowSelection();
		initializeDropdowns();
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
 * @param {Object} data - Update data containing viewModels and columns
 */
function updateTableData(data) {
	const { viewModels, columns } = data;

	// Get table body
	const tbody = document.querySelector('tbody');
	if (!tbody) {
		console.warn('[PluginTraceViewer] No tbody found for table update');
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

/**
 * Sets up the trace level change button handler.
 */
function setupTraceLevelButton() {
	const changeLevelBtn = document.getElementById('changeLevelBtn');
	if (!changeLevelBtn) {
		return;
	}

	changeLevelBtn.addEventListener('click', () => {
		const levels = ['Off', 'Exception', 'All'];
		const currentLevelEl = document.getElementById('currentTraceLevel');
		if (!currentLevelEl) {
			return;
		}

		const currentLevel = currentLevelEl.textContent;
		const currentIndex = levels.indexOf(currentLevel);
		const nextIndex = (currentIndex + 1) % levels.length;
		const nextLevel = levels[nextIndex];

		vscode.postMessage({
			command: 'setTraceLevel',
			data: { level: nextLevel }
		});
	});
}

/**
 * Sets up tab switching in the detail panel.
 */
function setupDetailPanelTabs() {
	const tabButtons = document.querySelectorAll('.tab-btn');

	tabButtons.forEach(btn => {
		btn.addEventListener('click', (e) => {
			const targetTab = e.target.dataset.tab;

			// Update button states
			tabButtons.forEach(b => b.classList.remove('active'));
			e.target.classList.add('active');

			// Update tab content visibility
			document.querySelectorAll('.tab-content').forEach(content => {
				content.classList.remove('active');
			});

			const targetContent = document.getElementById('tab-' + targetTab);
			if (targetContent) {
				targetContent.classList.add('active');
			}
		});
	});
}

/**
 * Listens for show/hide detail panel commands from extension.
 */
function setupDetailPanelVisibility() {
	window.addEventListener('message', event => {
		const message = event.data;
		const detailSection = document.querySelector('.detail-section');

		if (message.command === 'showDetailPanel' && detailSection) {
			detailSection.classList.remove('hidden');
		} else if (message.command === 'hideDetailPanel' && detailSection) {
			detailSection.classList.add('hidden');
			// Clear row selection when closing detail panel
			clearRowSelection();
		} else if (message.command === 'selectRow' && message.traceId) {
			// Find and select the row with the matching trace ID
			selectRowByTraceId(message.traceId);
		}
	});
}

/**
 * Sets up row selection highlighting when viewing trace details.
 */
function setupRowSelection() {
	// Listen for clicks on trace links - use capture phase to run before messaging.js
	document.addEventListener('click', (e) => {
		// Check if clicked element has viewDetail command
		const target = e.target.closest('[data-command="viewDetail"]');
		if (target) {
			// Find the parent row
			const row = target.closest('tr');
			if (row) {
				// Remove selected class from all rows
				clearRowSelection();
				// Add selected class to clicked row
				row.classList.add('selected');
			}
		}

		// Check if clicked element is close button
		const closeBtn = e.target.closest('[data-command="closeDetail"]');
		if (closeBtn) {
			clearRowSelection();
		}
	}, true); // Use capture phase to run before other handlers
}

/**
 * Removes selection highlighting from all table rows.
 */
function clearRowSelection() {
	const rows = document.querySelectorAll('tbody tr');
	rows.forEach(row => row.classList.remove('selected'));
}

/**
 * Selects a row by finding the element with matching trace ID.
 */
function selectRowByTraceId(traceId) {
	// Clear existing selection
	clearRowSelection();

	// Find the link with matching data-trace-id
	const link = document.querySelector(`[data-trace-id="${traceId}"]`);
	if (link) {
		const row = link.closest('tr');
		if (row) {
			row.classList.add('selected');
		}
	}
}
