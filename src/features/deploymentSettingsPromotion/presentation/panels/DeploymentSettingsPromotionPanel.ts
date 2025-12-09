import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import {
	HtmlScaffoldingBehavior,
	type HtmlScaffoldingConfig
} from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { DeploymentSettings } from '../../../../shared/domain/entities/DeploymentSettings';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import type { Connection } from '../../domain/entities/Connection';
import type { ConnectorMappingService } from '../../domain/services/ConnectorMappingService';
import type { ConnectorMatchResult } from '../../domain/valueObjects/ConnectorMatchResult';

/**
 * Commands supported by Deployment Settings Promotion panel.
 */
type DeploymentSettingsPromotionCommands =
	| 'loadSourceFile'
	| 'environmentChange'
	| 'generateOutputFile';

/**
 * Factory for creating connection repositories per environment.
 */
type ConnectionRepositoryFactory = (envId: string) => {
	findAll: () => Promise<readonly Connection[]>;
};

/**
 * Presentation layer panel for Deployment Settings Promotion.
 *
 * **Singleton Pattern (NOT Environment-Scoped)**:
 * This panel operates across TWO environments (source file + target environment),
 * so it doesn't fit the EnvironmentScopedPanel pattern. It's a singleton panel
 * that lets users select both source and target independently.
 */
export class DeploymentSettingsPromotionPanel {
	private static currentPanel: DeploymentSettingsPromotionPanel | undefined;
	private coordinator!: PanelCoordinator<DeploymentSettingsPromotionCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;

