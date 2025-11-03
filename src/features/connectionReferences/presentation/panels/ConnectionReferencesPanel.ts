import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ListConnectionReferencesUseCase } from '../../application/useCases/ListConnectionReferencesUseCase';
import { FlowConnectionRelationshipViewModelMapper } from '../../application/mappers/FlowConnectionRelationshipViewModelMapper';
import { type FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import {
	DataTablePanel,
	type EnvironmentOption,
	type DataTableConfig
} from '../../../../shared/infrastructure/ui/DataTablePanel';

/**
 * Presentation layer panel for Connection References.
 * Displays flows, connection references, and their relationships from a Power Platform environment.
 */
export class ConnectionReferencesPanel extends DataTablePanel {
	public static readonly viewType = 'powerPlatformDevSuite.connectionReferences';
	private static panels = new Map<string, ConnectionReferencesPanel>();

	private relationships: FlowConnectionRelationship[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		logger: ILogger,
		initialEnvironmentId?: string
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
	}

	/**
	 * Creates or shows the Connection References panel.
	 * Tracks panels by environment - each environment gets its own panel instance.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<ConnectionReferencesPanel> {
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
		const existingPanel = ConnectionReferencesPanel.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			ConnectionReferencesPanel.viewType,
			`Connection References - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new ConnectionReferencesPanel(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listConnectionReferencesUseCase,
			logger,
			targetEnvironmentId
		);

		ConnectionReferencesPanel.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	/**
	 * Returns the panel configuration.
	 */
	protected getConfig(): DataTableConfig {
		return {
			viewType: ConnectionReferencesPanel.viewType,
			title: 'Connection References',
			dataCommand: 'connectionReferencesData',
			defaultSortColumn: 'flowName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'flowName', label: 'Flow Name' },
				{ key: 'connectionReferenceLogicalName', label: 'Connection Reference' },
				{ key: 'connectionReferenceDisplayName', label: 'CR Display Name' },
				{ key: 'relationshipType', label: 'Status' },
				{ key: 'flowIsManaged', label: 'Flow Managed' },
				{ key: 'connectionReferenceIsManaged', label: 'CR Managed' },
				{ key: 'flowModifiedOn', label: 'Flow Modified' },
				{ key: 'connectionReferenceModifiedOn', label: 'CR Modified' }
			],
			searchPlaceholder: '🔍 Search flows and connection references...',
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No connection references found.'
		};
	}

	/**
	 * Loads connection references and their relationships from the current environment.
	 */
	protected async loadData(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load connection references: No environment selected');
			return;
		}

		this.logger.info('Loading connection references', { environmentId: this.currentEnvironmentId });

		try {
			this.setLoading(true);

			const cancellationToken = this.createCancellationToken();
			this.relationships = await this.listConnectionReferencesUseCase.execute(
				this.currentEnvironmentId,
				undefined, // No solution filtering for now
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			const viewModels = FlowConnectionRelationshipViewModelMapper.toViewModels(this.relationships, true);

			// Map to plain objects for webview compatibility
			const dataForWebview = viewModels.map(vm => ({ ...vm }));

			this.sendData(dataForWebview);

			this.logger.info('Connection references loaded successfully', { count: this.relationships.length });
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load connection references', error);
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
	 * Returns filter logic JavaScript for connection reference search.
	 */
	protected getFilterLogic(): string {
		return `
			filtered = allData.filter(rel =>
				rel.flowName.toLowerCase().includes(query) ||
				rel.connectionReferenceLogicalName.toLowerCase().includes(query) ||
				rel.connectionReferenceDisplayName.toLowerCase().includes(query) ||
				rel.relationshipType.toLowerCase().includes(query)
			);
		`;
	}

	/**
	 * Returns custom CSS for connection reference status highlighting.
	 */
	protected getCustomCss(): string {
		return `
			/* Highlight orphaned relationships */
			td:has(> span[data-status="Missing CR"]),
			td:has(> span[data-status="Unused CR"]) {
				color: #f48771;
			}
			td:has(> span[data-status="Valid"]) {
				color: #89d185;
			}
		`;
	}

	/**
	 * Opens the connection references page in the Maker Portal.
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

		// Connection references page URL pattern
		const url = `https://make.powerapps.com/environments/${environment.powerPlatformEnvironmentId}/connections`;
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened connection references in Maker Portal', {
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Switches to a different environment and reloads data.
	 * Updates the panel tracking to use the new environment ID.
	 */
	protected override async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return;
		}

		const oldEnvironmentId = this.currentEnvironmentId;

		// Remove from old environment key
		if (oldEnvironmentId) {
			ConnectionReferencesPanel.panels.delete(oldEnvironmentId);
		}

		// Call parent to update environment and reload data
		await super.switchEnvironment(environmentId);

		// Add to new environment key
		ConnectionReferencesPanel.panels.set(environmentId, this);
	}

	/**
	 * Disposes the panel and cleans up resources.
	 */
	public override dispose(): void {
		// Remove from panels map
		if (this.currentEnvironmentId) {
			ConnectionReferencesPanel.panels.delete(this.currentEnvironmentId);
		}
		super.dispose();
	}
}
