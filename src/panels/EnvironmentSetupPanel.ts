import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { EnvironmentConnection, PowerPlatformSettings } from '../models/PowerPlatformSettings';
import { AuthenticationMethod } from '../models/AuthenticationMethod';

import { BasePanel } from './base/BasePanel';

export class EnvironmentSetupPanel extends BasePanel {
    public static readonly viewType = 'environmentSetup';

    private actionBarComponent?: ActionBarComponent;
    private componentFactory: ComponentFactory;
    private currentEnvironment?: EnvironmentConnection;
    private isEditMode: boolean = false;

    public static createOrShow(extensionUri: vscode.Uri, environment?: EnvironmentConnection): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // Always create a new panel to allow editing multiple environments simultaneously
        const panelTitle = environment ? `Edit Environment: ${environment.name}` : 'New Environment';

        const panel = vscode.window.createWebviewPanel(
            EnvironmentSetupPanel.viewType,
            panelTitle,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            }
        );

        new EnvironmentSetupPanel(panel, extensionUri, environment);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private initialEnvironment?: EnvironmentConnection
    ) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentSetupPanel.viewType,
            title: 'Environment Setup'
        });

        this.componentLogger.debug('Constructor starting', {
            hasInitialEnvironment: !!initialEnvironment
        });

        // Create per-panel ComponentFactory instance to avoid ID collisions
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges for component communication using BasePanel method
        this.setupComponentEventBridges([
            this.actionBarComponent
        ]);

        // Initialize the panel (this calls updateWebview which calls getHtmlContent)
        this.initialize();

        // Load initial environment if provided
        if (initialEnvironment) {
            this.loadEnvironment(initialEnvironment);
        }

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');
        try {
            this.componentLogger.trace('Creating ActionBarComponent');
            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'environmentSetup-actions',
                actions: [
                    {
                        id: 'save',
                        label: 'Save Environment',
                        icon: 'save',
                        variant: 'primary',
                        disabled: false
                    },
                    {
                        id: 'test',
                        label: 'Test Connection',
                        icon: 'debug-start',
                        variant: 'secondary',
                        disabled: false
                    },
                    {
                        id: 'delete',
                        label: 'Delete Environment',
                        icon: 'trash',
                        variant: 'secondary',
                        disabled: true,
                        confirmMessage: 'Are you sure you want to delete this environment? This action cannot be undone.'
                    },
                    {
                        id: 'new',
                        label: 'New Environment',
                        icon: 'add',
                        variant: 'secondary',
                        disabled: false
                    }
                ],
                layout: 'horizontal',
                className: 'environment-setup-actions'
            });
            this.componentLogger.trace('ActionBarComponent created successfully');
            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Environment Setup panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'save-environment':
                    await this.saveEnvironment(message.data);
                    break;

                case 'test-connection':
                    await this.testConnection(message.data);
                    break;

                case 'delete-environment':
                    await this.deleteEnvironment(message.data?.environmentId);
                    break;

                case 'new-environment':
                    this.createNewEnvironment();
                    break;

                case 'load-environment':
                    await this.loadEnvironmentById(message.data?.environmentId);
                    break;

                case 'component-event':
                    await this.handleComponentEvent(message);
                    break;

                default:
                    this.componentLogger.warn('Unknown message command', { command: message.command });
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
            this.postMessage({
                command: 'error',
                action: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, eventType, data } = message.data || {};

            if (componentId === 'environmentSetup-actions' && eventType === 'actionClicked') {
                const { actionId } = data;

                switch (actionId) {
                    case 'save':
                        // Handled by save-environment message
                        break;
                    case 'test':
                        // Handled by test-connection message
                        break;
                    case 'delete':
                        // Handled by delete-environment message
                        break;
                    case 'new':
                        this.createNewEnvironment();
                        break;
                    default:
                        this.componentLogger.warn('Unknown action ID', { actionId });
                }
            }
        } catch (error) {
            this.componentLogger.error('Error handling component event', error as Error);
        }
    }

    private createNewEnvironment(): void {
        this.componentLogger.info('Creating new environment');
        this.isEditMode = false;
        this.currentEnvironment = undefined;
        this.updateWebview();
        this.postMessage({
            action: 'environment-loaded',
            data: null
        });
    }

    private async loadEnvironmentById(environmentId: string): Promise<void> {
        try {
            const environment = await this._authService.getEnvironment(environmentId);
            if (environment) {
                this.loadEnvironment(environment);
            }
        } catch (error) {
            this.componentLogger.error('Error loading environment', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment');
        }
    }

    private loadEnvironment(environment: EnvironmentConnection): void {
        this.componentLogger.info('Loading environment for editing', { environmentId: environment.id });
        this.isEditMode = true;
        this.currentEnvironment = environment;
        this.postMessage({
            action: 'environment-loaded',
            data: environment
        });
    }

    private async saveEnvironment(data: any): Promise<void> {
        try {
            this.componentLogger.info('Saving environment', { isEditMode: this.isEditMode });

            // Validate required fields
            if (!data.name || !data.dataverseUrl || !data.tenantId || !data.publicClientId) {
                vscode.window.showErrorMessage('Please fill in all required fields');
                return;
            }

            // Build environment connection object
            const environment: EnvironmentConnection = {
                id: this.isEditMode && this.currentEnvironment ? this.currentEnvironment.id : this.generateId(),
                name: data.name,
                environmentId: data.environmentId || undefined,
                isActive: this.currentEnvironment?.isActive ?? false,
                settings: {
                    dataverseUrl: data.dataverseUrl,
                    tenantId: data.tenantId,
                    publicClientId: data.publicClientId,
                    authenticationMethod: data.authenticationMethod || AuthenticationMethod.Interactive,
                    clientId: data.clientId || undefined,
                    clientSecret: data.clientSecret || undefined,
                    username: data.username || undefined,
                    password: data.password || undefined
                }
            };

            // Save environment - preserve credentials if not provided (allows editing without re-entering secrets)
            await this._authService.saveEnvironmentSettings(environment, true);

            vscode.window.showInformationMessage(`Environment '${environment.name}' saved successfully`);

            // Update current environment and reload
            this.currentEnvironment = environment;
            this.isEditMode = true;

            this.postMessage({
                action: 'environment-saved',
                data: environment
            });

        } catch (error) {
            this.componentLogger.error('Error saving environment', error as Error);
            vscode.window.showErrorMessage('Failed to save environment: ' + (error as Error).message);
        }
    }

    private async testConnection(data: any): Promise<void> {
        try {
            this.componentLogger.info('Testing connection');

            // Validate required fields
            if (!data.dataverseUrl || !data.tenantId || !data.publicClientId) {
                vscode.window.showErrorMessage('Please fill in required fields (Dataverse URL, Tenant ID, Public Client ID)');
                return;
            }

            // Validate auth-specific required fields
            const authMethod = data.authenticationMethod || AuthenticationMethod.Interactive;
            if (authMethod === AuthenticationMethod.ServicePrincipal && (!data.clientId || !data.clientSecret)) {
                vscode.window.showErrorMessage('Client ID and Client Secret are required for Service Principal authentication');
                return;
            }
            if (authMethod === AuthenticationMethod.UsernamePassword && (!data.username || !data.password)) {
                vscode.window.showErrorMessage('Username and Password are required for Username/Password authentication');
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Testing connection...",
                cancellable: false
            }, async (progress) => {
                try {
                    // Create a temporary in-memory environment for testing (don't save to storage)
                    const testEnv: EnvironmentConnection = {
                        id: 'test-' + Date.now(),
                        name: 'Test Connection (Temporary)',
                        isActive: false,
                        settings: {
                            dataverseUrl: data.dataverseUrl,
                            tenantId: data.tenantId,
                            publicClientId: data.publicClientId,
                            authenticationMethod: authMethod,
                            clientId: data.clientId,
                            clientSecret: data.clientSecret,
                            username: data.username,
                            password: data.password
                        }
                    };

                    // Save temporarily WITH credential preservation to avoid wiping existing secrets
                    await this._authService.saveEnvironmentSettings(testEnv, true);

                    try {
                        // Try to get access token as connection test
                        await this._authService.getAccessToken(testEnv.id);

                        vscode.window.showInformationMessage('Connection test successful!');
                        this.postMessage({
                            action: 'test-connection-result',
                            data: { success: true }
                        });
                    } finally {
                        // Always clean up the temporary environment
                        await this._authService.removeEnvironment(testEnv.id);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('Connection test failed: ' + (error as Error).message);
                    this.postMessage({
                        action: 'test-connection-result',
                        data: { success: false, error: (error as Error).message }
                    });
                }
            });

        } catch (error) {
            this.componentLogger.error('Error testing connection', error as Error);
            vscode.window.showErrorMessage('Failed to test connection');
        }
    }

    private async deleteEnvironment(environmentId: string): Promise<void> {
        try {
            if (!environmentId) {
                vscode.window.showWarningMessage('No environment selected to delete');
                return;
            }

            this.componentLogger.info('Deleting environment', { environmentId });

            await this._authService.removeEnvironment(environmentId);

            vscode.window.showInformationMessage('Environment deleted successfully');

            // Clear form and switch to new mode
            this.createNewEnvironment();

        } catch (error) {
            this.componentLogger.error('Error deleting environment', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to delete environment');
        }
    }

    private generateId(): string {
        return 'env-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.actionBarComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Environment Setup', 'Failed to initialize components');
            }

            const resources = this.getCommonWebviewResources();

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src ${this._panel.webview.cspSource} 'unsafe-inline';">
    <title>Environment Setup</title>
    <link rel="stylesheet" href="${resources.panelStylesSheet}">
    <style>
        body {
            padding: 0;
            margin: 0;
        }
        .page-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
        }
        .page-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: var(--vscode-foreground);
        }
        .page-subtitle {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
        }
        .form-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 24px;
        }
        .action-bar-container {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .form-section {
            margin-bottom: 32px;
        }
        .form-section-title {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--vscode-foreground);
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }
        .form-row.single {
            grid-template-columns: 1fr;
        }
        .form-field {
            margin-bottom: 0;
        }
        .form-field label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        .form-field input,
        .form-field select {
            width: 100%;
            padding: 8px 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            box-sizing: border-box;
        }
        .form-field input:focus,
        .form-field select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }
        .form-field .hint {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            line-height: 1.4;
        }
        .form-field.required label::after {
            content: " *";
            color: var(--vscode-inputValidation-errorBorder);
        }
        .conditional-field {
            display: none;
        }
        .conditional-field.visible {
            display: block;
        }

        /* Action Bar Button Styling */
        .action-bar {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .action-bar button {
            padding: 6px 14px;
            font-size: 13px;
            line-height: 18px;
            font-family: var(--vscode-font-family);
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border, transparent);
            border-radius: 2px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .action-bar button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        .action-bar button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .action-bar button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .action-bar button.secondary:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .component-loading-container,
        .component-error-container {
            display: none;
        }
    </style>
</head>
<body>
    <div class="page-header">
        <h1 class="page-title" id="pageTitle">New Environment</h1>
        <p class="page-subtitle" id="pageSubtitle">Configure authentication and connection settings</p>
    </div>

    <div class="form-container">
        <!-- Action Bar -->
        <div class="action-bar-container">
            ${this.actionBarComponent.generateHTML()}
        </div>

        <!-- Environment Form -->
        <form id="environmentForm">
            <!-- Basic Information Section -->
            <div class="form-section">
                <div class="form-section-title">Basic Information</div>

                <div class="form-row single">
                    <div class="form-field required">
                        <label for="name">Environment Name</label>
                        <input type="text" id="name" name="name" placeholder="e.g., Production, Development, Testing" required>
                        <div class="hint">A friendly name to identify this environment</div>
                    </div>
                </div>

                <div class="form-row single">
                    <div class="form-field required">
                        <label for="dataverseUrl">Dataverse URL</label>
                        <input type="url" id="dataverseUrl" name="dataverseUrl" placeholder="https://org.crm.dynamics.com" required>
                        <div class="hint">The URL of your Dataverse organization</div>
                    </div>
                </div>

                <div class="form-row single">
                    <div class="form-field">
                        <label for="environmentId">Environment ID</label>
                        <input type="text" id="environmentId" name="environmentId" placeholder="00000000-0000-0000-0000-000000000000">
                        <div class="hint">Optional: The unique GUID for this environment</div>
                    </div>
                </div>
            </div>

            <!-- Authentication Section -->
            <div class="form-section">
                <div class="form-section-title">Authentication</div>

                <div class="form-row">
                    <div class="form-field required">
                        <label for="tenantId">Tenant ID</label>
                        <input type="text" id="tenantId" name="tenantId" placeholder="00000000-0000-0000-0000-000000000000" required>
                        <div class="hint">Your Azure AD tenant ID</div>
                    </div>

                    <div class="form-field required">
                        <label for="publicClientId">Public Client ID</label>
                        <input type="text" id="publicClientId" name="publicClientId" placeholder="51f81489-12ee-4a9e-aaae-a2591f45987d" required>
                        <div class="hint">The application (client) ID</div>
                    </div>
                </div>

                <div class="form-row single">
                    <div class="form-field required">
                        <label for="authenticationMethod">Authentication Method</label>
                        <select id="authenticationMethod" name="authenticationMethod" required>
                            <option value="Interactive">Interactive (Browser)</option>
                            <option value="ServicePrincipal">Service Principal (Client Secret)</option>
                            <option value="UsernamePassword">Username/Password</option>
                            <option value="DeviceCode">Device Code</option>
                        </select>
                        <div class="hint">Select how you want to authenticate to this environment</div>
                    </div>
                </div>

                <!-- Service Principal Fields -->
                <div class="form-row conditional-field" data-auth-method="ServicePrincipal">
                    <div class="form-field">
                        <label for="clientId">Client ID</label>
                        <input type="text" id="clientId" name="clientId" placeholder="00000000-0000-0000-0000-000000000000">
                        <div class="hint">Application ID for service principal</div>
                    </div>

                    <div class="form-field">
                        <label for="clientSecret">Client Secret</label>
                        <input type="password" id="clientSecret" name="clientSecret" placeholder="Enter client secret">
                        <div class="hint">Secret value (stored securely)</div>
                    </div>
                </div>

                <!-- Username/Password Fields -->
                <div class="form-row conditional-field" data-auth-method="UsernamePassword">
                    <div class="form-field">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" placeholder="user@domain.com">
                        <div class="hint">Username for authentication</div>
                    </div>

                    <div class="form-field">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="Enter password">
                        <div class="hint">Password (stored securely)</div>
                    </div>
                </div>
            </div>
        </form>
    </div>

    <script src="${resources.panelUtilsScript}"></script>
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            let currentEnvironmentId = null;

            // Handle authentication method changes
            document.getElementById('authenticationMethod').addEventListener('change', function() {
                updateConditionalFields(this.value);
            });

            function updateConditionalFields(authMethod) {
                // Hide all conditional fields
                document.querySelectorAll('.conditional-field').forEach(field => {
                    field.classList.remove('visible');
                });

                // Show fields for selected auth method
                document.querySelectorAll(\`[data-auth-method="\${authMethod}"]\`).forEach(field => {
                    field.classList.add('visible');
                });
            }

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.action) {
                    case 'componentUpdate':
                        // Action bar events handled via component-event
                        break;

                    case 'environment-loaded':
                        loadEnvironmentData(message.data);
                        break;

                    case 'environment-saved':
                        currentEnvironmentId = message.data?.id;
                        updateActionBarState(true);
                        updatePageTitle(message.data?.name);
                        break;
                }
            });

            function loadEnvironmentData(env) {
                if (!env) {
                    // Clear form for new environment
                    document.getElementById('environmentForm').reset();
                    currentEnvironmentId = null;
                    updateActionBarState(false);
                    updateConditionalFields('Interactive');
                    updatePageTitle(null);
                    return;
                }

                // Load environment data into form
                currentEnvironmentId = env.id;
                document.getElementById('name').value = env.name || '';
                document.getElementById('dataverseUrl').value = env.settings.dataverseUrl || '';
                document.getElementById('environmentId').value = env.environmentId || '';
                document.getElementById('tenantId').value = env.settings.tenantId || '';
                document.getElementById('publicClientId').value = env.settings.publicClientId || '';
                document.getElementById('authenticationMethod').value = env.settings.authenticationMethod || 'Interactive';
                document.getElementById('clientId').value = env.settings.clientId || '';
                document.getElementById('username').value = env.settings.username || '';

                updateConditionalFields(env.settings.authenticationMethod || 'Interactive');
                updateActionBarState(true);
                updatePageTitle(env.name);
            }

            function updatePageTitle(environmentName) {
                const titleElement = document.getElementById('pageTitle');
                const subtitleElement = document.getElementById('pageSubtitle');

                if (environmentName) {
                    titleElement.textContent = \`Edit Environment: \${environmentName}\`;
                    subtitleElement.textContent = 'Update authentication and connection settings';
                } else {
                    titleElement.textContent = 'New Environment';
                    subtitleElement.textContent = 'Configure authentication and connection settings';
                }
            }

            function updateActionBarState(isEditMode) {
                // Enable/disable delete button based on whether we're editing
                const deleteAction = document.querySelector('[data-action-id="delete"]');
                if (deleteAction) {
                    if (isEditMode) {
                        deleteAction.removeAttribute('disabled');
                    } else {
                        deleteAction.setAttribute('disabled', 'true');
                    }
                }
            }

            // Intercept action bar button clicks and collect form data
            document.addEventListener('click', function(e) {
                const actionBtn = e.target.closest('[data-action-id]');
                if (!actionBtn) return;

                const actionId = actionBtn.getAttribute('data-action-id');

                if (actionId === 'save') {
                    e.stopPropagation();
                    saveEnvironment();
                } else if (actionId === 'test') {
                    e.stopPropagation();
                    testConnection();
                } else if (actionId === 'delete') {
                    e.stopPropagation();
                    deleteEnvironment();
                } else if (actionId === 'new') {
                    e.stopPropagation();
                    vscode.postMessage({ command: 'new-environment' });
                }
            });

            function saveEnvironment() {
                const formData = {
                    name: document.getElementById('name').value,
                    dataverseUrl: document.getElementById('dataverseUrl').value,
                    environmentId: document.getElementById('environmentId').value,
                    tenantId: document.getElementById('tenantId').value,
                    publicClientId: document.getElementById('publicClientId').value,
                    authenticationMethod: document.getElementById('authenticationMethod').value,
                    clientId: document.getElementById('clientId').value,
                    clientSecret: document.getElementById('clientSecret').value,
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                };

                vscode.postMessage({ command: 'save-environment', data: formData });
            }

            function testConnection() {
                const formData = {
                    dataverseUrl: document.getElementById('dataverseUrl').value,
                    tenantId: document.getElementById('tenantId').value,
                    publicClientId: document.getElementById('publicClientId').value,
                    authenticationMethod: document.getElementById('authenticationMethod').value,
                    clientId: document.getElementById('clientId').value,
                    clientSecret: document.getElementById('clientSecret').value,
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                };

                vscode.postMessage({ command: 'test-connection', data: formData });
            }

            function deleteEnvironment() {
                if (currentEnvironmentId) {
                    vscode.postMessage({
                        command: 'delete-environment',
                        data: { environmentId: currentEnvironmentId }
                    });
                }
            }

            // Initialize conditional fields
            updateConditionalFields('Interactive');
        })();
    </script>
</body>
</html>`;

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Environment Setup', 'Failed to generate panel content: ' + error);
        }
    }

    public dispose(): void {
        this.actionBarComponent?.dispose();

        super.dispose();
    }
}
