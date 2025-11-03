import * as vscode from 'vscode';

import { ILogger } from '../../../infrastructure/logging/ILogger';
import { VsCodeCancellationTokenAdapter } from '../adapters/VsCodeCancellationTokenAdapter';
import {
	isWebviewMessage,
	isWebviewLogMessage,
	isRefreshDataMessage,
	isEnvironmentChangedMessage,
	type WebviewLogMessage
} from '../../../infrastructure/ui/utils/TypeGuards';

/**
 * Environment option for dropdown
 */
export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
	readonly url: string;
}

/**
 * Column definition for data table
 */
export interface DataTableColumn {
	readonly key: string;
	readonly label: string;
}

/**
 * Configuration for data table panel
 */
export interface DataTableConfig {
	readonly viewType: string;
	readonly title: string;
	readonly dataCommand: string;
	readonly defaultSortColumn: string;
	readonly defaultSortDirection: 'asc' | 'desc';
	readonly columns: ReadonlyArray<DataTableColumn>;
	readonly searchPlaceholder: string;
	readonly openMakerButtonText: string;
	readonly noDataMessage: string;
	readonly enableSearch?: boolean; // Default: true
}

/**
 * Abstract base class for data table panels using Template Method pattern.
 *
 * ARCHITECTURE DECISION:
 * - Uses inheritance over composition for simplicity (current panels have identical needs)
 * - Provides search, sort, environment management, error handling, loading states
 * - Trade-off: Slight SRP violation for massive DRY benefit (eliminated ~950 lines)
 *
 * EXTENSIBILITY:
 * - Search is optional via config.enableSearch (default: true)
 * - Override getFilterLogic() for custom search (default: no filtering)
 * - Override getCustomCss/JavaScript for panel-specific behavior
 *
 * FUTURE: If you need a panel without search/sort/table, create a separate base class
 * or consider composition (SearchComponent, SortComponent, etc.)
 *
 * Derived classes implement panel-specific data loading and actions.
 *
 * TODO: TECHNICAL DEBT - DataTablePanel violates SRP
 * This class handles 8+ responsibilities (environment management, search, sorting,
 * error handling, loading states, HTML generation, message routing, cancellation).
 * Trade-off: Eliminated 950 lines of duplication vs. SRP violation.
 * When a 3rd panel type emerges that doesn't fit this pattern, refactor to composition:
 * - Extract SearchBehavior, SortBehavior, EnvironmentSwitchBehavior components
 * - Use composition over inheritance
 * - See: docs/TECHNICAL_DEBT.md for details
 */
export abstract class DataTablePanel {
	protected cancellationTokenSource: vscode.CancellationTokenSource | null = null;
	protected currentEnvironmentId: string | null = null;
	protected environments: EnvironmentOption[] = [];
	protected disposables: vscode.Disposable[] = [];

