import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { EnvironmentFormSection } from '../sections/EnvironmentFormSection';

type EnvironmentSetupCommands = 'save' | 'test' | 'delete' | 'discover';

export class EnvironmentSetupPanelComposed {
	public static currentPanels: Map<string, EnvironmentSetupPanelComposed> = new Map();
	private coordinator!: PanelCoordinator<EnvironmentSetupCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;
	private currentEnvironmentId?: string;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
		private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		private readonly testConnectionUseCase: TestConnectionUseCase,
		private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		private readonly logger: ILogger,
		environmentId?: string
	) {
		if (environmentId !== undefined) {
			this.currentEnvironmentId = environmentId;
		}

		logger.debug('EnvironmentSetupPanelComposed: Initialized with universal framework', {
			isEdit: !!environmentId,
			environmentId: environmentId || 'new'
		});

		if (environmentId) {
			const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
			if (!canEdit.canEdit) {
				logger.warn('Concurrent edit detected', { environmentId });
				vscode.window.showWarningMessage('This environment is already being edited in another panel');
				return;
			}

			this.checkConcurrentEditUseCase.registerEditSession(environmentId);
			logger.debug('Edit session registered', { environmentId });
		}

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		panel.onDidDispose(() => {
			const panelKey = this.currentEnvironmentId || 'new';
			EnvironmentSetupPanelComposed.currentPanels.delete(panelKey);
			if (this.currentEnvironmentId) {
				this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
			}
		});

		void this.initializePanel();
	}

	public static createOrShow(
		extensionUri: vscode.Uri,
		loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		saveEnvironmentUseCase: SaveEnvironmentUseCase,
		deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		testConnectionUseCase: TestConnectionUseCase,
		discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		logger: ILogger,
		environmentId?: string
	): EnvironmentSetupPanelComposed {
		const column = vscode.ViewColumn.One;

		const panelKey = environmentId || 'new';
		const existingPanel = EnvironmentSetupPanelComposed.currentPanels.get(panelKey);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			'environmentSetup',
			environmentId ? 'Edit Environment' : 'New Environment',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new EnvironmentSetupPanelComposed(
			panel,
			extensionUri,
			loadEnvironmentByIdUseCase,
			saveEnvironmentUseCase,
			deleteEnvironmentUseCase,
			testConnectionUseCase,
			discoverEnvironmentIdUseCase,
			validateUniqueNameUseCase,
			checkConcurrentEditUseCase,
			logger,
			environmentId
		);

		EnvironmentSetupPanelComposed.currentPanels.set(panelKey, newPanel);
		return newPanel;
	}

	private async initializePanel(): Promise<void> {
		await this.scaffoldingBehavior.refresh({
			formData: {}
		});
	}

	private createCoordinator(): { coordinator: PanelCoordinator<EnvironmentSetupCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const formSection = new EnvironmentFormSection();
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'save', label: 'Save Environment' },
				{ id: 'test', label: 'Test Connection' },
				{ id: 'delete', label: 'Delete Environment' }
			],
			position: 'right'
		}, SectionPosition.Toolbar);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, formSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['action-buttons']
			},
			this.extensionUri,
			this.panel.webview
		);

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris,
			jsUris: [],
			cspNonce: getNonce(),
			title: 'Environment Setup',
			customCss: `
				.form-container {
					max-width: 800px;
					margin: 0 auto;
					padding: 24px;
				}

				.form-section {
					margin-bottom: 24px;
				}

				.form-section h2 {
					font-size: 16px;
					font-weight: 600;
					margin-bottom: 16px;
					color: var(--vscode-foreground);
				}

				.form-group {
					margin-bottom: 16px;
				}

				.form-group label {
					display: block;
					margin-bottom: 6px;
					font-size: 13px;
					color: var(--vscode-foreground);
				}

				.form-group input,
				.form-group select {
					width: 100%;
				}

				.help-text {
					font-size: 12px;
					color: var(--vscode-descriptionForeground);
					margin-top: 4px;
				}

				.conditional-field {
					margin-top: 16px;
				}

				select {
					font-family: var(--vscode-font-family);
					font-size: var(--vscode-font-size);
					background: var(--vscode-input-background);
					color: var(--vscode-input-foreground);
					border: 1px solid var(--vscode-input-border);
					padding: 6px 12px;
					border-radius: 2px;
					width: 100%;
				}

				select:focus {
					outline: 1px solid var(--vscode-focusBorder);
					outline-offset: -1px;
				}
			`
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<EnvironmentSetupCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		this.coordinator.registerHandler('save', async () => {
			this.logger.info('Save command triggered');
		});

		this.coordinator.registerHandler('test', async () => {
			this.logger.info('Test command triggered');
		});

		this.coordinator.registerHandler('delete', async () => {
			this.logger.info('Delete command triggered');
		});

		this.coordinator.registerHandler('discover', async () => {
			this.logger.info('Discover command triggered');
		});
	}

}
