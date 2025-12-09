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

/**
 * Commands supported by Deployment Settings Promotion panel.
 */
type DeploymentSettingsPromotionCommands =
	| 'loadSourceFile'
	| 'environmentChanged'
	| 'generateOutputFile';

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

	private sourceFilePath: string | undefined;
	private targetEnvironmentId: string | undefined;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
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

		const newPanel = new DeploymentSettingsPromotionPanel(safePanel, extensionUri, getEnvironments, logger);

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
					{ id: 'loadSourceFile', label: 'Load Source File', customHandler: true },
					{ id: 'generateOutputFile', label: 'Generate Output', customHandler: true, disabled: true }
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
			'environmentChanged',
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
		this.sourceFilePath = filePath;

		this.logger.info('Source file selected', { filePath });

		// TODO: Load and parse the file, update UI
		void vscode.window.showInformationMessage(`Loaded: ${filePath}`);
	}

	private async handleEnvironmentChanged(environmentId: string): Promise<void> {
		this.targetEnvironmentId = environmentId;
		this.logger.info('Target environment changed', { environmentId });

		// TODO: Query connections from target environment and run matching algorithm
		void vscode.window.showInformationMessage(`Target environment: ${environmentId}`);
	}

	private async handleGenerateOutputFile(): Promise<void> {
		this.logger.debug('Generating output file');

		// TODO: Implement file generation
		void vscode.window.showInformationMessage('Generate output not yet implemented');
	}
}
