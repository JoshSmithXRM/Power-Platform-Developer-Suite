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
import { Solution } from '../../../features/solutionExplorer/domain/entities/Solution';

import { renderDataTable } from './views/dataTable';
import type { IPanelStateRepository, PanelState } from './IPanelStateRepository';

export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
	readonly url: string;
}

export interface DataTableColumn {
	readonly key: string;
	readonly label: string;
	readonly width?: string; // CSS width value (e.g., '20%', '150px', 'auto')
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
	readonly enableSolutionFilter?: boolean; // Default: false
}

/**
 * Abstract base class for data table panels using Template Method pattern.
 *
 * Eliminates duplication by providing shared infrastructure for environment switching,
 * search, sorting, error handling, and loading states across all data table panels.
 *
 * Note: This class violates SRP (accepted trade-off for DRY). See docs/TECHNICAL_DEBT.md
 * for details on when/how to refactor to composition-based approach.
 *
 * Extensibility:
 * - Search is optional via config.enableSearch (default: true)
 * - Override getFilterLogic() for custom search (default: no filtering)
 * - Override getCustomCss/JavaScript for panel-specific behavior
 *
 * Derived classes implement panel-specific data loading and actions.
 */
export interface SolutionOption {
	readonly id: string;
	readonly name: string;
	readonly uniqueName: string;
}

export abstract class DataTablePanel {
	protected cancellationTokenSource: vscode.CancellationTokenSource | null = null;
	protected currentEnvironmentId: string | null = null;
	protected currentSolutionId: string = Solution.DEFAULT_SOLUTION_ID;
	protected environments: EnvironmentOption[] = [];
	protected solutionFilterOptions: SolutionOption[] = [];
	protected disposables: vscode.Disposable[] = [];

