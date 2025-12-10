import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import {
	HtmlScaffoldingBehavior,
	type HtmlScaffoldingConfig
} from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { Connection } from '../../domain/entities/Connection';
import type { ConnectorMappingService } from '../../domain/services/ConnectorMappingService';
import type { ConnectorMatchResult } from '../../domain/valueObjects/ConnectorMatchResult';
import type { ListConnectionReferencesUseCase } from '../../../connectionReferences/application/useCases/ListConnectionReferencesUseCase';
import type { ConnectionReference } from '../../../connectionReferences/domain/entities/ConnectionReference';
import { DeploymentSettingsToolbarSection, type DeploymentSettingsToolbarData } from '../sections/DeploymentSettingsToolbarSection';
import { DeploymentSettingsStatusSection, type DeploymentSettingsStatus } from '../sections/DeploymentSettingsStatusSection';
import { ConnectionReferenceMappingSection } from '../sections/ConnectionReferenceMappingSection';
import type {
	ConnectionReferenceMappingViewModel,
	AvailableConnectionViewModel,
	ConnectionMappingStatus
} from '../viewModels/ConnectionReferenceMappingViewModel';

/** Persisted state for deployment settings panel */
interface DeploymentSettingsPanelState {
	sourceEnvironmentId?: string;
	solutionId?: string;
	targetEnvironmentId?: string;
	lastUpdated: string;
	[key: string]: unknown; // Index signature required by PanelState
}

/**
 * Commands supported by Deployment Settings Promotion panel.
 */
type DeploymentSettingsPromotionCommands =
	| 'sourceEnvironmentChange'
	| 'solutionChange'
	| 'targetEnvironmentChange'
	| 'connectionSelectionChange'
	| 'manualConnectionIdChange'
	| 'saveDeploymentSettings';

/**
 * Factory for creating connection repositories per environment.
 */
type ConnectionRepositoryFactory = (envId: string) => {
	findAll: () => Promise<readonly Connection[]>;
};

interface SolutionOption {
	readonly id: string;
	readonly name: string;
	readonly uniqueName: string;
}

/**
 * Tracks user's connection selection for a single connection reference.
 */
interface ConnectionSelection {
	/** Selected connection ID from dropdown (null if not selected) */
	selectedConnectionId: string | null;
	/** Selected connection's ConnectorId (needed for output when connector differs from source) */
	selectedConnectorId: string | null;
	/** Manual connection ID entry (for unmatched connectors) */
	manualConnectionId: string;
	/** Manual connector ID entry (when user enters ConnectionId manually) */
	manualConnectorId: string;
}

/**
 * Presentation layer panel for Deployment Settings Promotion.
 *
 * **Workflow:**
 * 1. Select SOURCE Environment (where solution is configured and working)
 * 2. Select Solution (loads from source environment)
 * 3. Select TARGET Environment (where solution will be deployed)
 * 4. System loads connection references and matches to target connections
 * 5. User reviews/edits mappings in the table
 * 6. Save generates deployment settings file
 *
 * **Singleton Pattern (NOT Environment-Scoped)**:
 * This panel operates across TWO environments (source + target),
 * so it doesn't fit the EnvironmentScopedPanel pattern.
 */
export class DeploymentSettingsPromotionPanel {
	public static readonly viewType = 'deploymentSettings';
	private static currentPanel: DeploymentSettingsPromotionPanel | undefined;
	private coordinator!: PanelCoordinator<DeploymentSettingsPromotionCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;

	// State
	private environments: Array<{ id: string; name: string }> = [];
	private sourceEnvironmentId: string | undefined;
	private solutionId: string | undefined;
	private solutions: SolutionOption[] = [];
	private targetEnvironmentId: string | undefined;
	private targetConnections: readonly Connection[] = [];
	private sourceConnectionReferences: ConnectionReference[] = [];
	private matchResult: ConnectorMatchResult | undefined;
	private status: DeploymentSettingsStatus = { stage: 'initial' };

