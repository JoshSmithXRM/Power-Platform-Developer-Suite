import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { EnvironmentManager } from './base/EnvironmentManager';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage, EnvironmentConnection } from '../types';
import { ServiceFactory } from '../services/ServiceFactory';

export class SolutionExplorerPanel extends BasePanel {
    public static readonly viewType = 'solutionExplorer';

    private _selectedEnvironmentId: string | undefined;
    private _cachedSolutions: any[] | undefined;
    private _cachedEnvironments: any[] | undefined;

    public static createOrShow(extensionUri: vscode.Uri) {
        // Try to focus existing panel first
        const existing = BasePanel.focusExisting(SolutionExplorerPanel.viewType);
        if (existing) {
            return;
        }

        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new SolutionExplorerPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new SolutionExplorerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer'
        });

        // Initialize after construction
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadSolutions':
                await this.handleLoadSolutions(message.environmentId, message.forceRefresh);
                break;

            case 'openSolutionInMaker':
                await this.handleOpenSolutionInMaker(message.environmentId, message.solutionId);
                break;

            case 'openSolutionInClassic':
                await this.handleOpenSolutionInClassic(message.environmentId, message.solutionId);
                break;

            case 'exportSolution':
                await this.handleExportSolution(message.environmentId, message.solutionId);
                break;

            case 'viewSolutionDetails':
                await this.handleViewSolutionDetails(message.environmentId, message.solutionId);
                break;

            case 'manageSolutionSecurity':
                await this.handleManageSolutionSecurity(message.environmentId, message.solutionId);
                break;

            case 'bulkExportSolutions':
                await this.handleBulkExportSolutions(message.environmentId, message.solutionIds);
                break;

            case 'bulkUpdateSolutions':
                await this.handleBulkUpdateSolutions(message.environmentId, message.solutionIds);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const selectedEnvironmentId = this._selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });
        } catch (error: any) {
            console.error('Error loading environments:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: `Failed to load environments: ${error.message}`
            });
        }
    }

    private async handleLoadSolutions(environmentId: string, forceRefresh: boolean = false): Promise<void> {
        if (!environmentId) return;

        try {
            this._selectedEnvironmentId = environmentId;

            // Use cached data if available and not forcing refresh
            if (!forceRefresh && this._cachedSolutions && this._cachedSolutions.length > 0) {
                this._panel.webview.postMessage({
                    action: 'solutionsLoaded',
                    data: this._cachedSolutions
                });
                return;
            }

            // Get available environments
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                throw new Error('Selected environment not found');
            }

            // Get access token for the environment
            const token = await this._authService.getAccessToken(environment.id);

            // Load solutions
            const solutionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,displayname,version,ismanaged,_publisherid_value,installedon,description&$expand=publisherid($select=friendlyname)&$orderby=friendlyname&$filter=(isvisible eq true)`;

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

            const data = await response.json();
            const solutions = data.value || [];

            // Transform the data
            const transformedSolutions = solutions.map((solution: any) => ({
                solutionId: solution.solutionid,
                uniqueName: solution.uniquename,
                friendlyName: solution.friendlyname || solution.displayname,
                displayName: solution.displayname,
                version: solution.version,
                isManaged: solution.ismanaged,
                publisherName: solution.publisherid?.friendlyname || 'Unknown',
                installedOn: solution.installedon,
                description: solution.description
            }));

            this._cachedSolutions = transformedSolutions;

            this._panel.webview.postMessage({
                action: 'solutionsLoaded',
                data: transformedSolutions
            });

        } catch (error: any) {
            console.error('Error loading solutions:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: `Failed to load solutions: ${error.message}`
            });
        }
    }

    private async handleOpenSolutionInMaker(environmentId: string, solutionId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment || !environment.environmentId) {
                throw new Error('Environment or environment ID not found');
            }

            const makerUrl = `https://make.powerapps.com/environments/${environment.environmentId}/solutions/${solutionId}`;
            await vscode.env.openExternal(vscode.Uri.parse(makerUrl));
        } catch (error: any) {
            console.error('Error opening solution in Maker:', error);
            vscode.window.showErrorMessage(`Failed to open solution in Maker: ${error.message}`);
        }
    }

    private async handleOpenSolutionInClassic(environmentId: string, solutionId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                throw new Error('Environment not found');
            }

            const classicUrl = `${environment.settings.dataverseUrl}/tools/solution/edit.aspx?id=${solutionId}`;
            await vscode.env.openExternal(vscode.Uri.parse(classicUrl));
        } catch (error: any) {
            console.error('Error opening solution in Classic:', error);
            vscode.window.showErrorMessage(`Failed to open solution in Classic: ${error.message}`);
        }
    }

    private async handleExportSolution(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution export functionality coming soon!');
        } catch (error: any) {
            console.error('Error exporting solution:', error);
            vscode.window.showErrorMessage(`Failed to export solution: ${error.message}`);
        }
    }

    private async handleViewSolutionDetails(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution details view coming soon!');
        } catch (error: any) {
            console.error('Error viewing solution details:', error);
            vscode.window.showErrorMessage(`Failed to view solution details: ${error.message}`);
        }
    }

    private async handleManageSolutionSecurity(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution security management coming soon!');
        } catch (error: any) {
            console.error('Error managing solution security:', error);
            vscode.window.showErrorMessage(`Failed to manage solution security: ${error.message}`);
        }
    }

    private async handleBulkExportSolutions(environmentId: string, solutionIds: string[]): Promise<void> {
        try {
            vscode.window.showInformationMessage(`Bulk export of ${solutionIds.length} solutions coming soon!`);
        } catch (error: any) {
            console.error('Error bulk exporting solutions:', error);
            vscode.window.showErrorMessage(`Failed to bulk export solutions: ${error.message}`);
        }
    }

    private async handleBulkUpdateSolutions(environmentId: string, solutionIds: string[]): Promise<void> {
        try {
            vscode.window.showInformationMessage(`Bulk update of ${solutionIds.length} solutions coming soon!`);
        } catch (error: any) {
            console.error('Error bulk updating solutions:', error);
            vscode.window.showErrorMessage(`Failed to bulk update solutions: ${error.message}`);
        }
    }

    protected getHtmlContent(): string {
        // Get common webview resources
        const { tableUtilsScript, tableStylesSheet } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'EnvironmentSelectorUtils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Solution Explorer</title>
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
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
                
                .loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .error {
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 16px;
                    border-radius: 6px;
                    margin: 20px 0;
                }
                
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .btn:hover {
                    background: var(--vscode-button-hoverBackground);
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
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector({
            id: 'environmentSelect',
            label: 'Environment:',
            placeholder: 'Loading environments...'
        })}

            <div class="header">
                <h1 class="title">Solution Explorer</h1>
                <button class="btn" onclick="refreshSolutions()">Refresh</button>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load solutions...</p>
                </div>
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                let solutions = [];
                
                // Initialize environment selector
                document.addEventListener('DOMContentLoaded', () => {
                    EnvironmentSelectorUtils.initializeSelector('environmentSelect', {
                        onSelectionChange: 'onEnvironmentChange'
                    });
                    loadEnvironments();
                });
                
                // Load environments
                function loadEnvironments() {
                    EnvironmentSelectorUtils.setLoadingState('environmentSelect', true);
                    vscode.postMessage({ action: 'loadEnvironments' });
                }
                
                // Handle environment selection change
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    if (environmentId) {
                        loadSolutions();
                    } else {
                        clearContent();
                    }
                }
                
                // Load solutions for current environment
                function loadSolutions() {
                    if (!currentEnvironmentId) return;
                    
                    document.getElementById('content').innerHTML = '<div class="loading"><p>Loading solutions...</p></div>';
                    
                    vscode.postMessage({ 
                        action: 'loadSolutions', 
                        environmentId: currentEnvironmentId 
                    });
                }
                
                // Refresh solutions
                function refreshSolutions() {
                    if (currentEnvironmentId) {
                        loadSolutions();
                    }
                }
                
                // Clear content when no environment selected
                function clearContent() {
                    document.getElementById('content').innerHTML = '<div class="loading"><p>Select an environment to load solutions...</p></div>';
                }
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.action) {
                        case 'environmentsLoaded':
                            EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                            if (message.selectedEnvironmentId) {
                                EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                                currentEnvironmentId = message.selectedEnvironmentId;
                                loadSolutions();
                            }
                            break;
                            
                        case 'solutionsLoaded':
                            populateSolutions(message.data);
                            break;
                            
                        case 'error':
                            showError(message.message);
                            break;
                    }
                });
                
                // Custom renderer for solution names
                function renderSolutionName(value, row) {
                    return \`<a class="solution-name-link" onclick="openSolutionInMaker('\${row.id}'); return false;">\${value}</a>\`;
                }
                
                // Custom renderer for solution type  
                function renderSolutionType(value, row) {
                    return value ? 'Managed' : 'Unmanaged';
                }
                
                // Custom renderer for installed date
                function renderInstalledDate(value, row) {
                    return value ? new Date(value).toLocaleDateString() : 'Unknown';
                }
                
                // Populate solutions table with enhanced ComponentFactory
                function populateSolutions(solutionsData) {
                    solutions = solutionsData;
                    
                    if (solutions.length === 0) {
                        document.getElementById('content').innerHTML = '<div class="loading"><p>No solutions found in this environment.</p></div>';
                        return;
                    }
                    
                    const tableHtml = \`\${${ComponentFactory.createDataTable({
            id: 'solutionsTable',
            columns: [
                { key: 'displayName', label: 'Solution Name', sortable: true, renderer: 'renderSolutionName' },
                { key: 'version', label: 'Version', sortable: true },
                { key: 'isManaged', label: 'Type', sortable: true, renderer: 'renderSolutionType' },
                { key: 'publisherName', label: 'Publisher', sortable: true },
                { key: 'installedOn', label: 'Installed', sortable: true, renderer: 'renderInstalledDate' },
                { key: 'description', label: 'Description', sortable: false }
            ],
            defaultSort: { column: 'displayName', direction: 'asc' },
            filterable: true,
            selectable: true,
            rowActions: [
                { id: 'openMaker', action: 'openInMaker', label: 'Open in Maker', icon: '🎨' },
                { id: 'openClassic', action: 'openInClassic', label: 'Open in Classic', icon: '📋' },
                { id: 'export', action: 'exportSolution', label: 'Export', icon: '📦' }
            ],
            contextMenu: [
                { id: 'openMaker', action: 'openInMaker', label: 'Open in Maker Portal' },
                { id: 'openClassic', action: 'openInClassic', label: 'Open in Classic UI' },
                { id: 'sep1', action: '', label: '', separator: true },
                { id: 'export', action: 'exportSolution', label: 'Export Solution' },
                { id: 'details', action: 'viewDetails', label: 'View Details' },
                { id: 'sep2', action: '', label: '', separator: true },
                { id: 'security', action: 'manageSecurity', label: 'Manage Security Roles' }
            ],
            bulkActions: [
                { id: 'exportSelected', action: 'bulkExport', label: 'Export Selected', icon: '📦', requiresSelection: true },
                { id: 'updateSelected', action: 'bulkUpdate', label: 'Update Selected', icon: '🔄', requiresSelection: true }
            ]
        })}\`;
                    
                    document.getElementById('content').innerHTML = tableHtml;
                    
                    // Initialize the enhanced table
                    TableUtils.initializeTable('solutionsTable', {
                        onRowAction: handleRowAction,
                        onContextMenuAction: handleContextMenuAction,
                        onBulkAction: handleBulkAction,
                        onSelectionChange: handleSelectionChange
                    });
                    
                    // Transform and load data
                    const tableData = solutions.map(solution => ({
                        id: solution.solutionId,
                        displayName: solution.friendlyName || solution.displayName,
                        version: solution.version,
                        isManaged: solution.isManaged,
                        publisherName: solution.publisherName || 'Unknown',
                        installedOn: solution.installedOn,
                        description: solution.description || ''
                    }));
                    
                    TableUtils.loadTableData('solutionsTable', tableData);
                }
                
                // Handle table row actions
                function handleRowAction(actionId, rowData) {
                    switch (actionId) {
                        case 'openInMaker':
                            openSolutionInMaker(rowData.id);
                            break;
                        case 'openInClassic':
                            openSolutionInClassic(rowData.id);
                            break;
                        case 'exportSolution':
                            exportSolution(rowData.id);
                            break;
                    }
                }
                
                // Handle context menu actions
                function handleContextMenuAction(actionId, rowData) {
                    switch (actionId) {
                        case 'openInMaker':
                            openSolutionInMaker(rowData.id);
                            break;
                        case 'openInClassic':
                            openSolutionInClassic(rowData.id);
                            break;
                        case 'exportSolution':
                            exportSolution(rowData.id);
                            break;
                        case 'viewDetails':
                            viewSolutionDetails(rowData.id);
                            break;
                        case 'manageSecurity':
                            manageSolutionSecurity(rowData.id);
                            break;
                    }
                }
                
                // Handle bulk actions
                function handleBulkAction(actionId, selectedRows) {
                    switch (actionId) {
                        case 'bulkExport':
                            bulkExportSolutions(selectedRows.map(row => row.id));
                            break;
                        case 'bulkUpdate':
                            bulkUpdateSolutions(selectedRows.map(row => row.id));
                            break;
                    }
                }
                
                // Handle selection changes
                function handleSelectionChange(selectedRows) {
                    console.log('Selected solutions:', selectedRows.length);
                }
                
                // Solution action functions
                function openSolutionInMaker(solutionId) {
                    vscode.postMessage({ 
                        action: 'openSolutionInMaker', 
                        solutionId: solutionId,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function openSolutionInClassic(solutionId) {
                    vscode.postMessage({ 
                        action: 'openSolutionInClassic', 
                        solutionId: solutionId,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function exportSolution(solutionId) {
                    vscode.postMessage({ 
                        action: 'exportSolution', 
                        solutionId: solutionId,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function viewSolutionDetails(solutionId) {
                    vscode.postMessage({ 
                        action: 'viewSolutionDetails', 
                        solutionId: solutionId,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function manageSolutionSecurity(solutionId) {
                    vscode.postMessage({ 
                        action: 'manageSolutionSecurity', 
                        solutionId: solutionId,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function bulkExportSolutions(solutionIds) {
                    vscode.postMessage({ 
                        action: 'bulkExportSolutions', 
                        solutionIds: solutionIds,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                function bulkUpdateSolutions(solutionIds) {
                    vscode.postMessage({ 
                        action: 'bulkUpdateSolutions', 
                        solutionIds: solutionIds,
                        environmentId: currentEnvironmentId 
                    });
                }
                
                // Show error message
                function showError(message) {
                    document.getElementById('content').innerHTML = \`
                        <div class="error">
                            <strong>Error:</strong> \${message}
                        </div>
                    \`;
                }
            </script>
        </body>
        </html>`;
    }
}
