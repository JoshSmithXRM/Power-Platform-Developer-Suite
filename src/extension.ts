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

    const openImportJobViewerCommand = vscode.commands.registerCommand('dynamics-devtools.importJobViewer', () => {
        ImportJobViewerPanel.createOrShow(context.extensionUri, authService);
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
        openImportJobViewerCommand,
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
                    case 'openSolutionInMaker':
                        await this.openSolutionInMaker(message.solutionId, message.solutionName);
                        break;
                    case 'openSolutionInClassic':
                        await this.openSolutionInClassic(message.solutionId, message.solutionName);
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
                
                /* Solution Actions */
                .solution-actions {
                    display: flex;
                    gap: 4px;
                    justify-content: center;
                }
                .action-btn {
                    background: none;
                    border: 1px solid var(--vscode-button-border);
                    padding: 4px 6px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    line-height: 1;
                    min-width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .maker-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .maker-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .classic-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                }
                .classic-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                
                /* Context Menu */
                .context-menu {
                    position: fixed;
                    background: var(--vscode-menu-background);
                    border: 1px solid var(--vscode-menu-border);
                    border-radius: 4px;
                    padding: 4px 0;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    z-index: 1000;
                    min-width: 180px;
                }
                .context-menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 13px;
                    color: var(--vscode-menu-foreground);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .context-menu-item:hover {
                    background: var(--vscode-menu-selectionBackground);
                    color: var(--vscode-menu-selectionForeground);
                }
                .context-menu-separator {
                    height: 1px;
                    background: var(--vscode-menu-separatorBackground);
                    margin: 4px 0;
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
                                        <th style="width: 120px;">Actions</th>
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
                            <tr data-solution-id="\${solution.solutionid}" oncontextmenu="showSolutionContextMenu(event, '\${solution.solutionid}', '\${solution.friendlyname || solution.uniquename}')">
                                <td>\${solution.friendlyname || solution.uniquename}</td>
                                <td>\${solution.uniquename}</td>
                                <td>\${managedBadge}</td>
                                <td>\${solution.version}</td>
                                <td>\${solution.publishername || 'Unknown'}</td>
                                <td>\${createdDate}</td>
                                <td>
                                    <div class="solution-actions">
                                        <button onclick="openSolutionInMaker('\${solution.solutionid}', '\${solution.friendlyname || solution.uniquename}')" 
                                                class="action-btn maker-btn" title="Open in Maker">
                                            🔧
                                        </button>
                                        <button onclick="openSolutionInClassic('\${solution.solutionid}', '\${solution.friendlyname || solution.uniquename}')" 
                                                class="action-btn classic-btn" title="Open in Classic">
                                            🏛️
                                        </button>
                                    </div>
                                </td>
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
                
                // Solution Actions
                function openSolutionInMaker(solutionId, solutionName) {
                    vscode.postMessage({ 
                        action: 'openSolutionInMaker', 
                        solutionId: solutionId,
                        solutionName: solutionName
                    });
                }
                
                function openSolutionInClassic(solutionId, solutionName) {
                    vscode.postMessage({ 
                        action: 'openSolutionInClassic', 
                        solutionId: solutionId,
                        solutionName: solutionName
                    });
                }
                
                // Context Menu Functions
                let currentContextMenu = null;
                
                function showSolutionContextMenu(event, solutionId, solutionName) {
                    event.preventDefault();
                    hideContextMenu(); // Hide any existing menu
                    
                    const menu = document.createElement('div');
                    menu.className = 'context-menu';
                    menu.innerHTML = \`
                        <div class="context-menu-item" onclick="openSolutionInMaker('\${solutionId}', '\${solutionName}'); hideContextMenu();">
                            🔧 Open in Maker
                        </div>
                        <div class="context-menu-item" onclick="openSolutionInClassic('\${solutionId}', '\${solutionName}'); hideContextMenu();">
                            🏛️ Open in Classic
                        </div>
                    \`;
                    
                    // Position the menu
                    menu.style.left = event.pageX + 'px';
                    menu.style.top = event.pageY + 'px';
                    
                    document.body.appendChild(menu);
                    currentContextMenu = menu;
                    
                    // Adjust position if menu goes off screen
                    const rect = menu.getBoundingClientRect();
                    if (rect.right > window.innerWidth) {
                        menu.style.left = (event.pageX - rect.width) + 'px';
                    }
                    if (rect.bottom > window.innerHeight) {
                        menu.style.top = (event.pageY - rect.height) + 'px';
                    }
                    
                    return false;
                }
                
                function hideContextMenu() {
                    if (currentContextMenu) {
                        currentContextMenu.remove();
                        currentContextMenu = null;
                    }
                }
                
                // Hide context menu when clicking elsewhere
                document.addEventListener('click', hideContextMenu);
                document.addEventListener('contextmenu', (e) => {
                    if (!e.target.closest('tr[data-solution-id]')) {
                        hideContextMenu();
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

    private async openSolutionInMaker(solutionId: string, solutionName: string) {
        try {
            // Get the current environment to extract the environment ID
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === this._selectedEnvironmentId);

            if (!currentEnv || !currentEnv.environmentId) {
                vscode.window.showErrorMessage(
                    'Environment ID is not configured for this environment. Please edit the environment and add the Environment ID.'
                );
                return;
            }

            // Build the Maker URL (ensure clean URL construction)
            const cleanEnvironmentId = currentEnv.environmentId.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
            const cleanSolutionId = solutionId.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
            const makerUrl = `https://make.powerapps.com/environments/${cleanEnvironmentId}/solutions/${cleanSolutionId}`;

            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(makerUrl));

            vscode.window.showInformationMessage(`Opening solution "${solutionName}" in Maker...`);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open solution in Maker: ${error.message}`);
        }
    }

    private async openSolutionInClassic(solutionId: string, solutionName: string) {
        try {
            // Get the current environment to extract the Dataverse URL
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === this._selectedEnvironmentId);

            if (!currentEnv) {
                vscode.window.showErrorMessage('Could not find current environment.');
                return;
            }

            // Format the solution ID for classic URL (needs to be URL encoded and wrapped in braces)
            const formattedSolutionId = encodeURIComponent(`{${solutionId.toUpperCase()}}`);

            // Build the Classic URL using the Dataverse URL (ensure no double slashes)
            const baseUrl = currentEnv.settings.dataverseUrl.endsWith('/')
                ? currentEnv.settings.dataverseUrl.slice(0, -1)
                : currentEnv.settings.dataverseUrl;
            const classicUrl = `${baseUrl}/tools/solution/edit.aspx?id=${formattedSolutionId}`;

            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(classicUrl));

            vscode.window.showInformationMessage(`Opening solution "${solutionName}" in Classic...`);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open solution in Classic: ${error.message}`);
        }
    }
}

