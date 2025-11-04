import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { EnvironmentOption, DataTableConfig } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelTrackingBehavior } from '../../../../shared/infrastructure/ui/behaviors/PanelTrackingBehavior';
import { HtmlRenderingBehavior, type HtmlCustomization } from '../../../../shared/infrastructure/ui/behaviors/HtmlRenderingBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { SolutionFilterBehavior } from '../../../../shared/infrastructure/ui/behaviors/SolutionFilterBehavior';
import { MessageRoutingBehavior } from '../../../../shared/infrastructure/ui/behaviors/MessageRoutingBehavior';
import { DataTableBehaviorRegistry } from '../../../../shared/infrastructure/ui/behaviors/DataTableBehaviorRegistry';
import { DataTablePanelCoordinator, type CoordinatorDependencies } from '../../../../shared/infrastructure/ui/coordinators/DataTablePanelCoordinator';
import { ListImportJobsUseCase } from '../../application/useCases/ListImportJobsUseCase';
import { OpenImportLogUseCase } from '../../application/useCases/OpenImportLogUseCase';
import { ImportJobDataLoader } from '../dataLoaders/ImportJobDataLoader';
import { isViewImportJobMessage } from '../../../../infrastructure/ui/utils/TypeGuards';
import { renderLinkClickHandler } from '../../../../shared/infrastructure/ui/views/clickableLinks';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';

/**
 * Presentation layer panel for Import Job Viewer.
 * Uses composition pattern with specialized behaviors instead of inheritance.
 */
