import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
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

/**
 * Commands supported by Deployment Settings Promotion panel.
 */
type DeploymentSettingsPromotionCommands =
	| 'sourceEnvironmentChange'
	| 'solutionChange'
	| 'targetEnvironmentChange'
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
 * Presentation layer panel for Deployment Settings Promotion.
 *
 * **Workflow:**
 * 1. Select SOURCE Environment (where solution is configured and working)
 * 2. Select Solution (loads from source environment)
 * 3. Select TARGET Environment (where solution will be deployed)
 * 4. System automatically loads and matches connection references
 * 5. Save generates deployment settings file
 *
 * **Singleton Pattern (NOT Environment-Scoped)**:
 * This panel operates across TWO environments (source + target),
 * so it doesn't fit the EnvironmentScopedPanel pattern.
 */
export class DeploymentSettingsPromotionPanel {
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

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
		private readonly createConnectionRepository: ConnectionRepositoryFactory,
		private readonly solutionRepository: ISolutionRepository,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly connectorMappingService: ConnectorMappingService,
		private readonly logger: ILogger
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
		logger: ILogger
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
			logger
		);

		DeploymentSettingsPromotionPanel.currentPanel = newPanel;
		return newPanel;
	}

	private async initializePanel(): Promise<void> {
		// Load environments for dropdowns
		const envData = await this.getEnvironments();
		this.environments = envData.map((e) => ({ id: e.id, name: e.name }));

		await this.refreshPanel();
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

		await this.scaffoldingBehavior.refresh({
			customData: {
				...toolbarData,
				deploymentSettingsStatus: this.status
			}
		});
	}

	/**
	 * Determines if save is enabled.
	 * Requires matching to be complete with no unmatched connectors.
	 */
	private canSave(): boolean {
		return this.matchResult !== undefined && !this.matchResult.hasUnmatchedConnectors();
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<DeploymentSettingsPromotionCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		// Custom toolbar with three selectors and save button
		const toolbarSection = new DeploymentSettingsToolbarSection();

		// Status section in main content area
		const statusSection = new DeploymentSettingsStatusSection();

		const compositionBehavior = new SectionCompositionBehavior(
			[toolbarSection, statusSection],
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
			'saveDeploymentSettings',
			async () => {
				await this.handleSaveDeploymentSettings();
			},
			{ disableOnExecute: true }
		);
	}

	/**
	 * Handles source environment selection.
	 * Loads solutions for the selected source environment.
	 */
	private async handleSourceEnvironmentChanged(environmentId: string): Promise<void> {
		this.sourceEnvironmentId = environmentId;
		this.solutionId = undefined; // Reset solution when source changes
		this.matchResult = undefined; // Reset matching
		this.sourceConnectionReferences = [];

		this.logger.info('Source environment changed', { environmentId });

		// Update status
		this.status = { stage: 'sourceSelected' };
		await this.refreshPanel();

		try {
			// Load solutions for the source environment
			this.logger.debug('Loading solutions for source environment');
			this.solutions = await this.solutionRepository.findAllForDropdown(environmentId);

			this.logger.info('Loaded solutions for source', {
				environmentId,
				count: this.solutions.length
			});

			// Update solution dropdown via message
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
		this.matchResult = undefined; // Reset matching
		this.sourceConnectionReferences = [];

		const solution = this.solutions.find(s => s.id === solutionId);
		this.logger.info('Solution changed', { solutionId, solutionName: solution?.name });

		// Update status
		if (this.targetEnvironmentId) {
			this.status = { stage: 'loading' };
		} else {
			this.status = { stage: 'solutionSelected' };
		}
		await this.refreshPanel();

		// Trigger auto-load if target is also selected
		await this.tryAutoLoad();
	}

	/**
	 * Handles target environment selection.
	 */
	private async handleTargetEnvironmentChanged(environmentId: string): Promise<void> {
		this.targetEnvironmentId = environmentId;
		this.matchResult = undefined; // Reset matching

		this.logger.info('Target environment changed', { environmentId });

		// Update status
		if (this.sourceEnvironmentId && this.solutionId) {
			this.status = { stage: 'loading' };
		} else {
			this.status = { stage: 'targetSelected' };
		}
		await this.refreshPanel();

		// Trigger auto-load if source and solution are also selected
		await this.tryAutoLoad();
	}

	/**
	 * Auto-loads data and runs matching when all three selections are made.
	 */
	private async tryAutoLoad(): Promise<void> {
		if (!this.sourceEnvironmentId || !this.solutionId || !this.targetEnvironmentId) {
			return;
		}

		// Prevent selecting same environment as source and target
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
			// Load connection references from source environment + solution
			const sourceResult = await this.listConnectionReferencesUseCase.execute(
				this.sourceEnvironmentId,
				this.solutionId
			);
			this.sourceConnectionReferences = sourceResult.connectionReferences;

			// Load connections from target environment
			const connectionRepo = this.createConnectionRepository(this.targetEnvironmentId);
			this.targetConnections = await connectionRepo.findAll();

			this.logger.info('Loaded source and target data', {
				sourceConnectionRefs: this.sourceConnectionReferences.length,
				targetConnections: this.targetConnections.length
			});

			// Run matching
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

		// Extract unique ConnectorIds from source connection references
		const sourceConnectorIds = new Set(
			this.sourceConnectionReferences
				.map((cr) => cr.connectorId)
				.filter((id): id is string => id !== null)
		);

		// DEBUG: Log sample ConnectorIds from both sources to compare formats
		const sampleSourceIds = Array.from(sourceConnectorIds).slice(0, 5);
		const sampleTargetIds = this.targetConnections.slice(0, 5).map(c => c.connectorId);
		this.logger.info('DEBUG: Sample source ConnectorIds (from ConnectionReference.connectorId)', {
			sampleSourceIds,
			totalUniqueSource: sourceConnectorIds.size
		});
		this.logger.info('DEBUG: Sample target ConnectorIds (from Connection.connectorId/apiId)', {
			sampleTargetIds,
			totalTarget: this.targetConnections.length
		});

		// Run matching algorithm
		this.matchResult = this.connectorMappingService.matchConnectors(sourceConnectorIds, this.targetConnections);

		const autoMatchedCount = this.matchResult.getAutoMatchedCount();
		const unmatchedCount = this.matchResult.getUnmatchedCount();

		this.logger.info('Connector matching completed', {
			autoMatched: autoMatchedCount,
			needsMapping: unmatchedCount
		});

		// Update status with matching results
		this.status = {
			stage: 'matched',
			connectionReferenceCount: this.sourceConnectionReferences.length,
			autoMatchedCount,
			unmatchedCount
		};
		await this.refreshPanel();

		// Show results summary
		if (unmatchedCount === 0) {
			void vscode.window.showInformationMessage(
				`All ${autoMatchedCount} connectors auto-matched! Ready to save.`
			);
		} else {
			void vscode.window.showWarningMessage(
				`${autoMatchedCount} connectors auto-matched, ${unmatchedCount} need manual mapping`
			);
		}
	}

	/**
	 * Handles save button click.
	 * Generates deployment settings JSON and prompts for file location.
	 */
	private async handleSaveDeploymentSettings(): Promise<void> {
		this.logger.debug('Saving deployment settings');

		if (!this.matchResult || !this.sourceConnectionReferences.length) {
			void vscode.window.showErrorMessage('No data to save. Please complete the workflow first.');
			return;
		}

		if (this.matchResult.hasUnmatchedConnectors()) {
			void vscode.window.showErrorMessage('Cannot save: some connectors need manual mapping');
			return;
		}

		try {
			// Generate promoted connection references
			const matchResult = this.matchResult;
			const promotedConnectionRefs = this.sourceConnectionReferences.map((cr) => {
				if (cr.connectorId === null) {
					return {
						LogicalName: cr.connectionReferenceLogicalName,
						ConnectionId: '',
						ConnectorId: ''
					};
				}

				const connections = matchResult.getConnectionsForConnector(cr.connectorId);
				const defaultConn = this.connectorMappingService.selectDefaultConnection(connections);

				return {
					LogicalName: cr.connectionReferenceLogicalName,
					ConnectionId: defaultConn?.id ?? '',
					ConnectorId: cr.connectorId
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

			// Only set defaultUri if we have a workspace folder
			if (workspaceFolder) {
				saveDialogOptions.defaultUri = vscode.Uri.joinPath(workspaceFolder, suggestedName);
			}

			const saveUri = await vscode.window.showSaveDialog(saveDialogOptions);
			if (!saveUri) {
				this.logger.debug('Save cancelled');
				return;
			}

			// Write file
			const content = JSON.stringify(deploymentSettings, null, 2);
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));

			this.logger.info('Deployment settings saved', { path: saveUri.fsPath });
			void vscode.window.showInformationMessage(`Saved: ${saveUri.fsPath}`);

			// Open the generated file
			const doc = await vscode.workspace.openTextDocument(saveUri);
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to save deployment settings', { error: message });
			void vscode.window.showErrorMessage(`Failed to save: ${message}`);
		}
	}
}
