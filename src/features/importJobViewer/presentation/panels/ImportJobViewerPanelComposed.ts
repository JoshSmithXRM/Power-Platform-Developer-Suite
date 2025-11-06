import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { DataTableConfig, EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { ListImportJobsUseCase } from '../../application/useCases/ListImportJobsUseCase';
import type { OpenImportLogUseCase } from '../../application/useCases/OpenImportLogUseCase';
import type { ImportJobViewModelMapper } from '../../application/mappers/ImportJobViewModelMapper';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';

/**
 * Commands supported by Import Job Viewer panel.
 */
type ImportJobViewerCommands = 'refresh' | 'openMaker' | 'viewImportJob' | 'environmentChange';

/**
 * Import Job Viewer panel using new PanelCoordinator architecture.
 * Displays list of import jobs for a specific environment.
 */
export class ImportJobViewerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.importJobViewer';
	private static panels = new Map<string, ImportJobViewerPanelComposed>();

	private readonly coordinator: PanelCoordinator<ImportJobViewerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private currentEnvironmentId: string;

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
		private readonly viewModelMapper: ImportJobViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		this.currentEnvironmentId = environmentId;
		logger.debug('ImportJobViewerPanel: Initialized with new architecture');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

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
		viewModelMapper: ImportJobViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<ImportJobViewerPanelComposed> {
		const column = vscode.ViewColumn.One;

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

		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			ImportJobViewerPanelComposed.viewType,
			`Import Jobs - ${environmentName}`,
			column,
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
			viewModelMapper,
			logger,
			targetEnvironmentId
		);

		ImportJobViewerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		const envId = targetEnvironmentId; // Capture for closure
		panel.onDidDispose(() => {
			ImportJobViewerPanelComposed.panels.delete(envId);
		});

		return newPanel;
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: []
		});

		// Load import jobs data
		await this.handleRefresh();
	}

	private createCoordinator(): { coordinator: PanelCoordinator<ImportJobViewerCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const config = this.getTableConfig();

		const environmentSelector = new EnvironmentSelectorSection();
		const tableSection = new DataTableSection(config);
		// Note: Button IDs must match command names registered in registerCommandHandlers()
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' }
			]
		}, SectionPosition.Toolbar);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'import-jobs.css')
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Import Jobs'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<ImportJobViewerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh import jobs
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open import history in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMakerImportHistory();
		});

		// View individual import job log
		this.coordinator.registerHandler('viewImportJob', async (data) => {
			const importJobId = (data as { importJobId?: string })?.importJobId;
			if (importJobId) {
				await this.handleViewImportLog(importJobId);
			}
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});
	}

	private getTableConfig(): DataTableConfig {
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
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing import jobs');

		try {
			const importJobs = await this.listImportJobsUseCase.execute(this.currentEnvironmentId);

			// Map to view models with clickable links
			const viewModels = importJobs
				.map(job => this.viewModelMapper.toViewModel(job));

			const environments = await this.getEnvironments();

			this.logger.info('Import jobs loaded successfully', { count: viewModels.length });

			// Refresh HTML with data
			await this.scaffoldingBehavior.refresh({
				tableData: viewModels,
				environments,
				currentEnvironmentId: this.currentEnvironmentId
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing import jobs', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh import jobs: ${errorMessage}`);
		}
	}

	private async handleViewImportLog(importJobId: string): Promise<void> {
		try {
			this.logger.info('Opening import log', { importJobId });

			const cancellationTokenSource = new vscode.CancellationTokenSource();
			const cancellationToken = new VsCodeCancellationTokenAdapter(cancellationTokenSource.token);

			await this.openImportLogUseCase.execute(this.currentEnvironmentId, importJobId, cancellationToken);

			this.logger.info('Import log opened successfully', { importJobId });
		} catch (error) {
			this.logger.error('Failed to open import log', error);
			vscode.window.showErrorMessage(`Failed to open import log: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async handleOpenMakerImportHistory(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildImportHistoryUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened import history in Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		this.setButtonLoading('refresh', true);

		try {
			this.currentEnvironmentId = environmentId;

			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Import Jobs - ${environment.name}`;
			}

			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}
}
