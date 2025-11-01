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
	type SaveEnvironmentMessage,
	type TestConnectionMessage,
	type DiscoverEnvironmentIdMessage,
	type CheckUniqueNameMessage,
	type WebviewLogMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { VsCodeCancellationTokenAdapter } from '../../infrastructure/adapters/VsCodeCancellationTokenAdapter';

/**
 * Presentation layer panel for Environment Setup
 * Delegates all logic to use cases - NO business logic here
 */
export class EnvironmentSetupPanel {
	public static currentPanels: Map<string, EnvironmentSetupPanel> = new Map();
	private readonly panel: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];
	private currentEnvironmentId?: string;

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
		environmentId?: string
	) {
		this.panel = panel;
		this.currentEnvironmentId = environmentId;

		this.logger.debug('EnvironmentSetupPanel: Initialized', {
			isEdit: !!environmentId,
			environmentId: environmentId || 'new'
		});

		// Check concurrent edit if loading existing
		if (environmentId) {
			const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
			if (!canEdit.canEdit) {
				this.logger.warn('Concurrent edit detected', { environmentId });
				vscode.window.showWarningMessage('This environment is already being edited in another panel');
				this.dispose();
				return;
			}

			// Register edit session
			this.checkConcurrentEditUseCase.registerEditSession(environmentId);
			this.logger.debug('Edit session registered', { environmentId });
		}

		// Set webview options
		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		// Set initial HTML
		this.panel.webview.html = this.getHtmlContent();

		// Handle messages from webview
		this.panel.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			null,
			this.disposables
		);

		// Handle panel disposal
		this.panel.onDidDispose(() => {
			this.logger.debug('EnvironmentSetupPanel: Disposed');
			this.dispose();
		}, null, this.disposables);

		// Load environment data if editing
		if (environmentId) {
			this.loadEnvironment(environmentId);
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
		environmentId?: string
	): EnvironmentSetupPanel {
		const column = vscode.ViewColumn.One;

		// Check if panel already exists for this environment
		const panelKey = environmentId || 'new';
		if (EnvironmentSetupPanel.currentPanels.has(panelKey)) {
			const existingPanel = EnvironmentSetupPanel.currentPanels.get(panelKey)!;
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
	 * Handles messages received from the webview.
	 * Routes commands to appropriate handler methods.
	 *
	 * @param message - Message from webview
	 */
	private async handleMessage(message: unknown): Promise<void> {
		try {
			// Handle webview logs FIRST (forwarding to logger)
			if (isWebviewLogMessage(message)) {
				this.handleWebviewLog(message);
				return;
			}

			// Log command being handled
			if (isWebviewMessage(message)) {
				this.logger.debug(`Handling webview command: ${message.command}`);
			}

			// Use type guards for proper type narrowing
			if (isSaveEnvironmentMessage(message)) {
				await this.handleSaveEnvironment(message.data);
			} else if (isTestConnectionMessage(message)) {
				await this.handleTestConnection(message.data);
			} else if (isDiscoverEnvironmentIdMessage(message)) {
				await this.handleDiscoverEnvironmentId(message.data);
			} else if (isDeleteEnvironmentMessage(message)) {
				await this.handleDeleteEnvironment();
			} else if (isCheckUniqueNameMessage(message)) {
				await this.handleValidateName(message.data);
			} else if (isWebviewMessage(message)) {
				// Known webview message but not handled - ignore silently
				return;
			} else {
				this.logger.warn('Received invalid message from webview', message);
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error, 'Operation failed');
		}
	}

	/**
	 * Loads environment data and sends it to the webview.
	 *
	 * @param environmentId - Environment ID to load
	 */
	private async loadEnvironment(environmentId: string): Promise<void> {
		this.logger.debug('Loading environment for editing', { environmentId });

		try {
			// Delegate to use case
			const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

			this.logger.info('Environment loaded successfully', {
				environmentId,
				name: viewModel.name
			});

			// Send to webview
			this.panel.webview.postMessage({
				command: 'environment-loaded',
				data: viewModel
			});
		} catch (error) {
			this.logger.error('Failed to load environment', error);
			this.handleError(error, 'Failed to load environment');
		}
	}

	/**
	 * Handles save environment request from webview.
	 *
	 * @param data - Environment data from webview form
	 */
	private async handleSaveEnvironment(data: SaveEnvironmentMessage['data']): Promise<void> {
		const wasNew = !this.currentEnvironmentId;

		this.logger.info('User initiated save for environment', {
			name: data.name,
			authMethod: data.authenticationMethod,
			isEdit: !wasNew
		});

		// Delegate to use case - data is already validated by type guard
		const result = await this.saveEnvironmentUseCase.execute({
			existingEnvironmentId: this.currentEnvironmentId,
			name: data.name,
			dataverseUrl: data.dataverseUrl,
			tenantId: data.tenantId,
			authenticationMethod: data.authenticationMethod,
			publicClientId: data.publicClientId,
			powerPlatformEnvironmentId: data.environmentId,
			clientId: data.clientId,
			clientSecret: data.clientSecret,
			username: data.username,
			password: data.password,
			preserveExistingCredentials: true
		});

		// Handle validation errors - send to webview for inline display
		if (!result.success && result.errors) {
			this.logger.warn('Environment validation failed', {
				name: data.name,
				errorCount: result.errors.length
			});

			this.panel.webview.postMessage({
				command: 'environment-saved',
				data: {
					success: false,
					errors: result.errors
				}
			});
			return;
		}

		// Show success message with warnings if any
		if (result.warnings && result.warnings.length > 0) {
			this.logger.warn('Environment saved with warnings', {
				environmentId: result.environmentId,
				warnings: result.warnings
			});
			vscode.window.showWarningMessage(`Environment saved with warnings: ${result.warnings.join(', ')}`);
		} else {
			this.logger.info('Environment saved successfully', {
				environmentId: result.environmentId,
				name: data.name
			});
			vscode.window.showInformationMessage('Environment saved successfully');
		}

		// Update panel state if new
		if (wasNew) {
			this.currentEnvironmentId = result.environmentId;
			this.checkConcurrentEditUseCase.registerEditSession(this.currentEnvironmentId);

			// Update panel key in map
			EnvironmentSetupPanel.currentPanels.delete('new');
			EnvironmentSetupPanel.currentPanels.set(result.environmentId, this);
		}

		// Notify webview with environment ID
		this.panel.webview.postMessage({
			command: 'environment-saved',
			data: {
				success: true,
				environmentId: result.environmentId,
				isNewEnvironment: wasNew
			}
		});

		// Trigger environment list refresh
		vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');
	}

	/**
	 * Handles test connection request from webview.
	 *
	 * @param data - Connection test data from webview
	 */
	private async handleTestConnection(data: TestConnectionMessage['data']): Promise<void> {
		this.logger.info('User initiated connection test', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Testing connection...",
			cancellable: false
		}, async () => {
			// Delegate to use case - data is already validated by type guard
			const result = await this.testConnectionUseCase.execute({
				existingEnvironmentId: this.currentEnvironmentId,
				name: data.name,
				dataverseUrl: data.dataverseUrl,
				tenantId: data.tenantId,
				authenticationMethod: data.authenticationMethod,
				publicClientId: data.publicClientId,
				powerPlatformEnvironmentId: data.powerPlatformEnvironmentId,
				clientId: data.clientId,
				clientSecret: data.clientSecret,
				username: data.username,
				password: data.password
			});

			if (result.success) {
				this.logger.info('Connection test successful', { name: data.name });
				vscode.window.showInformationMessage('Connection test successful!');
			} else {
				this.logger.error('Connection test failed', {
					name: data.name,
					errorMessage: result.errorMessage
				});
				vscode.window.showErrorMessage(`Connection test failed: ${result.errorMessage}`);
			}

			// Notify webview
			this.panel.webview.postMessage({
				command: 'test-connection-result',
				data: result
			});
		});
	}

	/**
	 * Handles discover environment ID request from webview.
	 *
	 * @param data - Discovery request data from webview
	 */
	private async handleDiscoverEnvironmentId(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		this.logger.info('User initiated environment ID discovery', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		// Show progress
		let result;
		try {
			result = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID...",
				cancellable: true
			}, async (_progress, token) => {
				// Adapt VS Code cancellation token to domain abstraction
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				// Delegate to use case - data is already validated by type guard
				const result = await this.discoverEnvironmentIdUseCase.execute({
					existingEnvironmentId: this.currentEnvironmentId,
					name: data.name,
					dataverseUrl: data.dataverseUrl,
					tenantId: data.tenantId,
					authenticationMethod: data.authenticationMethod,
					publicClientId: data.publicClientId,
					clientId: data.clientId,
					clientSecret: data.clientSecret,
					username: data.username,
					password: data.password
				}, cancellationToken);

				// Return result from withProgress
				return result;
			});

			// Handle results AFTER progress completes
			if (result.success) {
				this.logger.info('Environment ID discovered successfully', {
					environmentId: result.environmentId
				});
				vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
				this.panel.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			} else if (result.requiresInteractiveAuth) {
				this.logger.warn('Discovery requires interactive auth', {
					name: data.name
				});
				// Service Principal doesn't have BAP API permissions - offer Interactive auth
				const retry = await vscode.window.showWarningMessage(
					`Discovery failed: Service Principals typically don't have Power Platform API permissions.\n\nWould you like to use Interactive authentication just for discovery?`,
					'Use Interactive Auth',
					'Cancel'
				);

				if (retry === 'Use Interactive Auth') {
					// Retry with Interactive auth (starts new progress notification)
					await this.handleDiscoverEnvironmentIdWithInteractive(data);
				} else {
					vscode.window.showInformationMessage('You can manually enter the Environment ID from the Power Platform Admin Center.');
					this.panel.webview.postMessage({
						command: 'discover-environment-id-result',
						data: result
					});
				}
			} else {
				this.logger.error('Failed to discover environment ID', {
					errorMessage: result.errorMessage
				});
				vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
				this.panel.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			}
		} catch (error) {
			// Handle cancellation - error thrown when user clicks cancel
			if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('Authentication cancelled'))) {
				this.logger.info('Environment ID discovery cancelled by user');
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				// Notify webview of cancellation
				this.panel.webview.postMessage({
					command: 'discover-environment-id-result',
					data: { success: false, errorMessage: 'Cancelled by user' }
				});
			} else {
				throw error; // Re-throw unexpected errors
			}
		}
	}

	private async handleDiscoverEnvironmentIdWithInteractive(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		// Show progress
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID with Interactive auth...",
				cancellable: true
			}, async (_progress, token) => {
				// Adapt VS Code cancellation token to domain abstraction
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				// Retry discovery with Interactive authentication (temporary, non-cached)
				const result = await this.discoverEnvironmentIdUseCase.execute({
					// Use temporary ID to avoid caching credentials
					existingEnvironmentId: undefined,
					name: data.name,
					dataverseUrl: data.dataverseUrl,
					tenantId: data.tenantId,
					authenticationMethod: AuthenticationMethodType.Interactive, // Force Interactive for discovery
					publicClientId: data.publicClientId,
					clientId: undefined,
					clientSecret: undefined,
					username: undefined,
					password: undefined
				}, cancellationToken);

				if (result.success) {
					vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
				} else {
					vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
				}

				// Notify webview
				this.panel.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			});
		} catch (error) {
			// Handle cancellation - error thrown when user clicks cancel
			if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('Authentication cancelled'))) {
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				// Notify webview of cancellation
				this.panel.webview.postMessage({
					command: 'discover-environment-id-result',
					data: { success: false, errorMessage: 'Cancelled by user' }
				});
			} else {
				throw error; // Re-throw unexpected errors
			}
		}
	}

	/**
	 * Handles delete environment request from webview.
	 */
	private async handleDeleteEnvironment(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Delete attempted with no environment ID');
			vscode.window.showWarningMessage('No environment to delete');
			return;
		}

		this.logger.info('User initiated environment deletion', {
			environmentId: this.currentEnvironmentId
		});

		// Confirm deletion
		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to delete this environment? This action cannot be undone.',
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			this.logger.debug('Environment deletion cancelled by user');
			return;
		}

		// Delegate to use case
		await this.deleteEnvironmentUseCase.execute({
			environmentId: this.currentEnvironmentId
		});

		this.logger.info('Environment deleted successfully', {
			environmentId: this.currentEnvironmentId
		});

		vscode.window.showInformationMessage('Environment deleted successfully');

		// Trigger environment list refresh
		vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');

		// Close panel
		this.dispose();
	}

	private async handleValidateName(data: CheckUniqueNameMessage['data']): Promise<void> {
		// Delegate to use case - data is already validated by type guard
		const result = await this.validateUniqueNameUseCase.execute({
			name: data.name,
			excludeEnvironmentId: this.currentEnvironmentId
		});

		// Notify webview
		this.panel.webview.postMessage({
			command: 'name-validation-result',
			data: result
		});
	}

	/**
	 * Forwards webview log messages to the extension host logger.
	 *
	 * @param message - Log message from webview
	 */
	private handleWebviewLog(message: WebviewLogMessage): void {
		const prefix = `[Webview:${message.componentName}]`;
		const logMessage = `${prefix} ${message.message}`;

		this.logger[message.level](logMessage, message.data);
	}

	/**
	 * Handles errors safely, supporting both Error objects and other thrown values.
	 *
	 * @param error - Unknown error from catch block
	 * @param message - Contextual error message
	 */
	private handleError(error: unknown, message: string): void {
		const errorMessage = error instanceof Error
			? error.message
			: String(error);

		vscode.window.showErrorMessage(`${message}: ${errorMessage}`);
	}

	/**
	 * Generates the HTML content for the webview panel.
	 *
	 * @returns HTML content string
	 */
	private getHtmlContent(): string {
		const styleUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'styles', 'environment-setup.css')
		);

		const scriptUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'EnvironmentSetupBehavior.js')
		);

		// Use the view function to generate HTML
		return renderEnvironmentSetup({
			styleUri: styleUri.toString(),
			scriptUri: scriptUri.toString()
		});
	}

	/**
	 * Disposes the panel and cleans up resources.
	 */
	public dispose(): void {
		this.logger.debug('EnvironmentSetupPanel: Disposing', {
			environmentId: this.currentEnvironmentId || 'new'
		});

		// Unregister edit session
		if (this.currentEnvironmentId) {
			this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
		}

		// Remove from map
		const panelKey = this.currentEnvironmentId || 'new';
		EnvironmentSetupPanel.currentPanels.delete(panelKey);

		// Dispose panel
		this.panel.dispose();

		// Dispose subscriptions
		this.disposables.forEach((disposable: vscode.Disposable): void => {
			disposable.dispose();
		});
		this.disposables = [];
	}
}
