import * as vscode from 'vscode';
import { AuthenticationService } from './services/AuthenticationService';
import { AuthenticationMethod } from './models/AuthenticationMethod';
import { EnvironmentConnection } from './models/PowerPlatformSettings';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    const authService = AuthenticationService.getInstance(context);

    // Register the main command to open the webview panel
    const openPanelCommand = vscode.commands.registerCommand('dynamics-devtools.openPanel', () => {
        DynamicsDevToolsPanel.createOrShow(context.extensionUri, authService);
    });

    // Register the command to add a new environment using webview form
    const addEnvironmentCommand = vscode.commands.registerCommand('dynamics-devtools.addEnvironment', () => {
        EnvironmentSetupPanel.createOrShow(context.extensionUri, authService);
    });

    // Register test connection command
    const testConnectionCommand = vscode.commands.registerCommand('dynamics-devtools.testConnection', async () => {
        await testConnection(authService);
    });

    // Register the tree data provider for the sidebar
    const provider = new DynamicsDevToolsProvider(authService);
    vscode.window.registerTreeDataProvider('dynamics-devtools-main', provider);

    context.subscriptions.push(openPanelCommand, addEnvironmentCommand, testConnectionCommand);
}

async function testConnection(authService: AuthenticationService) {
    const environments = await authService.getEnvironments();

    if (environments.length === 0) {
        vscode.window.showWarningMessage('No environments configured. Add an environment first.');
        return;
    }

    const selected = await vscode.window.showQuickPick(
        environments.map(env => ({
            label: env.name,
            description: env.settings.dataverseUrl,
            detail: `Auth: ${env.settings.authenticationMethod}`,
            env: env
        })),
        { placeHolder: 'Select environment to test' }
    );

    if (!selected) return;

    try {
        vscode.window.showInformationMessage('Testing connection...');
        const token = await authService.getAccessToken(selected.env.id);
        vscode.window.showInformationMessage(`✅ Connection successful to ${selected.env.name}!`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`❌ Connection failed: ${error.message}`);
    }
}

export function deactivate() { }

class DynamicsDevToolsPanel {
    public static currentPanel: DynamicsDevToolsPanel | undefined;
    public static readonly viewType = 'dynamicsDevTools';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DynamicsDevToolsPanel.currentPanel) {
            DynamicsDevToolsPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DynamicsDevToolsPanel.viewType,
            'Dynamics DevTools',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'out'),
                    vscode.Uri.joinPath(extensionUri, 'src')
                ]
            }
        );

        DynamicsDevToolsPanel.currentPanel = new DynamicsDevToolsPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        DynamicsDevToolsPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Dynamics DevTools';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'MainPanel.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dynamics DevTools</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: var(--vscode-font-family);
                        background: var(--vscode-editor-background);
                    }
                </style>
            </head>
            <body>
                <main-panel></main-panel>
                <script type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

class EnvironmentSetupPanel {
    public static currentPanel: EnvironmentSetupPanel | undefined;
    public static readonly viewType = 'environmentSetup';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (EnvironmentSetupPanel.currentPanel) {
            EnvironmentSetupPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentSetupPanel.viewType,
            'Add Dynamics 365 Environment',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src')
                ]
            }
        );

        EnvironmentSetupPanel.currentPanel = new EnvironmentSetupPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.action) {
                    case 'saveEnvironment':
                        await this.handleSaveEnvironment(message.data);
                        break;
                    case 'testConnection':
                        await this.handleTestConnection(message.data);
                        break;
                    case 'cancel':
                        this.dispose();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async handleSaveEnvironment(data: any) {
        try {
            const environment: EnvironmentConnection = {
                id: `env-${Date.now()}`, // Generate unique ID
                name: data.name,
                settings: {
                    tenantId: data.tenantId,
                    dataverseUrl: data.dataverseUrl,
                    authenticationMethod: data.authenticationMethod as AuthenticationMethod,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    username: data.username,
                    password: data.password,
                    publicClientId: data.publicClientId
                },
                isActive: false,
                lastUsed: new Date()
            };

            await this._authService.saveEnvironmentSettings(environment);

            // Send success response
            this._panel.webview.postMessage({
                action: 'saveEnvironmentResponse',
                success: true,
                data: { message: 'Environment saved successfully!' }
            });

            vscode.window.showInformationMessage(`Environment '${data.name}' added successfully!`);

            // Close the panel after successful save
            setTimeout(() => this.dispose(), 1500);

        } catch (error: any) {
            this._panel.webview.postMessage({
                action: 'saveEnvironmentResponse',
                success: false,
                error: error.message
            });
        }
    }

    private async handleTestConnection(data: any) {
        try {
            // Create a temporary environment for testing
            const tempEnvironment: EnvironmentConnection = {
                id: 'temp-test',
                name: 'Test',
                settings: {
                    tenantId: data.tenantId,
                    dataverseUrl: data.dataverseUrl,
                    authenticationMethod: data.authenticationMethod as AuthenticationMethod,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    username: data.username,
                    password: data.password,
                    publicClientId: data.publicClientId
                },
                isActive: false
            };

            // Save temporarily to test
            await this._authService.saveEnvironmentSettings(tempEnvironment);

            // Try to get an access token (this will trigger authentication)
            const token = await this._authService.getAccessToken('temp-test');

            // Clean up temp environment
            await this._authService.removeEnvironment('temp-test');

            if (token) {
                this._panel.webview.postMessage({
                    action: 'testConnectionResponse',
                    success: true,
                    data: { message: 'Connection successful! Authentication completed.' }
                });
            }

        } catch (error: any) {
            // Clean up temp environment on error
            try {
                await this._authService.removeEnvironment('temp-test');
            } catch { }

            this._panel.webview.postMessage({
                action: 'testConnectionResponse',
                success: false,
                error: error.message
            });
        }
    }

    public dispose() {
        EnvironmentSetupPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Add Dynamics 365 Environment';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'EnvironmentSetup.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Add Dynamics 365 Environment</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: var(--vscode-font-family);
                        background: var(--vscode-editor-background);
                    }
                </style>
            </head>
            <body>
                <environment-setup></environment-setup>
                <script type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

class DynamicsDevToolsProvider implements vscode.TreeDataProvider<ToolItem> {
    private _authService: AuthenticationService;

    constructor(authService: AuthenticationService) {
        this._authService = authService;
    }

    getTreeItem(element: ToolItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ToolItem): Thenable<ToolItem[]> {
        if (!element) {
            return Promise.resolve([
                new ToolItem('🔑 Add Environment', 'Add a new Dynamics 365 environment', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.addEnvironment'),
                new ToolItem('🧪 Test Connection', 'Test connection to an environment', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.testConnection'),
                new ToolItem('📊 Entity Browser', 'Browse tables and data', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.openPanel'),
                new ToolItem('🔍 Query Data', 'Run custom queries', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.openPanel'),
                new ToolItem('📦 Solution Explorer', 'Manage solutions', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.openPanel')
            ]);
        }
        return Promise.resolve([]);
    }
}

class ToolItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        commandId?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
    }
}