export class ImportJobViewerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.importJobViewer';
	private static panels = new Map<string, ImportJobViewerPanelComposed>();

	private readonly coordinator: DataTablePanelCoordinator;
	private readonly registry: DataTableBehaviorRegistry;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		private readonly listImportJobsUseCase: ListImportJobsUseCase,
		private readonly openImportLogUseCase: OpenImportLogUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		environmentId: string
	) {
		logger.debug('ImportJobViewerPanel: Initialized');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		// Create behaviors
		this.registry = this.createBehaviorRegistry(environmentId);
		this.coordinator = this.createCoordinator();

		// Register panel-specific command handlers
		this.registerPanelCommands();

		// Initialize panel asynchronously
		void this.coordinator.initialize();
	}

	/**
	 * Creates or shows the Import Job Viewer panel for the specified environment.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		listImportJobsUseCase: ListImportJobsUseCase,
		openImportLogUseCase: OpenImportLogUseCase,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<ImportJobViewerPanelComposed> {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// Determine which environment to use
		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Check if panel already exists for this environment
		const existingPanel = ImportJobViewerPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			ImportJobViewerPanelComposed.viewType,
			`Import Jobs - ${environmentName}`,
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new ImportJobViewerPanelComposed(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listImportJobsUseCase,
			openImportLogUseCase,
			urlBuilder,
			logger,
			targetEnvironmentId
		);

		ImportJobViewerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	/**
	 * Creates all behaviors and composes them into a registry.
	 */
	private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
		const config = this.getConfig();
		const customization = this.getCustomization();

		// Panel tracking behavior
		const panelTrackingBehavior = new PanelTrackingBehavior(
			ImportJobViewerPanelComposed.panels
		);

		// HTML rendering behavior
		const htmlRenderingBehavior = new HtmlRenderingBehavior(
			this.panel.webview,
			this.extensionUri,
			config,
			customization
		);

		// Message routing behavior
		const messageRoutingBehavior = new MessageRoutingBehavior(
			this.panel.webview,
			this.logger
		);

		// Environment behavior
		const environmentBehavior = new EnvironmentBehavior(
			this.panel.webview,
			this.getEnvironments,
			this.getEnvironmentById,
			async () => { /* Coordinator handles reload */ },
			this.logger,
			environmentId
		);

		// Solution filter behavior (disabled for import jobs)
		const solutionFilterBehavior = new SolutionFilterBehavior(
			this.panel.webview,
			'importJobs',
			environmentBehavior,
			async () => [],
			undefined,
			async () => { /* No solution filtering */ },
			this.logger,
			false
		);

		// Data loader - gets current environment ID dynamically
		const dataLoader = new ImportJobDataLoader(
			() => environmentBehavior.getCurrentEnvironmentId(),
			this.listImportJobsUseCase,
			this.logger
		);

		// Data behavior
		const dataBehavior = new DataBehavior(
			this.panel.webview,
			config,
			dataLoader,
			this.logger
		);

		return new DataTableBehaviorRegistry(
			environmentBehavior,
			solutionFilterBehavior,
			dataBehavior,
			messageRoutingBehavior,
			htmlRenderingBehavior,
			panelTrackingBehavior
		);
	}

	/**
	 * Creates the panel lifecycle coordinator.
	 */
	private createCoordinator(): DataTablePanelCoordinator {
		const dependencies: CoordinatorDependencies = {
			panel: this.panel,
			getEnvironmentById: this.getEnvironmentById,
			logger: this.logger
		};

		return new DataTablePanelCoordinator(this.registry, dependencies);
	}

	/**
	 * Registers panel-specific command handlers.
	 */
	private registerPanelCommands(): void {
		// View import job command
		this.registry.messageRoutingBehavior.registerHandler('viewImportJob', async (message) => {
			if (isViewImportJobMessage(message)) {
				await this.handleViewImportLog(message.data.importJobId);
			}
		});

		// Open in Maker Portal command
		this.registry.messageRoutingBehavior.registerHandler('openMaker', async () => {
			await this.handleOpenMakerImportHistory();
		});
	}

	/**
	 * Returns the panel configuration.
	 */
	private getConfig(): DataTableConfig {
		return {
			viewType: ImportJobViewerPanelComposed.viewType,
			title: 'Import Jobs',
			dataCommand: 'importJobsData',
			defaultSortColumn: 'createdOn',
			defaultSortDirection: 'desc',
			columns: [
				{ key: 'solutionName', label: 'Solution' },
				{ key: 'status', label: 'Status' },
				{ key: 'progress', label: 'Progress' },
				{ key: 'createdBy', label: 'Created By' },
				{ key: 'createdOn', label: 'Created On' },
				{ key: 'duration', label: 'Duration' },
				{ key: 'operationContext', label: 'Operation Context' }
			],
			searchPlaceholder: '🔍 Search...',
			noDataMessage: 'No import jobs found.',
			toolbarButtons: [
				{ id: 'openMakerBtn', label: 'Open in Maker', command: 'openMaker', position: 'left' },
				{ id: 'refreshBtn', label: 'Refresh', command: 'refresh', position: 'left' }
			]
		};
	}

	/**
	 * Returns panel-specific HTML/CSS/JS customization.
	 */
	private getCustomization(): HtmlCustomization {
		return {
			customCss: `
				.status-completed {
					color: var(--vscode-terminal-ansiGreen);
				}
				.status-failed {
					color: var(--vscode-terminal-ansiRed);
				}
				.status-in-progress {
					color: var(--vscode-terminal-ansiYellow);
				}
			`,
			filterLogic: `
				filtered = allData.filter(job =>
					job.solutionName.toLowerCase().includes(query) ||
					job.createdBy.toLowerCase().includes(query) ||
					job.status.toLowerCase().includes(query) ||
					job.operationContext.toLowerCase().includes(query)
				);
			`,
			customJavaScript: renderLinkClickHandler('.job-link', 'viewImportJob', 'importJobId')
		};
	}

	/**
	 * Opens the import history page in the Maker Portal.
	 */
	private async handleOpenMakerImportHistory(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(envId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildImportHistoryUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened import history in Maker Portal', { environmentId: envId });
	}

	/**
	 * Handles opening the import log XML in VS Code editor.
	 */
	private async handleViewImportLog(importJobId: string): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot view import log: No environment selected');
			return;
		}

		try {
			this.logger.info('Opening import log', { importJobId });

			const cancellationTokenSource = new vscode.CancellationTokenSource();
			const cancellationToken = new VsCodeCancellationTokenAdapter(cancellationTokenSource.token);

			await this.openImportLogUseCase.execute(envId, importJobId, cancellationToken);

			this.logger.info('Import log opened successfully', { importJobId });
		} catch (error) {
			this.logger.error('Failed to open import log', error);
			vscode.window.showErrorMessage(`Failed to open import log: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
