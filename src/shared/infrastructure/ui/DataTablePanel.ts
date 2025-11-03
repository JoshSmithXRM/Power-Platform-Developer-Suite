import * as vscode from 'vscode';

import { ILogger } from '../../../infrastructure/logging/ILogger';
import { VsCodeCancellationTokenAdapter } from '../adapters/VsCodeCancellationTokenAdapter';
import {
	isWebviewMessage,
	isWebviewLogMessage,
	isRefreshDataMessage,
	isEnvironmentChangedMessage,
	type WebviewMessage,
	type WebviewLogMessage
} from '../../../infrastructure/ui/utils/TypeGuards';

import { renderDataTable } from './views/dataTable';

export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
	readonly url: string;
}

export interface DataTableColumn {
	readonly key: string;
	readonly label: string;
}

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

	protected abstract getConfig(): DataTableConfig;

	protected abstract loadData(): Promise<void>;

	protected abstract handlePanelCommand(message: WebviewMessage): Promise<void>;

	/**
	 * Returns filter logic JavaScript for panel-specific filtering.
	 *
	 * Each panel has different searchable fields. Override to specify which
	 * fields to search (solution name, status, etc.). Default: no filtering.
	 *
	 * EXECUTION TIMING: Runs during search input processing in webview, before rendering.
	 * Variables available: 'query' (lowercase search text), 'allData' (all records).
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
	 *
	 * Each panel may need custom event handlers (e.g., clickable solution names,
	 * import job links). Override to attach handlers to panel-specific elements.
	 *
	 * EXECUTION TIMING: Runs after table rendering in webview - safe to query DOM elements.
	 *
	 * @returns JavaScript code snippet to execute after rendering (default: empty)
	 */
	protected getCustomJavaScript(): string {
		return '';
	}

	private async initialize(): Promise<void> {
		try {
			this.environments = await this.getEnvironments();
			this.panel.webview.postMessage({ command: 'environmentsData', data: this.environments });

			this.currentEnvironmentId = this.initialEnvironmentId || this.environments[0]?.id;

			if (this.currentEnvironmentId) {
				this.panel.webview.postMessage({
					command: 'setCurrentEnvironment',
					environmentId: this.currentEnvironmentId
				});
			}

			let hasPowerPlatformEnvId = false;
			if (this.currentEnvironmentId) {
				const environment = await this.getEnvironmentById(this.currentEnvironmentId);
				hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;
			}

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

		const environment = await this.getEnvironmentById(environmentId);
		const hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;

		this.panel.webview.postMessage({
			command: 'setMakerButtonState',
			enabled: hasPowerPlatformEnvId
		});

		await this.updateTabTitle();
		await this.loadData();
	}

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

			await this.handlePanelCommand(message);
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
	 * Displays error message in webview.
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
	 * Updates loading state in webview (shows/hides spinner).
	 * @param isLoading - True to show loading spinner, false to hide
	 */
	protected setLoading(isLoading: boolean): void {
		this.panel.webview.postMessage({ command: isLoading ? 'loading' : 'loaded' });
	}

	/**
	 * Sends data to webview for table rendering.
	 * @param data - Array of data objects to display (must be serializable records)
	 */
	protected sendData(data: Record<string, unknown>[]): void {
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
	 * Maps status strings to CSS classes for consistent styling across panels.
	 * @param status - Status text (e.g., 'Completed', 'Failed', 'In Progress')
	 * @returns CSS class name or empty string
	 */
	protected getStatusClass(status: string): string {
		if (status === 'Completed') return 'status-completed';
		if (status === 'Failed' || status === 'Cancelled') return 'status-failed';
		if (status === 'In Progress' || status === 'Queued') return 'status-in-progress';
		return '';
	}

	private getHtmlContent(): string {
		const config = this.getConfig();
		const datatableCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'datatable.css')
		);

		return renderDataTable({
			datatableCssUri: datatableCssUri.toString(),
			config,
			customCss: this.getCustomCss(),
			filterLogic: this.getFilterLogic(),
			customJavaScript: this.getCustomJavaScript()
		});
	}


	public dispose(): void {
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();

		this.panel.dispose();

		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}
}
