import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ListSolutionsUseCase } from '../../application/useCases/ListSolutionsUseCase';
import { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { type Solution } from '../../domain/entities/Solution';
import { enhanceViewModelsWithSolutionLinks } from '../views/SolutionLinkView';
import {
	DataTablePanel,
	type EnvironmentOption,
	type DataTableConfig
} from '../../../../shared/infrastructure/ui/DataTablePanel';
import { isOpenInMakerMessage } from '../../../../infrastructure/ui/utils/TypeGuards';

/**
 * Presentation layer panel for Solution Explorer.
 * Displays solutions from a Power Platform environment with environment switching support.
 */
export class SolutionExplorerPanel extends DataTablePanel {
	public static readonly viewType = 'powerPlatformDevSuite.solutionExplorer';
	private static panels = new Map<string, SolutionExplorerPanel>();

	private solutions: Solution[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listSolutionsUseCase: ListSolutionsUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: SolutionViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
	}

	/**
	 * Creates or shows the Solution Explorer panel.
	 * Tracks panels by environment - each environment gets its own panel instance.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listSolutionsUseCase: ListSolutionsUseCase,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: SolutionViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<SolutionExplorerPanel> {
		const column = vscode.ViewColumn.One;

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
		const existingPanel = SolutionExplorerPanel.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			SolutionExplorerPanel.viewType,
			`Solutions - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new SolutionExplorerPanel(
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

		SolutionExplorerPanel.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	protected getConfig(): DataTableConfig {
		return {
			viewType: SolutionExplorerPanel.viewType,
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
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No solutions found.'
		};
	}

	protected getPanelType(): string {
		return 'solutions';
	}

	protected async loadData(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load solutions: No environment selected');
			return;
		}

		this.logger.info('Loading solutions', { environmentId: this.currentEnvironmentId });

		try {
			this.setLoading(true);

			const cancellationToken = this.createCancellationToken();
			this.solutions = await this.listSolutionsUseCase.execute(
				this.currentEnvironmentId,
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = this.viewModelMapper.toViewModels(this.solutions, true);
			const enhancedViewModels = enhanceViewModelsWithSolutionLinks(viewModels);

			this.sendData(enhancedViewModels);

			this.logger.info('Solutions loaded successfully', { count: this.solutions.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load solutions', error);
				this.handleError(error);
			}
		}
	}

	protected async handlePanelCommand(message: import('../../../../infrastructure/ui/utils/TypeGuards').WebviewMessage): Promise<void> {
		if (isOpenInMakerMessage(message)) {
			await this.handleOpenInMaker(message.data.solutionId);
		} else if (message.command === 'openMaker') {
			await this.handleOpenMakerSolutionsList();
		}
	}

	protected getFilterLogic(): string {
		return `
			filtered = allData.filter(s =>
				s.friendlyName.toLowerCase().includes(query) ||
				s.uniqueName.toLowerCase().includes(query) ||
				s.publisherName.toLowerCase().includes(query) ||
				s.description.toLowerCase().includes(query)
			);
		`;
	}

	/**
	 * Returns solution-specific JavaScript for event handlers.
	 * Adds click handlers to solution links for opening in Maker Portal.
	 */
	protected getPanelSpecificJavaScript(): string {
		return `
			// Attach click handlers to solution links
			document.querySelectorAll('.solution-link').forEach(link => {
				link.addEventListener('click', (e) => {
					const solutionId = e.target.getAttribute('data-id');
					vscode.postMessage({ command: 'openInMaker', data: { solutionId } });
				});
			});
		`;
	}

	/**
	 * Opens a solution in the Maker Portal.
	 * @param solutionId - GUID of the solution to open
	 * @throws Shows error message if environment ID not configured
	 */
	private async handleOpenInMaker(solutionId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open solution: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open solution: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const solution = this.solutions.find(s => s.id === solutionId);
		if (!solution) {
			this.logger.warn('Solution not found', { solutionId });
			return;
		}

		const url = this.urlBuilder.buildSolutionUrl(environment.powerPlatformEnvironmentId, solution.id);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solution in Maker Portal', {
			solutionId: solution.id,
			uniqueName: solution.uniqueName
		});
	}

	/**
	 * Opens the solutions list in the Maker Portal for the current environment.
	 * @throws Shows error message if environment ID not configured
	 */
	private async handleOpenMakerSolutionsList(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildSolutionsListUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solutions list in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	protected registerPanelForEnvironment(environmentId: string): void {
		SolutionExplorerPanel.panels.set(environmentId, this);
	}

	protected unregisterPanelForEnvironment(environmentId: string): void {
		SolutionExplorerPanel.panels.delete(environmentId);
	}
}
