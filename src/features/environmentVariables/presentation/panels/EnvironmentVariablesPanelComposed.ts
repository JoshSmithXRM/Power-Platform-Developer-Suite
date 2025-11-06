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

/**
 * Commands supported by Environment Variables panel.
 */
type EnvironmentVariablesCommands = 'refresh' | 'openMaker' | 'syncDeploymentSettings' | 'environmentChange' | 'solutionChange';

/**
 * Environment Variables panel using new PanelCoordinator architecture.
 * Displays list of environment variables for a specific environment with optional solution filtering.
 */
export class EnvironmentVariablesPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.environmentVariables';
	private static panels = new Map<string, EnvironmentVariablesPanelComposed>();

	private readonly coordinator: PanelCoordinator<EnvironmentVariablesCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private currentEnvironmentId: string;
	private currentSolutionId: string | undefined;
	private solutionOptions: SolutionOption[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		private readonly listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: EnvironmentVariableViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		this.currentEnvironmentId = environmentId;
		logger.debug('EnvironmentVariablesPanel: Initialized with new architecture');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		// Create coordinator with new architecture
		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Register command handlers
		this.registerCommandHandlers();

		// Initialize panel and load data asynchronously
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
		listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: EnvironmentVariableViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<EnvironmentVariablesPanelComposed> {
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
		const existingPanel = EnvironmentVariablesPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			EnvironmentVariablesPanelComposed.viewType,
			`Environment Variables - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new EnvironmentVariablesPanelComposed(
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
			targetEnvironmentId,
			panelStateRepository
		);

		EnvironmentVariablesPanelComposed.panels.set(targetEnvironmentId, newPanel);

		// Handle panel disposal
		const envId = targetEnvironmentId; // Capture for closure
		panel.onDidDispose(() => {
			EnvironmentVariablesPanelComposed.panels.delete(envId);
		});

		return newPanel;
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments and solutions first
		const environments = await this.getEnvironments();
		const solutions = await this.loadSolutions();

		// Load saved solution selection from panel state
		if (this.panelStateRepository) {
			const savedState = await this.panelStateRepository.load({
				panelType: 'environmentVariables',
				environmentId: this.currentEnvironmentId
			});
			if (savedState?.selectedSolutionId) {
				// Verify the solution still exists
				if (solutions.some(s => s.id === savedState.selectedSolutionId)) {
					this.currentSolutionId = savedState.selectedSolutionId;
				}
			}
		}

		// Initialize coordinator with environments and solutions
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions,
			currentSolutionId: this.currentSolutionId || undefined,
			tableData: []
		});

		// Load environment variables data
		await this.handleRefresh();
	}

	private createCoordinator(): { coordinator: PanelCoordinator<EnvironmentVariablesCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const config = this.getTableConfig();

		// Create sections
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

		// Create section composition behavior
		// Order: action buttons, solution filter, environment selector (far right), then table
		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, solutionFilter, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
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

		// Create HTML scaffolding behavior
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
			title: 'Environment Variables'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		// Create coordinator
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
			await this.handleSolutionChange(solutionId || undefined);
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
				{ key: 'schemaName', label: 'Schema Name' },
				{ key: 'displayName', label: 'Display Name' },
				{ key: 'type', label: 'Type' },
				{ key: 'currentValue', label: 'Current Value' },
				{ key: 'defaultValue', label: 'Default Value' },
				{ key: 'isManaged', label: 'Managed' },
				{ key: 'modifiedOn', label: 'Modified On' }
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

		try {
			const environmentVariables = await this.listEnvVarsUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId
			);

			// Map to view models and sort
			const viewModels = environmentVariables
				.map(envVar => this.viewModelMapper.toViewModel(envVar))
				.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

			const environments = await this.getEnvironments();
			const solutions = this.solutionOptions;

			this.logger.info('Environment variables loaded successfully', { count: viewModels.length });

			// Refresh HTML with data
			await this.scaffoldingBehavior.refresh({
				tableData: viewModels,
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				solutions,
				currentSolutionId: this.currentSolutionId || undefined
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing environment variables', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh environment variables: ${errorMessage}`);
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
			this.currentSolutionId || undefined
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

		// Disable refresh button during operation
		this.setButtonLoading('refresh', true);

		try {
			// Update current environment
			this.currentEnvironmentId = environmentId;
			this.currentSolutionId = undefined; // Reset solution filter

			// Update panel title
			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Environment Variables - ${environment.name}`;
			}

			// Load solutions for new environment
			this.solutionOptions = await this.loadSolutions();

			// Refresh data
			await this.handleRefresh();
		} finally {
			// Re-enable refresh button
			this.setButtonLoading('refresh', false);
		}
	}

	private async handleSolutionChange(solutionId: string | undefined): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		// Disable refresh button during operation
		this.setButtonLoading('refresh', true);

		try {
			// Update current solution filter
			this.currentSolutionId = solutionId;

			// Save solution selection to panel state
			if (this.panelStateRepository) {
				if (solutionId) {
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
				} else {
					await this.panelStateRepository.clear({
						panelType: 'environmentVariables',
						environmentId: this.currentEnvironmentId
					});
				}
			}

			// Refresh data
			await this.handleRefresh();
		} finally {
			// Re-enable refresh button
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