	constructor(
		protected readonly panel: vscode.WebviewPanel,
		protected readonly extensionUri: vscode.Uri,
		protected readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		protected readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId?: string } | null>,
		protected readonly logger: ILogger,
		protected readonly initialEnvironmentId?: string,
		protected readonly panelStateRepository?: IPanelStateRepository
	) {
		this.logger.debug(`${this.getConfig().title} Panel: Initialized`);

		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		this.panel.webview.html = this.getHtmlContent();

		this.panel.webview.onDidReceiveMessage(
			async (message) => await this.handleMessage(message),
			null,
			this.disposables
		);

		this.panel.onDidDispose(() => {
			this.logger.debug(`${this.getConfig().title} Panel: Disposed`);
			this.dispose();
		}, null, this.disposables);

		void this.initialize();
	}

	protected abstract getConfig(): DataTableConfig;

	protected abstract loadData(): Promise<void>;

	protected abstract handlePanelCommand(message: WebviewMessage): Promise<void>;

	/**
	 * Returns the panel type identifier used for state persistence.
	 * Each panel type should return a unique identifier (e.g., 'environmentVariables', 'connectionReferences').
	 */
	protected abstract getPanelType(): string;

	/**
	 * Loads solutions for the current environment (optional, for panels that support solution filtering).
	 * Default implementation returns empty array - override in panels that need solution filtering.
	 * @returns Promise resolving to array of solution options
	 */
	protected async loadSolutions(): Promise<SolutionOption[]> {
		return [];
	}

	/**
	 * Loads persisted solution filter selection for the current environment.
	 * Returns Default Solution GUID if no persisted state found (migration from legacy null values).
	 * @returns The persisted solution ID (never null)
	 */
	private async loadPersistedSolutionFilter(): Promise<string> {
		if (!this.panelStateRepository || !this.currentEnvironmentId) {
			return Solution.DEFAULT_SOLUTION_ID;
		}

		try {
			const state = await this.panelStateRepository.load({
				panelType: this.getPanelType(),
				environmentId: this.currentEnvironmentId
			});

			// Migration: Legacy null values become Default Solution
			return state?.selectedSolutionId ?? Solution.DEFAULT_SOLUTION_ID;
		} catch (error) {
			this.logger.warn('Failed to load persisted solution filter', error);
			return Solution.DEFAULT_SOLUTION_ID;
		}
	}

	/**
	 * Persists the current solution filter selection for the current environment.
	 */
	private async persistSolutionFilter(): Promise<void> {
		if (!this.panelStateRepository || !this.currentEnvironmentId) {
			return;
		}

		try {
			const state: PanelState = {
				selectedSolutionId: this.currentSolutionId,
				lastUpdated: new Date().toISOString()
			};

			await this.panelStateRepository.save({
				panelType: this.getPanelType(),
				environmentId: this.currentEnvironmentId
			}, state);
		} catch (error) {
			this.logger.warn('Failed to persist solution filter', error);
		}
	}

	/**
	 * Registers this panel in the panel tracking map for the given environment.
	 * Derived classes override this to manage their static panel maps.
	 *
	 * @param environmentId - The environment ID to associate with this panel
	 */
	protected abstract registerPanelForEnvironment(environmentId: string): void;

	/**
	 * Unregisters this panel from the panel tracking map for the given environment.
	 * Derived classes override this to clean up their static panel maps.
	 *
	 * @param environmentId - The environment ID to disassociate from this panel
	 */
	protected abstract unregisterPanelForEnvironment(environmentId: string): void;

	/**
	 * Returns filter logic JavaScript for panel-specific filtering.
	 *
	 * Each panel has different searchable fields. Override to specify which
	 * fields to search (solution name, status, etc.). Default: no filtering.
	 *
	 * Runs during search input processing in webview, before rendering.
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
	 * Runs after table rendering in webview - safe to query DOM elements.
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

			// Load solutions if panel has solution filtering enabled
			const config = this.getConfig();
			if (config.enableSolutionFilter && this.currentEnvironmentId) {
				this.solutionFilterOptions = await this.loadSolutions();
				this.panel.webview.postMessage({ command: 'solutionFilterOptionsData', data: this.solutionFilterOptions });

				// Load persisted solution filter (defaults to Default Solution)
				this.currentSolutionId = await this.loadPersistedSolutionFilter();
				this.panel.webview.postMessage({ command: 'setCurrentSolution', solutionId: this.currentSolutionId });
			}

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
	 * Updates Maker button availability based on whether environment has configured Power Platform Environment ID.
	 * Handles panel tracking registration/unregistration via abstract methods.
	 */
	protected async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return;
		}

		this.logger.info('Switching environment', { from: this.currentEnvironmentId, to: environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;

		// Unregister from old environment
		if (oldEnvironmentId) {
			this.unregisterPanelForEnvironment(oldEnvironmentId);
		}

		this.currentEnvironmentId = environmentId;

		// Register with new environment
		this.registerPanelForEnvironment(environmentId);

		const environment = await this.getEnvironmentById(environmentId);
		const hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;

		this.panel.webview.postMessage({
			command: 'setMakerButtonState',
			enabled: hasPowerPlatformEnvId
		});

		// Reload solutions if panel has solution filtering enabled
		const config = this.getConfig();
		if (config.enableSolutionFilter) {
			this.solutionFilterOptions = await this.loadSolutions();
			this.panel.webview.postMessage({ command: 'solutionFilterOptionsData', data: this.solutionFilterOptions });

			// Load persisted solution filter for new environment (defaults to Default Solution)
			this.currentSolutionId = await this.loadPersistedSolutionFilter();
			this.panel.webview.postMessage({ command: 'setCurrentSolution', solutionId: this.currentSolutionId });
		}

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

			if (message.command === 'solutionChanged') {
				const solutionId = message.data && typeof message.data === 'object' && 'solutionId' in message.data
					? (message.data as { solutionId: string }).solutionId
					: Solution.DEFAULT_SOLUTION_ID;
				this.currentSolutionId = solutionId;
				this.logger.debug('Solution filter changed', { solutionId: this.currentSolutionId });
				await this.persistSolutionFilter();
				await this.loadData();
				return;
			}

			await this.handlePanelCommand(message);
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error);
		}
	}

	/**
	 * Forwards webview logs to extension logger.
	 * Webview JavaScript cannot access VS Code OutputChannel directly, so this bridges the gap.
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
	 */
	protected setLoading(isLoading: boolean): void {
		this.panel.webview.postMessage({ command: isLoading ? 'loading' : 'loaded' });
	}

	/**
	 * Sends data to webview for table rendering.
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
	 * Cancels previous operation to prevent race conditions when rapidly switching environments.
	 */
	protected createCancellationToken(): VsCodeCancellationTokenAdapter {
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();
		this.cancellationTokenSource = new vscode.CancellationTokenSource();
		return new VsCodeCancellationTokenAdapter(this.cancellationTokenSource.token);
	}

	/**
	 * Escapes HTML special characters to prevent XSS attacks.
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
	 * Maps status strings to CSS classes for consistent styling.
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
		// Unregister from panel tracking
		if (this.currentEnvironmentId) {
			this.unregisterPanelForEnvironment(this.currentEnvironmentId);
		}

		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();

		this.panel.dispose();

		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}
}
