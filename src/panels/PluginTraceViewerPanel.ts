import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

export class PluginTraceViewerPanel extends BasePanel {
    public static readonly viewType = 'pluginTraceViewer';

    private _selectedEnvironmentId: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(PluginTraceViewerPanel.viewType);
        if (existing) return;
        PluginTraceViewerPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: PluginTraceViewerPanel.viewType,
            title: 'Plugin Trace Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new PluginTraceViewerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: PluginTraceViewerPanel.viewType,
            title: 'Plugin Trace Viewer'
        });

        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadPluginTraces':
                await this.handleLoadPluginTraces(message.environmentId);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            const cachedState = await this._stateService.getPanelState(PluginTraceViewerPanel.viewType);
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

    private async handleLoadPluginTraces(environmentId: string): Promise<void> {
        console.log('handleLoadPluginTraces called with environmentId:', environmentId);

        if (!environmentId) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        this._selectedEnvironmentId = environmentId;
        console.log('Selected environment ID set to:', this._selectedEnvironmentId);

        this._panel.webview.postMessage({
            action: 'pluginTracesLoaded',
            data: []
        });
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'EnvironmentSelectorUtils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Plugin Trace Viewer</title>
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
                <h1 class="title">Plugin Trace Viewer</h1>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to view plugin traces...</p>
                </div>
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to view plugin traces...'
                });
                
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                });
                
                panelUtils.loadEnvironments();
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        loadPluginTracesForEnvironment(environmentId);
                    } else {
                        panelUtils.clearContent('Select an environment to view plugin traces...');
                    }
                }
                
                function loadPluginTracesForEnvironment(environmentId) {
                    if (environmentId) {
                        panelUtils.showLoading('Loading plugin traces...');
                        PanelUtils.sendMessage('loadPluginTraces', { 
                            environmentId: environmentId 
                        });
                    }
                }
                
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            loadPluginTracesForEnvironment(message.selectedEnvironmentId);
                        }
                    },
                    
                    'pluginTracesLoaded': (message) => {
                        const content = document.getElementById('content');
                        content.innerHTML = '<div class="loading"><p>🚧 Plugin Trace Viewer functionality coming soon! Environment connected successfully.</p></div>';
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
