import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { EnvironmentConnection } from '../models/PowerPlatformSettings';
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

        const panel = BasePanel.createWebviewPanel({
            viewType: EnvironmentSetupPanel.viewType,
            title: panelTitle,
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        new EnvironmentSetupPanel(panel, extensionUri, environment);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private initialEnvironment?: EnvironmentConnection
    ) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
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

        // Disable delete button for new environment
        if (this.actionBarComponent) {
            this.actionBarComponent.setActionDisabled('delete', true);
        }

        // Send message to webview to clear form
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

        // Enable delete button for existing environment
        if (this.actionBarComponent) {
            this.actionBarComponent.setActionDisabled('delete', false);
        }

        // Send environment data to webview
        this.postMessage({
            action: 'environment-loaded',
            data: environment
        });
    }

    private async saveEnvironment(data: unknown): Promise<void> {
        try {
            this.componentLogger.info('Saving environment', { isEditMode: this.isEditMode });

            // Runtime validation
            if (!data || typeof data !== 'object') {
                vscode.window.showErrorMessage('Invalid environment data');
                return;
            }

            const envData = data as Record<string, unknown>;

            // Validate required fields
            if (!envData.name || !envData.dataverseUrl || !envData.tenantId || !envData.publicClientId) {
                vscode.window.showErrorMessage('Please fill in all required fields');
                return;
            }

            // Build environment connection object
            // For credentials: only include if provided in form (non-empty)
            // Pass undefined for empty credentials, let saveEnvironmentSettings preserve existing ones from secure storage
            const environment: EnvironmentConnection = {
                id: this.isEditMode && this.currentEnvironment ? this.currentEnvironment.id : this.generateId(),
                name: envData.name as string,
                environmentId: (envData.environmentId as string) || undefined,
                isActive: this.currentEnvironment?.isActive ?? false,
                settings: {
                    dataverseUrl: envData.dataverseUrl as string,
                    tenantId: envData.tenantId as string,
                    publicClientId: envData.publicClientId as string,
                    authenticationMethod: (envData.authenticationMethod as AuthenticationMethod) || AuthenticationMethod.Interactive,
                    // Only include credentials if provided (non-empty)
                    // undefined means "don't change" when preserveCredentials=true
                    clientId: (envData.clientId as string) || undefined,
                    clientSecret: (envData.clientSecret as string) || undefined,
                    username: (envData.username as string) || undefined,
                    password: (envData.password as string) || undefined
                }
            };

            // Save environment - preserveCredentials=true means AuthenticationService will fetch
            // existing credentials from secure storage if we pass undefined
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

    private async testConnection(data: unknown): Promise<void> {
        try {
            this.componentLogger.info('Testing connection');

            // Runtime validation
            if (!data || typeof data !== 'object') {
                vscode.window.showErrorMessage('Invalid connection data');
                return;
            }

            const connData = data as Record<string, unknown>;

            // Validate required fields
            if (!connData.dataverseUrl || !connData.tenantId || !connData.publicClientId) {
                vscode.window.showErrorMessage('Please fill in required fields (Dataverse URL, Tenant ID, Public Client ID)');
                return;
            }

            // Validate auth-specific required fields
            const authMethod = (connData.authenticationMethod as AuthenticationMethod) || AuthenticationMethod.Interactive;
            if (authMethod === AuthenticationMethod.ServicePrincipal && (!connData.clientId || !connData.clientSecret)) {
                vscode.window.showErrorMessage('Client ID and Client Secret are required for Service Principal authentication');
                return;
            }
            if (authMethod === AuthenticationMethod.UsernamePassword && (!connData.username || !connData.password)) {
                vscode.window.showErrorMessage('Username and Password are required for Username/Password authentication');
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Testing connection...",
                cancellable: false
            }, async (_progress) => {
                try {
                    // Create a temporary in-memory environment for testing (don't save to storage)
                    const testEnv: EnvironmentConnection = {
                        id: 'test-' + Date.now(),
                        name: 'Test Connection (Temporary)',
                        isActive: false,
                        settings: {
                            dataverseUrl: connData.dataverseUrl as string,
                            tenantId: connData.tenantId as string,
                            publicClientId: connData.publicClientId as string,
                            authenticationMethod: authMethod,
                            clientId: connData.clientId as string,
                            clientSecret: connData.clientSecret as string,
                            username: connData.username as string,
                            password: connData.password as string
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

    private getPanelSpecificResources(): {
        environmentSetupStylesSheet: vscode.Uri;
        environmentSetupBehaviorScript: vscode.Uri;
    } {
        return {
            environmentSetupStylesSheet: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'panels', 'environment-setup.css')
            ),
            environmentSetupBehaviorScript: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'panels', 'environmentSetupBehavior.js')
            )
        };
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.actionBarComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Environment Setup', 'Failed to initialize components');
            }

            const resources = this.getCommonWebviewResources();
            const panelSpecificResources = this.getPanelSpecificResources();

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource}; script-src ${this._panel.webview.cspSource};">
    <title>Environment Setup</title>
    <link rel="stylesheet" href="${resources.panelStylesSheet}">
    <link rel="stylesheet" href="${panelSpecificResources.environmentSetupStylesSheet}">
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
    <script src="${panelSpecificResources.environmentSetupBehaviorScript}"></script>
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
