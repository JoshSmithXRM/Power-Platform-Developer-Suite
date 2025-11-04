import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ListImportJobsUseCase } from '../../application/useCases/ListImportJobsUseCase';
import { OpenImportLogUseCase } from '../../application/useCases/OpenImportLogUseCase';
import { ImportJobViewModelMapper } from '../../application/mappers/ImportJobViewModelMapper';
import { ImportJobCollectionService } from '../../domain/services/ImportJobCollectionService';
import { type ImportJob } from '../../domain/entities/ImportJob';
import {
	DataTablePanel,
	type EnvironmentOption,
	type DataTableConfig
} from '../../../../shared/infrastructure/ui/DataTablePanel';
import { isViewImportJobMessage } from '../../../../infrastructure/ui/utils/TypeGuards';
import { enhanceViewModelsWithImportJobLinks } from '../views/ImportJobLinkView';
import { renderLinkClickHandler } from '../../../../shared/infrastructure/ui/views/clickableLinks';

/**
 * Presentation layer panel for Import Job Viewer.
 * Displays import jobs from a Power Platform environment with environment switching support.
 */
export class ImportJobViewerPanel extends DataTablePanel {
	public static readonly viewType = 'powerPlatformDevSuite.importJobViewer';
	private static panels = new Map<string, ImportJobViewerPanel>();

	private importJobs: ImportJob[] = [];
	private readonly mapper: ImportJobViewModelMapper;

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listImportJobsUseCase: ListImportJobsUseCase,
		private readonly openImportLogUseCase: OpenImportLogUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
		this.mapper = new ImportJobViewModelMapper(new ImportJobCollectionService());
	}

	/**
	 * Creates or shows the Import Job Viewer panel for the specified environment.
	 * Each environment gets its own panel instance to avoid data mixing.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listImportJobsUseCase: ListImportJobsUseCase,
		openImportLogUseCase: OpenImportLogUseCase,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<ImportJobViewerPanel> {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// Determine which environment to use
		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			// No environment specified - use first available
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Check if panel already exists for this environment
		const existingPanel = ImportJobViewerPanel.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			ImportJobViewerPanel.viewType,
			`Import Jobs - ${environmentName}`,
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new ImportJobViewerPanel(
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

		ImportJobViewerPanel.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	/**
	 * Returns the panel configuration.
	 */
	protected getConfig(): DataTableConfig {
		return {
			viewType: ImportJobViewerPanel.viewType,
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
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No import jobs found.'
		};
	}

	/**
	 * Returns panel type identifier for state persistence.
	 */
	protected getPanelType(): string {
		return 'importJobs';
	}

	/**
	 * Loads import jobs from the current environment.
	 */
	protected async loadData(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load import jobs: No environment selected');
			return;
		}

		this.logger.info('Loading import jobs', { environmentId: this.currentEnvironmentId });

		try {
			this.setLoading(true);

			const cancellationToken = this.createCancellationToken();
			this.importJobs = await this.listImportJobsUseCase.execute(
				this.currentEnvironmentId,
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = this.mapper.toViewModels(this.importJobs, true);
			const enhancedViewModels = enhanceViewModelsWithImportJobLinks(viewModels);

			this.sendData(enhancedViewModels);

			this.logger.info('Import jobs loaded successfully', { count: this.importJobs.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load import jobs', error);
				this.handleError(error);
			}
		}
	}

	/**
	 * Handles panel-specific commands from webview.
	 */
	protected async handlePanelCommand(message: import('../../../../infrastructure/ui/utils/TypeGuards').WebviewMessage): Promise<void> {
		if (isViewImportJobMessage(message)) {
			await this.handleViewImportLog(message.data.importJobId);
		} else if (message.command === 'openMaker') {
			await this.handleOpenMakerImportHistory();
		}
	}

	/**
	 * Returns filter logic JavaScript for import job-specific filtering.
	 */
	protected getFilterLogic(): string {
		return `
			filtered = allData.filter(job =>
				job.solutionName.toLowerCase().includes(query) ||
				job.createdBy.toLowerCase().includes(query) ||
				job.status.toLowerCase().includes(query) ||
				job.operationContext.toLowerCase().includes(query)
			);
		`;
	}

	/**
	 * Returns custom CSS for import job status coloring.
	 * Provides visual indicators for Completed (green), Failed (red), and In Progress (yellow) states.
	 */
	protected getCustomCss(): string {
		return `
		.status-completed {
			color: var(--vscode-terminal-ansiGreen);
		}
		.status-failed {
			color: var(--vscode-terminal-ansiRed);
		}
		.status-in-progress {
			color: var(--vscode-terminal-ansiYellow);
		}
		`;
	}

	/**
	 * Returns import job-specific JavaScript for event handlers.
	 * Adds click handlers to job name links for viewing import job details.
	 */
	protected getPanelSpecificJavaScript(): string {
		return renderLinkClickHandler('.job-link', 'viewImportJob', 'importJobId');
	}

	/**
	 * Opens the import history page in the Maker Portal for the current environment.
	 * @throws Shows error message if environment ID not configured
	 */
	private async handleOpenMakerImportHistory(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		// Get Power Platform Environment ID
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildImportHistoryUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened import history in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Handles opening the import log XML in VS Code editor.
	 * @param importJobId - GUID of the import job to view
	 */
	private async handleViewImportLog(importJobId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot view import log: No environment selected');
			return;
		}

		try {
			this.logger.info('Opening import log', { importJobId });

			const cancellationToken = this.createCancellationToken();

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
	 * Registers this panel in the static panels map for the given environment.
	 */
	protected registerPanelForEnvironment(environmentId: string): void {
		ImportJobViewerPanel.panels.set(environmentId, this);
	}

	/**
	 * Unregisters this panel from the static panels map for the given environment.
	 */
	protected unregisterPanelForEnvironment(environmentId: string): void {
		ImportJobViewerPanel.panels.delete(environmentId);
	}
}