	constructor(
		protected readonly panel: vscode.WebviewPanel,
		protected readonly extensionUri: vscode.Uri,
		protected readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		protected readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId?: string } | null>,
		protected readonly logger: ILogger,
		protected readonly initialEnvironmentId?: string
	) {
		this.logger.debug(`${this.getConfig().title} Panel: Initialized`);

		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		this.panel.webview.html = this.getHtmlContent();

		this.panel.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			null,
			this.disposables
		);

		this.panel.onDidDispose(() => {
			this.logger.debug(`${this.getConfig().title} Panel: Disposed`);
			this.dispose();
		}, null, this.disposables);

		this.initialize();
	}

	/**
	 * Returns the panel configuration.
	 * Must be implemented by derived classes.
	 */
	protected abstract getConfig(): DataTableConfig;

	/**
	 * Loads data for the current environment.
	 * Must be implemented by derived classes.
	 */
	protected abstract loadData(): Promise<void>;

	/**
	 * Handles panel-specific commands from webview.
	 * Must be implemented by derived classes.
	 */
	protected abstract handlePanelCommand(command: string, data: unknown): Promise<void>;

	/**
	 * Returns filter logic JavaScript for panel-specific filtering.
	 * Override to customize search behavior. Default: returns all data unfiltered.
	 *
	 * EXECUTION TIMING: Code runs during search input processing, before rendering.
	 * Access 'query' variable (lowercase search text) and 'allData' array.
	 *
	 * @returns JavaScript code snippet that sets 'filtered' variable
	 */
	protected getFilterLogic(): string {
		return 'filtered = allData;';
	}

	/**
	 * Returns custom CSS for panel-specific styling.
	 * Override to add custom status colors, hover states, or other visual styles.
	 * @returns CSS string to inject into webview (default: empty)
	 */
	protected getCustomCss(): string {
		return '';
	}

	/**
	 * Returns custom JavaScript for panel-specific behavior.
	 * Override to attach event handlers to custom elements (e.g., clickable links).
	 *
	 * EXECUTION TIMING: Code runs after table rendering - safe to query DOM elements.
	 *
	 * @returns JavaScript code snippet to execute after rendering (default: empty)
	 */
	protected getCustomJavaScript(): string {
		return '';
	}

	/**
	 * Initializes the panel by loading environments and initial data.
	 */
	private async initialize(): Promise<void> {
		try {
			this.environments = await this.getEnvironments();
			this.panel.webview.postMessage({ command: 'environmentsData', data: this.environments });

			this.currentEnvironmentId = this.initialEnvironmentId || this.environments[0]?.id;

			// Send current environment ID to webview so dropdown shows correct selection
			if (this.currentEnvironmentId) {
				this.panel.webview.postMessage({
					command: 'setCurrentEnvironment',
					environmentId: this.currentEnvironmentId
				});
			}

			// Check if current environment has Power Platform Environment ID configured
			let hasPowerPlatformEnvId = false;
			if (this.currentEnvironmentId) {
				const environment = await this.getEnvironmentById(this.currentEnvironmentId);
				hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;
			}

			// Notify webview if Open in Maker should be disabled
			this.panel.webview.postMessage({
				command: 'setMakerButtonState',
				enabled: hasPowerPlatformEnvId
			});

			await this.updateTabTitle();
			await this.loadData();
		} catch (error) {
			const config = this.getConfig();
			this.logger.error(`Failed to initialize ${config.title} panel`, error);
			this.handleError(error);
		}
	}

	/**
	 * Switches to a different environment and reloads data.
	 * Updates Maker button state based on whether Power Platform Environment ID is configured.
	 * @param environmentId - Internal environment ID to switch to
	 */
	protected async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return;
		}

		this.logger.info('Switching environment', { from: this.currentEnvironmentId, to: environmentId });
		this.currentEnvironmentId = environmentId;

		// Check if new environment has Power Platform Environment ID configured
		const environment = await this.getEnvironmentById(environmentId);
		const hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;

		// Update Maker button state based on whether Power Platform Environment ID exists
		this.panel.webview.postMessage({
			command: 'setMakerButtonState',
			enabled: hasPowerPlatformEnvId
		});

		await this.updateTabTitle();
		await this.loadData();
	}

	/**
	 * Updates the panel tab title to include the current environment name.
	 */
	protected async updateTabTitle(): Promise<void> {
		const config = this.getConfig();

		if (!this.currentEnvironmentId) {
			this.panel.title = config.title;
			return;
		}

		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (environment) {
				this.panel.title = `${config.title} - ${environment.name}`;
			}
		} catch (error) {
			this.logger.warn('Failed to update tab title', error);
		}
	}

	/**
	 * Handles messages received from the webview.
	 */
	private async handleMessage(message: unknown): Promise<void> {
		if (!isWebviewMessage(message)) {
			this.logger.warn('Received invalid message from webview', message);
			return;
		}

		try {
			if (isWebviewLogMessage(message)) {
				this.handleWebviewLog(message);
				return;
			}

			this.logger.debug(`Handling webview command: ${message.command}`);

			if (isRefreshDataMessage(message)) {
				await this.loadData();
				return;
			}

			if (isEnvironmentChangedMessage(message)) {
				await this.switchEnvironment(message.data.environmentId);
				return;
			}

			// Delegate to panel-specific command handler
			await this.handlePanelCommand(message.command, message.data);
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error);
		}
	}

	/**
	 * Forwards webview logs to the extension logger.
	 * Enables debugging of webview JavaScript by routing console logs to VS Code output channel.
	 * @param message - Webview log message with level and content
	 */
	protected handleWebviewLog(message: WebviewLogMessage): void {
		const logMessage = `[Webview] ${message.message}`;

		switch (message.level) {
			case 'debug':
				this.logger.debug(logMessage);
				break;
			case 'info':
				this.logger.info(logMessage);
				break;
			case 'warn':
				this.logger.warn(logMessage);
				break;
			case 'error':
				this.logger.error(logMessage);
				break;
		}
	}

	/**
	 * Handles errors by displaying them in the webview.
	 * Converts error to user-friendly message and sends to webview for display.
	 * @param error - Error object or value to display
	 */
	protected handleError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);

		this.panel.webview.postMessage({
			command: 'error',
			error: errorMessage
		});
	}

	/**
	 * Sends loading state to webview.
	 * Updates UI to show spinner during data fetch operations.
	 * @param isLoading - True to show loading spinner, false to hide
	 */
	protected setLoading(isLoading: boolean): void {
		this.panel.webview.postMessage({ command: isLoading ? 'loading' : 'loaded' });
	}

	/**
	 * Sends data to webview.
	 * Transmits data array to webview for rendering in the table.
	 * @param data - Array of data objects to display
	 */
	protected sendData(data: unknown[]): void {
		const config = this.getConfig();
		this.panel.webview.postMessage({
			command: config.dataCommand,
			data
		});
	}

	/**
	 * Creates cancellation token for async operations.
	 * Cancels any previous operation to prevent race conditions when switching environments.
	 * @returns Adapter wrapping VS Code cancellation token
	 */
	protected createCancellationToken(): VsCodeCancellationTokenAdapter {
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource = new vscode.CancellationTokenSource();
		return new VsCodeCancellationTokenAdapter(this.cancellationTokenSource.token);
	}

	/**
	 * Escapes HTML special characters to prevent XSS.
	 * Use when injecting user-controlled data into HTML.
	 */
	protected escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Gets CSS class for status display.
	 * Common status styling across panels.
	 */
	protected getStatusClass(status: string): string {
		if (status === 'Completed') return 'status-completed';
		if (status === 'Failed' || status === 'Cancelled') return 'status-failed';
		if (status === 'In Progress' || status === 'Queued') return 'status-in-progress';
		return '';
	}

	/**
	 * Generates the HTML content for the webview.
	 */
	private getHtmlContent(): string {
		const config = this.getConfig();
		const datatableCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'datatable.css')
		);

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
		${this.getCustomCss()}
	</style>
</head>
<body>
	<div class="toolbar">
		<div class="toolbar-left">
			<button id="openMakerBtn">${config.openMakerButtonText}</button>
			<button id="refreshBtn">Refresh</button>
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

				case 'setCurrentEnvironment':
					const select = document.getElementById('environmentSelect');
					select.value = message.environmentId;
					saveState({ currentEnvironmentId: message.environmentId });
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
				${this.getFilterLogic()}
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

			if (!data || data.length === 0) {
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
				html += '<th data-sort="' + col.key + '">' + col.label + sortIndicator + '</th>';
			});
			html += '</tr></thead><tbody>';

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
			${this.getCustomJavaScript()}
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

	/**
	 * Disposes the panel and cleans up resources.
	 */
	public dispose(): void {
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();

		this.panel.dispose();

		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}
}