	// State
	private sourceFilePath: string | undefined;
	private sourceDeploymentSettings: DeploymentSettings | undefined;
	private targetEnvironmentId: string | undefined;
	private targetConnections: readonly Connection[] = [];
	private matchResult: ConnectorMatchResult | undefined;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
		private readonly createConnectionRepository: ConnectionRepositoryFactory,
		private readonly deploymentSettingsRepository: IDeploymentSettingsRepository,
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
		deploymentSettingsRepository: IDeploymentSettingsRepository,
		connectorMappingService: ConnectorMappingService,
		logger: ILogger
	): DeploymentSettingsPromotionPanel {
		const column = vscode.ViewColumn.One;

		if (DeploymentSettingsPromotionPanel.currentPanel) {
			DeploymentSettingsPromotionPanel.currentPanel.panel.reveal(column);
			return DeploymentSettingsPromotionPanel.currentPanel;
		}

		const rawPanel = vscode.window.createWebviewPanel(
			'deploymentSettingsPromotion',
			'Promote Deployment Settings',
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
			deploymentSettingsRepository,
			connectorMappingService,
			logger
		);

		DeploymentSettingsPromotionPanel.currentPanel = newPanel;
		return newPanel;
	}

	private async initializePanel(): Promise<void> {
		// Load environments for dropdown
		const environments = await this.getEnvironments();

		await this.scaffoldingBehavior.refresh({
			environments: environments.map((e) => ({ id: e.id, name: e.name }))
		});
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<DeploymentSettingsPromotionCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		// Environment selector for target environment
		const environmentSelector = new EnvironmentSelectorSection({
			label: 'Target Environment:'
		});

		// Action buttons at top
		const actionButtons = new ActionButtonsSection(
			{
				buttons: [
					{ id: 'loadSourceFile', label: 'Load Source File' },
					{ id: 'generateOutputFile', label: 'Generate Output', disabled: true }
				],
				position: 'left'
			},
			SectionPosition.Toolbar
		);

		const compositionBehavior = new SectionCompositionBehavior(
			[environmentSelector, actionButtons],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs', 'dropdowns'],
				sections: ['action-buttons', 'environment-selector']
			},
			this.extensionUri,
			this.panel.webview
		);

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris],
			jsUris: [
				this.panel.webview
					.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js'))
					.toString()
			],
			cspNonce: getNonce(),
			title: 'Promote Deployment Settings'
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
			'loadSourceFile',
			async () => {
				await this.handleLoadSourceFile();
			},
			{ disableOnExecute: true }
		);

		this.coordinator.registerHandler(
			'environmentChange',
			async (data?: unknown) => {
				if (typeof data === 'object' && data !== null && 'environmentId' in data) {
					await this.handleEnvironmentChanged((data as { environmentId: string }).environmentId);
				}
			},
			{ disableOnExecute: false }
		);

		this.coordinator.registerHandler(
			'generateOutputFile',
			async () => {
				await this.handleGenerateOutputFile();
			},
			{ disableOnExecute: true }
		);
	}

	private async handleLoadSourceFile(): Promise<void> {
		this.logger.debug('Opening file picker for source deployment settings');

		const fileUri = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'JSON Files': ['json'],
				'All Files': ['*']
			},
			title: 'Select Source Deployment Settings File'
		});

		if (fileUri === undefined || fileUri.length === 0) {
			this.logger.debug('File selection cancelled');
			return;
		}

		const selectedFile = fileUri[0];
		if (selectedFile === undefined) {
			this.logger.debug('No file selected');
			return;
		}

		const filePath = selectedFile.fsPath;

		try {
			// Parse deployment settings file
			this.sourceDeploymentSettings = await this.deploymentSettingsRepository.read(filePath);
			this.sourceFilePath = filePath;

			const crCount = this.sourceDeploymentSettings.connectionReferences.length;
			const evCount = this.sourceDeploymentSettings.environmentVariables.length;

			this.logger.info('Source deployment settings loaded', {
				filePath,
				connectionReferences: crCount,
				environmentVariables: evCount
			});

			void vscode.window.showInformationMessage(
				`Loaded: ${crCount} connection references, ${evCount} environment variables`
			);

			// If target environment is already selected, run matching
			await this.tryRunMatching();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to load deployment settings', { filePath, error: message });
			void vscode.window.showErrorMessage(`Failed to load deployment settings: ${message}`);
		}
	}

	private async handleEnvironmentChanged(environmentId: string): Promise<void> {
		this.targetEnvironmentId = environmentId;
		this.logger.info('Target environment changed', { environmentId });

		try {
			// Query connections from target environment
			this.logger.debug('Fetching connections from target environment');
			const connectionRepo = this.createConnectionRepository(environmentId);
			this.targetConnections = await connectionRepo.findAll();

			this.logger.info('Fetched target connections', {
				environmentId,
				count: this.targetConnections.length
			});

			// Run matching if source is loaded
			await this.tryRunMatching();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to fetch target connections', { environmentId, error: message });
			void vscode.window.showErrorMessage(`Failed to fetch connections: ${message}`);
		}
	}

	/**
	 * Runs connector matching if both source and target are available.
	 */
	private async tryRunMatching(): Promise<void> {
		if (!this.sourceDeploymentSettings || this.targetConnections.length === 0) {
			return;
		}

		// Extract unique ConnectorIds from source connection references
		const sourceConnectorIds = new Set(
			this.sourceDeploymentSettings.connectionReferences.map((cr) => cr.ConnectorId)
		);

		// Run matching algorithm
		this.matchResult = this.connectorMappingService.matchConnectors(sourceConnectorIds, this.targetConnections);

		const autoMatchedCount = this.matchResult.getAutoMatchedCount();
		const unmatchedCount = this.matchResult.getUnmatchedCount();

		this.logger.info('Connector matching completed', {
			autoMatched: autoMatchedCount,
			needsMapping: unmatchedCount
		});

		// Show results summary
		if (unmatchedCount === 0) {
			void vscode.window.showInformationMessage(
				`✓ All ${autoMatchedCount} connectors auto-matched! Ready to generate output.`
			);
		} else {
			void vscode.window.showWarningMessage(
				`${autoMatchedCount} connectors auto-matched, ${unmatchedCount} need manual mapping`
			);
		}

		// Enable generate button if all connectors are matched
		// (For MVP, we only support fully auto-matched scenarios)
		if (unmatchedCount === 0) {
			await this.panel.postMessage({
				command: 'setButtonState',
				buttonId: 'generateOutputFile',
				disabled: false
			});
		}
	}

	private async handleGenerateOutputFile(): Promise<void> {
		this.logger.debug('Generating output file');

		if (!this.sourceDeploymentSettings || !this.matchResult) {
			void vscode.window.showErrorMessage('Load source file and select target environment first');
			return;
		}

		// For MVP, we need all connectors to be auto-matched
		if (this.matchResult.hasUnmatchedConnectors()) {
			void vscode.window.showErrorMessage('Cannot generate: some connectors need manual mapping');
			return;
		}

		try {
			// Generate promoted deployment settings
			const matchResult = this.matchResult;
			const promotedConnectionRefs = this.sourceDeploymentSettings.connectionReferences.map((cr) => {
				const connections = matchResult.getConnectionsForConnector(cr.ConnectorId);
				const defaultConn = this.connectorMappingService.selectDefaultConnection(connections);

				if (defaultConn) {
					return {
						LogicalName: cr.LogicalName,
						ConnectionId: defaultConn.id,
						ConnectorId: cr.ConnectorId
					};
				}

				// Fallback: preserve original (shouldn't happen with auto-matched)
				return cr;
			});

			// Sort alphabetically
			promotedConnectionRefs.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));

			// Create new deployment settings with promoted connection references
			// (Environment variables unchanged for MVP)
			const { DeploymentSettings } = await import('../../../../shared/domain/entities/DeploymentSettings.js');
			const promotedSettings = new DeploymentSettings(
				[...this.sourceDeploymentSettings.environmentVariables],
				promotedConnectionRefs
			);

			// Prompt for output file location
			const suggestedName = this.sourceFilePath
				? this.sourceFilePath.replace('.json', '-promoted.json')
				: 'deployment-settings-promoted.json';

			const outputPath = await this.deploymentSettingsRepository.promptForFilePath(suggestedName);
			if (!outputPath) {
				this.logger.debug('Output file selection cancelled');
				return;
			}

			// Write output file
			await this.deploymentSettingsRepository.write(outputPath, promotedSettings);

			this.logger.info('Promoted deployment settings generated', { outputPath });
			void vscode.window.showInformationMessage(`Generated: ${outputPath}`);

			// Open the generated file
			const doc = await vscode.workspace.openTextDocument(outputPath);
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to generate output file', { error: message });
			void vscode.window.showErrorMessage(`Failed to generate output: ${message}`);
		}
	}
}
