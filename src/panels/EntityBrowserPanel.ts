import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { WebviewMessage, PanelConfig } from '../types';

export class EntityBrowserPanel extends BasePanel {
    public static readonly viewType = 'entityBrowser';
    private _selectedEnvironmentId: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: EntityBrowserPanel.viewType,
            title: 'Entity Browser',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new EntityBrowserPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        super(panel, extensionUri, authService, {
            viewType: EntityBrowserPanel.viewType,
            title: 'Entity Browser'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.loadEnvironments();
                break;
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
            this.postMessage({
                action: 'environmentsLoaded',
                environments: environments
            });
        } catch (error) {
            console.error('Error loading environments:', error);
            this.postMessage({
                action: 'error',
                message: 'Failed to load environments'
            });
        }
    }

    protected getHtmlContent(): string {
        return `<!DOCTYPE html>
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
