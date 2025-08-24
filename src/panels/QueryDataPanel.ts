import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { WebviewMessage, PanelConfig } from '../types';

export class QueryDataPanel extends BasePanel {
    public static readonly viewType = 'queryData';

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: QueryDataPanel.viewType,
            title: 'Query Data',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new QueryDataPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        super(panel, extensionUri, authService, {
            viewType: QueryDataPanel.viewType,
            title: 'Query Data'
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
