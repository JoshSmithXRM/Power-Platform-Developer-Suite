import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { EnvironmentManager } from './base/EnvironmentManager';
import { WebviewMessage, EnvironmentConnection } from '../types';

export class ImportJobViewerPanel extends BasePanel {
    public static readonly viewType = 'importJobViewer';

    private _cachedEnvironments: EnvironmentConnection[] | undefined;
    private _selectedEnvironmentId: string | undefined;
    private _cachedImportJobs: any[] | null = null;
    private readonly _pageSize = 5000; // Large page size to get all records

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new ImportJobViewerPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        super(panel, extensionUri, authService, {
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer'
        });

        // Initialize after construction
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
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
    }

    private async loadEnvironments() {
        try {
            // Use cached environments if available
            if (this._cachedEnvironments) {
                this.postMessage({
                    action: 'environmentsLoaded',
                    data: this._cachedEnvironments,
                    selectedEnvironmentId: this._selectedEnvironmentId
                });
                return;
            }

            const environments = await this._authService.getEnvironments();

            // Cache the environments
            this._cachedEnvironments = environments;

            this.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: this._selectedEnvironmentId
            });

        } catch (error: any) {
            console.error('Error loading environments:', error);
            this.postMessage({
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
                this.postMessage({
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
                    this.postMessage({
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

            this.postMessage({
                action: 'importJobsLoaded',
                data: importJobs,
                hasMoreData: false // No more data since we loaded everything
            });

        } catch (error: any) {
            console.error('Error loading import jobs:', error);
            this.postMessage({
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
                this.postMessage({
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

            this.postMessage({
                action: 'xmlLoaded',
                importJobId: importJobId,
                xmlData: data.data || 'No XML data available'
            });

        } catch (error: any) {
            console.error('Error loading import job XML:', error);
            this.postMessage({
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

    protected getHtmlContent(): string {
        return this.getImportJobViewerHtml();
    }

    private getImportJobViewerHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Import Job Viewer</title>
            ${this.getImportJobViewerStyles()}
        </head>
        <body>
            ${this.getImportJobViewerBody()}
            ${this.getImportJobViewerScript()}
        </body>
        </html>`;
    }

    private getImportJobViewerStyles(): string {
        return `<style>
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
                .context-info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                ${EnvironmentManager.getStandardizedTableCss()}
            </style>`;
    }

    private getImportJobViewerBody(): string {
        return `
            <!-- Environment Selector -->
            <div class="environment-selector">
                <span class="environment-label">Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>

            <div class="header">
                <h1 class="title">Import Job Viewer</h1>
                <div class="header-actions">
                    <button class="solution-history-btn" onclick="openSolutionHistory()" id="solutionHistoryBtn" disabled>
                        View in Maker
                    </button>
                    <button class="refresh-btn" onclick="refreshImportJobs()">Refresh</button>
                </div>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load import jobs...</p>
                </div>
            </div>`;
    }

    private getImportJobViewerScript(): string {
        return `<script>
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
                
                function setupTableScrollDetection() {
                    const tableContainer = document.getElementById('tableContainer');
                    if (!tableContainer) return;
                    
                    function checkScroll() {
                        const hasHorizontalScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
                        const hasVerticalScroll = tableContainer.scrollHeight > tableContainer.clientHeight;
                        
                        if (hasHorizontalScroll || hasVerticalScroll) {
                            tableContainer.classList.add('has-scroll');
                        } else {
                            tableContainer.classList.remove('has-scroll');
                        }
                    }
                    
                    // Initial check
                    checkScroll();
                    
                    // Check on window resize
                    window.addEventListener('resize', checkScroll);
                    
                    // Check after content changes
                    const observer = new ResizeObserver(checkScroll);
                    observer.observe(tableContainer);
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
                
                function setupFilterAndSort() {
                    const filterInput = document.getElementById('solutionFilter');
                    
                    if (filterInput) {
                        filterInput.addEventListener('input', applyFilter);
                    }
                    
                    // Setup standardized table sorting with default sort by "started" descending
                    setupTableSorting('importJobsTable', 'started', 'desc');
                }
                
                // Custom filter for import jobs - extends the standardized sorting
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
                            <div class="filter-controls">
                                <input type="text" id="solutionFilter" placeholder="Filter by solution name..." class="filter-input" />
                            </div>
                            <div class="table-container" id="tableContainer">
                                <table class="data-table" id="importJobsTable">
                                    <thead>
                                        <tr>
                                            <th class="sortable" data-column="solutionName">
                                                Solution Name <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="progress">
                                                Progress <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="started">
                                                Started <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="completed">
                                                Completed <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="status">
                                                Status <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="importContext">
                                                Import Context <span class="sort-indicator"></span>
                                            </th>
                                            <th class="sortable" data-column="operationContext">
                                                Operation Context <span class="sort-indicator"></span>
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
                                <td data-column="solutionName">
                                    <a class="solution-name-link" onclick="showJobDetails('\${job.importjobid}', '\${job.solutionname || 'Unknown'}')">
                                        \${job.solutionname || 'Unknown'}
                                    </a>
                                </td>
                                <td data-column="progress" data-sort-value="\${job.progress || 0}">
                                    <span class="progress-text">\${job.progress || 0}%</span>
                                </td>
                                <td data-column="started" data-sort-value="\${job.startedon}"><div class="time-info">\${startedOn}</div></td>
                                <td data-column="completed" data-sort-value="\${job.completedon || ''}"><div class="time-info">\${completedOn}</div></td>
                                <td data-column="status">\${statusBadge}</td>
                                <td data-column="importContext"><div class="context-info">\${job.importcontext || 'N/A'}</div></td>
                                <td data-column="operationContext"><div class="context-info">\${job.operationcontext || 'N/A'}</div></td>
                            </tr>
                        \`;
                    });
                    
                    if (!isAppending) {
                        tableHtml += '</tbody></table></div>';
                        content.innerHTML = tableHtml;
                        
                        // Setup filter and sort functionality
                        setupFilterAndSort();
                        
                        // Setup responsive table scroll detection
                        setupTableScrollDetection();
                        
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
                        // The standardized sorting system will automatically handle re-sorting
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

                // ===== STANDARDIZED TABLE SORTING FUNCTIONS =====
                let currentSort = { column: null, direction: 'asc' };
                
                function setupTableSorting(tableId, defaultSortColumn = null, defaultDirection = 'desc') {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    if (defaultSortColumn) {
                        currentSort = { column: defaultSortColumn, direction: defaultDirection };
                    }
                    
                    const headers = table.querySelectorAll('th.sortable');
                    headers.forEach(header => {
                        header.addEventListener('click', () => {
                            const column = header.dataset.column;
                            sortTable(tableId, column);
                        });
                    });
                    
                    if (defaultSortColumn) {
                        applySortIndicators(tableId, defaultSortColumn, defaultDirection);
                    }
                }
                
                function sortTable(tableId, column) {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    const tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    
                    if (currentSort.column === column) {
                        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSort.column = column;
                        currentSort.direction = 'asc';
                    }
                    
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    
                    rows.sort((a, b) => {
                        const aCell = a.querySelector(\`[data-column="\${column}"]\`);
                        const bCell = b.querySelector(\`[data-column="\${column}"]\`);
                        
                        if (!aCell || !bCell) return 0;
                        
                        const aValue = getSortValue(aCell);
                        const bValue = getSortValue(bCell);
                        
                        let comparison = 0;
                        
                        if (typeof aValue === 'number' && typeof bValue === 'number') {
                            comparison = aValue - bValue;
                        } else if (aValue instanceof Date && bValue instanceof Date) {
                            comparison = aValue.getTime() - bValue.getTime();
                        } else {
                            const aStr = String(aValue).toLowerCase();
                            const bStr = String(bValue).toLowerCase();
                            comparison = aStr.localeCompare(bStr);
                        }
                        
                        return currentSort.direction === 'desc' ? -comparison : comparison;
                    });
                    
                    tbody.innerHTML = '';
                    rows.forEach(row => tbody.appendChild(row));
                    
                    applySortIndicators(tableId, column, currentSort.direction);
                }
                
                function getSortValue(cell) {
                    if (cell.hasAttribute('data-sort-value')) {
                        const value = cell.getAttribute('data-sort-value');
                        
                        const num = parseFloat(value);
                        if (!isNaN(num)) return num;
                        
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) return date;
                        
                        return value;
                    }
                    
                    const text = cell.textContent.trim();
                    
                    const num = parseFloat(text);
                    if (!isNaN(num)) return num;
                    
                    const date = new Date(text);
                    if (!isNaN(date.getTime())) return date;
                    
                    return text;
                }
                
                function applySortIndicators(tableId, sortColumn, sortDirection) {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    const headers = table.querySelectorAll('th.sortable');
                    headers.forEach(header => {
                        header.classList.remove('sort-asc', 'sort-desc');
                        const indicator = header.querySelector('.sort-indicator');
                        if (indicator) {
                            indicator.textContent = '';
                        }
                    });
                    
                    const currentHeader = table.querySelector(\`th[data-column="\${sortColumn}"]\`);
                    if (currentHeader) {
                        currentHeader.classList.add(\`sort-\${sortDirection}\`);
                        
                        let indicator = currentHeader.querySelector('.sort-indicator');
                        if (!indicator) {
                            indicator = document.createElement('span');
                            indicator.className = 'sort-indicator';
                            currentHeader.appendChild(indicator);
                        }
                    }
                }
            </script>`;
    }
}
