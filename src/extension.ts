import * as vscode from 'vscode';
import { AuthenticationService } from './services/AuthenticationService';
import { AuthenticationMethod } from './models/AuthenticationMethod';
import { EnvironmentConnection } from './models/PowerPlatformSettings';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    const authService = AuthenticationService.getInstance(context);

    // Register commands for different features
    const openDashboardCommand = vscode.commands.registerCommand('dynamics-devtools.openDashboard', () => {
        DashboardPanel.createOrShow(context.extensionUri, authService);
    });

    const addEnvironmentCommand = vscode.commands.registerCommand('dynamics-devtools.addEnvironment', () => {
        EnvironmentSetupPanel.createOrShow(context.extensionUri, authService);
    });

    const testConnectionCommand = vscode.commands.registerCommand('dynamics-devtools.testConnection', async () => {
        await testConnection(authService);
    });

    const openEntityBrowserCommand = vscode.commands.registerCommand('dynamics-devtools.entityBrowser', () => {
        EntityBrowserPanel.createOrShow(context.extensionUri, authService);
    });

    const openQueryDataCommand = vscode.commands.registerCommand('dynamics-devtools.queryData', () => {
        QueryDataPanel.createOrShow(context.extensionUri, authService);
    });

    const openSolutionExplorerCommand = vscode.commands.registerCommand('dynamics-devtools.solutionExplorer', () => {
        SolutionExplorerPanel.createOrShow(context.extensionUri, authService);
    });

    // Register the tree data provider for the sidebar
    const provider = new DynamicsDevToolsProvider(authService);
    vscode.window.registerTreeDataProvider('dynamics-devtools-main', provider);

    context.subscriptions.push(
        openDashboardCommand,
        addEnvironmentCommand, 
        testConnectionCommand,
        openEntityBrowserCommand,
        openQueryDataCommand,
        openSolutionExplorerCommand
    );
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

class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    public static readonly viewType = 'dynamicsDashboard';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DashboardPanel.viewType,
            'Dynamics DevTools Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src')
                ]
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Dynamics DevTools Dashboard';
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }

    private async _getHtmlForWebview(webview: vscode.Webview) {
        const environments = await this._authService.getEnvironments();
        const environmentsHtml = environments.length > 0 
            ? environments.map(env => `
                <div class="environment-card">
                    <h4>${env.name}</h4>
                    <p>${env.settings.dataverseUrl}</p>
                    <small>Auth: ${env.settings.authenticationMethod}</small>
                </div>
            `).join('')
            : '<p class="no-environments">No environments configured yet.</p>';

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dynamics DevTools Dashboard</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: var(--vscode-font-family);
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .welcome-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .welcome-title {
                        font-size: 2em;
                        margin-bottom: 10px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .welcome-subtitle {
                        color: var(--vscode-descriptionForeground);
                    }
                    .dashboard-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-top: 30px;
                    }
                    .dashboard-card {
                        background: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-editorWidget-border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .card-title {
                        font-size: 1.2em;
                        margin-bottom: 15px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .environment-card {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 12px;
                        margin-bottom: 10px;
                    }
                    .environment-card h4 {
                        margin: 0 0 5px 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    .environment-card p {
                        margin: 0 0 5px 0;
                        font-size: 0.9em;
                    }
                    .environment-card small {
                        color: var(--vscode-descriptionForeground);
                    }
                    .no-environments {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        text-align: center;
                        padding: 20px;
                    }
                    .quick-action {
                        display: inline-block;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        padding: 8px 16px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin: 5px;
                        border: none;
                        cursor: pointer;
                    }
                    .quick-action:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="welcome-header">
                    <h1 class="welcome-title">🚀 Welcome to Dynamics DevTools</h1>
                    <p class="welcome-subtitle">A powerful VS Code extension for Dynamics 365/Dataverse development and administration.</p>
                </div>

                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3 class="card-title">🔗 Environment Connections</h3>
                        ${environmentsHtml}
                        <p style="margin-top: 15px;">
                            <small>Use the sidebar to add or manage environment connections.</small>
                        </p>
                    </div>

                    <div class="dashboard-card">
                        <h3 class="card-title">🛠️ Quick Actions</h3>
                        <p>Access these tools from the sidebar:</p>
                        <ul>
                            <li><strong>Entity Browser</strong> - Browse tables and data</li>
                            <li><strong>Query Data</strong> - Run custom queries</li>
                            <li><strong>Solution Explorer</strong> - Manage solutions</li>
                        </ul>
                    </div>

                    <div class="dashboard-card">
                        <h3 class="card-title">📊 Extension Status</h3>
                        <p><strong>Environment Count:</strong> ${environments.length}</p>
                        <p><strong>Status:</strong> ✅ Ready</p>
                        <p><strong>Version:</strong> 0.0.1</p>
                    </div>

                    <div class="dashboard-card">
                        <h3 class="card-title">📚 Getting Started</h3>
                        <p>1. Click <strong>Add Environment</strong> in the sidebar to connect to your first Dynamics 365 environment</p>
                        <p>2. Test your connection to ensure authentication works</p>
                        <p>3. Explore the tools available in the sidebar</p>
                    </div>
                </div>
            </body>
            </html>`;
    }
}

class EntityBrowserPanel {
    public static currentPanel: EntityBrowserPanel | undefined;
    public static readonly viewType = 'entityBrowser';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (EntityBrowserPanel.currentPanel) {
            EntityBrowserPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EntityBrowserPanel.viewType,
            'Entity Browser',
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        EntityBrowserPanel.currentPanel = new EntityBrowserPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        EntityBrowserPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.webview.html = `<!DOCTYPE html>
        <html><head><title>Entity Browser</title></head>
        <body><h1>📊 Entity Browser</h1><p>Browse your Dataverse tables and data here.</p></body></html>`;
    }
}

class QueryDataPanel {
    public static currentPanel: QueryDataPanel | undefined;
    public static readonly viewType = 'queryData';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (QueryDataPanel.currentPanel) {
            QueryDataPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            QueryDataPanel.viewType,
            'Query Data',
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        QueryDataPanel.currentPanel = new QueryDataPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        QueryDataPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.webview.html = `<!DOCTYPE html>
        <html><head><title>Query Data</title></head>
        <body><h1>🔍 Query Data</h1><p>Run custom queries against your Dataverse environment.</p></body></html>`;
    }
}

class SolutionExplorerPanel {
    public static currentPanel: SolutionExplorerPanel | undefined;
    public static readonly viewType = 'solutionExplorer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (SolutionExplorerPanel.currentPanel) {
            SolutionExplorerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SolutionExplorerPanel.viewType,
            'Solution Explorer',
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        SolutionExplorerPanel.currentPanel = new SolutionExplorerPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        SolutionExplorerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.webview.html = `<!DOCTYPE html>
        <html><head><title>Solution Explorer</title></head>
        <body><h1>📦 Solution Explorer</h1><p>Manage your Dataverse solutions here.</p></body></html>`;
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
                new ToolItem('🏠 Dashboard', 'Open main dashboard', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.openDashboard'),
                new ToolItem('🔑 Add Environment', 'Add a new Dynamics 365 environment', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.addEnvironment'),
                new ToolItem('🧪 Test Connection', 'Test connection to an environment', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.testConnection'),
                new ToolItem('📊 Entity Browser', 'Browse tables and data', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.entityBrowser'),
                new ToolItem('🔍 Query Data', 'Run custom queries', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.queryData'),
                new ToolItem('📦 Solution Explorer', 'Manage solutions', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.solutionExplorer')
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
