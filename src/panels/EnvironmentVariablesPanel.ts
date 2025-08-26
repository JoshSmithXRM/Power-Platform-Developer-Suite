import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';

export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';

    private _selectedEnvironmentId: string | undefined;
    private _environmentVariablesService: any;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(EnvironmentVariablesPanel.viewType);
        if (existing) return;
        EnvironmentVariablesPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables Manager',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new EnvironmentVariablesPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables Manager'
        });

        this._environmentVariablesService = ServiceFactory.getEnvironmentVariablesService();
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadEnvironmentVariables':
                await this.handleLoadEnvironmentVariables(message.environmentId);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            const cachedState = await this._stateService.getPanelState(EnvironmentVariablesPanel.viewType);
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

    private async handleLoadEnvironmentVariables(environmentId: string): Promise<void> {
        console.log('handleLoadEnvironmentVariables called with environmentId:', environmentId);

        if (!environmentId) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this._selectedEnvironmentId = environmentId;
            console.log('Selected environment ID set to:', this._selectedEnvironmentId);

            // Save state
            await this._stateService.savePanelState(EnvironmentVariablesPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

            // Fetch environment variables data
            const environmentVariablesData = await this._environmentVariablesService.getEnvironmentVariables(environmentId);

            this._panel.webview.postMessage({
                action: 'environmentVariablesLoaded',
                data: environmentVariablesData
            });
        } catch (error: any) {
            console.error('Error loading environment variables:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: `Failed to load environment variables: ${error.message}`
            });
        }
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Environment Variables Manager</title>
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
                <h1 class="title">Environment Variables Manager</h1>
                <button class="btn" onclick="refreshEnvironmentVariables()">Refresh</button>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to manage environment variables...</p>
                </div>
            </div>

            <!-- Hidden template for environment variables table -->
            <script type="text/template" id="environmentVariablesTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'environmentVariablesTable',
                    columns: [
                        { key: 'displayname', label: 'Display Name', sortable: true },
                        { key: 'schemaname', label: 'Name', sortable: true },
                        { key: 'typeDisplay', label: 'Type', sortable: true },
                        { key: 'defaultValue', label: 'Default Value', sortable: false },
                        { key: 'currentValue', label: 'Current Value', sortable: false },
                        { key: 'ismanaged', label: 'Managed', sortable: true },
                        { key: 'modifiedon', label: 'Modified On', sortable: true },
                        { key: 'modifiedby', label: 'Modified By', sortable: true }
                    ],
                    defaultSort: { column: 'displayname', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true
                })}
            </script>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to manage environment variables...'
                });
                
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                });
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        loadEnvironmentVariablesForEnvironment(environmentId);
                    } else {
                        panelUtils.clearContent('Select an environment to manage environment variables...');
                    }
                }
                
                function loadEnvironmentVariablesForEnvironment(environmentId) {
                    if (environmentId) {
                        panelUtils.showLoading('Loading environment variables...');
                        PanelUtils.sendMessage('loadEnvironmentVariables', { 
                            environmentId: environmentId 
                        });
                    }
                }

                function refreshEnvironmentVariables() {
                    if (currentEnvironmentId) {
                        loadEnvironmentVariablesForEnvironment(currentEnvironmentId);
                    }
                }

                // Setup message handlers
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            loadEnvironmentVariablesForEnvironment(message.selectedEnvironmentId);
                        }
                    },

                    'environmentVariablesLoaded': (message) => {
                        populateEnvironmentVariables(message.data);
                    }
                });

                function populateEnvironmentVariables(data) {
                    const definitions = data.definitions || [];
                    const values = data.values || [];

                    // Create a map of environment variable values by definition ID
                    const valuesMap = new Map();
                    values.forEach(value => {
                        valuesMap.set(value.environmentvariabledefinitionid, value);
                    });

                    // Transform definitions to include values and formatting
                    const tableData = definitions.map(def => {
                        const value = valuesMap.get(def.environmentvariabledefinitionid);
                        return {
                            id: def.environmentvariabledefinitionid,
                            displayname: def.displayname || '',
                            schemaname: def.schemaname || '',
                            typeDisplay: getTypeDisplayName(def.type),
                            defaultValue: def.defaultvalue || '<em>No default</em>',
                            currentValue: value ? value.value : '<em>No value set</em>',
                            ismanaged: def.ismanaged ? 'Yes' : 'No',
                            modifiedon: formatDate(value ? value.modifiedon : def.modifiedon),
                            modifiedby: value ? value.modifiedby : def.modifiedby || ''
                        };
                    });

                    // Use ComponentFactory template and TableUtils for display
                    const content = document.getElementById('content');
                    const template = document.getElementById('environmentVariablesTableTemplate');
                    content.innerHTML = template.innerHTML;

                    // Initialize table
                    TableUtils.initializeTable('environmentVariablesTable', {
                        onRowClick: handleRowClick,
                        onRowAction: handleRowAction
                    });

                    // Load data and apply default sorting
                    TableUtils.loadTableData('environmentVariablesTable', tableData);
                    TableUtils.sortTable('environmentVariablesTable', 'displayname', 'asc');
                }

                function getTypeDisplayName(type) {
                    switch (type) {
                        case 100000000: return 'String';
                        case 100000001: return 'Number';
                        case 100000002: return 'Boolean';
                        case 100000003: return 'JSON';
                        case 100000004: return 'Data Source';
                        default: return 'Unknown';
                    }
                }

                function formatDate(dateString) {
                    if (!dateString) return '';
                    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
                }

                function handleRowClick(rowData, rowElement) {
                    console.log('Environment variable clicked:', rowData);
                }

                function handleRowAction(actionId, rowData) {
                    console.log('Environment variable action:', actionId, rowData);
                }
            </script>
        </body>
        </html>`;
    }
}
