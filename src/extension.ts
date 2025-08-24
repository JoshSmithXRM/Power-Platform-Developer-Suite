import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { AuthenticationService } from './services/AuthenticationService';
import { AuthenticationMethod } from './models/AuthenticationMethod';
import { EnvironmentConnection } from './models/PowerPlatformSettings';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    const authService = AuthenticationService.getInstance(context);

    // Register commands for different features
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

    const environmentsProvider = new EnvironmentsProvider(authService);
    const toolsProvider = new ToolsProvider(authService);
    vscode.window.registerTreeDataProvider('dynamics-devtools-environments', environmentsProvider);
    vscode.window.registerTreeDataProvider('dynamics-devtools-tools', toolsProvider);

    // Register new commands for context menu and inline buttons
    const refreshEnvironmentsCommand = vscode.commands.registerCommand('dynamics-devtools.refreshEnvironments', () => {
        environmentsProvider.refresh();
        vscode.window.showInformationMessage('Environments refreshed');
    });

    const openMakerCommand = vscode.commands.registerCommand('dynamics-devtools.openMaker', async (environmentItem?: EnvironmentItem) => {
        if (environmentItem) {
            // Use the stored environment ID if available
            const environment = await authService.getEnvironment(environmentItem.envId);
            const envId = environment?.environmentId || environmentItem.environmentId || 'default';
            const makerUrl = `https://make.powerapps.com/environments/${envId}`;
            vscode.env.openExternal(vscode.Uri.parse(makerUrl));
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    });

    const openDynamicsCommand = vscode.commands.registerCommand('dynamics-devtools.openDynamics', async (environmentItem?: EnvironmentItem) => {
        if (environmentItem) {
            // Open the Dataverse URL directly
            const environment = await authService.getEnvironment(environmentItem.envId);
            if (environment) {
                vscode.env.openExternal(vscode.Uri.parse(environment.settings.dataverseUrl));
            } else {
                vscode.window.showErrorMessage('Environment not found');
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    });

    const editEnvironmentCommand = vscode.commands.registerCommand('dynamics-devtools.editEnvironment', async (environmentItem?: EnvironmentItem) => {
        if (environmentItem) {
            const environment = await authService.getEnvironment(environmentItem.envId);
            if (environment) {
                EnvironmentSetupPanel.createOrShow(context.extensionUri, authService, environment);
            } else {
                vscode.window.showErrorMessage('Environment not found');
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    });

    const testEnvironmentConnectionCommand = vscode.commands.registerCommand('dynamics-devtools.testEnvironmentConnection', async (environmentItem?: EnvironmentItem) => {
        if (environmentItem) {
            try {
                await authService.getAccessToken(environmentItem.envId);
                vscode.window.showInformationMessage(`✅ Connection test successful for ${environmentItem.label}!`);
            } catch (error: any) {
                vscode.window.showErrorMessage(`❌ Connection test failed for ${environmentItem.label}: ${error.message}`);
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    });

    const removeEnvironmentFromContextCommand = vscode.commands.registerCommand('dynamics-devtools.removeEnvironment', async (environmentItem?: EnvironmentItem) => {
        if (environmentItem) {
            const confirmResult = await vscode.window.showWarningMessage(
                `Are you sure you want to remove the environment "${environmentItem.label}"?`,
                { modal: true },
                'Remove'
            );

            if (confirmResult === 'Remove') {
                try {
                    await authService.removeEnvironment(environmentItem.envId);
                    environmentsProvider.refresh();
                    vscode.window.showInformationMessage(`Environment "${environmentItem.label}" removed successfully!`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to remove environment: ${error.message}`);
                }
            }
        } else {
            await removeEnvironment(authService);
        }
    });

    context.subscriptions.push(
        addEnvironmentCommand,
        testConnectionCommand,
        openEntityBrowserCommand,
        openQueryDataCommand,
        openSolutionExplorerCommand,
        refreshEnvironmentsCommand,
        openMakerCommand,
        openDynamicsCommand,
        editEnvironmentCommand,
        testEnvironmentConnectionCommand,
        removeEnvironmentFromContextCommand
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

async function removeEnvironment(authService: AuthenticationService) {
    const environments = await authService.getEnvironments();

    if (environments.length === 0) {
        vscode.window.showWarningMessage('No environments configured to remove.');
        return;
    }

    const selected = await vscode.window.showQuickPick(
        environments.map(env => ({
            label: env.name,
            description: env.settings.dataverseUrl,
            detail: `Auth: ${env.settings.authenticationMethod}`,
            env: env
        })),
        { placeHolder: 'Select environment to remove' }
    );

    if (!selected) return;

    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to remove "${selected.env.name}"?`,
        { modal: true },
        'Yes, Remove'
    );

    if (confirm === 'Yes, Remove') {
        try {
            await authService.removeEnvironment(selected.env.id);
            vscode.window.showInformationMessage(`✅ Environment "${selected.env.name}" removed successfully!`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Failed to remove environment: ${error.message}`);
        }
    }
}

export function deactivate() { }


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
                retainContextWhenHidden: true,
                enableFindWidget: true
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
                retainContextWhenHidden: true,
                enableFindWidget: true
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
                retainContextWhenHidden: true,
                enableFindWidget: true
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
                
                /* Sortable Table Styles */
                .table-container {
                    margin-top: 10px;
                }
                .table-controls {
                    margin-bottom: 15px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .filter-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 14px;
                }
                .filter-input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                }
                .clear-filter-btn {
                    padding: 8px 12px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 14px;
                }
                .clear-filter-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                .sortable {
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                }
                .sortable:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .sort-indicator {
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                    margin-left: 5px;
                }
                .sort-asc .sort-indicator::after {
                    content: ' ↑';
                    color: var(--vscode-charts-blue);
                }
                .sort-desc .sort-indicator::after {
                    content: ' ↓';
                    color: var(--vscode-charts-blue);
                }
                .filtered-row {
                    display: none;
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
                        <div class="table-container">
                            <div class="table-controls">
                                <input type="text" id="solutionFilter" placeholder="🔍 Filter solutions..." class="filter-input">
                                <button onclick="clearFilter()" class="clear-filter-btn">Clear</button>
                            </div>
                            <table class="solutions-table sortable-table">
                                <thead>
                                    <tr>
                                        <th onclick="sortTable(0)" class="sortable">
                                            Display Name <span class="sort-indicator">⇅</span>
                                        </th>
                                        <th onclick="sortTable(1)" class="sortable">
                                            Name <span class="sort-indicator">⇅</span>
                                        </th>
                                        <th onclick="sortTable(2)" class="sortable">
                                            Type <span class="sort-indicator">⇅</span>
                                        </th>
                                        <th onclick="sortTable(3)" class="sortable">
                                            Version <span class="sort-indicator">⇅</span>
                                        </th>
                                        <th onclick="sortTable(4)" class="sortable">
                                            Publisher <span class="sort-indicator">⇅</span>
                                        </th>
                                        <th onclick="sortTable(5)" class="sortable">
                                            Created <span class="sort-indicator">⇅</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="solutionsTableBody">
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
                    
                    tableHtml += '</tbody></table></div>';
                    content.innerHTML = tableHtml;
                    
                    // Store solutions data globally for sorting/filtering
                    window.solutionsData = solutions;
                    
                    // Set up filter functionality
                    setupTableFiltering();
                }
                
                function displayError(error) {
                    document.getElementById('content').innerHTML = 
                        \`<div class="error">Error loading solutions: \${error}</div>\`;
                    updateEnvironmentStatus('Error', false);
                }
                
                // Sortable Table Functions
                let currentSortColumn = -1;
                let currentSortDirection = 'asc';
                
                function sortTable(columnIndex) {
                    const table = document.querySelector('.solutions-table');
                    const tbody = document.getElementById('solutionsTableBody');
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    
                    // Clear previous sort indicators
                    table.querySelectorAll('th').forEach(th => {
                        th.classList.remove('sort-asc', 'sort-desc');
                    });
                    
                    // Determine sort direction
                    if (currentSortColumn === columnIndex) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortDirection = 'asc';
                    }
                    currentSortColumn = columnIndex;
                    
                    // Add sort indicator to current column
                    const currentTh = table.querySelectorAll('th')[columnIndex];
                    currentTh.classList.add('sort-' + currentSortDirection);
                    
                    // Sort rows
                    rows.sort((a, b) => {
                        let aVal = a.cells[columnIndex].textContent.trim();
                        let bVal = b.cells[columnIndex].textContent.trim();
                        
                        // Handle different data types
                        if (columnIndex === 3) { // Version column
                            aVal = aVal.split('.').map(n => parseInt(n) || 0);
                            bVal = bVal.split('.').map(n => parseInt(n) || 0);
                            for (let i = 0; i < Math.max(aVal.length, bVal.length); i++) {
                                const aNum = aVal[i] || 0;
                                const bNum = bVal[i] || 0;
                                if (aNum !== bNum) {
                                    return currentSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                                }
                            }
                            return 0;
                        } else if (columnIndex === 5) { // Date column
                            aVal = new Date(aVal);
                            bVal = new Date(bVal);
                            return currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                        } else { // String columns
                            aVal = aVal.toLowerCase();
                            bVal = bVal.toLowerCase();
                            if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
                            if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
                            return 0;
                        }
                    });
                    
                    // Re-append sorted rows
                    rows.forEach(row => tbody.appendChild(row));
                }
                
                function setupTableFiltering() {
                    const filterInput = document.getElementById('solutionFilter');
                    if (filterInput) {
                        filterInput.addEventListener('input', filterTable);
                    }
                }
                
                function filterTable() {
                    const filterValue = document.getElementById('solutionFilter').value.toLowerCase();
                    const tbody = document.getElementById('solutionsTableBody');
                    const rows = tbody.querySelectorAll('tr');
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        if (text.includes(filterValue)) {
                            row.style.display = '';
                            row.classList.remove('filtered-row');
                        } else {
                            row.style.display = 'none';
                            row.classList.add('filtered-row');
                        }
                    });
                }
                
                function clearFilter() {
                    document.getElementById('solutionFilter').value = '';
                    filterTable();
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
    private readonly _editingEnvironment: EnvironmentConnection | undefined;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService, editingEnvironment?: EnvironmentConnection) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (EnvironmentSetupPanel.currentPanel) {
            EnvironmentSetupPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentSetupPanel.viewType,
            editingEnvironment ? 'Edit Dynamics 365 Environment' : 'Add Dynamics 365 Environment',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src')
                ]
            }
        );

        EnvironmentSetupPanel.currentPanel = new EnvironmentSetupPanel(panel, extensionUri, authService, editingEnvironment);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService, editingEnvironment?: EnvironmentConnection) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this._editingEnvironment = editingEnvironment;

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
                id: this._editingEnvironment?.id || `env-${Date.now()}`, // Use existing ID or generate new one
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
                isActive: this._editingEnvironment?.isActive || false,
                lastUsed: this._editingEnvironment?.lastUsed || new Date(),
                environmentId: data.environmentId || undefined
            };

            await this._authService.saveEnvironmentSettings(environment);

            // Refresh the environments tree view
            vscode.commands.executeCommand('dynamics-devtools.refreshEnvironments');

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
        this._panel.title = this._editingEnvironment ? 'Edit Dynamics 365 Environment' : 'Add Dynamics 365 Environment';
        this._panel.webview.html = this._getHtmlForWebview(webview);

        // If editing, send the environment data to the webview after a short delay to ensure it's loaded
        if (this._editingEnvironment) {
            setTimeout(() => {
                this._panel.webview.postMessage({
                    action: 'populateForm',
                    environment: this._editingEnvironment
                });
            }, 100);
        }
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

class EnvironmentsProvider implements vscode.TreeDataProvider<EnvironmentItem | ToolItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _authService: AuthenticationService;

    constructor(authService: AuthenticationService) {
        this._authService = authService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EnvironmentItem | ToolItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: EnvironmentItem | ToolItem): Promise<(EnvironmentItem | ToolItem)[]> {
        console.log('EnvironmentsProvider.getChildren called', element ? 'with element' : 'without element');

        if (!element) {
            const items: (EnvironmentItem | ToolItem)[] = [];

            // Add configured environments
            try {
                console.log('Getting environments from authService...');
                const environments = await this._authService.getEnvironments();
                console.log('Environments retrieved:', environments.length, environments);

                if (environments.length === 0) {
                    console.log('No environments found, showing placeholder');
                    items.push(new ToolItem('No environments configured', 'Click + to add an environment', vscode.TreeItemCollapsibleState.None, ''));
                } else {
                    console.log('Processing environments...');
                    for (const env of environments) {
                        // Extract environment ID from URL (e.g., https://org123.crm.dynamics.com -> get org123 part)
                        let environmentId = 'default';
                        try {
                            const url = new URL(env.settings.dataverseUrl);
                            const hostname = url.hostname;
                            // Extract environment ID from hostname like org123.crm.dynamics.com
                            const parts = hostname.split('.');
                            if (parts.length > 0) {
                                environmentId = parts[0];
                            }
                        } catch (error) {
                            console.warn('Could not extract environment ID from URL:', env.settings.dataverseUrl);
                        }

                        const envItem = new EnvironmentItem(env.name, env.settings.dataverseUrl, env.id, environmentId);
                        envItem.contextValue = 'environment';
                        items.push(envItem);
                        console.log('Added environment item:', env.name);
                    }
                }
            } catch (error) {
                console.error('Error loading environments for tree view:', error);
            }

            console.log('Returning items:', items.length);
            return items;
        }
        return [];
    }
}

class ToolsProvider implements vscode.TreeDataProvider<ToolItem> {
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
                new ToolItem('📊 Entity Browser', 'Browse tables and data', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.entityBrowser'),
                new ToolItem('🔍 Query Data', 'Run custom queries', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.queryData'),
                new ToolItem('📦 Solution Explorer', 'Manage solutions', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.solutionExplorer')
            ]);
        }
        return Promise.resolve([]);
    }
}

class EnvironmentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly envId: string,
        public readonly environmentId?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = description;
        this.tooltip = `${label} - ${description}`;
        this.contextValue = 'environment';

        // Remove the automatic command - we want right-click context menu instead
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
