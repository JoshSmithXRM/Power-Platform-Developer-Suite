import * as vscode from 'vscode';

import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { renderEnvironmentSetup } from '../views/environmentSetup';
import {
	isSaveEnvironmentMessage,
	isTestConnectionMessage,
	isDiscoverEnvironmentIdMessage,
	isDeleteEnvironmentMessage,
	isCheckUniqueNameMessage,
	isWebviewMessage,
	isWebviewLogMessage,
	type WebviewLogMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';
import { EnvironmentSetupMessageHandler } from '../handlers/EnvironmentSetupMessageHandler';

/**
 * Presentation layer panel for Environment Setup
 * Delegates all logic to use cases - NO business logic here
 */
export class EnvironmentSetupPanel {
	public static currentPanels: Map<string, EnvironmentSetupPanel> = new Map();
	private readonly panel: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];
	private currentEnvironmentId?: string;
	private readonly messageHandler: EnvironmentSetupMessageHandler;

	private constructor(
		panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
		private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		private readonly testConnectionUseCase: TestConnectionUseCase,
		private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		private readonly logger: ILogger,
		environmentId: string | undefined
	) {
		this.panel = panel;
		if (environmentId !== undefined) {
			this.currentEnvironmentId = environmentId;
		}

		this.logger.debug('EnvironmentSetupPanel: Initialized', {
			isEdit: !!environmentId,
			environmentId: environmentId || 'new'
		});

		this.messageHandler = new EnvironmentSetupMessageHandler(
			this.panel.webview,
			loadEnvironmentByIdUseCase,
			saveEnvironmentUseCase,
			deleteEnvironmentUseCase,
			testConnectionUseCase,
			discoverEnvironmentIdUseCase,
			validateUniqueNameUseCase,
			checkConcurrentEditUseCase,
			logger,
			() => this.currentEnvironmentId,
			(id: string) => { this.currentEnvironmentId = id; },
			(oldId: string, newId: string) => {
				EnvironmentSetupPanel.currentPanels.delete(oldId);
				EnvironmentSetupPanel.currentPanels.set(newId, this);
			},
			() => { this.dispose(); }
		);

		if (environmentId) {
			const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
			if (!canEdit.canEdit) {
				this.logger.warn('Concurrent edit detected', { environmentId });
				vscode.window.showWarningMessage('This environment is already being edited in another panel');
				this.dispose();
				return;
			}

			this.checkConcurrentEditUseCase.registerEditSession(environmentId);
			this.logger.debug('Edit session registered', { environmentId });
		}

		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		this.panel.webview.html = this.getHtmlContent();

		this.panel.webview.onDidReceiveMessage(
			async message => this.handleMessage(message),
			null,
			this.disposables
		);

		this.panel.onDidDispose(() => {
			this.logger.debug('EnvironmentSetupPanel: Disposed');
			this.dispose();
		}, null, this.disposables);

		if (environmentId) {
			void this.loadEnvironment(environmentId);
		}
	}

	/**
	 * Creates or shows the Environment Setup panel.
	 * Reuses existing panel if already open for the same environment.
	 *
	 * @param extensionUri - Extension URI for resource paths
	 * @param loadEnvironmentByIdUseCase - Use case to load environment data
	 * @param saveEnvironmentUseCase - Use case to save environment
	 * @param deleteEnvironmentUseCase - Use case to delete environment
	 * @param testConnectionUseCase - Use case to test connection
	 * @param discoverEnvironmentIdUseCase - Use case to discover environment ID
	 * @param validateUniqueNameUseCase - Use case to validate unique name
	 * @param checkConcurrentEditUseCase - Use case to check concurrent edits
	 * @param logger - Logger instance
	 * @param environmentId - Optional environment ID for editing existing environment
	 * @returns Panel instance
	 */
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
		environmentId: string | undefined
	): EnvironmentSetupPanel {
		const column = vscode.ViewColumn.One;

		// Check if panel already exists for this environment
		const panelKey = environmentId || 'new';
		const existingPanel = EnvironmentSetupPanel.currentPanels.get(panelKey);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Create new panel
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

		const newPanel = new EnvironmentSetupPanel(
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

		EnvironmentSetupPanel.currentPanels.set(panelKey, newPanel);
		return newPanel;
	}

	/**
	 * Routes webview messages to appropriate handler methods.
	 *
	 * Centralized message routing with type guards ensures type safety at the
	 * boundary between untrusted webview JavaScript and TypeScript.
	 *
	 * @param message - Message from webview
	 */
	private async handleMessage(message: unknown): Promise<void> {
		try {
			if (isWebviewLogMessage(message)) {
				this.handleWebviewLog(message);
				return;
			}

			if (isWebviewMessage(message)) {
				this.logger.debug(`Handling webview command: ${message.command}`);
			}

			if (isSaveEnvironmentMessage(message)) {
				await this.messageHandler.handleSaveEnvironment(message.data);
			} else if (isTestConnectionMessage(message)) {
				await this.messageHandler.handleTestConnection(message.data);
			} else if (isDiscoverEnvironmentIdMessage(message)) {
				await this.messageHandler.handleDiscoverEnvironmentId(message.data);
			} else if (isDeleteEnvironmentMessage(message)) {
				await this.messageHandler.handleDeleteEnvironment();
			} else if (isCheckUniqueNameMessage(message)) {
				await this.messageHandler.handleValidateName(message.data);
			} else if (isWebviewMessage(message)) {
				return;
			} else {
				this.logger.warn('Received invalid message from webview', message);
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error, 'Operation failed');
		}
	}

	private async loadEnvironment(environmentId: string): Promise<void> {
		this.logger.debug('Loading environment for editing', { environmentId });

		try {
			const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

			this.logger.info('Environment loaded successfully', {
				environmentId,
				name: viewModel.name
			});

			this.panel.webview.postMessage({
				command: 'environment-loaded',
				data: viewModel
			});
		} catch (error) {
			this.logger.error('Failed to load environment', error);
			this.handleError(error, 'Failed to load environment');
		}
	}

	private handleWebviewLog(message: WebviewLogMessage): void {
		const prefix = `[Webview:${message.componentName}]`;
		const logMessage = `${prefix} ${message.message}`;

		this.logger[message.level](logMessage, message.data);
	}

	/**
	 * Displays error message to user.
	 * @param error - Unknown error from catch block
	 * @param message - Contextual error message
	 */
	private handleError(error: unknown, message: string): void {
		const errorMessage = error instanceof Error
			? error.message
			: String(error);

		vscode.window.showErrorMessage(`${message}: ${errorMessage}`);
	}

	private getHtmlContent(): string {
		const styleUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'styles', 'environment-setup.css')
		);

		const scriptUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'EnvironmentSetupBehavior.js')
		);

		return renderEnvironmentSetup({
			styleUri: styleUri.toString(),
			scriptUri: scriptUri.toString()
		});
	}

	public dispose(): void {
		this.logger.debug('EnvironmentSetupPanel: Disposing', {
			environmentId: this.currentEnvironmentId || 'new'
		});

		if (this.currentEnvironmentId) {
			this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
		}

		const panelKey = this.currentEnvironmentId || 'new';
		EnvironmentSetupPanel.currentPanels.delete(panelKey);

		this.panel.dispose();

		this.disposables.forEach((disposable: vscode.Disposable): void => {
			disposable.dispose();
		});
		this.disposables = [];
	}
}