	/** User's connection selections, keyed by CR logical name */
	private connectionSelections: Map<string, ConnectionSelection> = new Map();

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
		private readonly createConnectionRepository: ConnectionRepositoryFactory,
		private readonly solutionRepository: ISolutionRepository,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly connectorMappingService: ConnectorMappingService,
		private readonly logger: ILogger,
		private readonly panelStateRepository?: IPanelStateRepository
	) {
		logger.debug('DeploymentSettingsPromotionPanel: Initialized');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		panel.onDidDispose(() => {
			DeploymentSettingsPromotionPanel.currentPanel = undefined;
		});

		void this.initializePanel();
	}

	public static createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
		createConnectionRepository: ConnectionRepositoryFactory,
		solutionRepository: ISolutionRepository,
		listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		connectorMappingService: ConnectorMappingService,
		logger: ILogger,
		panelStateRepository?: IPanelStateRepository
	): DeploymentSettingsPromotionPanel {
		const column = vscode.ViewColumn.One;

		if (DeploymentSettingsPromotionPanel.currentPanel) {
			DeploymentSettingsPromotionPanel.currentPanel.panel.reveal(column);
			return DeploymentSettingsPromotionPanel.currentPanel;
		}

		const rawPanel = vscode.window.createWebviewPanel(
			'deploymentSettings',
			'Deployment Settings',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		);

		const safePanel = new SafeWebviewPanel(rawPanel);

		const newPanel = new DeploymentSettingsPromotionPanel(
			safePanel,
			extensionUri,
			getEnvironments,
			createConnectionRepository,
			solutionRepository,
			listConnectionReferencesUseCase,
			connectorMappingService,
			logger,
			panelStateRepository
		);

		DeploymentSettingsPromotionPanel.currentPanel = newPanel;
		return newPanel;
	}

	private async initializePanel(): Promise<void> {
		// Load environments for dropdowns
		const envData = await this.getEnvironments();
		this.environments = envData.map((e) => ({ id: e.id, name: e.name }));

		// Try to restore saved state
		await this.restoreSavedState();

		await this.refreshPanel();
	}

	/**
	 * Restores saved panel state (source env, solution, target env).
	 * If all three are restored, auto-triggers the workflow.
	 */
	private async restoreSavedState(): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			const state = await this.panelStateRepository.load({
				panelType: DeploymentSettingsPromotionPanel.viewType,
				environmentId: 'global' // Not environment-scoped
			}) as DeploymentSettingsPanelState | null;

			if (!state) {
				return;
			}

			this.logger.debug('Restoring deployment settings panel state', state);

			// Restore source environment if it still exists
			if (state.sourceEnvironmentId && this.environments.some(e => e.id === state.sourceEnvironmentId)) {
				this.sourceEnvironmentId = state.sourceEnvironmentId;

				// Load solutions for restored source environment
				try {
					this.solutions = await this.solutionRepository.findAllForDropdown(state.sourceEnvironmentId);
				} catch {
					this.logger.debug('Failed to load solutions for restored source environment');
					this.sourceEnvironmentId = undefined;
					return;
				}

				// Restore solution if it still exists
				if (state.solutionId && this.solutions.some(s => s.id === state.solutionId)) {
					this.solutionId = state.solutionId;
				}
			}

			// Restore target environment if it still exists
			if (state.targetEnvironmentId && this.environments.some(e => e.id === state.targetEnvironmentId)) {
				this.targetEnvironmentId = state.targetEnvironmentId;
			}

			// Auto-trigger workflow if all three are restored
			if (this.sourceEnvironmentId && this.solutionId && this.targetEnvironmentId) {
				this.logger.info('Auto-loading data from restored state');
				this.status = { stage: 'loading' };
				// Don't await - let it run in background while panel renders
				void this.tryAutoLoad();
			}
		} catch (error) {
			this.logger.debug('Failed to restore panel state', { error });
		}
	}

	/**
	 * Saves current panel state for restoration on next open.
	 */
	private async saveState(): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			// Build state object conditionally to satisfy exactOptionalPropertyTypes
			const state: DeploymentSettingsPanelState = {
				lastUpdated: new Date().toISOString()
			};
			if (this.sourceEnvironmentId !== undefined) {
				state.sourceEnvironmentId = this.sourceEnvironmentId;
			}
			if (this.solutionId !== undefined) {
				state.solutionId = this.solutionId;
			}
			if (this.targetEnvironmentId !== undefined) {
				state.targetEnvironmentId = this.targetEnvironmentId;
			}

			await this.panelStateRepository.save(
				{ panelType: DeploymentSettingsPromotionPanel.viewType, environmentId: 'global' },
				state
			);
		} catch (error) {
			this.logger.debug('Failed to save panel state', { error });
		}
	}

	/**
	 * Refreshes the panel HTML with current state.
	 */
	private async refreshPanel(): Promise<void> {
		const toolbarData: DeploymentSettingsToolbarData = {
			environments: this.environments,
			sourceEnvironmentId: this.sourceEnvironmentId,
			solutions: this.solutions,
			currentSolutionId: this.solutionId,
			solutionDisabled: !this.sourceEnvironmentId,
			targetEnvironmentId: this.targetEnvironmentId,
			saveDisabled: !this.canSave()
		};

		// Build mapping view models if we have data
		const connectionReferenceMappings = this.buildMappingViewModels();

		await this.scaffoldingBehavior.refresh({
			customData: {
				...toolbarData,
				deploymentSettingsStatus: this.status,
				connectionReferenceMappings
			}
		});
	}

	/**
	 * Builds the mapping view models from current state.
	 * Sorted: items needing attention first, then alphabetically by logicalName.
	 */
	private buildMappingViewModels(): ConnectionReferenceMappingViewModel[] {
		if (!this.matchResult || this.sourceConnectionReferences.length === 0) {
			return [];
		}

		const viewModels = this.sourceConnectionReferences.map((cr) => {
			const connectorId = cr.connectorId;
			const logicalName = cr.connectionReferenceLogicalName;

			// Get or create selection state for this CR
			let selection = this.connectionSelections.get(logicalName);
			if (!selection) {
				selection = { selectedConnectionId: null, selectedConnectorId: null, manualConnectionId: '', manualConnectorId: '' };
				this.connectionSelections.set(logicalName, selection);
			}

			// Get available connections for this connector type
			let availableConnections: AvailableConnectionViewModel[] = [];
			let status: ConnectionMappingStatus = 'unmatched';

			if (connectorId !== null) {
				const connections = this.matchResult?.getConnectionsForConnector(connectorId) ?? [];

				if (connections.length > 0) {
					// Matched connector - show connections for this connector type, sorted
					const mapped = connections.map(conn => ({
						id: conn.id,
						displayName: conn.displayName,
						status: conn.status,
						owner: conn.createdBy,
						connectorId: conn.connectorId,
						connectorName: this.extractConnectorName(conn.connectorId)
					}));
					availableConnections = this.sortConnectionViewModels(mapped);

					// Auto-select first active connection if not already selected
					if (selection.selectedConnectionId === null) {
						const defaultConn = this.connectorMappingService.selectDefaultConnection(connections);
						if (defaultConn) {
							selection.selectedConnectionId = defaultConn.id;
							selection.selectedConnectorId = defaultConn.connectorId;
						}
					}
					status = availableConnections.length > 1 ? 'multiple' : 'configured';
				} else {
					// Unmatched connector - show ALL target connections for manual mapping
					availableConnections = this.getAllTargetConnectionsAsViewModels();
					status = 'unmatched';
				}
			} else {
				// No connector ID - show ALL target connections
				availableConnections = this.getAllTargetConnectionsAsViewModels();
				status = 'unmatched';
			}

			// Extract connector name for display
			const connectorName = this.extractConnectorName(connectorId);

			return {
				logicalName,
				displayName: cr.displayName,
				connectorName,
				connectorId,
				availableConnections,
				selectedConnectionId: selection.selectedConnectionId,
				status,
				manualConnectionId: selection.manualConnectionId
			};
		});

		// Sort: needs attention first, then alphabetically by logicalName
		return this.sortMappingsForDisplay(viewModels);
	}

	/**
	 * Sorts mappings: items needing attention first, then alphabetically by logicalName.
	 */
	private sortMappingsForDisplay(
		mappings: ConnectionReferenceMappingViewModel[]
	): ConnectionReferenceMappingViewModel[] {
		return [...mappings].sort((a, b) => {
			const aNeedsAttention = this.needsAttention(a);
			const bNeedsAttention = this.needsAttention(b);

			// Needs attention items come first
			if (aNeedsAttention && !bNeedsAttention) return -1;
			if (!aNeedsAttention && bNeedsAttention) return 1;

			// Within same group, sort by logicalName
			return a.logicalName.localeCompare(b.logicalName);
		});
	}

	/**
	 * Determines if a mapping needs user attention.
	 */
	private needsAttention(mapping: ConnectionReferenceMappingViewModel): boolean {
		// Unmatched without selection needs attention
		if (mapping.status === 'unmatched') {
			return mapping.selectedConnectionId === null && mapping.manualConnectionId === '';
		}
		// Multiple options without selection needs attention
		if (mapping.status === 'multiple') {
			return mapping.selectedConnectionId === null;
		}
		return false;
	}

	/**
	 * Converts ALL target connections to view models for unmatched connector dropdown.
	 * Sorted: Connected first, then alphabetically by connector name and display name.
	 */
	private getAllTargetConnectionsAsViewModels(): AvailableConnectionViewModel[] {
		const viewModels = this.targetConnections.map(conn => ({
			id: conn.id,
			displayName: conn.displayName,
			status: conn.status,
			owner: conn.createdBy,
			connectorId: conn.connectorId,
			connectorName: this.extractConnectorName(conn.connectorId)
		}));
		return this.sortConnectionViewModels(viewModels);
	}

	/**
	 * Sorts connection view models: Connected first, then alphabetically by connector/display name.
	 */
	private sortConnectionViewModels(connections: AvailableConnectionViewModel[]): AvailableConnectionViewModel[] {
		return [...connections].sort((a, b) => {
			// Connected status comes first
			const aConnected = a.status === 'Connected' ? 0 : 1;
			const bConnected = b.status === 'Connected' ? 0 : 1;
			if (aConnected !== bConnected) {
				return aConnected - bConnected;
			}

			// Then sort by connector name
			const connectorCompare = a.connectorName.localeCompare(b.connectorName);
			if (connectorCompare !== 0) {
				return connectorCompare;
			}

			// Finally by display name
			return a.displayName.localeCompare(b.displayName);
		});
	}

	/**
	 * Normalizes a ConnectorId to the short form for deployment settings output.
	 * Converts: /providers/.../environments/{guid}/apis/shared_foo
	 * To:       /providers/Microsoft.PowerApps/apis/shared_foo
	 */
	private normalizeConnectorIdForOutput(connectorId: string | null): string {
		if (connectorId === null) {
			return '';
		}

		// Extract connector name (e.g., "shared_azureblob")
		const connectorName = this.connectorMappingService.normalizeConnectorId(connectorId);

		// Return the standard short-form path
		return `/providers/Microsoft.PowerApps/apis/${connectorName}`;
	}

	/**
	 * Extracts a friendly connector name from the ConnectorId path.
	 */
	private extractConnectorName(connectorId: string | null): string {
		if (connectorId === null) {
			return 'Unknown Connector';
		}

		// Extract connector name after /apis/
		const normalized = this.connectorMappingService.normalizeConnectorId(connectorId);

		// Convert shared_commondataserviceforapps to "Dataverse" etc
		const friendlyNames: Record<string, string> = {
			'shared_commondataserviceforapps': 'Dataverse',
			'shared_commondataservice': 'Dataverse (legacy)',
			'shared_sharepointonline': 'SharePoint Online',
			'shared_office365': 'Office 365',
			'shared_office365users': 'Office 365 Users',
			'shared_outlook': 'Outlook',
			'shared_teams': 'Microsoft Teams',
			'shared_azuread': 'Azure AD',
			'shared_azureblob': 'Azure Blob Storage',
			'shared_dynamicsax': 'Dynamics 365 Finance',
			'shared_sendmail': 'Send Email'
		};

		return friendlyNames[normalized] ?? normalized.replace('shared_', '').replace(/_/g, ' ');
	}

	/**
	 * Determines if save is enabled.
	 * Now checks if all connection references have a valid selection.
	 */
	private canSave(): boolean {
		if (!this.matchResult || this.sourceConnectionReferences.length === 0) {
			return false;
		}

		// Check that all CRs have either a selected connection or manual entry
		for (const cr of this.sourceConnectionReferences) {
			const selection = this.connectionSelections.get(cr.connectionReferenceLogicalName);
			if (!selection) {
				return false;
			}

			const hasSelection = selection.selectedConnectionId !== null && selection.selectedConnectionId !== '';
			const hasManual = selection.manualConnectionId !== '';

			if (!hasSelection && !hasManual) {
				return false;
			}
		}

		return true;
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<DeploymentSettingsPromotionCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		// Custom toolbar with three selectors and save button
		const toolbarSection = new DeploymentSettingsToolbarSection();

		// Status section (shows instructions before data is loaded)
		const statusSection = new DeploymentSettingsStatusSection();

		// Connection reference mapping table
		const mappingSection = new ConnectionReferenceMappingSection();

		const compositionBehavior = new SectionCompositionBehavior(
			[toolbarSection, statusSection, mappingSection],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs', 'dropdown'],
				sections: ['action-buttons', 'environment-selector']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview
			.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'deployment-settings.css'))
			.toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview
					.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js'))
					.toString(),
				this.panel.webview
					.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'DeploymentSettingsBehavior.js'))
					.toString()
			],
			cspNonce: getNonce(),
			title: 'Deployment Settings'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(this.panel, compositionBehavior, scaffoldingConfig);

		const coordinator = new PanelCoordinator<DeploymentSettingsPromotionCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		this.coordinator.registerHandler(
			'sourceEnvironmentChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'environmentId' in data) {
					await this.handleSourceEnvironmentChanged((data as { environmentId: string }).environmentId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'solutionChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'solutionId' in data) {
					await this.handleSolutionChanged((data as { solutionId: string }).solutionId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'targetEnvironmentChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'environmentId' in data) {
					await this.handleTargetEnvironmentChanged((data as { environmentId: string }).environmentId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'connectionSelectionChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'logicalName' in data && 'connectionId' in data) {
					const { logicalName, connectionId } = data as { logicalName: string; connectionId: string };
					await this.handleConnectionSelectionChange(logicalName, connectionId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'manualConnectionIdChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'logicalName' in data && 'connectionId' in data) {
					const { logicalName, connectionId } = data as { logicalName: string; connectionId: string };
					await this.handleManualConnectionIdChange(logicalName, connectionId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'saveDeploymentSettings',
			async () => {
				await this.handleSaveDeploymentSettings();
			},
			{ disableOnExecute: true }
		);
	}

	/**
	 * Handles connection dropdown selection change.
	 * Captures both ConnectionId and ConnectorId from the selected target connection.
	 */
	private async handleConnectionSelectionChange(logicalName: string, connectionId: string): Promise<void> {
		let selection = this.connectionSelections.get(logicalName);
		if (!selection) {
			selection = { selectedConnectionId: null, selectedConnectorId: null, manualConnectionId: '', manualConnectorId: '' };
			this.connectionSelections.set(logicalName, selection);
		}

		selection.selectedConnectionId = connectionId || null;

		// Look up the selected connection to get its ConnectorId
		if (connectionId) {
			const selectedConnection = this.targetConnections.find(c => c.id === connectionId);
			selection.selectedConnectorId = selectedConnection?.connectorId ?? null;
		} else {
			selection.selectedConnectorId = null;
		}

		this.logger.debug('Connection selection changed', {
			logicalName,
			connectionId,
			connectorId: selection.selectedConnectorId
		});

		// Refresh panel to update visual indicators (checkmarks/warnings)
		await this.refreshPanel();
	}

	/**
	 * Handles manual connection ID input change.
	 */
	private async handleManualConnectionIdChange(logicalName: string, connectionId: string): Promise<void> {
		let selection = this.connectionSelections.get(logicalName);
		if (!selection) {
			selection = { selectedConnectionId: null, selectedConnectorId: null, manualConnectionId: '', manualConnectorId: '' };
			this.connectionSelections.set(logicalName, selection);
		}

		selection.manualConnectionId = connectionId;

		this.logger.debug('Manual connection ID changed', { logicalName, connectionId });

		// Update save button state (don't refresh full panel on every keystroke)
		await this.panel.postMessage({
			command: 'updateSaveButton',
			data: { disabled: !this.canSave() }
		});
	}

	/**
	 * Handles source environment selection.
	 * Loads solutions for the selected source environment.
	 */
	private async handleSourceEnvironmentChanged(environmentId: string): Promise<void> {
		this.sourceEnvironmentId = environmentId;
		this.solutionId = undefined;
		this.matchResult = undefined;
		this.sourceConnectionReferences = [];
		this.connectionSelections.clear();

		this.logger.info('Source environment changed', { environmentId });

		// Persist selection
		await this.saveState();

		this.status = { stage: 'sourceSelected' };
		await this.refreshPanel();

		try {
			this.logger.debug('Loading solutions for source environment');
			this.solutions = await this.solutionRepository.findAllForDropdown(environmentId);

			this.logger.info('Loaded solutions for source', {
				environmentId,
				count: this.solutions.length
			});

			await this.panel.postMessage({
				command: 'updateSolutionSelector',
				data: {
					solutions: this.solutions,
					currentSolutionId: undefined,
					disabled: false
				}
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to load solutions', { environmentId, error: message });
			void vscode.window.showErrorMessage(`Failed to load solutions: ${message}`);
		}
	}

	/**
	 * Handles solution selection.
	 */
	private async handleSolutionChanged(solutionId: string): Promise<void> {
		this.solutionId = solutionId;
		this.matchResult = undefined;
		this.sourceConnectionReferences = [];
		this.connectionSelections.clear();

		const solution = this.solutions.find(s => s.id === solutionId);
		this.logger.info('Solution changed', { solutionId, solutionName: solution?.name });

		// Persist selection
		await this.saveState();

		if (this.targetEnvironmentId) {
			this.status = { stage: 'loading' };
		} else {
			this.status = { stage: 'solutionSelected' };
		}
		await this.refreshPanel();

		await this.tryAutoLoad();
	}

	/**
	 * Handles target environment selection.
	 */
	private async handleTargetEnvironmentChanged(environmentId: string): Promise<void> {
		this.targetEnvironmentId = environmentId;
		this.matchResult = undefined;
		this.connectionSelections.clear();

		this.logger.info('Target environment changed', { environmentId });

		// Persist selection
		await this.saveState();

		if (this.sourceEnvironmentId && this.solutionId) {
			this.status = { stage: 'loading' };
		} else {
			this.status = { stage: 'targetSelected' };
		}
		await this.refreshPanel();

		await this.tryAutoLoad();
	}

	/**
	 * Auto-loads data and runs matching when all three selections are made.
	 */
	private async tryAutoLoad(): Promise<void> {
		if (!this.sourceEnvironmentId || !this.solutionId || !this.targetEnvironmentId) {
			return;
		}

		if (this.sourceEnvironmentId === this.targetEnvironmentId) {
			void vscode.window.showWarningMessage('Source and target environments must be different');
			return;
		}

		this.logger.info('Auto-loading deployment settings data', {
			sourceEnv: this.sourceEnvironmentId,
			solutionId: this.solutionId,
			targetEnv: this.targetEnvironmentId
		});

		this.status = { stage: 'loading' };
		await this.refreshPanel();

		try {
			const sourceResult = await this.listConnectionReferencesUseCase.execute(
				this.sourceEnvironmentId,
				this.solutionId
			);
			this.sourceConnectionReferences = sourceResult.connectionReferences;

			const connectionRepo = this.createConnectionRepository(this.targetEnvironmentId);
			this.targetConnections = await connectionRepo.findAll();

			this.logger.info('Loaded source and target data', {
				sourceConnectionRefs: this.sourceConnectionReferences.length,
				targetConnections: this.targetConnections.length
			});

			await this.runMatching();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to auto-load data', { error: message });

			this.status = {
				stage: 'error',
				errorMessage: `Failed to load data: ${message}`
			};
			await this.refreshPanel();

			void vscode.window.showErrorMessage(`Failed to load data: ${message}`);
		}
	}

	/**
	 * Runs connector matching between source connection refs and target connections.
	 */
	private async runMatching(): Promise<void> {
		if (this.sourceConnectionReferences.length === 0) {
			this.status = {
				stage: 'matched',
				connectionReferenceCount: 0,
				autoMatchedCount: 0,
				unmatchedCount: 0
			};
			await this.refreshPanel();
			return;
		}

		const sourceConnectorIds = new Set(
			this.sourceConnectionReferences
				.map((cr) => cr.connectorId)
				.filter((id): id is string => id !== null)
		);

		this.matchResult = this.connectorMappingService.matchConnectors(sourceConnectorIds, this.targetConnections);

		const autoMatchedCount = this.matchResult.getAutoMatchedCount();
		const unmatchedCount = this.matchResult.getUnmatchedCount();

		this.logger.info('Connector matching completed', {
			autoMatched: autoMatchedCount,
			needsMapping: unmatchedCount
		});

		// Clear old selections and let buildMappingViewModels auto-select
		this.connectionSelections.clear();

		// Update status - now show the mapping table
		this.status = {
			stage: 'matched',
			connectionReferenceCount: this.sourceConnectionReferences.length,
			autoMatchedCount,
			unmatchedCount
		};
		await this.refreshPanel();
	}

	/**
	 * Handles save button click.
	 * Generates deployment settings JSON using user's selections.
	 */
	private async handleSaveDeploymentSettings(): Promise<void> {
		this.logger.debug('Saving deployment settings');

		if (!this.sourceConnectionReferences.length) {
			void vscode.window.showErrorMessage('No data to save. Please complete the workflow first.');
			return;
		}

		try {
			// Generate connection references using user's selections
			const promotedConnectionRefs = this.sourceConnectionReferences.map((cr) => {
				const logicalName = cr.connectionReferenceLogicalName;
				const selection = this.connectionSelections.get(logicalName);

				// Determine ConnectionId and ConnectorId from selection
				let connectionId = '';
				let connectorId = cr.connectorId ?? '';

				if (selection) {
					if (selection.selectedConnectionId) {
						// User selected from dropdown - use target connection's IDs
						connectionId = selection.selectedConnectionId;
						// Use target's ConnectorId if available (important for cross-connector mapping)
						if (selection.selectedConnectorId) {
							connectorId = selection.selectedConnectorId;
						}
					} else if (selection.manualConnectionId) {
						// Manual entry - use provided values
						connectionId = selection.manualConnectionId;
						// For manual entry, use manual ConnectorId if provided, else source's
						if (selection.manualConnectorId) {
							connectorId = selection.manualConnectorId;
						}
					}
				}

				// Normalize ConnectorId to short form for deployment settings output
				// Converts environment-scoped paths to standard /providers/Microsoft.PowerApps/apis/... format
				const normalizedConnectorId = this.normalizeConnectorIdForOutput(connectorId);

				return {
					LogicalName: logicalName,
					ConnectionId: connectionId,
					ConnectorId: normalizedConnectorId
				};
			});

			// Sort alphabetically by logical name
			promotedConnectionRefs.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));

			// Create deployment settings object
			const deploymentSettings = {
				EnvironmentVariables: [],
				ConnectionReferences: promotedConnectionRefs
			};

			// Get suggested filename from solution
			const solution = this.solutions.find(s => s.id === this.solutionId);
			const suggestedName = solution
				? `${solution.uniqueName}.deploymentsettings.json`
				: 'deploymentsettings.json';

			// Prompt for save location
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
			const saveDialogOptions: vscode.SaveDialogOptions = {
				filters: {
					'JSON Files': ['json'],
					'All Files': ['*']
				},
				title: 'Save Deployment Settings'
			};

			if (workspaceFolder) {
				saveDialogOptions.defaultUri = vscode.Uri.joinPath(workspaceFolder, suggestedName);
			}

			const saveUri = await vscode.window.showSaveDialog(saveDialogOptions);
			if (!saveUri) {
				this.logger.debug('Save cancelled');
				return;
			}

			const content = JSON.stringify(deploymentSettings, null, 2);
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));

			this.logger.info('Deployment settings saved', { path: saveUri.fsPath });
			void vscode.window.showInformationMessage(`Saved: ${saveUri.fsPath}`);

			const doc = await vscode.workspace.openTextDocument(saveUri);
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to save deployment settings', { error: message });
			void vscode.window.showErrorMessage(`Failed to save: ${message}`);
		}
	}
}
