import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ListConnectionReferencesUseCase, type ListConnectionReferencesResult } from '../../application/useCases/ListConnectionReferencesUseCase';
import { ExportConnectionReferencesToDeploymentSettingsUseCase } from '../../application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase';
import { FlowConnectionRelationshipViewModelMapper } from '../../application/mappers/FlowConnectionRelationshipViewModelMapper';
import { type FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import { type ConnectionReference } from '../../domain/entities/ConnectionReference';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { isOpenFlowMessage } from '../../../../infrastructure/ui/utils/TypeGuards';
import {
	DataTablePanel,
	type EnvironmentOption,
	type DataTableConfig,
	type SolutionOption
} from '../../../../shared/infrastructure/ui/DataTablePanel';

/**
 * Presentation layer panel for Connection References.
 * Displays flows, connection references, and their relationships from a Power Platform environment.
 */
export class ConnectionReferencesPanel extends DataTablePanel {
	public static readonly viewType = 'powerPlatformDevSuite.connectionReferences';
	private static panels = new Map<string, ConnectionReferencesPanel>();

	private relationships: FlowConnectionRelationship[] = [];
	private connectionReferences: ConnectionReference[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId, panelStateRepository);
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
		exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
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
			exportToDeploymentSettingsUseCase,
			solutionRepository,
			urlBuilder,
			logger,
			targetEnvironmentId,
			panelStateRepository
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
				{ key: 'flowModifiedOn', label: 'Flow Modified' },
				{ key: 'connectionReferenceIsManaged', label: 'CR Managed' },
				{ key: 'connectionReferenceModifiedOn', label: 'CR Modified' }
			],
			searchPlaceholder: '🔍 Search flows and connection references...',
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No connection references found.',
			enableSolutionFilter: true
		};
	}

	/**
	 * Returns panel type identifier for state persistence.
	 */
	protected getPanelType(): string {
		return 'connectionReferences';
	}

	/**
	 * Loads solutions for the current environment (dropdown display only).
	 */
	protected async loadSolutions(): Promise<SolutionOption[]> {
		if (!this.currentEnvironmentId) {
			return [];
		}

		try {
			return await this.solutionRepository.findAllForDropdown(this.currentEnvironmentId);
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
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
			const result: ListConnectionReferencesResult = await this.listConnectionReferencesUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId || undefined, // Solution filtering
				cancellationToken
			);

			if (cancellationToken.isCancellationRequested) {
				return;
			}

			this.relationships = result.relationships;
			this.connectionReferences = result.connectionReferences;

			const viewModels = FlowConnectionRelationshipViewModelMapper.toViewModels(this.relationships, true);

			// Add HTML for clickable flow names
			const enhancedViewModels = viewModels.map(vm => ({
				...vm,
				flowNameHtml: vm.flowId
					? `<a class="flow-link" data-id="${vm.flowId}">${this.escapeHtml(vm.flowName)}</a>`
					: this.escapeHtml(vm.flowName)
			}));

			this.sendData(enhancedViewModels);

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
		if (isOpenFlowMessage(message)) {
			await this.handleOpenFlow(message.data.flowId);
		} else if (message.command === 'openMaker') {
			await this.handleOpenMaker();
		} else if (message.command === 'syncDeploymentSettings') {
			await this.handleSyncDeploymentSettings();
		}
	}

	/**
	 * Returns filter logic JavaScript for connection reference search.
	 */
	protected getFilterLogic(): string {
		return `
			filtered = allData.filter(rel =>
				(rel.flowName || '').toLowerCase().includes(query) ||
				(rel.connectionReferenceLogicalName || '').toLowerCase().includes(query) ||
				(rel.connectionReferenceDisplayName || '').toLowerCase().includes(query) ||
				(rel.relationshipType || '').toLowerCase().includes(query)
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
	 * Returns custom JavaScript to add the Sync Deployment Settings button and flow link handlers.
	 */
	protected getCustomJavaScript(): string {
		return `
			// Add Sync Deployment Settings button to toolbar
			const toolbarLeft = document.querySelector('.toolbar-left');
			if (toolbarLeft && !document.getElementById('syncDeploymentSettingsBtn')) {
				const syncBtn = document.createElement('button');
				syncBtn.id = 'syncDeploymentSettingsBtn';
				syncBtn.textContent = 'Sync Deployment Settings';
				syncBtn.addEventListener('click', () => {
					vscode.postMessage({ command: 'syncDeploymentSettings' });
				});
				toolbarLeft.appendChild(syncBtn);
			}

			// Attach click handlers to flow links
			document.querySelectorAll('.flow-link').forEach(link => {
				link.addEventListener('click', (e) => {
					const flowId = e.target.getAttribute('data-id');
					vscode.postMessage({ command: 'openFlow', data: { flowId } });
				});
			});
		`;
	}

	/**
	 * Opens a flow in the Maker Portal.
	 * @param flowId - GUID of the flow to open
	 */
	private async handleOpenFlow(flowId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open flow: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open flow: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		if (!this.currentSolutionId) {
			this.logger.warn('Cannot open flow: No solution selected');
			vscode.window.showWarningMessage('Please select a solution to open flows.');
			return;
		}

		const url = this.urlBuilder.buildFlowUrl(environment.powerPlatformEnvironmentId, this.currentSolutionId, flowId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened flow in Maker Portal', {
			flowId,
			solutionId: this.currentSolutionId
		});
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

		const url = this.urlBuilder.buildConnectionReferencesUrl(
			environment.powerPlatformEnvironmentId,
			this.currentSolutionId || undefined
		);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened connection references in Maker Portal', {
			environmentId: this.currentEnvironmentId,
			solutionId: this.currentSolutionId
		});
	}

	/**
	 * Syncs connection references to a deployment settings file.
	 */
	private async handleSyncDeploymentSettings(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot sync deployment settings: No environment selected');
			return;
		}

		if (this.connectionReferences.length === 0) {
			vscode.window.showWarningMessage('No connection references to export.');
			return;
		}

		// Get current solution uniqueName for filename
		const currentSolution = this.solutionFilterOptions.find(sol => sol.id === this.currentSolutionId);
		const filename = currentSolution
			? `${currentSolution.uniqueName}.deploymentsettings.json`
			: 'deploymentsettings.json';

		this.logger.info('Syncing deployment settings', {
			count: this.connectionReferences.length,
			filename
		});

		try {
			const result = await this.exportToDeploymentSettingsUseCase.execute(
				this.connectionReferences,
				filename
			);

			if (result) {
				const message = `Synced deployment settings: ${result.added} added, ${result.removed} removed, ${result.preserved} preserved`;
				vscode.window.showInformationMessage(message);
				this.logger.info('Deployment settings synced successfully', result);
			}
		} catch (error) {
			this.logger.error('Failed to sync deployment settings', error);
			vscode.window.showErrorMessage(`Failed to sync deployment settings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Registers this panel in the static panels map for the given environment.
	 */
	protected registerPanelForEnvironment(environmentId: string): void {
		ConnectionReferencesPanel.panels.set(environmentId, this);
	}

	/**
	 * Unregisters this panel from the static panels map for the given environment.
	 */
	protected unregisterPanelForEnvironment(environmentId: string): void {
		ConnectionReferencesPanel.panels.delete(environmentId);
	}
}
