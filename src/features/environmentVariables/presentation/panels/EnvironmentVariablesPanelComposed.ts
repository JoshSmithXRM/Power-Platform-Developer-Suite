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
import { SolutionFilterSection } from '../../../../shared/infrastructure/ui/sections/SolutionFilterSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { ListEnvironmentVariablesUseCase } from '../../application/useCases/ListEnvironmentVariablesUseCase';
import type { ExportEnvironmentVariablesToDeploymentSettingsUseCase } from '../../application/useCases/ExportEnvironmentVariablesToDeploymentSettingsUseCase';
import type { EnvironmentVariableViewModelMapper } from '../../application/mappers/EnvironmentVariableViewModelMapper';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { SolutionOption } from '../../../../shared/infrastructure/ui/views/solutionFilterView';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';

/**
 * Commands supported by Environment Variables panel.
 */
type EnvironmentVariablesCommands = 'refresh' | 'openMaker' | 'syncDeploymentSettings' | 'environmentChange' | 'solutionChange';

/**
 * Environment Variables panel using new PanelCoordinator architecture.
 * Displays list of environment variables for a specific environment with optional solution filtering.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class EnvironmentVariablesPanelComposed extends EnvironmentScopedPanel<EnvironmentVariablesPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.environmentVariables';
	private static panels = new Map<string, EnvironmentVariablesPanelComposed>();

	private readonly coordinator: PanelCoordinator<EnvironmentVariablesCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly loadingBehavior: LoadingStateBehavior;
	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;
	private solutionOptions: SolutionOption[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: EnvironmentVariableViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		super();
		this.currentEnvironmentId = environmentId;
		logger.debug('EnvironmentVariablesPanel: Initialized with new architecture');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Initialize loading behavior for toolbar buttons
		// Note: openMaker excluded - it only needs environmentId which is already known
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(['refresh', 'syncDeploymentSettings']),
			logger
		);

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: EnvironmentVariableViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<EnvironmentVariablesPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: EnvironmentVariablesPanelComposed.viewType,
			titlePrefix: 'Environment Variables',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new EnvironmentVariablesPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				listEnvVarsUseCase,
				exportToDeploymentSettingsUseCase,
				solutionRepository,
				urlBuilder,
				viewModelMapper,
				logger,
				envId,
				panelStateRepository
			),
			webviewOptions: {
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		}, EnvironmentVariablesPanelComposed.panels);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load persisted solution ID immediately (optimistic - no validation yet)
		if (this.panelStateRepository) {
			const savedState = await this.panelStateRepository.load({
				panelType: 'environmentVariables',
				environmentId: this.currentEnvironmentId
			});
			if (savedState?.selectedSolutionId) {
				this.currentSolutionId = savedState.selectedSolutionId;
			}
		}

		// Show initial loading state with known solution ID
		const environments = await this.getEnvironments();
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions: [],
			currentSolutionId: this.currentSolutionId,
			tableData: [],
			isLoading: true
		});

		// Disable all buttons during initial load (refresh shows spinner)
		await this.loadingBehavior.setLoading(true);

		try {
			// PARALLEL LOADING - Don't wait for solutions to load data!
			const [solutions, environmentVariables] = await Promise.all([
				this.loadSolutions(),
				this.listEnvVarsUseCase.execute(
					this.currentEnvironmentId,
					this.currentSolutionId
				)
			]);

			// Post-load validation: Check if persisted solution still exists
			let finalSolutionId = this.currentSolutionId;
			if (this.currentSolutionId !== DEFAULT_SOLUTION_ID) {
				if (!solutions.some(s => s.id === this.currentSolutionId)) {
					this.logger.warn('Persisted solution no longer exists, falling back to default', {
						invalidSolutionId: this.currentSolutionId
					});
					finalSolutionId = DEFAULT_SOLUTION_ID;
					this.currentSolutionId = DEFAULT_SOLUTION_ID;

					// Save corrected state
					if (this.panelStateRepository) {
						await this.panelStateRepository.save(
							{ panelType: 'environmentVariables', environmentId: this.currentEnvironmentId },
							{ selectedSolutionId: DEFAULT_SOLUTION_ID, lastUpdated: new Date().toISOString() }
						);
					}
				}
			}

			const viewModels = environmentVariables
				.map(envVar => this.viewModelMapper.toViewModel(envVar))
				.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

			// Final render with both solutions and data
			await this.scaffoldingBehavior.refresh({
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				solutions,
				currentSolutionId: finalSolutionId,
				tableData: viewModels
			});
		} finally {
			// Re-enable buttons after load completes
			await this.loadingBehavior.setLoading(false);
		}
	}

	private createCoordinator(): { coordinator: PanelCoordinator<EnvironmentVariablesCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const config = this.getTableConfig();

		const environmentSelector = new EnvironmentSelectorSection();
		const solutionFilter = new SolutionFilterSection();
		const tableSection = new DataTableSection(config);
		// Note: Button IDs must match command names registered in registerCommandHandlers()
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' },
				{ id: 'syncDeploymentSettings', label: 'Sync Deployment Settings' }
			]
		}, SectionPosition.Toolbar);

		// Order: action buttons, solution filter, environment selector (far right), then table
		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, solutionFilter, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'solution-filter', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'environment-variables.css')
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'EnvironmentVariablesBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Environment Variables'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<EnvironmentVariablesCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh environment variables
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open environment variables in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		// Sync deployment settings
		this.coordinator.registerHandler('syncDeploymentSettings', async () => {
			await this.handleSyncDeploymentSettings();
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Solution change
		this.coordinator.registerHandler('solutionChange', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId) {
				await this.handleSolutionChange(solutionId);
			}
		});
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: EnvironmentVariablesPanelComposed.viewType,
			title: 'Environment Variables',
			dataCommand: 'environmentVariablesData',
			defaultSortColumn: 'schemaName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'schemaName', label: 'Schema Name', type: 'identifier' },
				{ key: 'displayName', label: 'Display Name', type: 'name' },
				{ key: 'type', label: 'Type', type: 'status' },
				{ key: 'defaultValue', label: 'Default Value', type: 'description' },
				{ key: 'currentValue', label: 'Current Value', type: 'description' },
				{ key: 'isManaged', label: 'Managed', type: 'boolean' },
				{ key: 'modifiedOn', label: 'Modified On', type: 'datetime' }
			],
			searchPlaceholder: '🔍 Search environment variables...',
			noDataMessage: 'No environment variables found.',
			toolbarButtons: []
		};
	}

	private async loadSolutions(): Promise<SolutionOption[]> {
		try {
			this.solutionOptions = await this.solutionRepository.findAllForDropdown(this.currentEnvironmentId);
			return this.solutionOptions;
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing environment variables');

		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			const environmentVariables = await this.listEnvVarsUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId
			);

			// Map to view models and sort
			const viewModels = environmentVariables
				.map(envVar => this.viewModelMapper.toViewModel(envVar))
				.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

			this.logger.info('Environment variables loaded successfully', { count: viewModels.length });

			const config = this.getTableConfig();

			// Data-driven update: Send ViewModels to frontend
			await this.panel.webview.postMessage({
				command: 'updateTableData',
				data: {
					viewModels,
					columns: config.columns,
					noDataMessage: config.noDataMessage
				}
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing environment variables', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh environment variables: ${errorMessage}`);
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	private async handleOpenMaker(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildEnvironmentVariablesObjectsUrl(
			environment.powerPlatformEnvironmentId,
			this.currentSolutionId
		);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened environment variables in Maker Portal');
	}

	private async handleSyncDeploymentSettings(): Promise<void> {
		this.logger.debug('Syncing deployment settings');

		try {
			// Load current environment variables to get full entities
			const environmentVariables = await this.listEnvVarsUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId
			);

			if (environmentVariables.length === 0) {
				vscode.window.showWarningMessage('No environment variables to export.');
				return;
			}

			const currentSolution = this.solutionOptions.find(sol => sol.id === this.currentSolutionId);
			const filename = currentSolution
				? `${currentSolution.uniqueName}.deploymentsettings.json`
				: 'deploymentsettings.json';

			this.logger.info('Syncing deployment settings', {
				count: environmentVariables.length,
				filename
			});

			const result = await this.exportToDeploymentSettingsUseCase.execute(
				environmentVariables,
				filename
			);

			if (result) {
				const message = `Synced deployment settings: ${result.added} added, ${result.removed} removed, ${result.preserved} preserved`;
				this.logger.info(message);
				vscode.window.showInformationMessage(message);
			}
		} catch (error) {
			this.logger.error('Failed to sync deployment settings', error);
			vscode.window.showErrorMessage(`Failed to sync deployment settings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;
		this.currentSolutionId = DEFAULT_SOLUTION_ID; // Reset to default solution

		// Re-register panel in map for new environment
		this.reregisterPanel(EnvironmentVariablesPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Environment Variables - ${environment.name}`;
		}

		this.solutionOptions = await this.loadSolutions();

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		this.currentSolutionId = solutionId;

		// Always save concrete solution selection to panel state
		if (this.panelStateRepository) {
			await this.panelStateRepository.save(
				{
					panelType: 'environmentVariables',
					environmentId: this.currentEnvironmentId
				},
				{
					selectedSolutionId: solutionId,
					lastUpdated: new Date().toISOString()
				}
			);
		}

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment/solution switches.
	 */
	private showTableLoading(): void {
		this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: [],
				columns: this.getTableConfig().columns,
				isLoading: true
			}
		});
	}

}
