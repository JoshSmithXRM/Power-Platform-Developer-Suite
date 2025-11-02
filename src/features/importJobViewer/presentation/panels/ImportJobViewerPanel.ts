import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { ListImportJobsUseCase } from '../../application/useCases/ListImportJobsUseCase';
import { OpenImportLogUseCase } from '../../application/useCases/OpenImportLogUseCase';
import { ImportJobViewModelMapper } from '../../application/mappers/ImportJobViewModelMapper';
import { ImportJob } from '../../domain/entities/ImportJob';
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
 * Presentation layer panel for Import Job Viewer.
 * Displays import jobs from a Power Platform environment with environment switching support.
 */
export class ImportJobViewerPanel {
	public static readonly viewType = 'powerPlatformDevSuite.importJobViewer';
	private static currentPanel?: ImportJobViewerPanel;

	private importJobs: ImportJob[] = [];
	private cancellationTokenSource: vscode.CancellationTokenSource | null = null;
	private currentEnvironmentId: string | null = null;
	private environments: EnvironmentOption[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listImportJobsUseCase: ListImportJobsUseCase,
		private readonly openImportLogUseCase: OpenImportLogUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		private readonly initialEnvironmentId?: string,
		private disposables: vscode.Disposable[] = []
	) {
		this.logger.debug('ImportJobViewerPanel: Initialized');

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
			this.logger.debug('ImportJobViewerPanel: Disposed');
			this.dispose();
		}, null, this.disposables);

		this.initialize();
	}

	/**
	 * Creates or shows the Import Job Viewer panel.
	 */
	public static createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listImportJobsUseCase: ListImportJobsUseCase,
		openImportLogUseCase: OpenImportLogUseCase,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	): void {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (ImportJobViewerPanel.currentPanel) {
			ImportJobViewerPanel.currentPanel.panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			ImportJobViewerPanel.viewType,
			'Import Jobs',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		ImportJobViewerPanel.currentPanel = new ImportJobViewerPanel(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listImportJobsUseCase,
			openImportLogUseCase,
			urlBuilder,
			logger,
			initialEnvironmentId
		);
	}

	/**
	 * Initializes the panel by loading environments and initial data.
	 */
	private async initialize(): Promise<void> {
		try {
			this.environments = await this.getEnvironments();
			this.panel.webview.postMessage({ command: 'environmentsData', data: this.environments });

			this.currentEnvironmentId = this.initialEnvironmentId || this.environments[0]?.id;
			await this.updateTabTitle();
			await this.loadImportJobs();
		} catch (error) {
			this.logger.error('Failed to initialize Import Job Viewer panel', error);
			this.handleError(error);
		}
	}

	/**
	 * Switches to a different environment and reloads data.
	 */
	private async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return;
		}

		this.logger.info('Switching environment', { from: this.currentEnvironmentId, to: environmentId });
		this.currentEnvironmentId = environmentId;
		await this.updateTabTitle();
		await this.loadImportJobs();
	}

	/**
	 * Updates the panel tab title to include the current environment name.
	 */
	private async updateTabTitle(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.panel.title = 'Import Jobs';
			return;
		}

		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (environment) {
				this.panel.title = `Import Jobs - ${environment.name}`;
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
					await this.loadImportJobs();
					break;
				case 'environmentChanged':
					if (typeof message.data === 'object' && message.data !== null && 'environmentId' in message.data) {
						await this.switchEnvironment((message.data as { environmentId: string }).environmentId);
					}
					break;
				case 'openMakerImportHistory':
					await this.handleOpenMakerImportHistory();
					break;
				case 'viewImportLog':
					if (typeof message.data === 'object' && message.data !== null && 'importJobId' in message.data) {
						await this.handleViewImportLog((message.data as { importJobId: string }).importJobId);
					}
					break;
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error);
		}
	}

	/**
	 * Loads import jobs from the current environment.
	 */
	private async loadImportJobs(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load import jobs: No environment selected');
			return;
		}

		this.logger.info('Loading import jobs', { environmentId: this.currentEnvironmentId });

		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource = new vscode.CancellationTokenSource();

		try {
			this.panel.webview.postMessage({ command: 'loading' });

			const cancellationToken = new VsCodeCancellationTokenAdapter(this.cancellationTokenSource.token);
			this.importJobs = await this.listImportJobsUseCase.execute(
				this.currentEnvironmentId,
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = ImportJobViewModelMapper.toViewModels(this.importJobs);

			this.panel.webview.postMessage({
				command: 'importJobsData',
				data: viewModels
			});

			this.logger.info('Import jobs loaded successfully', { count: this.importJobs.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load import jobs', error);
				this.handleError(error);
			}
		}
	}

	/**
	 * Opens the import history page in the Maker Portal.
	 */
	private async handleOpenMakerImportHistory(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const url = this.urlBuilder.buildImportHistoryUrl(this.currentEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened import history in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Handles opening the import log XML in VS Code editor.
	 */
	private async handleViewImportLog(importJobId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot view import log: No environment selected');
			return;
		}

		try {
			this.logger.info('Opening import log', { importJobId });

			const cancellationToken = new VsCodeCancellationTokenAdapter(
				new vscode.CancellationTokenSource().token
			);

			await this.openImportLogUseCase.execute(
				this.currentEnvironmentId,
				importJobId,
				cancellationToken
			);

			this.logger.info('Import log opened successfully', { importJobId });
		} catch (error) {
			this.logger.error('Failed to open import log', error);
			vscode.window.showErrorMessage(`Failed to open import log: ${error instanceof Error ? error.message : String(error)}`);
		}
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
	<title>Import Jobs</title>
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
			margin-bottom: 16px;
		}
		.status-completed {
			color: var(--vscode-terminal-ansiGreen);
		}
		.status-failed {
			color: var(--vscode-terminal-ansiRed);
		}
		.status-in-progress {
			color: var(--vscode-terminal-ansiYellow);
		}
		#errorContainer {
			padding: 16px;
		}
		#importJobsContainer {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
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
		<div id="importJobsContainer"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let allImportJobs = [];
		let environments = [];
		let sortColumn = 'createdOn';
		let sortDirection = 'desc';

		// Restore state on load
		const previousState = vscode.getState();
		if (previousState) {
			sortColumn = previousState.sortColumn || 'createdOn';
			sortDirection = previousState.sortDirection || 'desc';
		}

		// Event handlers
		document.getElementById('refreshBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'refresh' });
		});

		document.getElementById('openMakerBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'openMakerImportHistory' });
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
			filterImportJobs(query.toLowerCase());
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

				case 'importJobsData':
					setLoading(false);
					allImportJobs = message.data;
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
				filterImportJobs(state.searchQuery.toLowerCase());
			} else {
				filterImportJobs('');
			}
		}

		function filterImportJobs(query) {
			let filtered = allImportJobs;

			if (query) {
				filtered = allImportJobs.filter(job =>
					job.solutionName.toLowerCase().includes(query) ||
					job.createdBy.toLowerCase().includes(query) ||
					job.status.toLowerCase().includes(query) ||
					job.operationContext.toLowerCase().includes(query)
				);
			}

			const sorted = sortImportJobs(filtered, sortColumn, sortDirection);
			renderImportJobs(sorted);
		}

		function sortImportJobs(jobs, column, direction) {
			return [...jobs].sort((a, b) => {
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

		function renderImportJobs(jobs) {
			const container = document.getElementById('importJobsContainer');

			if (!jobs || jobs.length === 0) {
				container.innerHTML = '<p style="padding: 16px;">No import jobs found.</p>';
				return;
			}

			const columns = [
				{ key: 'solutionName', label: 'Solution' },
				{ key: 'status', label: 'Status' },
				{ key: 'progress', label: 'Progress' },
				{ key: 'createdBy', label: 'Created By' },
				{ key: 'createdOn', label: 'Created On' },
				{ key: 'duration', label: 'Duration' },
				{ key: 'operationContext', label: 'Operation Context' }
			];

			const totalCount = allImportJobs.length;
			const displayedCount = jobs.length;
			const countText = displayedCount === totalCount
				? totalCount + ' record' + (totalCount !== 1 ? 's' : '')
				: displayedCount + ' of ' + totalCount + ' record' + (totalCount !== 1 ? 's' : '');

			let html = '<div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">';
			html += '<div class="table-container">';
			html += '<table><thead><tr>';
			columns.forEach(col => {
				const sortIndicator = sortColumn === col.key
					? (sortDirection === 'asc' ? ' ▲' : ' ▼')
					: '';
				html += '<th data-sort="' + col.key + '">' + col.label + sortIndicator + '</th>';
			});
			html += '</tr></thead><tbody>';

			jobs.forEach(job => {
				html += '<tr>';
				html += '<td><a href="#" class="job-link" data-job-id="' + job.id + '">' + escapeHtml(job.solutionName) + '</a></td>';
				html += '<td class="' + getStatusClass(job.status) + '">' + escapeHtml(job.status) + '</td>';
				html += '<td>' + escapeHtml(job.progress) + '</td>';
				html += '<td>' + escapeHtml(job.createdBy) + '</td>';
				html += '<td>' + escapeHtml(job.createdOn) + '</td>';
				html += '<td>' + escapeHtml(job.duration) + '</td>';
				html += '<td>' + escapeHtml(job.operationContext) + '</td>';
				html += '</tr>';
			});

			html += '</tbody></table>';
			html += '</div>';
			html += '<div class="table-footer">' + countText + '</div>';
			html += '</div>';
			container.innerHTML = html;

			// Attach sort handlers to table headers
			document.querySelectorAll('th[data-sort]').forEach(header => {
				header.addEventListener('click', () => {
					const column = header.getAttribute('data-sort');
					handleSort(column);
				});
			});

			// Attach click handlers to job name links
			document.querySelectorAll('.job-link').forEach(link => {
				link.addEventListener('click', (e) => {
					e.preventDefault();
					const importJobId = link.getAttribute('data-job-id');
					vscode.postMessage({
						command: 'viewImportLog',
						data: { importJobId }
					});
				});
			});
		}

		function getStatusClass(status) {
			if (status === 'Completed') return 'status-completed';
			if (status === 'Failed' || status === 'Cancelled') return 'status-failed';
			if (status === 'In Progress' || status === 'Queued') return 'status-in-progress';
			return '';
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
		ImportJobViewerPanel.currentPanel = undefined;

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
