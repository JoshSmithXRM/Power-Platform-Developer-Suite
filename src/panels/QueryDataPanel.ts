import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

export class QueryDataPanel extends BasePanel {
    public static readonly viewType = 'queryData';

    private _selectedEnvironmentId: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(QueryDataPanel.viewType);
        if (existing) return;
        QueryDataPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: QueryDataPanel.viewType,
            title: 'Query Data',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new QueryDataPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: QueryDataPanel.viewType,
            title: 'Query Data'
        });

        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'queryData':
                await this.handleQueryData(message.environmentId);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            // Get previously selected environment from state
            const cachedState = await this._stateService.getPanelState(QueryDataPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load environments';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleQueryData(environmentId: string): Promise<void> {
        console.log('handleQueryData called with environmentId:', environmentId);

        if (!environmentId) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        // Update the selected environment
        this._selectedEnvironmentId = environmentId;
        console.log('Selected environment ID set to:', this._selectedEnvironmentId);

        // For now, just show a placeholder message
        this._panel.webview.postMessage({
            action: 'dataQueried',
            data: []
        });
    }

    protected getHtmlContent(): string {
        // Get common webview resources
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Query Data</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
        </head>
        <body>
            <!-- Environment Selector -->
            <div class="environment-selector">
                <span class="environment-label">Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>
            
            <div class="header">
                <h1 class="title">Query Data</h1>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to query data...</p>
                </div>
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                
                // Initialize panel with PanelUtils
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to query data...'
                });
                
                // Load environments on startup
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                });
                
                // Fallback for environments loading
                panelUtils.loadEnvironments();
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        queryDataForEnvironment(environmentId);
                    } else {
                        panelUtils.clearContent('Select an environment to query data...');
                    }
                }
                
                function queryDataForEnvironment(environmentId) {
                    if (environmentId) {
                        panelUtils.showLoading('Connecting to environment...');
                        PanelUtils.sendMessage('queryData', { 
                            environmentId: environmentId 
                        });
                    }
                }
                
                // Setup message handlers using shared pattern
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            queryDataForEnvironment(message.selectedEnvironmentId);
                        }
                    },
                    
                    'dataQueried': (message) => {
                        const content = document.getElementById('content');
                        content.innerHTML = '<div class="loading"><p>🚧 Data query functionality coming soon! Environment connected successfully.</p></div>';
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
