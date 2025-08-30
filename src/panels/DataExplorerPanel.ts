import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { DataverseQueryService, EntityMetadata, QueryOptions, FilterOperator } from '../services/DataverseQueryService';
import { ComponentFactory } from '../components/ComponentFactory';

export class DataExplorerPanel extends BasePanel {
    public static readonly viewType = 'dataExplorer';

    private _selectedEnvironmentId: string | undefined;
    private _selectedEntity: EntityMetadata | undefined;
    private _queryService: DataverseQueryService;
    private _currentFilters: QueryOptions = {};
    private _nextLink: string | undefined;
    private _hasMore: boolean = false;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(DataExplorerPanel.viewType);
        if (existing) return;
        DataExplorerPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: DataExplorerPanel.viewType,
            title: 'Data Explorer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new DataExplorerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: DataExplorerPanel.viewType,
            title: 'Data Explorer'
        });

        this._queryService = ServiceFactory.getDataverseQueryService();
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadEntities':
                await this.handleLoadEntities(message.environmentId);
                break;

            case 'loadEntityFields':
                await this.handleLoadEntityFields(message.environmentId, message.entityLogicalName);
                break;

            case 'queryData':
                await this.handleQueryData(message.environmentId, message.entitySetName, message.options);
                break;

            case 'loadNextPage':
                await this.handleLoadNextPage();
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            // Get previously selected environment from state
            const cachedState = await this._stateService.getPanelState(DataExplorerPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });

            // If we have a selected environment, load entities
            if (selectedEnvironmentId) {
                await this.handleLoadEntities(selectedEnvironmentId);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load environments';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadEntities(environmentId: string): Promise<void> {
        if (!environmentId) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this._selectedEnvironmentId = environmentId;
            
            // Save selected environment to state
            await this._stateService.savePanelState(DataExplorerPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

            const entities = await this._queryService.getEntities(environmentId);
            
            this._panel.webview.postMessage({
                action: 'entitiesLoaded',
                data: entities
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entities';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadEntityFields(environmentId: string, entityLogicalName: string): Promise<void> {
        if (!environmentId || !entityLogicalName) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID and entity logical name are required'
            });
            return;
        }

        try {
            const fields = await this._queryService.getEntityFields(environmentId, entityLogicalName);
            
            this._panel.webview.postMessage({
                action: 'fieldsLoaded',
                data: fields
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entity fields';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleQueryData(environmentId: string, entitySetName: string, options?: QueryOptions): Promise<void> {
        console.log('handleQueryData called with:', { environmentId, entitySetName, options });
        
        if (!environmentId || !entitySetName) {
            console.log('Missing required parameters');
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID and entity set name are required'
            });
            return;
        }

        try {
            // Store current filters
            this._currentFilters = options || {};
            
            // Apply proper OData pagination using Prefer header
            const queryOptions: QueryOptions = {
                ...this._currentFilters,
                maxPageSize: 200
            };
            
            console.log('Executing query with options:', queryOptions);

            const result = await this._queryService.queryRecords(environmentId, entitySetName, queryOptions);
            
            console.log('Query completed. Result count:', result.value?.length || 0);
            console.log('Total count:', result.count);
            console.log('Has more:', result.hasMore);
            console.log('Next link:', result.nextLink ? 'Present' : 'None');
            
            // Store pagination state
            this._nextLink = result.nextLink;
            this._hasMore = result.hasMore;
            
            const responseMessage = {
                action: 'dataQueried',
                data: result.value,
                count: result.count,
                hasMore: this._hasMore,
                pageSize: 200
            };
            
            console.log('Sending dataQueried response with', responseMessage.data?.length || 0, 'records');
            this._panel.webview.postMessage(responseMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to query data';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadNextPage(): Promise<void> {
        console.log('handleLoadNextPage called');
        console.log('selectedEnvironmentId:', this._selectedEnvironmentId);
        console.log('nextLink exists:', !!this._nextLink);
        console.log('nextLink preview:', this._nextLink?.substring(0, 100) + '...');

        if (!this._selectedEnvironmentId || !this._nextLink) {
            console.log('Missing environment ID or next link, aborting');
            return;
        }

        try {
            console.log('Calling queryNextPage...');
            const result = await this._queryService.queryNextPage(this._selectedEnvironmentId, this._nextLink);
            
            console.log('queryNextPage returned:', result.value?.length || 0, 'records');
            console.log('New nextLink exists:', !!result.nextLink);
            console.log('New hasMore:', result.hasMore);
            
            // Update pagination state
            this._nextLink = result.nextLink;
            this._hasMore = result.hasMore;
            
            const responseMessage = {
                action: 'nextPageLoaded',
                data: result.value,
                hasMore: this._hasMore
            };
            
            console.log('Sending nextPageLoaded response with', responseMessage.data?.length || 0, 'records');
            this._panel.webview.postMessage(responseMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load next page';
            console.log('Error in handleLoadNextPage:', errorMessage);
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
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
            <title>Data Explorer</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>

                .query-builder {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    align-items: center;
                    padding: 12px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                }

                .entity-selector {
                    flex: 1;
                    min-width: 200px;
                }

                .entity-selector select {
                    width: 100%;
                    padding: 6px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }

                .view-selector {
                    margin-top: 12px;
                }

                .view-selector label {
                    display: block;
                    margin-bottom: 4px;
                    font-weight: 500;
                }

                .view-selector select {
                    width: 200px;
                    padding: 4px 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }

                .query-actions {
                    display: flex;
                    gap: 8px;
                }

                .btn-primary {
                    padding: 6px 12px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }

                .btn-primary:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .results-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    min-height: 0; /* Important for flex child to shrink */
                }

                .table-container {
                    flex: 1;
                    overflow: auto;
                    min-height: 0; /* Important for flex child to shrink */
                }

                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .data-table thead {
                    position: sticky;
                    top: 0;
                    background: var(--vscode-editor-background);
                    z-index: 1;
                }

                .data-table tfoot {
                    position: sticky;
                    bottom: 0;
                    background: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-panel-border);
                    z-index: 1;
                }

                .table-footer {
                    padding: 12px !important;
                }

                .footer-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                }

                .record-count {
                    font-size: 13px;
                    color: var(--vscode-foreground);
                }

                .load-more-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 16px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                }

                .load-more-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .load-more-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .all-loaded {
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }

                .data-table th,
                .data-table td {
                    padding: 8px 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .data-table th {
                    font-weight: 600;
                    background: var(--vscode-list-hoverBackground);
                }

                .data-table tbody tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }


                .pagination {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .pagination button {
                    padding: 4px 8px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }

                .pagination button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .entity-info {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                #statusMessage {
                    padding: 8px;
                    margin: 8px 0;
                    border-radius: 4px;
                    display: none;
                }

                #statusMessage.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    display: block;
                }

                #statusMessage.info {
                    background: var(--vscode-inputValidation-infoBackground);
                    border: 1px solid var(--vscode-inputValidation-infoBorder);
                    display: block;
                }
                
                /* Loading Indicator */
                .loading-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 20px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 4px;
                    margin: 20px 0;
                }
                
                .loading-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--vscode-descriptionForeground);
                    border-top: 2px solid var(--vscode-button-background);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .loading-text {
                    color: var(--vscode-foreground);
                    font-size: 14px;
                    font-weight: 500;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Footer loading state */
                .footer-loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                
                .footer-loading .loading-spinner {
                    width: 16px;
                    height: 16px;
                    border-width: 1px;
                }
                
                /* Table wrapper and footer positioning */
                .table-wrapper {
                    flex: 1;
                    overflow: auto;
                }
                
                .data-table-footer {
                    background: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-editorWidget-border);
                    padding: 12px 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                    flex-shrink: 0;
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                }
                
                .footer-load-more {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }
                
                .footer-load-more:hover:not(:disabled) {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .footer-load-more:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>
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
                <h1 class="title">Data Explorer</h1>
            </div>

            <!-- Status Message -->
            <div id="statusMessage" style="display: none;"></div>
            
            <!-- Query Builder -->
            <div class="query-builder">
                <div class="entity-selector">
                    <label for="entitySelect">Entity:</label>
                    <select id="entitySelect">
                        <option value="">Select an entity...</option>
                    </select>
                    <div id="entityInfo" class="entity-info"></div>
                </div>
                
                <div class="view-selector">
                    <label for="viewSelect">View:</label>
                    <select id="viewSelect" disabled>
                        <option value="allrecords">All Records (No View)</option>
                    </select>
                </div>
                
                <div class="query-actions">
                    <button id="queryButton" class="btn-primary" disabled>Query Data</button>
                    <button id="refreshButton" class="btn-primary">Refresh Entities</button>
                </div>
            </div>
            
            <!-- Results Container using content div for flex layout -->
            <div id="content">
                <div id="resultsContainer"></div>
            </div>


            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                let currentEntities = [];
                let currentEntity = null;
                let currentRecords = [];
                
                // Global state for table footer
                window.dataExplorerHasMore = false;
                
                // Initialize panel with PanelUtils 
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to explore data...'
                });
                
                // Restore our proper content structure after PanelUtils overwrites it
                function restoreContentStructure() {
                    const contentDiv = document.getElementById('content');
                    if (contentDiv) {
                        // Remove results header, just keep the results container
                        contentDiv.innerHTML = '<div id="resultsContainer"><p style="padding: 20px; text-align: center;">Select an environment to explore data...</p></div>';
                    }
                }
                
                // Restore content structure after a short delay to let PanelUtils finish
                setTimeout(restoreContentStructure, 100);
                
                // Note: Using document.getElementById() directly in functions for reliability
                
                // Wait for DOM to be ready and verify elements exist
                function waitForElement(selector, callback, maxAttempts = 50) {
                    let attempts = 0;
                    const checkElement = () => {
                        const element = document.getElementById(selector);
                        if (element) {
                            callback();
                        } else if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(checkElement, 100);
                        } else {
                            console.error('Element not found after', maxAttempts, 'attempts:', selector);
                        }
                    };
                    checkElement();
                }
                
                // Load environments on startup after ensuring DOM is ready
                document.addEventListener('DOMContentLoaded', () => {
                    console.log('DOMContentLoaded fired');
                    console.log('resultsContainer exists:', !!document.getElementById('resultsContainer'));
                    console.log('content exists:', !!document.getElementById('content'));
                    
                    const contentDiv = document.getElementById('content');
                    if (contentDiv) {
                        console.log('Content div innerHTML:', contentDiv.innerHTML);
                        console.log('Content div children count:', contentDiv.children.length);
                        for (let i = 0; i < contentDiv.children.length; i++) {
                            console.log('Child', i, ':', contentDiv.children[i].tagName, contentDiv.children[i].id, contentDiv.children[i].className);
                        }
                    }
                    
                    // Load environments
                    panelUtils.loadEnvironments();
                });
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        loadEntities(environmentId);
                    } else {
                        clearEntitySelect();
                        clearResults();
                    }
                }

                function showStatus(message, type = 'info') {
                    statusMessage.textContent = message;
                    statusMessage.className = type;
                    if (type === 'info') {
                        setTimeout(() => {
                            statusMessage.style.display = 'none';
                        }, 3000);
                    }
                }
                
                function loadEntities(environmentId) {
                    showStatus('Loading entities...', 'info');
                    PanelUtils.sendMessage('loadEntities', { environmentId });
                }
                
                function clearEntitySelect() {
                    const entitySelect = document.getElementById('entitySelect');
                    const entityInfo = document.getElementById('entityInfo');
                    const queryButton = document.getElementById('queryButton');
                    if (entitySelect) entitySelect.innerHTML = '<option value="">Select an entity...</option>';
                    if (entityInfo) entityInfo.textContent = '';
                    if (queryButton) queryButton.disabled = true;
                    currentEntity = null;
                }
                
                function clearResults() {
                    const container = document.getElementById('resultsContainer');
                    if (container) container.innerHTML = '';
                }
                
                function showLoadingIndicator(message) {
                    message = message || 'Loading data...';
                    const container = document.getElementById('resultsContainer');
                    if (container) {
                        container.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><div class="loading-text">' + message + '</div></div>';
                    } else {
                        console.error('resultsContainer not found');
                    }
                }
                
                function showFooterLoadingIndicator(message) {
                    message = message || 'Loading more data...';
                    const existingFooter = document.querySelector('.data-table-footer');
                    if (existingFooter) {
                        const loadMoreBtn = existingFooter.querySelector('.footer-load-more');
                        if (loadMoreBtn) {
                            loadMoreBtn.style.display = 'none';
                        }
                        const loadingDiv = document.createElement('div');
                        loadingDiv.className = 'footer-loading';
                        loadingDiv.innerHTML = '<div class="loading-spinner"></div><span>' + message + '</span>';
                        existingFooter.appendChild(loadingDiv);
                    }
                }
                
                function hideFooterLoadingIndicator() {
                    const loadingDiv = document.querySelector('.footer-loading');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                    const loadMoreBtn = document.querySelector('.footer-load-more');
                    if (loadMoreBtn) {
                        loadMoreBtn.style.display = 'inline-block';
                    }
                }
                
                // Entity selection
                const entitySelect = document.getElementById('entitySelect');
                if (entitySelect) {
                    entitySelect.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue) {
                        currentEntity = currentEntities.find(entity => entity.entitySetName === selectedValue);
                        if (currentEntity) {
                            const queryBtn = document.getElementById('queryButton');
                            const entityInfoElement = document.getElementById('entityInfo');
                            if (queryBtn) queryBtn.disabled = false;
                            // Show entity info
                            let info = 'Type: ' + (currentEntity.isCustomEntity ? 'Custom' : 'System');
                            if (currentEntity.isVirtualEntity) {
                                info += ' (Virtual)';
                            }
                            if (currentEntity.description) {
                                info += ' - ' + currentEntity.description;
                            }
                            if (entityInfoElement) entityInfoElement.textContent = info;
                        }
                    } else {
                        const queryBtn = document.getElementById('queryButton');
                        const entityInfoElement = document.getElementById('entityInfo');
                        if (queryBtn) queryBtn.disabled = true;
                        currentEntity = null;
                        if (entityInfoElement) entityInfoElement.textContent = '';
                    }
                });
                }
                
                // Query button
                const queryButton = document.getElementById('queryButton');
                if (queryButton) {
                    queryButton.addEventListener('click', () => {
                    console.log('Query Data button clicked');
                    console.log('Current Environment ID:', currentEnvironmentId);
                    console.log('Current Entity:', currentEntity);
                    
                    if (currentEnvironmentId && currentEntity) {
                        // Show loading indicator
                        showLoadingIndicator('Querying data...');
                        const queryBtn = document.getElementById('queryButton');
                        if (queryBtn) queryBtn.disabled = true;
                        showStatus('Querying data...', 'info');
                        const queryMessage = {
                            environmentId: currentEnvironmentId,
                            entitySetName: currentEntity.entitySetName,
                            options: {
                                // TODO: Add filters from UI
                            }
                        };
                        
                        console.log('Sending queryData message:', queryMessage);
                        PanelUtils.sendMessage('queryData', queryMessage);
                    }
                });
                }
                
                // Refresh button
                const refreshButton = document.getElementById('refreshButton');
                if (refreshButton) {
                    refreshButton.addEventListener('click', () => {
                        if (currentEnvironmentId) {
                            loadEntities(currentEnvironmentId);
                        }
                    });
                }
                
                // Load More Pagination (delegated to footer button)
                document.addEventListener('click', (event) => {
                    if (event.target && event.target.id === 'loadMoreFooter') {
                        console.log('Load More button clicked');
                        console.log('Current records count before Load More:', currentRecords.length);
                        console.log('Sending loadNextPage message...');
                        
                        // Show footer loading indicator
                        showFooterLoadingIndicator('Loading more records...');
                        
                        PanelUtils.sendMessage('loadNextPage', {});
                    }
                });
                
                // Setup message handlers
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                        }
                    },
                    
                    'entitiesLoaded': (message) => {
                        currentEntities = message.data;
                        clearEntitySelect();
                        
                        // Sort entities by display name
                        currentEntities.sort((a, b) => a.displayName.localeCompare(b.displayName));
                        
                        // Populate entity select
                        currentEntities.forEach(entity => {
                            const option = document.createElement('option');
                            option.value = entity.entitySetName;
                            option.textContent = entity.displayName + ' (' + entity.logicalName + ')';
                            entitySelect.appendChild(option);
                        });
                        
                        statusMessage.style.display = 'none';
                    },
                    
                    'dataQueried': (message) => {
                        console.log('Received dataQueried message:', message);
                        console.log('Data received:', message.data?.length || 0, 'records');
                        
                        // Re-enable query button and hide status
                        const queryBtn = document.getElementById('queryButton');
                        const statusMsg = document.getElementById('statusMessage');
                        if (queryBtn) queryBtn.disabled = false;
                        if (statusMsg) statusMsg.style.display = 'none';
                        
                        const { data, count, hasMore, pageSize } = message;
                        
                        // Reset table and update records
                        currentRecords = data || [];
                        console.log('Current records set to:', currentRecords.length, 'items');
                        
                        // Update global state for footer
                        window.dataExplorerHasMore = hasMore;
                        
                        // Display results in table
                        console.log('About to display results. Data length:', data?.length || 0);
                        if (data && data.length > 0) {
                            console.log('Calling displayResults with', data.length, 'records');
                            displayResults(data);
                        } else {
                            console.log('No data to display, showing empty message');
                            const container = document.getElementById('resultsContainer');
                            if (container) {
                                container.innerHTML = '<p style="padding: 20px; text-align: center;">No records found</p>';
                            }
                        }
                        
                        statusMessage.style.display = 'none';
                    },
                    
                    'nextPageLoaded': (message) => {
                        const { data, hasMore } = message;
                        
                        console.log('nextPageLoaded: Received', data?.length || 0, 'new records');
                        console.log('nextPageLoaded: Current total before concat:', currentRecords.length);
                        
                        // Hide footer loading indicator
                        hideFooterLoadingIndicator();
                        
                        // Append new data to current records
                        currentRecords = currentRecords.concat(data || []);
                        console.log('nextPageLoaded: Current total after concat:', currentRecords.length);
                        
                        // Update global state for footer
                        window.dataExplorerHasMore = hasMore;
                        
                        // Update the display with all records
                        if (currentRecords.length > 0) {
                            displayResults(currentRecords);
                        }
                    },
                    
                    'error': (message) => {
                        showStatus(message.message, 'error');
                    }
                });
                
                function displayResults(data) {
                    console.log('displayResults called with:', data?.length || 0, 'records');
                    console.log('First record sample:', data?.[0]);
                    console.log('Looking for resultsContainer...');
                    console.log('Document:', document);
                    console.log('All elements with id resultsContainer:', document.querySelectorAll('#resultsContainer'));
                    console.log('Content div:', document.getElementById('content'));
                    
                    if (!data || data.length === 0) {
                        console.log('No data provided, showing empty message');
                        const container = document.getElementById('resultsContainer');
                        if (container) {
                            container.innerHTML = '<p style="padding: 20px; text-align: center;">No records found</p>';
                        } else {
                            console.error('resultsContainer not found for empty data case');
                        }
                        return;
                    }
                    
                    // Get all unique columns from the data (limit to first 10 most common)
                    const columnCounts = {};
                    data.forEach(record => {
                        Object.keys(record).forEach(key => {
                            // Skip OData metadata fields
                            if (!key.startsWith('@') && !key.startsWith('_')) {
                                columnCounts[key] = (columnCounts[key] || 0) + 1;
                            }
                        });
                    });
                    
                    // Sort by frequency and take top 10 columns
                    const columnArray = Object.entries(columnCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([key]) => key);
                    
                    // Always include primary name attribute if it exists
                    if (currentEntity?.primaryNameAttribute && !columnArray.includes(currentEntity.primaryNameAttribute)) {
                        columnArray.unshift(currentEntity.primaryNameAttribute);
                    }
                    
                    // Prepare data for table
                    const tableData = data.map(record => {
                        const row = { 
                            id: record[currentEntity?.primaryIdAttribute || 'id'] || record['@odata.etag'] || Math.random().toString()
                        };
                        columnArray.forEach(col => {
                            let value = record[col];
                            // Format lookup fields
                            if (typeof value === 'object' && value !== null) {
                                value = JSON.stringify(value);
                            }
                            row[col] = value || '';
                        });
                        return row;
                    });
                    
                    // Create columns config for ComponentFactory
                    const columns = columnArray.map(col => ({
                        key: col,
                        label: col,
                        sortable: true,
                        width: '150px'
                    }));
                    
                    console.log('Building table HTML with proper footer...');
                    
                    // Create a wrapper div with proper CSS structure
                    let tableHtml = '<div class="table-wrapper">';
                    tableHtml += '<table id="resultsTable" class="data-table">';
                    
                    // Add header
                    tableHtml += '<thead><tr>';
                    columnArray.forEach(col => {
                        const headerText = col.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                        tableHtml += '<th data-column="' + col + '" class="sortable">' + headerText + '</th>';
                    });
                    tableHtml += '</tr></thead>';
                    
                    // Add body
                    tableHtml += '<tbody id="resultsTableBody">';
                    tableData.forEach(row => {
                        tableHtml += '<tr>';
                        columnArray.forEach(col => {
                            const value = row[col] || '';
                            tableHtml += '<td>' + value + '</td>';
                        });
                        tableHtml += '</tr>';
                    });
                    tableHtml += '</tbody>';
                    tableHtml += '</table>';
                    tableHtml += '</div>';
                    
                    // Add footer outside table wrapper for proper positioning
                    const hasMore = window.dataExplorerHasMore || false;
                    tableHtml += '<div class="data-table-footer">';
                    tableHtml += '<span class="footer-record-count">Showing ' + tableData.length + ' records</span>';
                    
                    if (hasMore) {
                        tableHtml += '<button id="loadMoreFooter" class="footer-load-more">Load More</button>';
                    } else {
                        tableHtml += '<span class="footer-record-count">All records loaded</span>';
                    }
                    tableHtml += '</div>';
                    
                    const container = document.getElementById('resultsContainer');
                    if (container) {
                        container.innerHTML = tableHtml;
                        console.log('Table HTML built and inserted, rows:', tableData.length);
                    } else {
                        console.error('resultsContainer not found in displayResults');
                    }
                    
                    // Initialize table functionality
                    TableUtils.initializeTable('resultsTable', {
                        data: tableData,
                        onRowClick: (rowData) => {
                            console.log('Row clicked:', rowData);
                        }
                    });
                    console.log('Table initialized successfully');
                }
            </script>
        </body>
        </html>`;
    }
}