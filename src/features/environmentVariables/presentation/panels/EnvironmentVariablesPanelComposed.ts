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
	private currentEnvironmentId: string;
	private currentSolutionId: string | undefined;
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
			tableData: [],
			isLoading: true
		});

		// Load environment variables data
		const environmentVariables = await this.listEnvVarsUseCase.execute(
			this.currentEnvironmentId,
			this.currentSolutionId
		);
		const viewModels = environmentVariables
			.map(envVar => this.viewModelMapper.toViewModel(envVar))
			.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

		// Re-render with actual data
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions,
			currentSolutionId: this.currentSolutionId || undefined,
			tableData: viewModels
		});
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

			this.logger.info('Environment variables loaded successfully', { count: viewModels.length });

			// Data-driven update: Send ViewModels to frontend
			await this.panel.webview.postMessage({
				command: 'updateTableData',
				data: {
					viewModels,
					columns: this.getTableConfig().columns
				}
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

		this.setButtonLoading('refresh', true);
		this.clearTable();

		try {
			const oldEnvironmentId = this.currentEnvironmentId;
			this.currentEnvironmentId = environmentId;
			this.currentSolutionId = undefined; // Reset solution filter

			// Re-register panel in map for new environment
			this.reregisterPanel(EnvironmentVariablesPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Environment Variables - ${environment.name}`;
			}

			this.solutionOptions = await this.loadSolutions();

			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	private async handleSolutionChange(solutionId: string | undefined): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		this.setButtonLoading('refresh', true);
		this.clearTable();

		try {
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

			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	/**
	 * Clears the table by sending empty data to the webview.
	 * Provides immediate visual feedback during environment switches.
	 */
	private clearTable(): void {
		this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: [],
				columns: this.getTableConfig().columns
			}
		});
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
