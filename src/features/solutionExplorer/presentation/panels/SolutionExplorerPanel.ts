import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { ListSolutionsUseCase } from '../../application/useCases/ListSolutionsUseCase';
import { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { Solution } from '../../domain/entities/Solution';
import {
	isWebviewMessage,
	isWebviewLogMessage,
	type WebviewLogMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';

/**
 * Environment option for dropdown
 */
interface EnvironmentOption {
	id: string;
	name: string;
	url: string;
}

/**
 * Presentation layer panel for Solution Explorer.
 * Displays solutions from a Power Platform environment with environment switching support.
 */
export class SolutionExplorerPanel {
	public static readonly viewType = 'powerPlatformDevSuite.solutionExplorer';
	private static currentPanel?: SolutionExplorerPanel;

	private solutions: Solution[] = [];
	private cancellationTokenSource: vscode.CancellationTokenSource | null = null;
	private currentEnvironmentId: string | null = null;
	private environments: EnvironmentOption[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listSolutionsUseCase: ListSolutionsUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		private readonly initialEnvironmentId?: string,
		private disposables: vscode.Disposable[] = []
	) {
		this.logger.debug('SolutionExplorerPanel: Initialized');

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
			this.logger.debug('SolutionExplorerPanel: Disposed');
			this.dispose();
		}, null, this.disposables);

		this.initialize();
	}

	/**
	 * Creates or shows the Solution Explorer panel.
	 */
	public static createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listSolutionsUseCase: ListSolutionsUseCase,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	): SolutionExplorerPanel {
		const column = vscode.ViewColumn.One;

		if (SolutionExplorerPanel.currentPanel) {
			SolutionExplorerPanel.currentPanel.panel.reveal(column);
			// If environment is specified, switch to it
			if (initialEnvironmentId) {
				void SolutionExplorerPanel.currentPanel.switchEnvironment(initialEnvironmentId);
			}
			return SolutionExplorerPanel.currentPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			SolutionExplorerPanel.viewType,
			'Solutions',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		SolutionExplorerPanel.currentPanel = new SolutionExplorerPanel(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listSolutionsUseCase,
			urlBuilder,
			logger,
			initialEnvironmentId
		);

		return SolutionExplorerPanel.currentPanel;
	}

	/**
	 * Initializes the panel by loading environments.
	 */
	private async initialize(): Promise<void> {
		try {
			this.environments = await this.getEnvironments();

			if (this.environments.length === 0) {
				this.panel.webview.postMessage({
					command: 'error',
					error: 'No environments configured. Please add an environment first.'
				});
				return;
			}

			// Send environments to webview
			this.panel.webview.postMessage({
				command: 'environmentsData',
				data: this.environments
			});

			// Set initial environment
			if (this.initialEnvironmentId) {
				this.currentEnvironmentId = this.initialEnvironmentId;
			} else {
				this.currentEnvironmentId = this.environments[0].id;
			}

			// Update tab title with environment name
			await this.updateTabTitle();

			// Load solutions for initial environment
			await this.loadSolutions();
		} catch (error) {
			this.logger.error('Failed to initialize Solution Explorer', error);
			this.handleError(error);
		}
	}

	/**
	 * Switches to a different environment and reloads solutions.
	 */
	private async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return; // Already on this environment
		}

		this.logger.info('Switching environment', { from: this.currentEnvironmentId, to: environmentId });
		this.currentEnvironmentId = environmentId;

		await this.updateTabTitle();
		await this.loadSolutions();
	}

	/**
	 * Updates the panel tab title with current environment name.
	 */
	private async updateTabTitle(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.panel.title = 'Solutions';
			return;
		}

		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (environment) {
				this.panel.title = `Solutions - ${environment.name}`;
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

			switch (message.command) {
				case 'refresh':
					await this.loadSolutions();
					break;
				case 'environmentChanged':
					if (typeof message.data === 'object' && message.data !== null && 'environmentId' in message.data) {
						await this.switchEnvironment((message.data as { environmentId: string }).environmentId);
					}
					break;
				case 'openInMaker':
					if (typeof message.data === 'object' && message.data !== null && 'solutionId' in message.data) {
						await this.handleOpenInMaker((message.data as { solutionId: string }).solutionId);
					}
					break;
				case 'openMakerSolutionsList':
					await this.handleOpenMakerSolutionsList();
					break;
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error);
		}
	}

	/**
	 * Loads solutions from the current environment.
	 */
	private async loadSolutions(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load solutions: No environment selected');
			return;
		}

		this.logger.info('Loading solutions', { environmentId: this.currentEnvironmentId });

		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource = new vscode.CancellationTokenSource();

		try {
			this.panel.webview.postMessage({ command: 'loading' });

			const cancellationToken = new VsCodeCancellationTokenAdapter(this.cancellationTokenSource.token);
			this.solutions = await this.listSolutionsUseCase.execute(
				this.currentEnvironmentId,
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = SolutionViewModelMapper.toViewModels(this.solutions);

			this.panel.webview.postMessage({
				command: 'solutionsData',
				data: viewModels
			});

			this.logger.info('Solutions loaded successfully', { count: this.solutions.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load solutions', error);
				this.handleError(error);
			}
		}
	}

	/**
	 * Opens a solution in the Maker Portal.
	 */
	private async handleOpenInMaker(solutionId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open solution: No environment selected');
			return;
		}

		const solution = this.solutions.find(s => s.id === solutionId);
		if (!solution) {
			this.logger.warn('Solution not found', { solutionId });
			return;
		}

		const url = this.urlBuilder.buildSolutionUrl(this.currentEnvironmentId, solution.id);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solution in Maker Portal', {
			solutionId: solution.id,
			uniqueName: solution.uniqueName
		});
	}

	/**
	 * Opens the solutions list in the Maker Portal.
	 */
	private async handleOpenMakerSolutionsList(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const url = this.urlBuilder.buildSolutionsListUrl(this.currentEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solutions list in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Forwards webview logs to the extension logger.
	 */
	private handleWebviewLog(message: WebviewLogMessage): void {
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
	 */
	private handleError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);

		this.panel.webview.postMessage({
			command: 'error',
			error: errorMessage
		});
	}

	/**
	 * Generates the HTML content for the webview.
	 */
	private getHtmlContent(): string {
		const datatableCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'datatable.css')
		);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Solutions</title>
	<link rel="stylesheet" href="${datatableCssUri}">
	<style>
		body {
			padding: 0;
			margin: 0;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
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
		.codicon {
			font-family: codicon;
			font-size: 16px;
			margin-right: 4px;
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
		.search-container {
			padding: 12px 16px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		input[type="text"] {
			width: 100%;
			padding: 6px 8px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			font-size: 13px;
		}
		input[type="text"]:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		.content {
			padding: 16px;
		}
		.error {
			color: var(--vscode-errorForeground);
			padding: 12px;
			background: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			margin-bottom: 16px;
		}
	</style>
</head>
<body>
	<div class="toolbar">
		<div class="toolbar-left">
			<button id="openMakerBtn">Open in Maker</button>
			<button id="refreshBtn">Refresh</button>
		</div>
		<div class="toolbar-right">
			<label for="environmentSelect">Environment:</label>
			<select id="environmentSelect">
				<option value="">Loading...</option>
			</select>
		</div>
	</div>

	<div class="search-container">
		<input type="text" id="searchInput" placeholder="🔍 Search...">
	</div>

	<div class="content">
		<div id="errorContainer"></div>
		<div id="solutionsContainer"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let allSolutions = [];
		let environments = [];
		let sortColumn = 'friendlyName';
		let sortDirection = 'asc';

		// Restore state on load
		const previousState = vscode.getState();
		if (previousState) {
			sortColumn = previousState.sortColumn || 'friendlyName';
			sortDirection = previousState.sortDirection || 'asc';
		}

		// Event handlers
		document.getElementById('refreshBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'refresh' });
		});

		document.getElementById('openMakerBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'openMakerSolutionsList' });
		});

		document.getElementById('environmentSelect').addEventListener('change', (e) => {
			saveState({ currentEnvironmentId: e.target.value });
			vscode.postMessage({
				command: 'environmentChanged',
				data: { environmentId: e.target.value }
			});
		});

		document.getElementById('searchInput').addEventListener('input', (e) => {
			const query = e.target.value;
			saveState({ searchQuery: query });
			filterSolutions(query.toLowerCase());
		});

		// Message handler
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.command) {
				case 'environmentsData':
					environments = message.data;
					populateEnvironmentDropdown();
					break;

				case 'loading':
					setLoading(true);
					document.getElementById('errorContainer').innerHTML = '';
					break;

				case 'solutionsData':
					setLoading(false);
					allSolutions = message.data;
					applySortAndFilter();
					break;

				case 'error':
					setLoading(false);
					document.getElementById('errorContainer').innerHTML =
						'<div class="error">' + escapeHtml(message.error) + '</div>';
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
				btn.innerHTML = '<span class="spinner"></span> Refreshing...';
			} else {
				btn.textContent = 'Refresh';
			}
		}

		function applySortAndFilter() {
			// Restore search query from state
			const state = vscode.getState();
			if (state && state.searchQuery) {
				document.getElementById('searchInput').value = state.searchQuery;
				filterSolutions(state.searchQuery.toLowerCase());
			} else {
				filterSolutions('');
			}
		}

		function filterSolutions(query) {
			let filtered = allSolutions;

			if (query) {
				filtered = allSolutions.filter(s =>
					s.friendlyName.toLowerCase().includes(query) ||
					s.uniqueName.toLowerCase().includes(query) ||
					s.publisherName.toLowerCase().includes(query) ||
					s.description.toLowerCase().includes(query)
				);
			}

			const sorted = sortSolutions(filtered, sortColumn, sortDirection);
			renderSolutions(sorted);
		}

		function sortSolutions(solutions, column, direction) {
			return [...solutions].sort((a, b) => {
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

		function renderSolutions(solutions) {
			const container = document.getElementById('solutionsContainer');

			if (!solutions || solutions.length === 0) {
				container.innerHTML = '<p>No solutions found.</p>';
				return;
			}

			const columns = [
				{ key: 'friendlyName', label: 'Solution Name' },
				{ key: 'uniqueName', label: 'Unique Name' },
				{ key: 'version', label: 'Version' },
				{ key: 'isManaged', label: 'Type' },
				{ key: 'publisherName', label: 'Publisher' },
				{ key: 'installedOn', label: 'Installed On' }
			];

			let html = '<table><thead><tr>';
			columns.forEach(col => {
				const sortIndicator = sortColumn === col.key
					? (sortDirection === 'asc' ? ' ▲' : ' ▼')
					: '';
				html += '<th data-sort="' + col.key + '">' + col.label + sortIndicator + '</th>';
			});
			html += '</tr></thead><tbody>';

			solutions.forEach(solution => {
				html += '<tr>';
				html += '<td><a class="solution-link" data-id="' + solution.id + '">' + escapeHtml(solution.friendlyName) + '</a></td>';
				html += '<td>' + escapeHtml(solution.uniqueName) + '</td>';
				html += '<td>' + escapeHtml(solution.version) + '</td>';
				html += '<td>' + escapeHtml(solution.isManaged) + '</td>';
				html += '<td>' + escapeHtml(solution.publisherName) + '</td>';
				html += '<td>' + escapeHtml(solution.installedOn) + '</td>';
				html += '</tr>';
			});

			html += '</tbody></table>';
			container.innerHTML = html;

			// Attach click handlers to solution links
			document.querySelectorAll('.solution-link').forEach(link => {
				link.addEventListener('click', (e) => {
					const solutionId = e.target.getAttribute('data-id');
					vscode.postMessage({ command: 'openInMaker', data: { solutionId } });
				});
			});

			// Attach sort handlers to table headers
			document.querySelectorAll('th[data-sort]').forEach(header => {
				header.addEventListener('click', () => {
					const column = header.getAttribute('data-sort');
					handleSort(column);
				});
			});
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
		SolutionExplorerPanel.currentPanel = undefined;

		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();

		this.panel.dispose();

		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
