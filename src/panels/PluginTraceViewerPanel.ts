import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';
import { PluginTraceService, PluginTraceLevel, PluginTraceFilterOptions } from '../services/PluginTraceService';

export class PluginTraceViewerPanel extends BasePanel {
    public static readonly viewType = 'pluginTraceViewer';

    private _selectedEnvironmentId: string | undefined;
    private _pluginTraceService: PluginTraceService;

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

        this._pluginTraceService = ServiceFactory.getPluginTraceService();
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.action) {
                case 'loadEnvironments':
                    await this.handleLoadEnvironments();
                    break;

                case 'loadPluginTraces':
                    await this.handleLoadPluginTraces(message.environmentId, message.filterOptions);
                    break;

                case 'getPluginTraceLevel':
                    await this.handleGetPluginTraceLevel(message.environmentId);
                    break;

                case 'setPluginTraceLevel':
                    await this.handleSetPluginTraceLevel(message.environmentId, message.traceLevel);
                    break;

                case 'refreshTraces':
                    await this.handleRefreshTraces(message.environmentId, message.filterOptions);
                    break;

                case 'openTraceInDynamics':
                    await this.handleOpenTraceInDynamics(message.environmentId, message.traceId);
                    break;

                default:
                    console.log('Unknown action:', message.action);
            }
        } catch (error: any) {
            console.error(`Error handling message ${message.action}:`, error);
            this.postMessage({
                action: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            const cachedState = await this._stateService.getPanelState(PluginTraceViewerPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            this.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });

            // Auto-load trace level for selected environment
            if (selectedEnvironmentId) {
                await this.handleGetPluginTraceLevel(selectedEnvironmentId);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load environments';
            this.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadPluginTraces(environmentId: string, filterOptions?: PluginTraceFilterOptions): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this._selectedEnvironmentId = environmentId;
            
            // Save environment selection
            await this.updateState({ selectedEnvironmentId: environmentId });

            const traceLogs = await this._pluginTraceService.getPluginTraceLogs(environmentId, filterOptions);

            this.postMessage({
                action: 'pluginTracesLoaded',
                data: traceLogs
            });
        } catch (error: any) {
            console.error('Error loading plugin traces:', error);
            this.postMessage({
                action: 'error',
                message: `Failed to load plugin traces: ${error.message}`
            });
        }
    }

    private async handleGetPluginTraceLevel(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            const traceLevel = await this._pluginTraceService.getPluginTraceLevel(environmentId);
            
            this.postMessage({
                action: 'traceLevelLoaded',
                data: {
                    level: traceLevel,
                    displayName: this._pluginTraceService.getTraceLevelDisplayName(traceLevel)
                }
            });
        } catch (error: any) {
            console.error('Error getting plugin trace level:', error);
            this.postMessage({
                action: 'error',
                message: `Failed to get plugin trace level: ${error.message}`
            });
        }
    }

    private async handleSetPluginTraceLevel(environmentId: string, traceLevel: PluginTraceLevel): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            await this._pluginTraceService.setPluginTraceLevel(environmentId, traceLevel);
            
            this.postMessage({
                action: 'traceLevelSet',
                data: {
                    level: traceLevel,
                    displayName: this._pluginTraceService.getTraceLevelDisplayName(traceLevel),
                    message: `Plugin trace level set to ${this._pluginTraceService.getTraceLevelDisplayName(traceLevel)}`
                }
            });
        } catch (error: any) {
            console.error('Error setting plugin trace level:', error);
            this.postMessage({
                action: 'error',
                message: `Failed to set plugin trace level: ${error.message}`
            });
        }
    }

    private async handleRefreshTraces(environmentId: string, filterOptions?: PluginTraceFilterOptions): Promise<void> {
        await this.handleLoadPluginTraces(environmentId, filterOptions);
    }

    private async handleOpenTraceInDynamics(environmentId: string, traceId: string): Promise<void> {
        if (!environmentId || !traceId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID and Trace ID are required'
            });
            return;
        }

        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                throw new Error('Environment not found');
            }

            // Extract the base URL from the dataverseUrl (remove /api/data/v9.2 part)
            const baseUrl = environment.settings.dataverseUrl.replace('/api/data/v9.2', '').replace(/\/$/, '');
            const dynamicsUrl = `${baseUrl}/main.aspx?pagetype=entityrecord&etn=plugintracelog&id=${traceId}`;

            await vscode.env.openExternal(vscode.Uri.parse(dynamicsUrl));

        } catch (error: any) {
            console.error('Error opening trace in Dynamics:', error);
            this.postMessage({
                action: 'error',
                message: `Failed to open trace in Dynamics: ${error.message}`
            });
        }
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js')
        );

        const modalUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'modal-utils.js')
        );

        const modalStylesSheet = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'modal-styles.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Plugin Trace Viewer</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <link rel="stylesheet" href="${modalStylesSheet}">
            <style>
                .controls-section {
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .control-group label {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    min-width: fit-content;
                }
                
                .control-group input, .control-group select {
                    padding: 6px 10px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 13px;
                }
                
                .control-group input[type="datetime-local"] {
                    width: 180px;
                }
                
                .control-group input[type="text"] {
                    width: 200px;
                }
                
                .control-group select {
                    min-width: 120px;
                }
                
                
                .filter-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-left: auto;
                }
                
                
                .duration-cell {
                    font-family: var(--vscode-editor-font-family);
                    text-align: right;
                }
                
                
                .depth-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--vscode-charts-blue);
                    margin-right: 4px;
                }
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector({
                id: 'environmentSelect',
                label: 'Environment:',
                placeholder: 'Loading environments...'
            })}

            <!-- Trace Level Control -->
            <div class="controls-section">
                <div class="control-row">
                    <div class="control-group">
                        <label for="traceLevelSelect">Trace Level:</label>
                        <select id="traceLevelSelect">
                            <option value="0">Off</option>
                            <option value="1">Exception</option>
                            <option value="2">All</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="fromDate">From:</label>
                        <input type="datetime-local" id="fromDate">
                    </div>
                    <div class="control-group">
                        <label for="toDate">To:</label>
                        <input type="datetime-local" id="toDate">
                    </div>
                </div>
                
                <div class="control-row">
                    <div class="control-group">
                        <label for="pluginFilter">Plugin:</label>
                        <input type="text" id="pluginFilter" placeholder="Filter by plugin name...">
                    </div>
                    <div class="control-group">
                        <label for="entityFilter">Entity:</label>
                        <input type="text" id="entityFilter" placeholder="Filter by entity name...">
                    </div>
                    <div class="control-group">
                        <input type="checkbox" id="exceptionOnlyFilter">
                        <label for="exceptionOnlyFilter">Exception Only</label>
                    </div>
                    <div class="control-group">
                        <label for="topFilter">Max Results:</label>
                        <input type="number" id="topFilter" min="1" max="5000" value="1000" style="width: 80px;">
                    </div>
                    <div class="filter-actions">
                        <button class="btn btn-primary" onclick="applyFilters()">Apply Filters</button>
                        <button class="btn btn-secondary" onclick="clearFilters()">Clear</button>
                        <button class="btn" onclick="refreshTraces()">Refresh</button>
                    </div>
                </div>
            </div>
            
            <div class="header">
                <h1 class="title">Plugin Trace Logs</h1>
                <div class="header-actions">
                    <button class="btn" onclick="exportTraces()">Export</button>
                </div>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to view plugin traces...</p>
                </div>
            </div>

            <!-- Hidden template for plugin trace table -->
            <script type="text/template" id="pluginTraceTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'pluginTraceTable',
                    columns: [
                        { key: 'createdon', label: 'Start Time', sortable: true, width: '140px' },
                        { key: 'duration', label: 'Duration', sortable: true, width: '80px', className: 'duration-cell' },
                        { key: 'pluginname', label: 'Plugin', sortable: true },
                        { key: 'messagename', label: 'Step', sortable: true, width: '120px' },
                        { key: 'depth', label: 'Depth', sortable: true, width: '60px' },
                        { key: 'mode', label: 'Mode', sortable: true, width: '100px' },
                        { key: 'entityname', label: 'Entity', sortable: true, width: '100px' },
                        { key: 'messageblock', label: 'Message', sortable: true, width: '80px' },
                        { key: 'exceptiondetails', label: 'Exception', sortable: true, width: '80px' }
                    ],
                    defaultSort: undefined,
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    rowActions: [
                        { id: 'viewDetails', label: 'View Details', icon: '👁️', action: 'viewTraceDetails' },
                        { id: 'openInDynamics', label: 'View in Dynamics', icon: '🔗', action: 'openTraceInDynamics' }
                    ]
                })}
            </script>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${modalUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                let currentTraceData = [];
                
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to view plugin traces...'
                });
                
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                    initializeFilters();
                });
                
                function initializeFilters() {
                    // Leave date fields empty by default - user can set as needed
                    // This allows loading all available traces initially
                    
                    // Set up trace level change handler
                    document.getElementById('traceLevelSelect').addEventListener('change', onTraceLevelChange);
                }
                
                function formatDateForInput(date) {
                    return date.toISOString().slice(0, 16);
                }
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        // Get current trace level first
                        PanelUtils.sendMessage('getPluginTraceLevel', { environmentId });
                        // Then load traces
                        loadPluginTracesForEnvironment(environmentId);
                    } else {
                        panelUtils.clearContent('Select an environment to view plugin traces...');
                    }
                }
                
                function onTraceLevelChange() {
                    const select = document.getElementById('traceLevelSelect');
                    const traceLevel = parseInt(select.value);
                    
                    if (currentEnvironmentId && !isNaN(traceLevel)) {
                        PanelUtils.sendMessage('setPluginTraceLevel', {
                            environmentId: currentEnvironmentId,
                            traceLevel: traceLevel
                        });
                    }
                }
                
                function getFilterOptions() {
                    const fromDate = document.getElementById('fromDate').value;
                    const toDate = document.getElementById('toDate').value;
                    const pluginName = document.getElementById('pluginFilter').value.trim();
                    const entityName = document.getElementById('entityFilter').value.trim();
                    const exceptionOnly = document.getElementById('exceptionOnlyFilter').checked;
                    const topLimit = document.getElementById('topFilter').value;
                    
                    const options = {};
                    
                    if (fromDate) options.fromDate = new Date(fromDate).toISOString();
                    if (toDate) options.toDate = new Date(toDate).toISOString();
                    if (pluginName) options.pluginName = pluginName;
                    if (entityName) options.entityName = entityName;
                    if (exceptionOnly) options.exceptionOnly = true;
                    if (topLimit && topLimit !== '1000') options.top = parseInt(topLimit);
                    
                    return options;
                }
                
                function loadPluginTracesForEnvironment(environmentId) {
                    if (environmentId) {
                        panelUtils.showLoading('Loading plugin traces...');
                        const filterOptions = getFilterOptions();
                        PanelUtils.sendMessage('loadPluginTraces', { 
                            environmentId: environmentId,
                            filterOptions: filterOptions
                        });
                    }
                }
                
                function applyFilters() {
                    if (currentEnvironmentId) {
                        loadPluginTracesForEnvironment(currentEnvironmentId);
                    }
                }
                
                function clearFilters() {
                    document.getElementById('pluginFilter').value = '';
                    document.getElementById('entityFilter').value = '';
                    document.getElementById('exceptionOnlyFilter').checked = false;
                    document.getElementById('fromDate').value = '';
                    document.getElementById('toDate').value = '';
                    document.getElementById('topFilter').value = '1000';
                    
                    if (currentEnvironmentId) {
                        loadPluginTracesForEnvironment(currentEnvironmentId);
                    }
                }
                
                function refreshTraces() {
                    if (currentEnvironmentId) {
                        loadPluginTracesForEnvironment(currentEnvironmentId);
                    }
                }
                
                function exportTraces() {
                    if (currentTraceData.length === 0) {
                        PanelUtils.sendMessage('error', { message: 'No trace data to export' });
                        return;
                    }
                    
                    // Export all raw data without transformation
                    const headers = [
                        'plugintracelogid', 'createdon', 'operationtype', 'pluginname', 'entityname', 
                        'messagename', 'mode', 'stage', 'depth', 'duration', 'exceptiondetails', 'messageblock', 
                        'configuration', 'performancedetails', 'correlationid', 'userid', 'initiatinguserid', 
                        'ownerid', 'businessunitid', 'organizationid'
                    ];
                    const csvContent = [
                        headers.join(','),
                        ...currentTraceData.map(row => [
                            '"' + (row.plugintracelogid || '') + '"',
                            '"' + (row.createdon || '') + '"',
                            '"' + (row.operationtype || '') + '"',
                            '"' + (row.pluginname || '') + '"',
                            '"' + (row.entityname || '') + '"',
                            '"' + (row.messagename || '') + '"',
                            row.mode || 0,
                            row.stage || 0,
                            row.depth || 0,
                            row.duration || 0,
                            '"' + (row.exceptiondetails || '').replace(/"/g, '""') + '"',
                            '"' + (row.messageblock || '').replace(/"/g, '""') + '"',
                            '"' + (row.configuration || '') + '"',
                            '"' + (row.performancedetails || '') + '"',
                            '"' + (row.correlationid || '') + '"',
                            '"' + (row.userid || '') + '"',
                            '"' + (row.initiatinguserid || '') + '"',
                            '"' + (row.ownerid || '') + '"',
                            '"' + (row.businessunitid || '') + '"',
                            '"' + (row.organizationid || '') + '"'
                        ].join(','))
                    ].join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`plugin-traces-\${new Date().toISOString().slice(0, 10)}.csv\`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                
                function populatePluginTraces(data) {
                    currentTraceData = data;
                    
                    // Transform data for table display
                    const tableData = data.map(trace => ({
                        id: trace.plugintracelogid,
                        createdon: formatDate(trace.createdon),
                        duration: formatDuration(trace.duration),
                        pluginname: trace.pluginname || '',
                        messagename: trace.messagename || '',
                        depth: trace.depth || 0,
                        mode: getModeDisplayName(trace.mode),
                        entityname: trace.entityname || '',
                        messageblock: trace.messageblock && trace.messageblock.trim() ? 'Yes' : 'No',
                        exceptiondetails: trace.exceptiondetails ? 'Yes' : 'No',
                        // Store raw data for sorting
                        'data-sort-createdon': new Date(trace.createdon).getTime(),
                        'data-sort-duration': trace.duration
                    }));
                    
                    // Use ComponentFactory template and TableUtils for display
                    const content = document.getElementById('content');
                    const template = document.getElementById('pluginTraceTableTemplate');
                    content.innerHTML = template.innerHTML;
                    
                    // Initialize table
                    TableUtils.initializeTable('pluginTraceTable', {
                        onRowClick: handleRowClick,
                        onRowAction: handleRowAction
                    });
                    
                    // Load data and apply default sorting
                    TableUtils.loadTableData('pluginTraceTable', tableData);
                    TableUtils.sortTable('pluginTraceTable', 'createdon', 'desc');
                }
                
                function formatDate(dateString) {
                    if (!dateString) return '';
                    return new Date(dateString).toLocaleString();
                }
                
                function formatDuration(duration) {
                    if (!duration) return '0ms';
                    if (duration < 1000) {
                        return duration + 'ms';
                    } else if (duration < 60000) {
                        return (duration / 1000).toFixed(2) + 's';
                    } else {
                        const minutes = Math.floor(duration / 60000);
                        const seconds = ((duration % 60000) / 1000).toFixed(2);
                        return minutes + 'm ' + seconds + 's';
                    }
                }
                
                function getModeDisplayName(mode) {
                    switch (mode) {
                        case 0: return 'Synchronous';
                        case 1: return 'Asynchronous';
                        default: return 'Unknown';
                    }
                }
                
                
                function handleRowClick(rowData, rowElement) {
                    console.log('Plugin trace clicked:', rowData);
                }
                
                function handleRowAction(actionId, rowData) {
                    if (actionId === 'viewTraceDetails') {
                        viewTraceDetails(rowData.id);
                    } else if (actionId === 'openTraceInDynamics') {
                        PanelUtils.sendMessage('openTraceInDynamics', {
                            environmentId: currentEnvironmentId,
                            traceId: rowData.id
                        });
                    }
                }
                
                function viewTraceDetails(traceId) {
                    const trace = currentTraceData.find(t => t.plugintracelogid === traceId);
                    if (!trace) return;
                    
                    // Create Configuration tab content
                    const configurationContent = \`
                        <div class="detail-section">
                            <div class="detail-section-title">General</div>
                            <div class="detail-grid">
                                <div class="detail-label">Plugin Trace Log ID</div>
                                <div class="detail-value" style="font-family: var(--vscode-editor-font-family); font-size: 13px;">\${trace.plugintracelogid}</div>
                                
                                <div class="detail-label">Type Name</div>
                                <div class="detail-value">\${trace.pluginname || '<span class="empty">---</span>'}</div>
                                
                                <div class="detail-label">Message Name</div>
                                <div class="detail-value">\${trace.messagename || '<span class="empty">none</span>'}</div>
                                
                                <div class="detail-label">Primary Entity</div>
                                <div class="detail-value">\${trace.entityname || '<span class="empty">none</span>'}</div>
                                
                                <div class="detail-label">Operation Type</div>
                                <div class="detail-value">\${trace.operationtype || '<span class="empty">---</span>'}</div>
                                
                                <div class="detail-label">Plugin Type</div>
                                <div class="detail-value">\${getModeDisplayName(trace.mode)} Plugin</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <div class="detail-section-title">Configuration</div>
                            <div class="detail-grid">
                                <div class="detail-label">Configuration</div>
                                <div class="detail-value"><span class="empty">---</span></div>
                                
                                <div class="detail-label">Secure Configuration</div>
                                <div class="detail-value"><span class="empty">---</span></div>
                                
                                <div class="detail-label">Persistence Key</div>
                                <div class="detail-value">\${trace.persistencekey || '<span class="empty">00000000-0000-0000-0000-000000000000</span>'}</div>
                                
                                <div class="detail-label">Plugin Step Id</div>
                                <div class="detail-value">\${trace.pluginstepid || '<span class="empty">---</span>'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <div class="detail-section-title">Context</div>
                            <div class="detail-grid">
                                <div class="detail-label">Depth</div>
                                <div class="detail-value">\${trace.depth || 1}</div>
                                
                                <div class="detail-label">Correlation Id</div>
                                <div class="detail-value">\${trace.correlationid || '<span class="empty">---</span>'}</div>
                                
                                <div class="detail-label">Mode</div>
                                <div class="detail-value">\${getModeDisplayName(trace.mode)}</div>
                                
                                <div class="detail-label">Request Id</div>
                                <div class="detail-value">\${trace.requestid || '<span class="empty">---</span>'}</div>
                            </div>
                        </div>
                    \`;
                    
                    // Create Execution tab content
                    const executionContent = \`
                        <div class="detail-section">
                            <div class="detail-section-title">Performance</div>
                            <div class="detail-grid">
                                <div class="detail-label">Execution Start Time</div>
                                <div class="detail-value">\${formatDate(trace.createdon)}</div>
                                
                                <div class="detail-label">Execution Duration</div>
                                <div class="detail-value">\${formatDuration(trace.duration)}</div>
                                
                                <div class="detail-label">Performance Details</div>
                                <div class="detail-value">\${trace.performancedetails || '<span class="empty">---</span>'}</div>
                            </div>
                        </div>
                        
                        \${trace.messageblock ? \`
                        <div class="detail-section">
                            <div class="detail-section-title">Message Block</div>
                            <div class="detail-code">\${escapeHtml(trace.messageblock)}</div>
                        </div>
                        \` : ''}
                        
                        \${trace.exceptiondetails ? \`
                        <div class="detail-section">
                            <div class="detail-section-title">Exception Details</div>
                            <div class="detail-code exception">\${formatStackTrace(trace.exceptiondetails)}</div>
                        </div>
                        \` : ''}
                    \`;
                    
                    // Create tabbed content
                    const tabs = [
                        {
                            id: 'configuration-tab',
                            label: 'Configuration',
                            content: configurationContent,
                            active: true
                        },
                        {
                            id: 'execution-tab',
                            label: 'Execution',
                            content: executionContent,
                            active: false
                        }
                    ];
                    
                    const modalContent = ModalUtils.createTabbedContent(tabs);
                    
                    ModalUtils.showModal({
                        id: 'trace-details-modal',
                        title: \`Plugin Trace Log - \${trace.pluginname || 'Unknown Plugin'}\`,
                        content: modalContent,
                        size: 'large',
                        closable: true
                    });
                }
                
                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                function formatStackTrace(stackTrace) {
                    if (!stackTrace) return '';
                    
                    // Simple syntax highlighting for stack traces
                    return escapeHtml(stackTrace)
                        .replace(/(\\w+Exception[^\\n]*)/g, '<span class="stack-trace-type">$1</span>')
                        .replace(/(at\\s+[\\w\\.]+\\.[\\w<>]+)/g, '<span class="stack-trace-method">$1</span>')
                        .replace(/(in\\s+[^\\n]*\\.cs:line\\s+\\d+)/g, '<span class="stack-trace-file">$1</span>');
                }
                
                // Setup message handlers
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            // Get trace level first, then load traces
                            PanelUtils.sendMessage('getPluginTraceLevel', { environmentId: message.selectedEnvironmentId });
                        }
                    },
                    
                    'pluginTracesLoaded': (message) => {
                        populatePluginTraces(message.data);
                    },
                    
                    'traceLevelLoaded': (message) => {
                        const select = document.getElementById('traceLevelSelect');
                        select.value = message.data.level.toString();
                        
                        // Load traces after getting trace level
                        if (currentEnvironmentId) {
                            loadPluginTracesForEnvironment(currentEnvironmentId);
                        }
                    },
                    
                    'traceLevelSet': (message) => {
                        panelUtils.showSuccess(message.data.message);
                        // Refresh traces after changing level
                        setTimeout(() => {
                            if (currentEnvironmentId) {
                                loadPluginTracesForEnvironment(currentEnvironmentId);
                            }
                        }, 1000);
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
