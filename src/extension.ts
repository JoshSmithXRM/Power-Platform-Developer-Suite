import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';
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
    public static readonly viewType = 'entityBrowser';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];
    private _selectedEnvironmentId: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // Always create a new panel instead of reusing existing one
        const panel = vscode.window.createWebviewPanel(
            EntityBrowserPanel.viewType,
            'Entity Browser',
            column || vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        new EntityBrowserPanel(panel, extensionUri, authService);
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
                    case 'loadEnvironments':
                        await this.loadEnvironments();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private async loadEnvironments() {
        try {
            // Get environments from storage (this would typically come from your environment storage)
            const persistence = require('node-persist');
            await persistence.init({
                dir: path.join(os.homedir(), '.dynamics-devtools', 'environments'),
                stringify: JSON.stringify,
                parse: JSON.parse,
                encoding: 'utf8',
                logging: false,
                continuous: true,
                interval: false,
                ttl: false,
            });

            const environmentKeys = await persistence.keys();
            const environments = [];
            
            for (const key of environmentKeys) {
                const envData = await persistence.getItem(key);
                if (envData && envData.displayName && envData.url) {
                    environments.push({
                        id: key,
                        name: envData.displayName,
                        url: envData.url
                    });
                }
            }

            // Send environments to webview
            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                environments: environments
            });
        } catch (error) {
            console.error('Error loading environments:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Failed to load environments'
            });
        }
    }

    private _update() {
        this._panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Entity Browser</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .environment-selector {
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .environment-label {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    min-width: 80px;
                }
                .environment-dropdown {
                    flex: 1;
                    max-width: 400px;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 14px;
                }
                .environment-status {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                    font-weight: 500;
                }
                .environment-connected {
                    background: var(--vscode-testing-iconPassed);
                    color: white;
                }
                .environment-disconnected {
                    background: var(--vscode-testing-iconFailed);
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="environment-selector">
                <span class="environment-label">🌐 Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>
            
            <h1>📊 Entity Browser</h1>
            <p>Browse your Dataverse tables and data here.</p>
            <div id="content">
                <p>Select an environment to load entities...</p>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function loadEnvironments() {
                    vscode.postMessage({ action: 'loadEnvironments' });
                }
                
                function populateEnvironments(environments) {
                    const select = document.getElementById('environmentSelect');
                    select.innerHTML = '<option value="">Select an environment...</option>';
                    
                    environments.forEach(env => {
                        const option = document.createElement('option');
                        option.value = env.id;
                        option.textContent = \`\${env.name} (\${env.settings.dataverseUrl})\`;
                        select.appendChild(option);
                    });
                    
                    if (environments.length > 0) {
                        select.value = environments[0].id;
                        updateEnvironmentStatus('Connected', true);
                    }
                }
                
                function updateEnvironmentStatus(status, isConnected) {
                    const statusElement = document.getElementById('environmentStatus');
                    statusElement.textContent = status;
                    statusElement.className = 'environment-status ' + 
                        (isConnected ? 'environment-connected' : 'environment-disconnected');
                }
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.action === 'environmentsLoaded') {
                        populateEnvironments(message.data);
                    }
                });
                
                document.addEventListener('DOMContentLoaded', () => {
                    document.getElementById('environmentSelect').addEventListener('change', (e) => {
                        const isConnected = e.target.value !== '';
                        updateEnvironmentStatus(isConnected ? 'Connected' : 'Disconnected', isConnected);
                    });
                    loadEnvironments();
                });
                
                loadEnvironments();
            </script>
        </body>
        </html>`;
    }
}

class QueryDataPanel {
    public static readonly viewType = 'queryData';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // Always create a new panel instead of reusing existing one
        const panel = vscode.window.createWebviewPanel(
            QueryDataPanel.viewType,
            'Query Data',
            column || vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        new QueryDataPanel(panel, extensionUri, authService);
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
                    case 'loadEnvironments':
                        await this.loadEnvironments();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private async loadEnvironments() {
        try {
            // Get environments from storage
            const persistence = require('node-persist');
            await persistence.init({
                dir: path.join(os.homedir(), '.dynamics-devtools', 'environments'),
                stringify: JSON.stringify,
                parse: JSON.parse,
                encoding: 'utf8',
                logging: false,
                continuous: true,
                interval: false,
                ttl: false,
            });

            const environmentKeys = await persistence.keys();
            const environments = [];
            
            for (const key of environmentKeys) {
                const envData = await persistence.getItem(key);
                if (envData && envData.displayName && envData.url) {
                    environments.push({
                        id: key,
                        name: envData.displayName,
                        url: envData.url
                    });
                }
            }

            // Send environments to webview
            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                environments: environments
            });
        } catch (error) {
            console.error('Error loading environments:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Failed to load environments'
            });
        }
    }

    private _update() {
        this._panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Query Data</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                
                .environment-selector {
                    background-color: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .env-status {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-charts-green);
                }
                
                .env-label {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .env-dropdown {
                    background-color: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: inherit;
                    min-width: 200px;
                }
                
                .env-dropdown:focus {
                    outline: 1px solid var(--vscode-focusBorder);
                    outline-offset: 1px;
                }
                
                h1 {
                    color: var(--vscode-foreground);
                    margin-bottom: 20px;
                }
                
                .content {
                    padding: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="environment-selector">
                <div class="env-status"></div>
                <span class="env-label">Environment:</span>
                <select class="env-dropdown" id="environmentSelect">
                    <option value="">Loading environments...</option>
                </select>
            </div>
            
            <div class="content">
                <h1>🔍 Query Data</h1>
                <p>Run custom queries against your Dataverse environment.</p>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Load environments on page load
                window.addEventListener('DOMContentLoaded', () => {
                    vscode.postMessage({ action: 'loadEnvironments' });
                });
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.action) {
                        case 'environmentsLoaded':
                            const select = document.getElementById('environmentSelect');
                            select.innerHTML = '<option value="">Select an environment...</option>';
                            
                            message.environments.forEach(env => {
                                const option = document.createElement('option');
                                option.value = env.id;
                                option.textContent = env.name;
                                select.appendChild(option);
                            });
                            
                            // Set first environment as default if available
                            if (message.environments.length > 0) {
                                select.value = message.environments[0].id;
                            }
                            break;
                        case 'error':
                            console.error('Error:', message.message);
                            break;
                    }
                });
                
                // Handle environment selection
                document.getElementById('environmentSelect').addEventListener('change', (e) => {
                    const selectedEnvId = e.target.value;
                    // TODO: Implement environment switching logic
                    console.log('Selected environment:', selectedEnvId);
                });
            </script>
        </body>
        </html>`;
    }
}

class SolutionExplorerPanel {
    public static readonly viewType = 'solutionExplorer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];
    private _selectedEnvironmentId: string | undefined;
    private _cachedSolutions: any[] | undefined;
    private _cachedEnvironments: any[] | undefined;

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // Always create a new panel instead of reusing existing one
        const panel = vscode.window.createWebviewPanel(
            SolutionExplorerPanel.viewType,
            'Solution Explorer',
            column || vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        new SolutionExplorerPanel(panel, extensionUri, authService);
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
                    case 'loadEnvironments':
                        await this.loadEnvironments();
                        break;
                    case 'loadSolutions':
                        // Clear cache if environment changed or force refresh requested
                        if (this._selectedEnvironmentId !== message.environmentId || message.forceRefresh) {
                            this._cachedSolutions = undefined;
                        }
                        // Store the selected environment
                        this._selectedEnvironmentId = message.environmentId;
                        await this.loadSolutions(message.environmentId);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Solution Explorer</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .environment-selector {
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .environment-label {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    min-width: 80px;
                }
                .environment-dropdown {
                    flex: 1;
                    max-width: 400px;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 14px;
                }
                .environment-dropdown:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                }
                .environment-status {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                    font-weight: 500;
                }
                .environment-connected {
                    background: var(--vscode-testing-iconPassed);
                    color: white;
                }
                .environment-disconnected {
                    background: var(--vscode-testing-iconFailed);
                    color: white;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                }
                .title {
                    font-size: 1.5em;
                    margin: 0;
                    color: var(--vscode-textLink-foreground);
                }
                .refresh-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .refresh-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
                .error {
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 12px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .solutions-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 4px;
                }
                .solutions-table th,
                .solutions-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                }
                .solutions-table th {
                    background: var(--vscode-editorGroupHeader-tabsBackground);
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    position: sticky;
                    top: 0;
                }
                .solutions-table tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .managed-badge {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                }
                .unmanaged-badge {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                }
                .no-solutions {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <!-- Environment Selector -->
            <div class="environment-selector">
                <span class="environment-label">🌐 Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>

            <div class="header">
                <h1 class="title">📦 Solution Explorer</h1>
                <button class="refresh-btn" onclick="refreshSolutions()">🔄 Refresh</button>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load solutions...</p>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                
                // Load environments on startup
                function loadEnvironments() {
                    vscode.postMessage({ action: 'loadEnvironments' });
                }
                
                function populateEnvironments(environments, selectedEnvironmentId) {
                    const select = document.getElementById('environmentSelect');
                    select.innerHTML = '<option value="">Select an environment...</option>';
                    
                    environments.forEach(env => {
                        const option = document.createElement('option');
                        option.value = env.id;
                        option.textContent = \`\${env.name} (\${env.settings.dataverseUrl})\`;
                        select.appendChild(option);
                    });
                    
                    // Restore selected environment or auto-select first environment if available
                    if (selectedEnvironmentId && environments.find(env => env.id === selectedEnvironmentId)) {
                        select.value = selectedEnvironmentId;
                        currentEnvironmentId = selectedEnvironmentId;
                        updateEnvironmentStatus('Connected', true);
                        loadSolutions();
                    } else if (environments.length > 0) {
                        select.value = environments[0].id;
                        currentEnvironmentId = environments[0].id;
                        updateEnvironmentStatus('Connected', true);
                        loadSolutions();
                    }
                }
                
                function updateEnvironmentStatus(status, isConnected) {
                    const statusElement = document.getElementById('environmentStatus');
                    statusElement.textContent = status;
                    statusElement.className = 'environment-status ' + 
                        (isConnected ? 'environment-connected' : 'environment-disconnected');
                }
                
                function onEnvironmentChange() {
                    const select = document.getElementById('environmentSelect');
                    currentEnvironmentId = select.value;
                    
                    if (currentEnvironmentId) {
                        updateEnvironmentStatus('Connected', true);
                        loadSolutions();
                    } else {
                        updateEnvironmentStatus('Disconnected', false);
                        document.getElementById('content').innerHTML = 
                            '<div class="loading"><p>Select an environment to load solutions...</p></div>';
                    }
                }
                
                function loadSolutions() {
                    if (!currentEnvironmentId) {
                        document.getElementById('content').innerHTML = 
                            '<div class="error">Please select an environment first.</div>';
                        return;
                    }
                    
                    document.getElementById('content').innerHTML = '<div class="loading"><p>Loading solutions...</p></div>';
                    vscode.postMessage({ 
                        action: 'loadSolutions', 
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function refreshSolutions() {
                    if (!currentEnvironmentId) {
                        document.getElementById('content').innerHTML = 
                            '<div class="error">Please select an environment first.</div>';
                        return;
                    }
                    
                    document.getElementById('content').innerHTML = '<div class="loading"><p>Loading solutions...</p></div>';
                    vscode.postMessage({ 
                        action: 'loadSolutions', 
                        environmentId: currentEnvironmentId,
                        forceRefresh: true
                    });
                }
                
                function displaySolutions(solutions) {
                    const content = document.getElementById('content');
                    
                    if (!solutions || solutions.length === 0) {
                        content.innerHTML = '<div class="no-solutions"><p>No solutions found in this environment.</p></div>';
                        return;
                    }
                    
                    let tableHtml = \`
                        <table class="solutions-table">
                            <thead>
                                <tr>
                                    <th>Display Name</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Version</th>
                                    <th>Publisher</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                    \`;
                    
                    solutions.forEach(solution => {
                        const managedBadge = solution.ismanaged 
                            ? '<span class="managed-badge">Managed</span>'
                            : '<span class="unmanaged-badge">Unmanaged</span>';
                            
                        const createdDate = new Date(solution.createdon).toLocaleDateString();
                        
                        tableHtml += \`
                            <tr>
                                <td>\${solution.friendlyname || solution.uniquename}</td>
                                <td>\${solution.uniquename}</td>
                                <td>\${managedBadge}</td>
                                <td>\${solution.version}</td>
                                <td>\${solution.publishername || 'Unknown'}</td>
                                <td>\${createdDate}</td>
                            </tr>
                        \`;
                    });
                    
                    tableHtml += '</tbody></table>';
                    content.innerHTML = tableHtml;
                }
                
                function displayError(error) {
                    document.getElementById('content').innerHTML = 
                        \`<div class="error">Error loading solutions: \${error}</div>\`;
                    updateEnvironmentStatus('Error', false);
                }
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.action) {
                        case 'environmentsLoaded':
                            populateEnvironments(message.data, message.selectedEnvironmentId);
                            break;
                        case 'solutionsLoaded':
                            displaySolutions(message.data);
                            break;
                        case 'solutionsError':
                            displayError(message.error);
                            break;
                    }
                });
                
                // Set up event listeners
                document.addEventListener('DOMContentLoaded', () => {
                    document.getElementById('environmentSelect').addEventListener('change', onEnvironmentChange);
                    loadEnvironments();
                });
                
                // Load environments on startup (fallback)
                loadEnvironments();
            </script>
        </body>
        </html>`;
    }

    private async loadEnvironments() {
        try {
            // Use cached environments if available
            if (this._cachedEnvironments) {
                this._panel.webview.postMessage({
                    action: 'environmentsLoaded',
                    data: this._cachedEnvironments,
                    selectedEnvironmentId: this._selectedEnvironmentId
                });
                return;
            }

            const environments = await this._authService.getEnvironments();
            
            // Cache the environments
            this._cachedEnvironments = environments;
            
            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: this._selectedEnvironmentId
            });

        } catch (error: any) {
            console.error('Error loading environments:', error);
            this._panel.webview.postMessage({
                action: 'solutionsError',
                error: `Failed to load environments: ${error.message}`
            });
        }
    }

    private async loadSolutions(environmentId?: string) {
        try {
            // Check if we have cached solutions for this environment
            if (this._cachedSolutions && this._selectedEnvironmentId === environmentId) {
                this._panel.webview.postMessage({
                    action: 'solutionsLoaded',
                    data: this._cachedSolutions
                });
                return;
            }

            // Get available environments
            const environments = await this._authService.getEnvironments();
            
            if (environments.length === 0) {
                this._panel.webview.postMessage({
                    action: 'solutionsError',
                    error: 'No environments configured. Please add an environment first.'
                });
                return;
            }

            // Use specified environment or fall back to first one
            let environment = environments[0];
            if (environmentId) {
                const foundEnv = environments.find(env => env.id === environmentId);
                if (foundEnv) {
                    environment = foundEnv;
                } else {
                    this._panel.webview.postMessage({
                        action: 'solutionsError',
                        error: 'Selected environment not found.'
                    });
                    return;
                }
            }
            
            // Get access token for the environment
            const token = await this._authService.getAccessToken(environment.id);
            
            // Fetch solutions from Dataverse
            const solutionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,createdon,description&$expand=publisherid($select=uniquename,friendlyname)&$orderby=createdon desc`;
            
            const response = await fetch(solutionsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as any;
            
            // Transform the data to include publisher name
            const solutions = data.value.map((solution: any) => ({
                solutionid: solution.solutionid,
                uniquename: solution.uniquename,
                friendlyname: solution.friendlyname,
                version: solution.version,
                ismanaged: solution.ismanaged,
                createdon: solution.createdon,
                description: solution.description,
                publishername: solution.publisherid?.friendlyname || solution.publisherid?.uniquename || 'Unknown'
            }));

            // Cache the solutions data
            this._cachedSolutions = solutions;

            this._panel.webview.postMessage({
                action: 'solutionsLoaded',
                data: solutions
            });

        } catch (error: any) {
            console.error('Error loading solutions:', error);
            this._panel.webview.postMessage({
                action: 'solutionsError',
                error: error.message
            });
        }
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
