import * as vscode from 'vscode';

import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { renderEnvironmentSetup } from '../views/environmentSetup';
import {
	isSaveEnvironmentMessage,
	isTestConnectionMessage,
	isDiscoverEnvironmentIdMessage,
	isDeleteEnvironmentMessage,
	isCheckUniqueNameMessage,
	isWebviewMessage,
	type SaveEnvironmentMessage,
	type TestConnectionMessage,
	type DiscoverEnvironmentIdMessage,
	type CheckUniqueNameMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';

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
		environmentId?: string
	) {
		this.panel = panel;
		this.currentEnvironmentId = environmentId;

		// Check concurrent edit if loading existing
		if (environmentId) {
			const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
			if (!canEdit.canEdit) {
				vscode.window.showWarningMessage('This environment is already being edited in another panel');
				this.dispose();
				return;
			}

			// Register edit session
			this.checkConcurrentEditUseCase.registerEditSession(environmentId);
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
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		// Load environment data if editing
		if (environmentId) {
			this.loadEnvironment(environmentId);
		}
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
			environmentId
		);

		EnvironmentSetupPanel.currentPanels.set(panelKey, newPanel);
		return newPanel;
	}

	private async handleMessage(message: unknown): Promise<void> {
		try {
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
			}
			// Unknown message type - ignore
		} catch (error) {
			this.handleError(error as Error, 'Operation failed');
		}
	}

	private async loadEnvironment(environmentId: string): Promise<void> {
		try {
			// Delegate to use case
			const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

			// Send to webview
			this.panel.webview.postMessage({
				command: 'environment-loaded',
				data: viewModel
			});
		} catch (error) {
			this.handleError(error as Error, 'Failed to load environment');
		}
	}

	private async handleSaveEnvironment(data: SaveEnvironmentMessage['data']): Promise<void> {
		const wasNew = !this.currentEnvironmentId;

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
			vscode.window.showWarningMessage(`Environment saved with warnings: ${result.warnings.join(', ')}`);
		} else {
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

	private async handleTestConnection(data: TestConnectionMessage['data']): Promise<void> {
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
				vscode.window.showInformationMessage('Connection test successful!');
			} else {
				vscode.window.showErrorMessage(`Connection test failed: ${result.errorMessage}`);
			}

			// Notify webview
			this.panel.webview.postMessage({
				command: 'test-connection-result',
				data: result
			});
		});
	}

	private async handleDiscoverEnvironmentId(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Discovering Power Platform Environment ID...",
			cancellable: false
		}, async () => {
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
			});

			if (result.success) {
				vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
			} else if (result.requiresInteractiveAuth) {
				// Service Principal doesn't have BAP API permissions - offer Interactive auth
				const retry = await vscode.window.showWarningMessage(
					`Discovery failed: Service Principals typically don't have Power Platform API permissions.\n\nWould you like to use Interactive authentication just for discovery?`,
					'Use Interactive Auth',
					'Cancel'
				);

				if (retry === 'Use Interactive Auth') {
					// Retry with Interactive auth
					await this.handleDiscoverEnvironmentIdWithInteractive(data);
					return; // Don't send result to webview yet
				} else {
					vscode.window.showInformationMessage('You can manually enter the Environment ID from the Power Platform Admin Center.');
				}
			} else {
				vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
			}

			// Notify webview
			this.panel.webview.postMessage({
				command: 'discover-environment-id-result',
				data: result
			});
		});
	}

	private async handleDiscoverEnvironmentIdWithInteractive(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Discovering Power Platform Environment ID with Interactive auth...",
			cancellable: false
		}, async () => {
			// Retry discovery with Interactive authentication (temporary, non-cached)
			const result = await this.discoverEnvironmentIdUseCase.execute({
				// Use temporary ID to avoid caching credentials
				existingEnvironmentId: undefined,
				name: data.name,
				dataverseUrl: data.dataverseUrl,
				tenantId: data.tenantId,
				authenticationMethod: 'Interactive', // Force Interactive for discovery
				publicClientId: data.publicClientId,
				clientId: undefined,
				clientSecret: undefined,
				username: undefined,
				password: undefined
			});

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
	}

	private async handleDeleteEnvironment(): Promise<void> {
		if (!this.currentEnvironmentId) {
			vscode.window.showWarningMessage('No environment to delete');
			return;
		}

		// Confirm deletion
		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to delete this environment? This action cannot be undone.',
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			return;
		}

		// Delegate to use case
		await this.deleteEnvironmentUseCase.execute({
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

	private handleError(error: Error, message: string): void {
		vscode.window.showErrorMessage(`${message}: ${error.message}`);
	}

	private getHtmlContent(): string {
		const styleUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'styles', 'environment-setup.css')
		);

		const scriptUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'EnvironmentSetupBehavior.js')
		);

		// Use the view function to generate HTML
		return renderEnvironmentSetup({
			styleUri: styleUri.toString(),
			scriptUri: scriptUri.toString()
		});
	}

	public dispose(): void {
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
		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