class ImportJobViewerPanel {
    public static readonly viewType = 'importJobViewer';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _authService: AuthenticationService;
    private _disposables: vscode.Disposable[] = [];
    private _cachedEnvironments: EnvironmentConnection[] | undefined;
    private _selectedEnvironmentId: string | undefined;
    private _cachedImportJobs: any[] | null = null;
    private readonly _pageSize = 5000; // Large page size to get all records

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // Always create a new panel instead of reusing existing one
        const panel = vscode.window.createWebviewPanel(
            ImportJobViewerPanel.viewType,
            'Import Job Viewer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true
            }
        );

        new ImportJobViewerPanel(panel, extensionUri, authService);
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
                    case 'loadImportJobs':
                        // Clear cache if environment changed or force refresh requested
                        if (this._selectedEnvironmentId !== message.environmentId || message.forceRefresh) {
                            this._cachedImportJobs = null;
                        }
                        // Store the selected environment
                        this._selectedEnvironmentId = message.environmentId;
                        await this.loadImportJobs(message.environmentId, message.loadMore || false);
                        break;
                    case 'loadImportJobXml':
                        await this.loadImportJobXml(message.importJobId);
                        break;
                    case 'openImportJobXmlInEditor':
                        await this.openImportJobXmlInEditor(message.importJobId);
                        break;
                    case 'openSolutionHistory':
                        await this.openSolutionHistory(message.environmentId);
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
            <title>Import Job Viewer</title>
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
                .header-actions {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .solution-history-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .solution-history-btn:hover:not(:disabled) {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                .solution-history-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .filter-controls {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px 6px 0 0;
                }
                .filter-input {
                    width: 100%;
                    max-width: 300px;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: 13px;
                    font-family: var(--vscode-font-family);
                }
                .filter-input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }
                .filter-input::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                }
                /* Sortable Table Styles */
                .sortable {
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                }
                .sortable:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .sort-indicator {
                    margin-left: 8px;
                    opacity: 0.6;
                }
                .sort-asc .sort-indicator::after {
                    content: ' ▲';
                    color: var(--vscode-textLink-foreground);
                }
                .sort-desc .sort-indicator::after {
                    content: ' ▼';
                    color: var(--vscode-textLink-foreground);
                }
                .import-jobs-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .import-jobs-table th,
                .import-jobs-table td {
                    padding: 16px 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                }
                .import-jobs-table th {
                    background: var(--vscode-editorGroupHeader-tabsBackground);
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    position: sticky;
                    top: 0;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .import-jobs-table tr {
                    transition: background-color 0.2s ease;
                }
                .import-jobs-table tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .import-jobs-table tr:last-child td {
                    border-bottom: none;
                }
                .solution-name-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    cursor: pointer;
                    font-weight: 500;
                }
                .solution-name-link:hover {
                    text-decoration: underline;
                }
                .progress-text {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    font-weight: 500;
                }
                .context-info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                    font-weight: 500;
                }
                .status-success {
                    background: var(--vscode-testing-iconPassed);
                    color: white;
                }
                .status-failed {
                    background: var(--vscode-testing-iconFailed);
                    color: white;
                }
                .status-in-progress {
                    background: var(--vscode-charts-orange);
                    color: white;
                }
                .xml-content {
                    margin-top: 10px;
                    padding: 10px;
                    background: var(--vscode-textCodeBlock-background);
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    white-space: pre-wrap;
                    word-break: break-all;
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-editorWidget-border);
                }
                .no-jobs {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
                .time-info {
                    font-size: 0.9em;
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
                <h1 class="title">📥 Import Job Viewer</h1>
                <div class="header-actions">
                    <button class="solution-history-btn" onclick="openSolutionHistory()" id="solutionHistoryBtn" disabled>
                        🔗 View in Maker
                    </button>
                    <button class="refresh-btn" onclick="refreshImportJobs()">🔄 Refresh</button>
                </div>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load import jobs...</p>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                let isLoadingMore = false;
                
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
                        enableSolutionHistoryButton();
                        loadImportJobs();
                    } else if (environments.length > 0) {
                        select.value = environments[0].id;
                        currentEnvironmentId = environments[0].id;
                        updateEnvironmentStatus('Connected', true);
                        enableSolutionHistoryButton();
                        loadImportJobs();
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
                        enableSolutionHistoryButton();
                        loadImportJobs();
                    } else {
                        updateEnvironmentStatus('Disconnected', false);
                        disableSolutionHistoryButton();
                        document.getElementById('content').innerHTML = 
                            '<div class="loading"><p>Select an environment to load import jobs...</p></div>';
                    }
                }
                
                function openSolutionHistory() {
                    if (!currentEnvironmentId) {
                        return;
                    }
                    
                    // Get the environment to extract the environment ID
                    vscode.postMessage({
                        action: 'openSolutionHistory',
                        environmentId: currentEnvironmentId
                    });
                }
                
                function enableSolutionHistoryButton() {
                    const button = document.getElementById('solutionHistoryBtn');
                    if (button) {
                        button.disabled = false;
                    }
                }
                
                function disableSolutionHistoryButton() {
                    const button = document.getElementById('solutionHistoryBtn');
                    if (button) {
                        button.disabled = true;
                    }
                }
                
                function loadImportJobs(loadMore = false) {
                    if (!currentEnvironmentId) {
                        document.getElementById('content').innerHTML = 
                            '<div class="error">Please select an environment first.</div>';
                        return;
                    }
                    
                    if (!loadMore) {
                        document.getElementById('content').innerHTML = '<div class="loading"><p>Loading import jobs...</p></div>';
                    }
                    
                    isLoadingMore = loadMore;
                    vscode.postMessage({ 
                        action: 'loadImportJobs', 
                        environmentId: currentEnvironmentId,
                        loadMore: loadMore
                    });
                }
                
                function refreshImportJobs() {
                    if (!currentEnvironmentId) {
                        document.getElementById('content').innerHTML = 
                            '<div class="error">Please select an environment first.</div>';
                        return;
                    }
                    
                    document.getElementById('content').innerHTML = '<div class="loading"><p>Loading import jobs...</p></div>';
                    vscode.postMessage({ 
                        action: 'loadImportJobs', 
                        environmentId: currentEnvironmentId,
                        forceRefresh: true
                    });
                }
                
                let allImportJobs = []; // Store all loaded jobs for filtering/sorting
                let currentSortColumn = 2; // Default to Started column (createdon)
                let currentSortDirection = 'desc'; // Default to descending
                
                function setupFilterAndSort() {
                    const filterInput = document.getElementById('solutionFilter');
                    
                    if (filterInput) {
                        filterInput.addEventListener('input', applyFilter);
                    }
                }
                
                function applyFilter() {
                    const filterInput = document.getElementById('solutionFilter');
                    if (!filterInput) return;
                    
                    const filterValue = filterInput.value.toLowerCase().trim();
                    const tbody = document.getElementById('importJobsTableBody');
                    if (!tbody) return;
                    
                    const rows = tbody.querySelectorAll('tr');
                    console.log('Applying filter:', filterValue, 'to', rows.length, 'rows');
                    
                    let visibleCount = 0;
                    rows.forEach((row, index) => {
                        const solutionNameCell = row.cells[0];
                        if (solutionNameCell) {
                            const solutionName = solutionNameCell.textContent.toLowerCase();
                            const isVisible = !filterValue || solutionName.includes(filterValue);
                            row.style.display = isVisible ? '' : 'none';
                            if (isVisible) visibleCount++;
                        }
                    });
                    
                    console.log('Filter applied:', visibleCount, 'of', rows.length, 'rows visible');
                }
                
                function sortImportJobTable(columnIndex) {
                    const table = document.querySelector('.import-jobs-table');
                    const tbody = document.getElementById('importJobsTableBody');
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
                        if (columnIndex === 1) { // Progress column - extract percentage
                            aVal = parseInt(aVal.replace('%', '')) || 0;
                            bVal = parseInt(bVal.replace('%', '')) || 0;
                        } else if (columnIndex === 2 || columnIndex === 3) { // Date columns
                            aVal = new Date(aVal).getTime() || 0;
                            bVal = new Date(bVal).getTime() || 0;
                        } else {
                            aVal = aVal.toLowerCase();
                            bVal = bVal.toLowerCase();
                        }
                        
                        if (currentSortDirection === 'asc') {
                            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                        } else {
                            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                        }
                    });
                    
                    // Clear and rebuild tbody
                    tbody.innerHTML = '';
                    rows.forEach(row => tbody.appendChild(row));
                    
                    // Reapply filter if active
                    const filterInput = document.getElementById('solutionFilter');
                    if (filterInput && filterInput.value) {
                        applyFilter();
                    }
                }
                
                function expandXml(importJobId, button) {
                    // Update button state if button exists (for backward compatibility)
                    if (button) {
                        button.textContent = 'Loading...';
                        button.disabled = true;
                    }
                    
                    vscode.postMessage({
                        action: 'openImportJobXmlInEditor',
                        importJobId: importJobId
                    });
                    
                    // Reset button state if button exists
                    if (button) {
                        setTimeout(() => {
                            button.textContent = '📄 Details';
                            button.disabled = false;
                        }, 1000);
                    }
                }
                
                function showJobDetails(importJobId, solutionName) {
                    // Show XML details when solution name is clicked
                    expandXml(importJobId, null);
                }
                
                // Helper function to parse XML status from the first line
                function parseXmlStatus(xmlData) {
                    if (!xmlData) return null;
                    
                    // Extract just the first line or first tag
                    const firstLineMatch = xmlData.match(/<importexportxml[^>]*>/i);
                    if (!firstLineMatch) return null;
                    
                    const firstLine = firstLineMatch[0];
                    
                    // Extract processed and succeeded attributes from the opening tag
                    const processedMatch = firstLine.match(/processed="([^"]+)"/i);
                    const succeededMatch = firstLine.match(/succeeded="([^"]+)"/i);
                    
                    let processed = processedMatch ? processedMatch[1] : null;
                    let succeeded = succeededMatch ? succeededMatch[1] : null;
                    
                    // If processed="true" but no succeeded attribute, check for result tags
                    if (processed === 'true' && !succeeded) {
                        // Look for <result result="failure"> or <result result="success"> tags
                        const resultFailureMatch = xmlData.match(/<result[^>]*result="failure"/i);
                        const resultSuccessMatch = xmlData.match(/<result[^>]*result="success"/i);
                        
                        if (resultFailureMatch) {
                            succeeded = 'failure';
                        } else if (resultSuccessMatch) {
                            succeeded = 'success';
                        }
                    }
                    
                    const result = {
                        processed: processed,
                        succeeded: succeeded
                    };
                    
                    // Debug logging for the first few jobs
                    if (Math.random() < 0.1) { // Log ~10% of jobs to avoid spam
                        console.log('XML Status Parse:', {
                            firstLine: firstLine.substring(0, 200) + '...',
                            hasResultTag: xmlData.includes('<result'),
                            parsed: result
                        });
                    }
                    
                    return result;
                }

                function displayImportJobs(importJobs, isAppending = false, hasMoreData = false) {
                    const content = document.getElementById('content');
                    
                    console.log('displayImportJobs called:', {
                        isAppending,
                        hasMoreData,
                        newJobsCount: importJobs ? importJobs.length : 0,
                        currentRowCount: document.querySelectorAll('#importJobsTableBody tr').length
                    });
                    
                    if (!importJobs || importJobs.length === 0) {
                        if (!isAppending) {
                            content.innerHTML = '<div class="no-jobs"><p>No import jobs found in this environment.</p></div>';
                        }
                        return;
                    }
                    
                    let tableHtml = '';
                    
                    if (!isAppending) {
                        tableHtml = \`
                            <div class="table-container">
                                <div class="filter-controls">
                                    <input type="text" id="solutionFilter" placeholder="🔍 Filter by solution name..." class="filter-input" />
                                </div>
                                <table class="import-jobs-table sortable-table">
                                    <thead>
                                        <tr>
                                            <th onclick="sortImportJobTable(0)" class="sortable">
                                                Solution Name <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(1)" class="sortable">
                                                Progress <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(2)" class="sortable">
                                                Started <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(3)" class="sortable">
                                                Completed <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(4)" class="sortable">
                                                Status <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(5)" class="sortable">
                                                Import Context <span class="sort-indicator">⇅</span>
                                            </th>
                                            <th onclick="sortImportJobTable(6)" class="sortable">
                                                Operation Context <span class="sort-indicator">⇅</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody id="importJobsTableBody">
                        \`;
                    }
                    
                    importJobs.forEach(job => {
                        const startedOn = new Date(job.startedon).toLocaleString();
                        const completedOn = job.completedon ? new Date(job.completedon).toLocaleString() : '';
                        
                        let statusBadge;
                        // Use simple logic first, XML check only for unknowns
                        if (job.progress === 100 && job.completedon) {
                            statusBadge = '<span class="status-badge status-success">Complete</span>';
                        } else if (job.progress === 0) {
                            // No progress = failed
                            statusBadge = '<span class="status-badge status-failed">Failed</span>';
                        } else if (job.progress > 0 && job.progress < 100 && !job.completedon) {
                            // Default to in progress
                            statusBadge = '<span class="status-badge status-in-progress">In Progress</span>';
                        } else {
                            // Unknown case - check XML to determine if failed or in progress
                            const xmlStatus = parseXmlStatus(job.data);
                            if (xmlStatus && xmlStatus.processed === 'true' && xmlStatus.succeeded === 'failure') {
                                statusBadge = '<span class="status-badge status-failed">Failed</span>';
                            } else {
                                // If not definitively failed, assume in progress
                                statusBadge = '<span class="status-badge status-in-progress">In Progress</span>';
                            }
                        }
                        
                        tableHtml += \`
                            <tr>
                                <td>
                                    <a class="solution-name-link" onclick="showJobDetails('\${job.importjobid}', '\${job.solutionname || 'Unknown'}')">
                                        \${job.solutionname || 'Unknown'}
                                    </a>
                                </td>
                                <td>
                                    <span class="progress-text">\${job.progress || 0}%</span>
                                </td>
                                <td><div class="time-info">\${startedOn}</div></td>
                                <td><div class="time-info">\${completedOn}</div></td>
                                <td>\${statusBadge}</td>
                                <td><div class="context-info">\${job.importcontext || 'N/A'}</div></td>
                                <td><div class="context-info">\${job.operationcontext || 'N/A'}</div></td>
                            </tr>
                        \`;
                    });
                    
                    if (!isAppending) {
                        tableHtml += '</tbody></table></div>';
                        content.innerHTML = tableHtml;
                        
                        // Setup filter and sort functionality
                        setupFilterAndSort();
                        
                        // Apply default sort (Started column, descending)
                        setTimeout(() => sortImportJobTable(2), 100);
                    } else {
                        // Append to existing table
                        const tbody = document.getElementById('importJobsTableBody');
                        if (tbody) {
                            // Create table rows for each job with proper formatting
                            importJobs.forEach(job => {
                                const startedOn = job.startedon ? new Date(job.startedon).toLocaleString() : 'N/A';
                                const completedOn = job.completedon ? new Date(job.completedon).toLocaleString() : 'In Progress';
                                
                                let statusBadge;
                                // Use simple logic first, XML check only for unknowns
                                if (job.progress === 100 && job.completedon) {
                                    statusBadge = '<span class="status-badge complete">Complete</span>';
                                } else if (job.progress === 0) {
                                    // No progress = failed
                                    statusBadge = '<span class="status-badge failed">Failed</span>';
                                } else if (job.progress > 0 && job.progress < 100 && !job.completedon) {
                                    // Default to in progress
                                    statusBadge = '<span class="status-badge in-progress">In Progress</span>';
                                } else {
                                    // Unknown case - check XML to determine if failed or in progress
                                    const xmlStatus = parseXmlStatus(job.data);
                                    if (xmlStatus && xmlStatus.processed === 'true' && xmlStatus.succeeded === 'failure') {
                                        statusBadge = '<span class="status-badge failed">Failed</span>';
                                    } else {
                                        // If not definitively failed, assume in progress
                                        statusBadge = '<span class="status-badge in-progress">In Progress</span>';
                                    }
                                }
                                
                                const row = tbody.insertRow();
                                row.innerHTML = \`
                                    <td>
                                        <a class="solution-name-link" onclick="showJobDetails('\${job.importjobid}', '\${job.solutionname || 'Unknown'}')">
                                            \${job.solutionname || 'Unknown'}
                                        </a>
                                    </td>
                                    <td>
                                        <span class="progress-text">\${job.progress || 0}%</span>
                                    </td>
                                    <td><div class="time-info">\${startedOn}</div></td>
                                    <td><div class="time-info">\${completedOn}</div></td>
                                    <td>\${statusBadge}</td>
                                    <td><div class="context-info">\${job.importcontext || 'N/A'}</div></td>
                                    <td><div class="context-info">\${job.operationcontext || 'N/A'}</div></td>
                                \`;
                            });
                        }
                        
                        // Since we load all data at once, no need for Load More button logic
                        // Just reapply filters and sorting if needed
                        
                        // Reapply current filter after adding new rows (if needed)
                        const filterInput = document.getElementById('solutionFilter');
                        if (filterInput && filterInput.value.trim()) {
                            console.log('Reapplying filter after data load:', filterInput.value);
                            setTimeout(() => {
                                applyFilter();
                                console.log('Filter reapplied after data load');
                            }, 100);
                        }
                        
                        // Reapply current sort after adding new rows  
                        console.log('Reapplying sort after data load. Current sort:', currentSortColumn, currentSortDirection);
                        setTimeout(() => {
                            if (currentSortColumn !== -1) {
                                console.log('Reapplying sort to column', currentSortColumn);
                                sortImportJobTable(currentSortColumn);
                            }
                        }, 150);
                    }
                }
                
                function displayError(error) {
                    document.getElementById('content').innerHTML = 
                        \`<div class="error">Error loading import jobs: \${error}</div>\`;
                    updateEnvironmentStatus('Error', false);
                }
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.action) {
                        case 'environmentsLoaded':
                            populateEnvironments(message.data, message.selectedEnvironmentId);
                            break;
                        case 'importJobsLoaded':
                            displayImportJobs(message.data, isLoadingMore, message.hasMoreData);
                            break;
                        case 'importJobsError':
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
                action: 'importJobsError',
                error: `Failed to load environments: ${error.message}`
            });
        }
    }

    private async loadImportJobs(environmentId?: string, loadMore: boolean = false) {
        try {
            // If loadMore is true, but we already have all data, just return - no pagination needed
            if (loadMore) {
                console.log('Load more requested, but no pagination - ignoring');
                return;
            }

            // Get available environments
            const environments = await this._authService.getEnvironments();

            if (environments.length === 0) {
                this._panel.webview.postMessage({
                    action: 'importJobsError',
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
                        action: 'importJobsError',
                        error: 'Selected environment not found.'
                    });
                    return;
                }
            }

            // Get access token for the environment
            const token = await this._authService.getAccessToken(environment.id);

            // Load all import jobs at once (no pagination since $skip is not supported)
            const importJobsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/importjobs?$orderby=createdon desc&$top=${this._pageSize}&$count=true&$select=importjobid,solutionname,progress,startedon,completedon,modifiedon,data,importcontext,operationcontext`;
            console.log('Loading all import jobs from:', importJobsUrl);

            const response = await fetch(importJobsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (!response.ok) {
                // Log more details for debugging
                const errorText = await response.text();
                console.error('Import Jobs API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: importJobsUrl,
                    response: errorText
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;
            const importJobs = data.value;

            console.log('API Response:', {
                importJobsCount: importJobs.length,
                totalCount: data['@odata.count'],
                allDataLoaded: true,
                sampleJobFields: importJobs.length > 0 ? Object.keys(importJobs[0]) : [],
                sampleJob: importJobs.length > 0 ? {
                    progress: importJobs[0].progress,
                    completedon: importJobs[0].completedon,
                    solutionname: importJobs[0].solutionname,
                    importcontext: importJobs[0].importcontext,
                    operationcontext: importJobs[0].operationcontext
                } : null
            });

            // Cache all import jobs
            this._cachedImportJobs = importJobs;

            this._panel.webview.postMessage({
                action: 'importJobsLoaded',
                data: importJobs,
                hasMoreData: false // No more data since we loaded everything
            });

        } catch (error: any) {
            console.error('Error loading import jobs:', error);
            this._panel.webview.postMessage({
                action: 'importJobsError',
                error: error.message
            });
        }
    }

    private async loadImportJobXml(importJobId: string) {
        try {
            // Get the current environment
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === this._selectedEnvironmentId);

            if (!currentEnv) {
                this._panel.webview.postMessage({
                    action: 'importJobsError',
                    error: 'Could not find current environment.'
                });
                return;
            }

            // Get access token for the environment
            const token = await this._authService.getAccessToken(currentEnv.id);

            // Fetch the specific import job with XML data
            const importJobUrl = `${currentEnv.settings.dataverseUrl}/api/data/v9.2/importjobs(${importJobId})?$select=data`;

            const response = await fetch(importJobUrl, {
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

            this._panel.webview.postMessage({
                action: 'xmlLoaded',
                importJobId: importJobId,
                xmlData: data.data || 'No XML data available'
            });

        } catch (error: any) {
            console.error('Error loading import job XML:', error);
            this._panel.webview.postMessage({
                action: 'importJobsError',
                error: `Failed to load XML: ${error.message}`
            });
        }
    }

    private async openImportJobXmlInEditor(importJobId: string) {
        try {
            // Get the current environment
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === this._selectedEnvironmentId);

            if (!currentEnv) {
                vscode.window.showErrorMessage('Could not find current environment.');
                return;
            }

            // Get access token for the environment
            const token = await this._authService.getAccessToken(currentEnv.id);

            // Fetch the specific import job with XML data
            const importJobUrl = `${currentEnv.settings.dataverseUrl}/api/data/v9.2/importjobs(${importJobId})?$select=data`;

            const response = await fetch(importJobUrl, {
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
            const xmlData = data.data || 'No XML data available';

            // Create a new untitled document with XML content
            const document = await vscode.workspace.openTextDocument({
                content: this.formatXml(xmlData),
                language: 'xml'
            });

            // Show the document in the editor
            await vscode.window.showTextDocument(document);

        } catch (error: any) {
            console.error('Error opening import job XML in editor:', error);
            vscode.window.showErrorMessage(`Failed to open XML in editor: ${error.message}`);
        }
    }

    private formatXml(xml: string): string {
        try {
            // Simple XML formatting - add indentation
            let formatted = xml;
            let indent = 0;
            const tab = '  ';

            formatted = formatted.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
            const lines = formatted.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.length === 0) continue;

                if (line.match(/.+<\/\w[^>]*>$/)) {
                    // Self-closing or same-line tag
                    lines[i] = tab.repeat(indent) + line;
                } else if (line.match(/^<\/\w/)) {
                    // Closing tag
                    if (indent > 0) indent--;
                    lines[i] = tab.repeat(indent) + line;
                } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
                    // Opening tag
                    lines[i] = tab.repeat(indent) + line;
                    indent++;
                } else {
                    // Content or self-closing
                    lines[i] = tab.repeat(indent) + line;
                }
            }

            return lines.join('\n');
        } catch (error) {
            // If formatting fails, return original
            return xml;
        }
    }

    private async openSolutionHistory(environmentId: string) {
        try {
            // Get the environment to extract the environment ID for Maker
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment || !environment.environmentId) {
                vscode.window.showErrorMessage(
                    'Environment ID is not configured for this environment. Please edit the environment and add the Environment ID to view Solution History.'
                );
                return;
            }

            // Build the Solution History URL
            const historyUrl = `https://make.powerapps.com/environments/${environment.environmentId}/solutionsHistory`;

            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(historyUrl));

            vscode.window.showInformationMessage(`Opening Solution History in Maker...`);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open Solution History: ${error.message}`);
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
                new ToolItem('📦 Solution Explorer', 'Manage solutions', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.solutionExplorer'),
                new ToolItem('📥 Import Job Viewer', 'View solution import history', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.importJobViewer')
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
