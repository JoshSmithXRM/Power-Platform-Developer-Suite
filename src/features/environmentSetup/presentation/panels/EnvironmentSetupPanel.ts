import * as vscode from 'vscode';

import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { ApplicationError } from '../../application/errors/ApplicationError';

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
		if (!message || typeof message !== 'object') {
			return;
		}

		const msg = message as { command: string; data?: unknown };
		try {
			switch (msg.command) {
				case 'save-environment':
					await this.handleSaveEnvironment(msg.data);
					break;

				case 'test-connection':
					await this.handleTestConnection(msg.data);
					break;

				case 'discover-environment-id':
					await this.handleDiscoverEnvironmentId(msg.data);
					break;

				case 'delete-environment':
					await this.handleDeleteEnvironment();
					break;

				case 'validate-name':
					await this.handleValidateName(msg.data);
					break;

				default:
					// Unknown command - ignore
					break;
			}
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

	private async handleSaveEnvironment(data: unknown): Promise<void> {
		// Validate message data
		if (!data || typeof data !== 'object') {
			throw new ApplicationError('Invalid environment data');
		}

		const envData = data as Record<string, unknown>;
		const wasNew = !this.currentEnvironmentId;

		// Delegate to use case
		const result = await this.saveEnvironmentUseCase.execute({
			existingEnvironmentId: this.currentEnvironmentId,
			name: envData.name as string,
			dataverseUrl: envData.dataverseUrl as string,
			tenantId: envData.tenantId as string,
			authenticationMethod: envData.authenticationMethod as string,
			publicClientId: envData.publicClientId as string,
			powerPlatformEnvironmentId: envData.powerPlatformEnvironmentId as string | undefined,
			clientId: envData.clientId as string | undefined,
			clientSecret: envData.clientSecret as string | undefined,
			username: envData.username as string | undefined,
			password: envData.password as string | undefined,
			preserveExistingCredentials: true
		});

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

	private async handleTestConnection(data: unknown): Promise<void> {
		if (!data || typeof data !== 'object') {
			throw new ApplicationError('Invalid connection data');
		}

		const connData = data as Record<string, unknown>;

		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Testing connection...",
			cancellable: false
		}, async () => {
			// Delegate to use case
			const result = await this.testConnectionUseCase.execute({
				existingEnvironmentId: this.currentEnvironmentId,
				name: connData.name as string,
				dataverseUrl: connData.dataverseUrl as string,
				tenantId: connData.tenantId as string,
				authenticationMethod: connData.authenticationMethod as string,
				publicClientId: connData.publicClientId as string,
				powerPlatformEnvironmentId: connData.powerPlatformEnvironmentId as string | undefined,
				clientId: connData.clientId as string | undefined,
				clientSecret: connData.clientSecret as string | undefined,
				username: connData.username as string | undefined,
				password: connData.password as string | undefined
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

	private async handleDiscoverEnvironmentId(data: unknown): Promise<void> {
		if (!data || typeof data !== 'object') {
			throw new ApplicationError('Invalid connection data');
		}

		const connData = data as Record<string, unknown>;

		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Discovering Power Platform Environment ID...",
			cancellable: false
		}, async () => {
			// Delegate to use case
			const result = await this.discoverEnvironmentIdUseCase.execute({
				existingEnvironmentId: this.currentEnvironmentId,
				name: connData.name as string,
				dataverseUrl: connData.dataverseUrl as string,
				tenantId: connData.tenantId as string,
				authenticationMethod: connData.authenticationMethod as string,
				publicClientId: connData.publicClientId as string,
				clientId: connData.clientId as string | undefined,
				clientSecret: connData.clientSecret as string | undefined,
				username: connData.username as string | undefined,
				password: connData.password as string | undefined
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
					await this.handleDiscoverEnvironmentIdWithInteractive(connData);
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

	private async handleDiscoverEnvironmentIdWithInteractive(connData: Record<string, unknown>): Promise<void> {
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
				name: connData.name as string,
				dataverseUrl: connData.dataverseUrl as string,
				tenantId: connData.tenantId as string,
				authenticationMethod: 'Interactive', // Force Interactive for discovery
				publicClientId: connData.publicClientId as string,
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

	private async handleValidateName(data: unknown): Promise<void> {
		if (!data || typeof data !== 'object') {
			return;
		}

		const nameData = data as { name: string };

		// Delegate to use case
		const result = await this.validateUniqueNameUseCase.execute({
			name: nameData.name,
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

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="${styleUri}" rel="stylesheet">
	<title>Environment Setup</title>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Environment Setup</h1>
			<div class="button-group">
				<button id="saveButton" class="button primary">Save Environment</button>
				<button id="testButton" class="button secondary">Test Connection</button>
				<button id="deleteButton" class="button danger" style="display: none;">Delete Environment</button>
			</div>
		</div>

		<form id="environmentForm">
			<section class="section">
				<h2>Basic Information</h2>

				<div class="form-group">
					<label for="name">Environment Name *</label>
					<input type="text" id="name" name="name" required placeholder="e.g., DEV">
					<span class="help-text">A friendly name to identify this environment</span>
				</div>

				<div class="form-group">
					<label for="dataverseUrl">Dataverse URL *</label>
					<input type="text" id="dataverseUrl" name="dataverseUrl" required placeholder="https://org.crm.dynamics.com">
					<span class="help-text">The URL of your Dataverse organization</span>
				</div>

				<div class="form-group">
					<label for="environmentId">Environment ID (Optional)</label>
					<div style="display: flex; gap: 8px;">
						<input type="text" id="environmentId" name="powerPlatformEnvironmentId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="flex: 1;">
						<button type="button" id="discoverButton" class="button secondary" style="white-space: nowrap;">Discover ID</button>
					</div>
					<span class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</span>
				</div>
			</section>

			<section class="section">
				<h2>Authentication</h2>

				<div class="form-group">
					<label for="tenantId">Tenant ID *</label>
					<input type="text" id="tenantId" name="tenantId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
					<span class="help-text">Your Azure AD tenant ID</span>
				</div>

				<div class="form-group">
					<label for="authenticationMethod">Authentication Method *</label>
					<select id="authenticationMethod" name="authenticationMethod" required>
						<option value="Interactive">Interactive (Browser)</option>
						<option value="ServicePrincipal">Service Principal (Client Secret)</option>
						<option value="UsernamePassword">Username/Password</option>
						<option value="DeviceCode">Device Code</option>
					</select>
					<span class="help-text">Select how you want to authenticate to this environment</span>
				</div>

				<div class="form-group">
					<label for="publicClientId">Public Client ID *</label>
					<input type="text" id="publicClientId" name="publicClientId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
					<span class="help-text">Application (client) ID for Interactive/DeviceCode flows</span>
				</div>

				<!-- Service Principal fields -->
				<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: none;">
					<div class="form-group">
						<label for="clientId">Client ID *</label>
						<input type="text" id="clientId" name="clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
						<span class="help-text">Application ID for service principal</span>
					</div>

					<div class="form-group">
						<label for="clientSecret">Client Secret *</label>
						<input type="password" id="clientSecret" name="clientSecret" placeholder="Enter client secret">
						<span class="help-text">Secret value (stored securely)</span>
					</div>
				</div>

				<!-- Username/Password fields -->
				<div class="conditional-field" data-auth-method="UsernamePassword" style="display: none;">
					<div class="form-group">
						<label for="username">Username *</label>
						<input type="text" id="username" name="username" placeholder="user@domain.com">
						<span class="help-text">Dataverse username</span>
					</div>

					<div class="form-group">
						<label for="password">Password *</label>
						<input type="password" id="password" name="password" placeholder="Enter password">
						<span class="help-text">Password (stored securely)</span>
					</div>
				</div>
			</section>
		</form>
	</div>

	<script>
		(function() {
			const vscode = acquireVsCodeApi();
			const form = document.getElementById('environmentForm');
			const nameInput = document.getElementById('name');
			const authMethodSelect = document.getElementById('authenticationMethod');
			const saveButton = document.getElementById('saveButton');
			const testButton = document.getElementById('testButton');
			const discoverButton = document.getElementById('discoverButton');
			const deleteButton = document.getElementById('deleteButton');

			// Listen for messages from extension
			window.addEventListener('message', event => {
				const message = event.data;

				switch (message.command) {
					case 'environment-loaded':
						loadEnvironmentData(message.data);
						break;

					case 'environment-saved':
						handleSaveComplete(message.data);
						break;

					case 'test-connection-result':
						handleTestResult(message.data);
						break;

					case 'discover-environment-id-result':
						handleDiscoverResult(message.data);
						break;

					case 'name-validation-result':
						handleNameValidation(message.data);
						break;
				}
			});

			// Save button
			saveButton.addEventListener('click', () => {
				if (form.checkValidity()) {
					saveEnvironment();
				} else {
					form.reportValidity();
				}
			});

			// Test button
			testButton.addEventListener('click', () => {
				if (form.checkValidity()) {
					testConnection();
				} else {
					form.reportValidity();
				}
			});

			// Discover Environment ID button
			discoverButton.addEventListener('click', () => {
				if (form.checkValidity()) {
					discoverEnvironmentId();
				} else {
					form.reportValidity();
				}
			});

			// Delete button
			deleteButton.addEventListener('click', () => {
				vscode.postMessage({
					command: 'delete-environment'
				});
			});

			// Auth method change
			authMethodSelect.addEventListener('change', () => {
				updateConditionalFields();
			});

			// Name validation (debounced)
			let nameValidationTimeout;
			nameInput.addEventListener('input', () => {
				clearTimeout(nameValidationTimeout);
				nameValidationTimeout = setTimeout(() => {
					validateName();
				}, 500);
			});

			function loadEnvironmentData(data) {
				if (!data) return;

				document.getElementById('name').value = data.name || '';
				document.getElementById('dataverseUrl').value = data.dataverseUrl || '';
				document.getElementById('tenantId').value = data.tenantId || '';
				document.getElementById('authenticationMethod').value = data.authenticationMethod || 'Interactive';
				document.getElementById('publicClientId').value = data.publicClientId || '';
				document.getElementById('environmentId').value = data.powerPlatformEnvironmentId || '';
				document.getElementById('clientId').value = data.clientId || '';
				document.getElementById('username').value = data.username || '';

				// Show credential placeholders
				if (data.hasStoredClientSecret && data.clientSecretPlaceholder) {
					document.getElementById('clientSecret').placeholder = data.clientSecretPlaceholder;
				}
				if (data.hasStoredPassword && data.passwordPlaceholder) {
					document.getElementById('password').placeholder = data.passwordPlaceholder;
				}

				updateConditionalFields();
				deleteButton.style.display = 'inline-block';
			}

			function saveEnvironment() {
				const formData = new FormData(form);
				const data = Object.fromEntries(formData.entries());

				vscode.postMessage({
					command: 'save-environment',
					data: data
				});
			}

			function testConnection() {
				const formData = new FormData(form);
				const data = Object.fromEntries(formData.entries());

				testButton.disabled = true;
				testButton.textContent = 'Testing...';

				vscode.postMessage({
					command: 'test-connection',
					data: data
				});
			}

			function discoverEnvironmentId() {
				const formData = new FormData(form);
				const data = Object.fromEntries(formData.entries());

				discoverButton.disabled = true;
				discoverButton.textContent = 'Discovering...';

				vscode.postMessage({
					command: 'discover-environment-id',
					data: data
				});
			}

			function validateName() {
				const name = nameInput.value.trim();
				if (name.length === 0) return;

				vscode.postMessage({
					command: 'validate-name',
					data: { name }
				});
			}

			function updateConditionalFields() {
				const authMethod = authMethodSelect.value;
				const conditionalFields = document.querySelectorAll('.conditional-field');

				conditionalFields.forEach(field => {
					const requiredMethod = field.dataset.authMethod;
					field.style.display = requiredMethod === authMethod ? 'block' : 'none';
				});
			}

			function handleSaveComplete(data) {
				if (data.success) {
					saveButton.textContent = 'Saved!';
					setTimeout(() => {
						saveButton.textContent = 'Save Environment';
					}, 2000);

					// Show delete button if newly created
					if (data.isNewEnvironment && data.environmentId) {
						deleteButton.style.display = 'inline-block';
					}
				}
			}

			function handleTestResult(data) {
				testButton.disabled = false;
				testButton.textContent = 'Test Connection';

				if (data.success) {
					testButton.classList.add('success');
					setTimeout(() => {
						testButton.classList.remove('success');
					}, 3000);
				} else {
					testButton.classList.add('error');
					setTimeout(() => {
						testButton.classList.remove('error');
					}, 3000);
				}
			}

			function handleDiscoverResult(data) {
				discoverButton.disabled = false;
				discoverButton.textContent = 'Discover ID';

				if (data.success && data.environmentId) {
					// Populate the environment ID field
					document.getElementById('environmentId').value = data.environmentId;
					discoverButton.classList.add('success');
					setTimeout(() => {
						discoverButton.classList.remove('success');
					}, 3000);
				} else {
					discoverButton.classList.add('error');
					setTimeout(() => {
						discoverButton.classList.remove('error');
					}, 3000);
				}
			}

			function handleNameValidation(data) {
				const nameField = nameInput.parentElement;
				const existingError = nameField.querySelector('.validation-error');

				if (existingError) {
					existingError.remove();
				}

				if (!data.isUnique) {
					const error = document.createElement('div');
					error.className = 'validation-error';
					error.textContent = data.message;
					nameField.appendChild(error);
					nameInput.classList.add('invalid');
				} else {
					nameInput.classList.remove('invalid');
				}
			}

			// Initialize
			updateConditionalFields();
		})();
	</script>
</body>
</html>`;
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
