/**
 * DataTable panel view.
 * Renders the complete HTML for data table webviews (ImportJobViewer, SolutionExplorer).
 */

import type { DataTableConfig } from '../DataTablePanel';

export interface DataTableViewResources {
	datatableCssUri: string;
	config: DataTableConfig;
	customCss: string;
	filterLogic: string;
	customJavaScript: string;
}

/**
 * Renders the complete DataTable panel HTML.
 * @param resources - Configuration and URIs for the data table
 * @returns Complete HTML document string
 */
export function renderDataTable(resources: DataTableViewResources): string {
	const { config, datatableCssUri, customCss, filterLogic, customJavaScript } = resources;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${config.title}</title>
	<link rel="stylesheet" href="${datatableCssUri}">
	<style>
		body {
			padding: 0;
			margin: 0;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			display: flex;
			flex-direction: column;
			height: 100vh;
			overflow: hidden;
		}
		.toolbar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px 16px;
			border-bottom: 1px solid var(--vscode-panel-border);
			gap: 12px;
		}
		.toolbar-left {
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.toolbar-right {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 6px 14px;
			cursor: pointer;
			font-size: 13px;
		}
		button:hover:not(:disabled) {
			background: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.spinner {
			display: inline-block;
			width: 14px;
			height: 14px;
			border: 2px solid var(--vscode-button-foreground);
			border-top-color: transparent;
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
			margin-right: 6px;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		select {
			background: var(--vscode-dropdown-background);
			color: var(--vscode-dropdown-foreground);
			border: 1px solid var(--vscode-dropdown-border);
			padding: 4px 8px;
			font-size: 13px;
			min-width: 200px;
		}
		.table-wrapper {
			display: flex;
			flex-direction: column;
			flex: 1;
			overflow: hidden;
		}
		.search-container {
			padding: 12px 16px;
			border-bottom: 1px solid var(--vscode-panel-border);
			flex-shrink: 0;
		}
		input[type="text"] {
			width: 100%;
			padding: 6px 8px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			font-size: 13px;
			box-sizing: border-box;
		}
		input[type="text"]:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		.table-content {
			flex: 1;
			overflow: auto;
		}
		.content {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}
		.error {
			color: var(--vscode-errorForeground);
			padding: 12px;
			background: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			margin: 16px;
		}
		#dataContainer {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}
		${customCss}
	</style>
</head>
<body>
	<div class="toolbar">
		<div class="toolbar-left">
			<button id="openMakerBtn">${config.openMakerButtonText}</button>
			<button id="refreshBtn">Refresh</button>
			<label for="solutionSelect" id="solutionSelectLabel" style="display: none;">Solution:</label>
			<select id="solutionSelect" style="display: none;">
			</select>
		</div>
		<div class="toolbar-right">
			<label for="environmentSelect">Environment:</label>
			<select id="environmentSelect">
				<option value="">Loading...</option>
			</select>
		</div>
	</div>

	<div class="content">
		<div id="errorContainer"></div>
		<div id="dataContainer"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const config = ${JSON.stringify(config)};
		let allData = [];
		let environments = [];
		let solutions = [];
		let sortColumn = config.defaultSortColumn;
		let sortDirection = config.defaultSortDirection;

		// Restore state on load
		const previousState = vscode.getState();
		if (previousState) {
			sortColumn = previousState.sortColumn || config.defaultSortColumn;
			sortDirection = previousState.sortDirection || config.defaultSortDirection;
		}

		// Event handlers
		document.getElementById('refreshBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'refresh' });
		});

		document.getElementById('openMakerBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'openMaker' });
		});

		document.getElementById('environmentSelect').addEventListener('change', (e) => {
			saveState({ currentEnvironmentId: e.target.value });
			vscode.postMessage({
				command: 'environmentChanged',
				data: { environmentId: e.target.value }
			});
		});

		document.getElementById('solutionSelect').addEventListener('change', (e) => {
			saveState({ currentSolutionId: e.target.value });
			vscode.postMessage({
				command: 'solutionChanged',
				data: { solutionId: e.target.value || null }
			});
		});

		// Search event handler function (will be attached in renderData)
		function handleSearchInput(e) {
			const query = e.target.value;
			saveState({ searchQuery: query });
			filterData(query.toLowerCase());
		}

		// Message handler
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.command) {
				case 'environmentsData':
					environments = message.data;
					populateEnvironmentDropdown();
					break;

				case 'solutionFilterOptionsData':
					solutions = message.data;
					populateSolutionDropdown();
					break;

				case 'setCurrentEnvironment':
					const select = document.getElementById('environmentSelect');
					select.value = message.environmentId;
					saveState({ currentEnvironmentId: message.environmentId });
					break;

				case 'setCurrentSolution':
					const solutionSelect = document.getElementById('solutionSelect');
					if (solutionSelect) {
						solutionSelect.value = message.solutionId;
						saveState({ currentSolutionId: message.solutionId });
					}
					break;

				case 'loading':
					setLoading(true);
					document.getElementById('errorContainer').innerHTML = '';
					break;

				case config.dataCommand:
					setLoading(false);
					allData = message.data;
					applySortAndFilter();
					break;

				case 'error':
					setLoading(false);
					document.getElementById('errorContainer').innerHTML =
						'<div class="error">' + escapeHtml(message.error) + '</div>';
					break;

				case 'setMakerButtonState':
					const openMakerBtn = document.getElementById('openMakerBtn');
					if (openMakerBtn) {
						openMakerBtn.disabled = !message.enabled;
						openMakerBtn.title = message.enabled ? '' : 'Environment ID not configured. Edit environment to add one.';
					}
					break;
			}
		});

		function saveState(updates) {
			const currentState = vscode.getState() || {};
			const newState = { ...currentState, ...updates };
			vscode.setState(newState);
		}

		function populateEnvironmentDropdown() {
			const select = document.getElementById('environmentSelect');
			select.innerHTML = environments.map(env =>
				'<option value="' + env.id + '">' + escapeHtml(env.name) + '</option>'
			).join('');

			// Restore selected environment from state
			const state = vscode.getState();
			if (state && state.currentEnvironmentId) {
				select.value = state.currentEnvironmentId;
			}
		}

		function populateSolutionDropdown() {
			const select = document.getElementById('solutionSelect');
			const label = document.getElementById('solutionSelectLabel');

			if (!select || !label) return;

			// Only show if panel has enableSolutionFilter and we have solutions
			if (!config.enableSolutionFilter || solutions.length === 0) {
				select.style.display = 'none';
				label.style.display = 'none';
				return;
			}

			select.innerHTML = '';
			solutions.forEach(solution => {
				const option = document.createElement('option');
				option.value = solution.id;
				option.textContent = solution.name + ' (' + solution.uniqueName + ')';
				select.appendChild(option);
			});

			// Restore previous selection from state
			const previousState = vscode.getState();
			if (previousState && previousState.currentSolutionId) {
				select.value = previousState.currentSolutionId;
			}

			select.style.display = '';
			label.style.display = '';
		}

		function setLoading(isLoading) {
			const btn = document.getElementById('refreshBtn');
			btn.disabled = isLoading;

			if (isLoading) {
				btn.innerHTML = '<span class="spinner"></span>';
			} else {
				btn.textContent = 'Refresh';
			}
		}

		function applySortAndFilter() {
			// Restore search query from state and apply filter
			const state = vscode.getState();
			const enableSearch = config.enableSearch !== false;

			if (enableSearch && state && state.searchQuery) {
				filterData(state.searchQuery.toLowerCase());
			} else {
				filterData('');
			}
		}

		function filterData(query) {
			let filtered = allData;

			if (query) {
				// Panel-specific filter logic
				${filterLogic}
			}

			const sorted = sortData(filtered, sortColumn, sortDirection);
			renderData(sorted);
		}

		function sortData(data, column, direction) {
			return [...data].sort((a, b) => {
				let aVal = a[column];
				let bVal = b[column];

				// Handle empty values
				if (!aVal && !bVal) return 0;
				if (!aVal) return 1;
				if (!bVal) return -1;

				// String comparison
				const comparison = aVal.localeCompare(bVal);
				return direction === 'asc' ? comparison : -comparison;
			});
		}

		function handleSort(column) {
			if (sortColumn === column) {
				sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				sortColumn = column;
				sortDirection = 'asc';
			}

			saveState({ sortColumn, sortDirection });
			applySortAndFilter();
		}

		function renderData(data) {
			const container = document.getElementById('dataContainer');
			const enableSearch = config.enableSearch !== false;

			// BEFORE re-rendering: Capture search input state
			const searchInput = document.getElementById('searchInput');
			let focusState = null;

			if (searchInput) {
				// Search input exists - capture current state
				focusState = {
					hadFocus: searchInput === document.activeElement,
					cursorPosition: searchInput.selectionStart || 0,
					value: searchInput.value || ''
				};
			} else {
				// First render - restore from saved state if available
				const state = vscode.getState();
				if (state && state.searchQuery) {
					focusState = {
						hadFocus: false,
						cursorPosition: 0,
						value: state.searchQuery
					};
				}
			}

			// Handle case where there's no data at all (not just filtered out)
			if (!allData || allData.length === 0) {
				container.innerHTML = '<p style="padding: 16px;">${config.noDataMessage}</p>';
				return;
			}

			const totalCount = allData.length;
			const displayedCount = data.length;
			const countText = displayedCount === totalCount
				? totalCount + ' record' + (totalCount !== 1 ? 's' : '')
				: displayedCount + ' of ' + totalCount + ' record' + (totalCount !== 1 ? 's' : '');

			// Start table-wrapper div (contains search + table as cohesive unit)
			let html = '<div class="table-wrapper">';

			// Add search bar if enabled
			if (enableSearch) {
				const searchValue = focusState?.value || '';
				html += '<div class="search-container">';
				html += '  <input type="text" id="searchInput" placeholder="' + escapeHtml(config.searchPlaceholder) + '" value="' + escapeHtml(searchValue) + '">';
				html += '</div>';
			}

			// Add table content
			html += '<div class="table-content">';
			html += '<div class="table-container">';
			html += '<table><thead><tr>';
			config.columns.forEach(col => {
				const sortIndicator = sortColumn === col.key
					? (sortDirection === 'asc' ? ' ▲' : ' ▼')
					: '';
				const widthAttr = col.width ? ' style="width: ' + col.width + '"' : '';
				html += '<th data-sort="' + col.key + '"' + widthAttr + '>' + col.label + sortIndicator + '</th>';
			});
			html += '</tr></thead><tbody>';

			if (data.length === 0) {
				// No results after filtering - show message in table
				html += '<tr><td colspan="' + config.columns.length + '" style="text-align: center; padding: 24px; color: var(--vscode-descriptionForeground);">No matching records found</td></tr>';
			} else {
				data.forEach(row => {
					html += '<tr>';
					config.columns.forEach(col => {
						const value = row[col.key];
						const cellClass = row[col.key + 'Class'] || '';
						const cellHtml = row[col.key + 'Html'] || escapeHtml(value);
						html += '<td class="' + cellClass + '">' + cellHtml + '</td>';
					});
					html += '</tr>';
				});
			}

			html += '</tbody></table>';
			html += '</div>'; // Close table-container
			html += '</div>'; // Close table-content
			html += '<div class="table-footer">' + countText + '</div>';
			html += '</div>'; // Close table-wrapper

			container.innerHTML = html;

			// AFTER re-rendering: Restore search input focus state
			if (focusState && focusState.hadFocus && enableSearch) {
				const newInput = document.getElementById('searchInput');
				if (newInput) {
					newInput.focus();
					newInput.setSelectionRange(focusState.cursorPosition, focusState.cursorPosition);
				}
			}

			// Re-attach search event listener if enabled
			if (enableSearch) {
				const newSearchInput = document.getElementById('searchInput');
				if (newSearchInput) {
					newSearchInput.addEventListener('input', handleSearchInput);
				}
			}

			// Attach sort handlers to table headers
			document.querySelectorAll('th[data-sort]').forEach(header => {
				header.addEventListener('click', () => {
					const column = header.getAttribute('data-sort');
					handleSort(column);
				});
			});

			// Panel-specific event handlers
			${customJavaScript}
		}

		function escapeHtml(text) {
			if (!text) return '';
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}
	</script>
</body>
</html>`;
}
