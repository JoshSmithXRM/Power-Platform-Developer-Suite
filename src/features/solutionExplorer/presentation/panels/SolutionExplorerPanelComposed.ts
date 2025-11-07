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
import type { ListSolutionsUseCase } from '../../application/useCases/ListSolutionsUseCase';
import type { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';

/**
 * Commands supported by Solution Explorer panel.
 */
type SolutionExplorerCommands = 'refresh' | 'openMaker' | 'openInMaker' | 'environmentChange';

/**
 * Solution Explorer panel using new PanelCoordinator architecture.
 * Displays list of solutions for a specific environment.
 */
export class SolutionExplorerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.solutionExplorer';
	private static panels = new Map<string, SolutionExplorerPanelComposed>();

	private readonly coordinator: PanelCoordinator<SolutionExplorerCommands>;
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
		private readonly listSolutionsUseCase: ListSolutionsUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: SolutionViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		this.currentEnvironmentId = environmentId;
		logger.debug('SolutionExplorerPanel: Initialized with new architecture');

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
		listSolutionsUseCase: ListSolutionsUseCase,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: SolutionViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<SolutionExplorerPanelComposed> {
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
		const existingPanel = SolutionExplorerPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			SolutionExplorerPanelComposed.viewType,
			`Solutions - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new SolutionExplorerPanelComposed(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listSolutionsUseCase,
			urlBuilder,
			viewModelMapper,
			logger,
			targetEnvironmentId
		);

		SolutionExplorerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		const envId = targetEnvironmentId; // Capture for closure
		panel.onDidDispose(() => {
			SolutionExplorerPanelComposed.panels.delete(envId);
		});

		return newPanel;
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		// Initialize coordinator with environments
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: []
		});

		// Load solutions data
		await this.handleRefresh();
	}

	private createCoordinator(): { coordinator: PanelCoordinator<SolutionExplorerCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
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
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'solutions.css')
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
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'SolutionExplorerBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Solutions'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<SolutionExplorerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh solutions
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open solutions list in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMakerSolutionsList();
		});

		// Open individual solution in Maker
		this.coordinator.registerHandler('openInMaker', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId) {
				await this.handleOpenInMaker(solutionId);
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
			viewType: SolutionExplorerPanelComposed.viewType,
			title: 'Solutions',
			dataCommand: 'solutionsData',
			defaultSortColumn: 'friendlyName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'friendlyName', label: 'Solution Name' },
				{ key: 'uniqueName', label: 'Unique Name' },
				{ key: 'version', label: 'Version' },
				{ key: 'isManaged', label: 'Type' },
				{ key: 'publisherName', label: 'Publisher' },
				{ key: 'isVisible', label: 'Visible' },
				{ key: 'isApiManaged', label: 'API Managed' },
				{ key: 'installedOn', label: 'Installed On' },
				{ key: 'modifiedOn', label: 'Modified On' }
			],
			searchPlaceholder: '🔍 Search...',
			noDataMessage: 'No solutions found.',
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing solutions');

		try {
			const solutions = await this.listSolutionsUseCase.execute(this.currentEnvironmentId);

			// Sort view models alphabetically by friendlyName for initial render
			// Client-side sorting (DataTableBehavior.js) handles user interactions
			const viewModels = solutions
				.map(s => this.viewModelMapper.toViewModel(s))
				.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

			this.logger.info('Solutions loaded successfully', { count: viewModels.length });

			// Data-driven update: Send ViewModels to frontend
			await this.panel.webview.postMessage({
				command: 'updateTableData',
				data: {
					viewModels,
					columns: this.getTableConfig().columns
				}
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing solutions', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh solutions: ${errorMessage}`);
		}
	}

	private async handleOpenInMaker(solutionId: string): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open solution: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildSolutionUrl(environment.powerPlatformEnvironmentId, solutionId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solution in Maker Portal', { solutionId });
	}

	private async handleOpenMakerSolutionsList(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildSolutionsListUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solutions list in Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		this.setButtonLoading('refresh', true);
		this.clearTable();

		try {
			this.currentEnvironmentId = environmentId;

			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Solutions - ${environment.name}`;
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
