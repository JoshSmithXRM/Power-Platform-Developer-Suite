import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ListEnvironmentVariablesUseCase } from '../../application/useCases/ListEnvironmentVariablesUseCase';
import { EnvironmentVariableViewModelMapper } from '../../application/mappers/EnvironmentVariableViewModelMapper';
import { type EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import {
	DataTablePanel,
	type EnvironmentOption,
	type DataTableConfig
} from '../../../../shared/infrastructure/ui/DataTablePanel';

/**
 * Presentation layer panel for Environment Variables.
 * Displays environment variables from a Power Platform environment with environment switching support.
 */
export class EnvironmentVariablesPanel extends DataTablePanel {
	public static readonly viewType = 'powerPlatformDevSuite.environmentVariables';
	private static panels = new Map<string, EnvironmentVariablesPanel>();

	private environmentVariables: EnvironmentVariable[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		logger: ILogger,
		initialEnvironmentId?: string
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
	}

	/**
	 * Creates or shows the Environment Variables panel.
	 * Tracks panels by environment - each environment gets its own panel instance.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<EnvironmentVariablesPanel> {
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
		const existingPanel = EnvironmentVariablesPanel.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			EnvironmentVariablesPanel.viewType,
			`Environment Variables - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new EnvironmentVariablesPanel(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listEnvVarsUseCase,
			logger,
			targetEnvironmentId
		);

		EnvironmentVariablesPanel.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	/**
	 * Returns the panel configuration.
	 */
	protected getConfig(): DataTableConfig {
		return {
			viewType: EnvironmentVariablesPanel.viewType,
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
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No environment variables found.'
		};
	}

	/**
	 * Loads environment variables from the current environment.
	 */
	protected async loadData(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load environment variables: No environment selected');
			return;
		}

		this.logger.info('Loading environment variables', { environmentId: this.currentEnvironmentId });

		try {
			this.setLoading(true);

			const cancellationToken = this.createCancellationToken();
			this.environmentVariables = await this.listEnvVarsUseCase.execute(
				this.currentEnvironmentId,
				undefined, // No solution filtering for now
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = EnvironmentVariableViewModelMapper.toViewModels(this.environmentVariables, true);

			// Map to plain objects for webview compatibility
			const dataForWebview = viewModels.map(vm => ({ ...vm }));

			this.sendData(dataForWebview);

			this.logger.info('Environment variables loaded successfully', { count: this.environmentVariables.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load environment variables', error);
				this.handleError(error);
			}
		}
	}

	/**
	 * Handles panel-specific commands from webview.
	 */
	protected async handlePanelCommand(message: import('../../../../infrastructure/ui/utils/TypeGuards').WebviewMessage): Promise<void> {
		if (message.command === 'openMaker') {
			await this.handleOpenMaker();
		}
	}

	/**
	 * Returns filter logic JavaScript for environment variable search.
	 */
	protected getFilterLogic(): string {
		return `
			filtered = allData.filter(ev =>
				ev.schemaName.toLowerCase().includes(query) ||
				ev.displayName.toLowerCase().includes(query) ||
				ev.type.toLowerCase().includes(query) ||
				ev.currentValue.toLowerCase().includes(query) ||
				ev.defaultValue.toLowerCase().includes(query) ||
				ev.description.toLowerCase().includes(query)
			);
		`;
	}

	/**
	 * Opens the environment variables page in the Maker Portal.
	 */
	private async handleOpenMaker(): Promise<void> {
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

		// Environment variables page URL pattern
		const url = `https://make.powerapps.com/environments/${environment.powerPlatformEnvironmentId}/environmentvariables`;
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened environment variables in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Registers this panel in the static panels map for the given environment.
	 */
	protected registerPanelForEnvironment(environmentId: string): void {
		EnvironmentVariablesPanel.panels.set(environmentId, this);
	}

	/**
	 * Unregisters this panel from the static panels map for the given environment.
	 */
	protected unregisterPanelForEnvironment(environmentId: string): void {
		EnvironmentVariablesPanel.panels.delete(environmentId);
	}
}
