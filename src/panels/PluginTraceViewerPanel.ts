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

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Plugin Trace Viewer</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
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
                
                .exception-indicator {
                    background: var(--vscode-testing-iconFailed);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 0.8em;
                    font-weight: 500;
                }
                
                .duration-cell {
                    font-family: var(--vscode-editor-font-family);
                    text-align: right;
                }
                
                .plugin-name-cell {
                    font-weight: 500;
                }
                
                .message-cell {
                    max-width: 300px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
                        { key: 'pluginname', label: 'Plugin', sortable: true, className: 'plugin-name-cell' },
                        { key: 'messagename', label: 'Step', sortable: true, width: '120px' },
                        { key: 'depth', label: 'Depth', sortable: true, width: '60px' },
                        { key: 'mode', label: 'Mode', sortable: true, width: '100px' },
                        { key: 'stage', label: 'Stage', sortable: true, width: '120px' },
                        { key: 'entityname', label: 'Entity', sortable: true, width: '100px' },
                        { key: 'messageblock', label: 'Message', sortable: false, className: 'message-cell' },
                        { key: 'exceptiondetails', label: 'Exception', sortable: false, className: 'message-cell' }
                    ],
                    defaultSort: { column: 'createdon', direction: 'desc' },
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
                    
                    const options = {};
                    
                    if (fromDate) options.fromDate = new Date(fromDate).toISOString();
                    if (toDate) options.toDate = new Date(toDate).toISOString();
                    if (pluginName) options.pluginName = pluginName;
                    if (entityName) options.entityName = entityName;
                    if (exceptionOnly) options.exceptionOnly = true;
                    
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
                    
                    // Simple CSV export
                    const headers = ['Start Time', 'Duration', 'Plugin', 'Step', 'Depth', 'Mode', 'Stage', 'Entity', 'Message', 'Exception'];
                    const csvContent = [
                        headers.join(','),
                        ...currentTraceData.map(row => [
                            formatDate(row.createdon),
                            row.duration + 'ms',
                            '"' + (row.pluginname || '') + '"',
                            '"' + (row.messagename || '') + '"',
                            row.depth,
                            getModeDisplayName(row.mode),
                            getStageDisplayName(row.stage),
                            '"' + (row.entityname || '') + '"',
                            '"' + (row.messageblock || '').replace(/"/g, '""') + '"',
                            '"' + (row.exceptiondetails || '').replace(/"/g, '""') + '"'
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
                        stage: getStageDisplayName(trace.stage),
                        entityname: trace.entityname || '',
                        messageblock: truncateMessage(trace.messageblock),
                        exceptiondetails: trace.exceptiondetails ? 
                            '<span class="exception-indicator">Exception</span>' : '',
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
                        case 0: return 'Sync';
                        case 1: return 'Async';
                        default: return 'Unknown';
                    }
                }
                
                function getStageDisplayName(stage) {
                    switch (stage) {
                        case 10: return 'Pre-validation';
                        case 20: return 'Pre-operation';
                        case 40: return 'Post-operation';
                        case 50: return 'Post-operation (Deprecated)';
                        default: return 'Unknown';
                    }
                }
                
                function truncateMessage(message, maxLength = 100) {
                    if (!message) return '';
                    if (message.length <= maxLength) return message;
                    return message.substring(0, maxLength) + '...';
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
                    if (trace) {
                        // Show detailed information in a dialog-like format
                        const details = \`
                            <div class="trace-details">
                                <h3>Plugin Trace Details</h3>
                                <p><strong>Plugin:</strong> \${trace.pluginname}</p>
                                <p><strong>Entity:</strong> \${trace.entityname || 'N/A'}</p>
                                <p><strong>Message:</strong> \${trace.messagename}</p>
                                <p><strong>Duration:</strong> \${formatDuration(trace.duration)}</p>
                                <p><strong>Depth:</strong> \${trace.depth}</p>
                                <p><strong>Mode:</strong> \${getModeDisplayName(trace.mode)}</p>
                                <p><strong>Stage:</strong> \${getStageDisplayName(trace.stage)}</p>
                                <p><strong>Start Time:</strong> \${formatDate(trace.createdon)}</p>
                                \${trace.messageblock ? \`<p><strong>Message Block:</strong><br><pre>\${trace.messageblock}</pre></p>\` : ''}
                                \${trace.exceptiondetails ? \`<p><strong>Exception Details:</strong><br><pre style="color: var(--vscode-testing-iconFailed);">\${trace.exceptiondetails}</pre></p>\` : ''}
                            </div>
                        \`;
                        
                        vscode.postMessage({
                            action: 'showInfo',
                            message: 'Plugin Trace Details',
                            details: details
                        });
                    }
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
