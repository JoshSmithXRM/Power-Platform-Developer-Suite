import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { DataverseQueryService, EntityMetadata, QueryOptions, FilterOperator } from '../services/DataverseQueryService';
import { ComponentFactory } from '../components/ComponentFactory';
import { FetchXmlParser } from '../services/FetchXmlParser';
import { DataverseMetadataService } from '../services/DataverseMetadataService';

export class DataExplorerPanel extends BasePanel {
    public static readonly viewType = 'dataExplorer';

    private _selectedEnvironmentId: string | undefined;
    private _selectedEntity: EntityMetadata | undefined;
    private _queryService: DataverseQueryService;
    private _metadataService: DataverseMetadataService;
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
        this._metadataService = ServiceFactory.getDataverseMetadataService();
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

            case 'loadEntityViews':
                await this.handleLoadEntityViews(message.environmentId, message.entityLogicalName);
                break;

            case 'queryData':
                await this.handleQueryData(message.environmentId, message.entitySetName, message.options, message.selectedView);
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
            // Load both fields and metadata concurrently
            const [fields, attributes] = await Promise.all([
                this._queryService.getEntityFields(environmentId, entityLogicalName),
                this._metadataService.getEntityAttributes(environmentId, entityLogicalName)
            ]);
            
            console.log(`Loaded ${fields.length} fields and ${attributes.length} attributes for entity: ${entityLogicalName}`);
            
            this._panel.webview.postMessage({
                action: 'fieldsLoaded',
                data: fields
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entity fields';
            console.error('Error in handleLoadEntityFields:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadEntityViews(environmentId: string, entityLogicalName: string): Promise<void> {
        if (!environmentId || !entityLogicalName) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID and entity logical name are required'
            });
            return;
        }

        try {
            const views = await this._queryService.getEntityViews(environmentId, entityLogicalName);
            
            this._panel.webview.postMessage({
                action: 'viewsLoaded',
                data: views
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entity views';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleQueryData(environmentId: string, entitySetName: string, options?: QueryOptions, selectedView?: any): Promise<void> {
        console.log('handleQueryData called with:', { environmentId, entitySetName, options, selectedView });
        console.log('selectedView.fetchXml:', selectedView?.fetchXml?.substring(0, 200) + '...');
        console.log('selectedView.layoutXml:', selectedView?.layoutXml?.substring(0, 200) + '...');
        
        if (!environmentId || !entitySetName) {
            console.log('Missing required parameters');
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID and entity set name are required'
            });
            return;
        }

        try {
            let result: any;
            let layoutColumns: any[] = [];

            // If a view is selected with FetchXML, use direct FetchXML execution (preferred approach)
            if (selectedView?.fetchXml) {
                console.log('Using direct FetchXML execution for view:', selectedView.name);
                
                // Parse LayoutXML if available
                if (selectedView.layoutXml) {
                    console.log('Parsing view LayoutXML:', selectedView.layoutXml);
                    const parsedLayout = FetchXmlParser.parseLayoutXml(selectedView.layoutXml);
                    if (parsedLayout) {
                        layoutColumns = parsedLayout.columns;
                        console.log('Parsed layout columns:', layoutColumns);
                    }
                }
                
                // Execute FetchXML directly - this bypasses OData conversion entirely
                result = await this._queryService.executeFetchXml(environmentId, selectedView.fetchXml);
                
                // For FetchXML queries, pagination is handled differently - we'll need to track the original FetchXML
                this._currentFilters = { fetchXml: selectedView.fetchXml };
                this._nextLink = undefined; // FetchXML pagination works differently
                this._hasMore = false; // TODO: Implement FetchXML pagination if needed
                
            } else {
                // Use OData approach for custom queries without views
                console.log('Using OData approach for custom query');
                
                let queryOptions: QueryOptions = options || {};
                
                // Apply proper OData pagination using Prefer header
                queryOptions = {
                    ...queryOptions,
                    maxPageSize: 200
                };
                
                // Store current filters for pagination
                this._currentFilters = queryOptions;
                
                console.log('Executing OData query with options:', queryOptions);
                result = await this._queryService.queryRecords(environmentId, entitySetName, queryOptions, this._metadataService);
                
                // Store pagination state for OData queries
                this._nextLink = result.nextLink;
                this._hasMore = result.hasMore;
            }
            
            console.log('Query completed. Result count:', result.value?.length || 0);
            console.log('Total count:', result.count);
            console.log('Has more:', result.hasMore);
            console.log('Next link:', result.nextLink ? 'Present' : 'None');
            
            const responseMessage = {
                action: 'dataQueried',
                data: result.value,
                count: result.count,
                hasMore: this._hasMore,
                pageSize: 200,
                layoutColumns: layoutColumns.length > 0 ? layoutColumns : undefined
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
                    align-items: flex-start;  /* Changed from center to flex-start */
                    padding: 12px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                }

                .entity-selector {
                    flex: 1;
                    min-width: 200px;
                }

                .entity-selector label,
                .view-selector label {
                    display: block;
                    margin-bottom: 4px;
                    font-weight: 500;
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
                    flex: 1;
                    min-width: 200px;
                }

                .view-selector select {
                    width: 100%;
                    padding: 6px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }

                .query-actions {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;  /* Align buttons to bottom of their container */
                    margin-top: 20px;  /* Add consistent spacing from labels/selects above */
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

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: var(--vscode-button-background);
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
                    font-size: 0.85em;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                    height: 1.2em;  /* Fixed height to prevent layout shift */
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
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
                
                /* FetchXML Builder Styles */
                .fetchxml-builder {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    margin: 16px 0;
                    padding: 16px;
                }

                .builder-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 12px;
                }

                .builder-header h3 {
                    margin: 0;
                    color: var(--vscode-foreground);
                    font-size: 16px;
                    font-weight: 600;
                }

                .builder-actions {
                    display: flex;
                    gap: 8px;
                }

                .builder-content {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .builder-section {
                    background: var(--vscode-list-hoverBackground);
                    padding: 12px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-editorWidget-border);
                }

                .builder-section h4 {
                    margin: 0 0 12px 0;
                    color: var(--vscode-foreground);
                    font-size: 14px;
                    font-weight: 600;
                }

                .filter-row, .sort-row {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    margin-bottom: 8px;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 3px;
                }

                .filter-row select, .sort-row select {
                    padding: 4px 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    font-size: 13px;
                    min-width: 120px;
                }

                .filter-row input[type="text"] {
                    padding: 4px 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    font-size: 13px;
                    flex: 1;
                    min-width: 150px;
                }

                .remove-filter-btn, .remove-sort-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .remove-filter-btn:hover, .remove-sort-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .columns-checkboxes {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 8px;
                    margin-top: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 3px;
                }

                .columns-checkboxes label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .columns-checkboxes input[type="checkbox"] {
                    margin: 0;
                }

                .btn-secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                }

                .btn-secondary:hover {
                    background: var(--vscode-button-hoverBackground);
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
                        <option value="">All Records (No Filter)</option>
                    </select>
                </div>
                
                <div class="query-actions">
                    <button id="queryButton" class="btn-primary" disabled>Query Data</button>
                    <button id="refreshButton" class="btn-primary">Refresh Entities</button>
                </div>
            </div>
            
            <!-- FetchXML Builder (hidden by default) -->
            <div id="fetchXmlBuilder" class="fetchxml-builder" style="display: none;">
                <div class="builder-header">
                    <h3>FetchXML Query Builder</h3>
                    <div class="builder-actions">
                        <button id="resetBuilderButton" class="btn-secondary">Reset</button>
                        <button id="previewFetchXmlButton" class="btn-secondary">Preview FetchXML</button>
                    </div>
                </div>
                
                <div class="builder-content">
                    <!-- Filters Section -->
                    <div class="builder-section">
                        <h4>Filters</h4>
                        <div id="filtersList" class="filters-list">
                            <!-- Filters will be added dynamically -->
                        </div>
                        <button id="addFilterButton" class="btn-secondary">Add Filter</button>
                    </div>
                    
                    <!-- Columns Section -->
                    <div class="builder-section">
                        <h4>Select Columns</h4>
                        <div id="columnsList" class="columns-list">
                            <div class="column-selection">
                                <label>
                                    <input type="checkbox" id="selectAllColumns" checked> Select All Columns
                                </label>
                            </div>
                            <div id="columnsCheckboxes" class="columns-checkboxes">
                                <!-- Column checkboxes will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sorting Section -->
                    <div class="builder-section">
                        <h4>Sort Order</h4>
                        <div id="sortsList" class="sorts-list">
                            <!-- Sort orders will be added dynamically -->
                        </div>
                        <button id="addSortButton" class="btn-secondary">Add Sort</button>
                    </div>
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
                let currentViews = [];
                let currentSelectedView = null;
                let currentLayoutColumns = null;
                
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
                            const viewSelect = document.getElementById('viewSelect');
                            
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
                            
                            // Clear and disable view selector while loading
                            if (viewSelect) {
                                viewSelect.innerHTML = '<option value="">Loading views...</option>';
                                viewSelect.disabled = true;
                            }
                            
                            // Load views for this entity
                            PanelUtils.sendMessage('loadEntityViews', {
                                environmentId: currentEnvironmentId,
                                entityLogicalName: currentEntity.logicalName
                            });
                        }
                    } else {
                        const queryBtn = document.getElementById('queryButton');
                        const entityInfoElement = document.getElementById('entityInfo');
                        const viewSelect = document.getElementById('viewSelect');
                        
                        if (queryBtn) queryBtn.disabled = true;
                        currentEntity = null;
                        if (entityInfoElement) entityInfoElement.textContent = '';
                        
                        // Reset view selector
                        if (viewSelect) {
                            viewSelect.innerHTML = '<option value="">All Records (No Filter)</option>';
                            viewSelect.disabled = true;
                        }
                        currentViews = [];
                        currentSelectedView = null;
                    }
                });
                }
                
                // View selection
                const viewSelect = document.getElementById('viewSelect');
                if (viewSelect) {
                    viewSelect.addEventListener('change', (e) => {
                        const selectedViewId = e.target.value;
                        if (selectedViewId === 'custom') {
                            // Custom Query selected - show FetchXML builder
                            currentSelectedView = {
                                id: 'custom',
                                name: 'Custom Query',
                                isCustom: true
                            };
                            console.log('Custom Query selected - showing FetchXML builder');
                            showFetchXmlBuilder();
                        } else if (selectedViewId) {
                            currentSelectedView = currentViews.find(v => v.id === selectedViewId);
                            console.log('View selected:', currentSelectedView?.name);
                            if (currentSelectedView) {
                                console.log('Selected view details:');
                                console.log('  - FetchXML:', currentSelectedView.fetchXml?.substring(0, 500));
                                console.log('  - LayoutXML:', currentSelectedView.layoutXml?.substring(0, 500));
                            }
                            hideFetchXmlBuilder();
                        } else {
                            currentSelectedView = null;
                            console.log('No view selected (All Records)');
                            hideFetchXmlBuilder();
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
                                // Note: View filtering will be implemented in Phase 2
                                // For now, we pass the view info but don't apply filters
                            },
                            selectedView: currentSelectedView  // Pass selected view for future use
                        };
                        
                        console.log('Sending queryData message:', queryMessage);
                        console.log('queryMessage.selectedView:', queryMessage.selectedView);
                        console.log('queryMessage.selectedView.fetchXml exists:', !!queryMessage.selectedView?.fetchXml);
                        console.log('queryMessage.selectedView.layoutXml exists:', !!queryMessage.selectedView?.layoutXml);
                        if (currentSelectedView) {
                            console.log('Query will use view:', currentSelectedView.name);
                            if (currentSelectedView.isCustom) {
                                console.log('Executing custom query');
                                executeCustomQuery();
                                return;
                            } else {
                                console.log('View FetchXML:', currentSelectedView.fetchXml);
                                console.log('View LayoutXML:', currentSelectedView.layoutXml);
                            }
                        } else {
                            console.log('Query will use no view (All Records)');
                        }
                        
                        // Additional logging to see what's actually being sent
                        console.log('Final queryMessage structure:', JSON.stringify(queryMessage, null, 2));
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
                    
                    'viewsLoaded': (message) => {
                        currentViews = message.data || [];
                        console.log('Views loaded in frontend:', currentViews);
                        
                        const viewSelect = document.getElementById('viewSelect');
                        
                        if (viewSelect) {
                            // Clear the select
                            viewSelect.innerHTML = '';
                            
                            // Add "All Records" option
                            const allOption = document.createElement('option');
                            allOption.value = '';
                            allOption.textContent = 'All Records (No Filter)';
                            viewSelect.appendChild(allOption);
                            
                            // Add "Custom Query" option
                            const customOption = document.createElement('option');
                            customOption.value = 'custom';
                            customOption.textContent = 'Custom Query (FetchXML Builder)';
                            viewSelect.appendChild(customOption);
                            
                            // Add each view
                            if (currentViews.length > 0) {
                                currentViews.forEach(view => {
                                    console.log('Adding view to dropdown:', view.name);
                                    console.log('  - FetchXML exists:', !!view.fetchXml);
                                    console.log('  - LayoutXML exists:', !!view.layoutXml);
                                    
                                    const option = document.createElement('option');
                                    option.value = view.id;
                                    option.textContent = view.name;
                                    if (view.isDefault) {
                                        option.textContent += ' (Default)';
                                    }
                                    viewSelect.appendChild(option);
                                });
                                
                                // Select the default view if there is one
                                const defaultView = currentViews.find(v => v.isDefault);
                                if (defaultView) {
                                    viewSelect.value = defaultView.id;
                                    currentSelectedView = defaultView;
                                    console.log('Default view selected:', defaultView.name);
                                }
                            }
                            
                            // Enable the select
                            viewSelect.disabled = false;
                        }
                    },
                    
                    'dataQueried': (message) => {
                        console.log('Received dataQueried message:', message);
                        console.log('Data received:', message.data?.length || 0, 'records');
                        
                        // Re-enable query button and hide status
                        const queryBtn = document.getElementById('queryButton');
                        const statusMsg = document.getElementById('statusMessage');
                        if (queryBtn) queryBtn.disabled = false;
                        if (statusMsg) statusMsg.style.display = 'none';
                        
                        const { data, count, hasMore, pageSize, layoutColumns } = message;
                        
                        // Reset table and update records
                        currentRecords = data || [];
                        currentLayoutColumns = layoutColumns;
                        console.log('Current records set to:', currentRecords.length, 'items');
                        console.log('Layout columns received:', layoutColumns);
                        
                        // Update global state for footer
                        window.dataExplorerHasMore = hasMore;
                        
                        // Display results in table
                        console.log('About to display results. Data length:', data?.length || 0);
                        if (data && data.length > 0) {
                            console.log('Calling displayResults with', data.length, 'records');
                            displayResults(data, layoutColumns);
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
                        
                        // Update the display with all records (preserve layout columns)
                        if (currentRecords.length > 0) {
                            displayResults(currentRecords, currentLayoutColumns);
                        }
                    },
                    
                    'fieldsLoaded': (message) => {
                        console.log('Fields loaded for entity:', message.data?.length || 0);
                        if (message.data && message.data.length > 0) {
                            // Populate column checkboxes in FetchXML builder
                            populateColumnCheckboxes(message.data);
                        }
                    },
                    
                    'error': (message) => {
                        showStatus(message.message, 'error');
                    }
                });
                
                function displayResults(data, layoutColumns) {
                    console.log('displayResults called with:', data?.length || 0, 'records');
                    console.log('Layout columns provided:', layoutColumns);
                    console.log('First record sample:', data?.[0]);
                    
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
                    
                    let columnArray = [];
                    
                    // Use layout columns if available, otherwise auto-detect
                    if (layoutColumns && layoutColumns.length > 0) {
                        console.log('Using layout columns from view definition');
                        columnArray = layoutColumns.map(col => col.name);
                    } else {
                        console.log('Auto-detecting columns from data');
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
                        columnArray = Object.entries(columnCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([key]) => key);
                    }
                    
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
                        tableHtml += '<th data-column="' + col + '" class="sortable">' + col + '</th>';
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

                // FetchXML Builder Functions
                let currentEntityFields = [];
                let fetchXmlBuilderFilters = [];
                let fetchXmlBuilderSorts = [];

                function showFetchXmlBuilder() {
                    const builder = document.getElementById('fetchXmlBuilder');
                    if (builder) {
                        builder.style.display = 'block';
                        initializeFetchXmlBuilder();
                    }
                }

                function hideFetchXmlBuilder() {
                    const builder = document.getElementById('fetchXmlBuilder');
                    if (builder) {
                        builder.style.display = 'none';
                    }
                }

                function initializeFetchXmlBuilder() {
                    if (!currentEntity) return;

                    // Clear existing state
                    fetchXmlBuilderFilters = [];
                    fetchXmlBuilderSorts = [];

                    // Load entity fields for the builder
                    loadEntityFieldsForBuilder();

                    // Setup event listeners for builder controls
                    setupBuilderEventListeners();
                }

                function loadEntityFieldsForBuilder() {
                    if (!currentEnvironmentId || !currentEntity) return;

                    vscode.postMessage({
                        action: 'loadEntityFields',
                        environmentId: currentEnvironmentId,
                        entityLogicalName: currentEntity.logicalName
                    });
                }

                function setupBuilderEventListeners() {
                    // Add Filter button
                    const addFilterBtn = document.getElementById('addFilterButton');
                    if (addFilterBtn) {
                        addFilterBtn.onclick = () => addFilter();
                    }

                    // Add Sort button
                    const addSortBtn = document.getElementById('addSortButton');
                    if (addSortBtn) {
                        addSortBtn.onclick = () => addSort();
                    }

                    // Reset button
                    const resetBtn = document.getElementById('resetBuilderButton');
                    if (resetBtn) {
                        resetBtn.onclick = () => resetBuilder();
                    }

                    // Preview FetchXML button
                    const previewBtn = document.getElementById('previewFetchXmlButton');
                    if (previewBtn) {
                        previewBtn.onclick = () => previewFetchXml();
                    }

                    // Select all columns checkbox
                    const selectAllBtn = document.getElementById('selectAllColumns');
                    if (selectAllBtn) {
                        selectAllBtn.onchange = (e) => toggleAllColumns(e.target.checked);
                    }
                }

                function populateColumnCheckboxes(fields) {
                    currentEntityFields = fields;
                    const container = document.getElementById('columnsCheckboxes');
                    if (!container) return;

                    container.innerHTML = '';
                    fields.forEach(field => {
                        const label = document.createElement('label');
                        label.innerHTML = \`
                            <input type="checkbox" value="\${field.logicalName}" checked>
                            \${field.displayName} (\${field.logicalName})
                        \`;
                        container.appendChild(label);
                    });
                }

                function addFilter() {
                    if (currentEntityFields.length === 0) return;

                    const filterId = 'filter_' + Date.now();
                    const filter = {
                        id: filterId,
                        field: '',
                        operator: 'eq',
                        value: ''
                    };

                    fetchXmlBuilderFilters.push(filter);
                    renderFilters();
                }

                function renderFilters() {
                    const container = document.getElementById('filtersList');
                    if (!container) return;

                    container.innerHTML = '';
                    fetchXmlBuilderFilters.forEach(filter => {
                        const filterDiv = document.createElement('div');
                        filterDiv.className = 'filter-row';
                        filterDiv.innerHTML = \`
                            <select onchange="updateFilter('\${filter.id}', 'field', this.value)">
                                <option value="">Select Field...</option>
                                \${currentEntityFields.map(f => 
                                    \`<option value="\${f.logicalName}" \${f.logicalName === filter.field ? 'selected' : ''}>\${f.displayName}</option>\`
                                ).join('')}
                            </select>
                            <select onchange="updateFilter('\${filter.id}', 'operator', this.value)">
                                <option value="eq" \${filter.operator === 'eq' ? 'selected' : ''}>Equals</option>
                                <option value="ne" \${filter.operator === 'ne' ? 'selected' : ''}>Not Equal</option>
                                <option value="like" \${filter.operator === 'like' ? 'selected' : ''}>Contains</option>
                                <option value="gt" \${filter.operator === 'gt' ? 'selected' : ''}>Greater Than</option>
                                <option value="ge" \${filter.operator === 'ge' ? 'selected' : ''}>Greater or Equal</option>
                                <option value="lt" \${filter.operator === 'lt' ? 'selected' : ''}>Less Than</option>
                                <option value="le" \${filter.operator === 'le' ? 'selected' : ''}>Less or Equal</option>
                                <option value="null" \${filter.operator === 'null' ? 'selected' : ''}>Is Null</option>
                                <option value="not-null" \${filter.operator === 'not-null' ? 'selected' : ''}>Is Not Null</option>
                            </select>
                            <input type="text" placeholder="Value" value="\${filter.value}" 
                                   onchange="updateFilter('\${filter.id}', 'value', this.value)"
                                   \${filter.operator === 'null' || filter.operator === 'not-null' ? 'disabled' : ''}>
                            <button class="remove-filter-btn" onclick="removeFilter('\${filter.id}')">Remove</button>
                        \`;
                        container.appendChild(filterDiv);
                    });
                }

                function addSort() {
                    if (currentEntityFields.length === 0) return;

                    const sortId = 'sort_' + Date.now();
                    const sort = {
                        id: sortId,
                        field: '',
                        direction: 'asc'
                    };

                    fetchXmlBuilderSorts.push(sort);
                    renderSorts();
                }

                function renderSorts() {
                    const container = document.getElementById('sortsList');
                    if (!container) return;

                    container.innerHTML = '';
                    fetchXmlBuilderSorts.forEach(sort => {
                        const sortDiv = document.createElement('div');
                        sortDiv.className = 'sort-row';
                        sortDiv.innerHTML = \`
                            <select onchange="updateSort('\${sort.id}', 'field', this.value)">
                                <option value="">Select Field...</option>
                                \${currentEntityFields.map(f => 
                                    \`<option value="\${f.logicalName}" \${f.logicalName === sort.field ? 'selected' : ''}>\${f.displayName}</option>\`
                                ).join('')}
                            </select>
                            <select onchange="updateSort('\${sort.id}', 'direction', this.value)">
                                <option value="asc" \${sort.direction === 'asc' ? 'selected' : ''}>Ascending</option>
                                <option value="desc" \${sort.direction === 'desc' ? 'selected' : ''}>Descending</option>
                            </select>
                            <button class="remove-sort-btn" onclick="removeSort('\${sort.id}')">Remove</button>
                        \`;
                        container.appendChild(sortDiv);
                    });
                }

                function updateFilter(filterId, property, value) {
                    const filter = fetchXmlBuilderFilters.find(f => f.id === filterId);
                    if (filter) {
                        filter[property] = value;
                        // Re-render if operator changed to update value field state
                        if (property === 'operator') {
                            renderFilters();
                        }
                    }
                }

                function updateSort(sortId, property, value) {
                    const sort = fetchXmlBuilderSorts.find(s => s.id === sortId);
                    if (sort) {
                        sort[property] = value;
                    }
                }

                function removeFilter(filterId) {
                    fetchXmlBuilderFilters = fetchXmlBuilderFilters.filter(f => f.id !== filterId);
                    renderFilters();
                }

                function removeSort(sortId) {
                    fetchXmlBuilderSorts = fetchXmlBuilderSorts.filter(s => s.id !== sortId);
                    renderSorts();
                }

                function toggleAllColumns(selectAll) {
                    const checkboxes = document.querySelectorAll('#columnsCheckboxes input[type="checkbox"]');
                    checkboxes.forEach(cb => cb.checked = selectAll);
                }

                function resetBuilder() {
                    fetchXmlBuilderFilters = [];
                    fetchXmlBuilderSorts = [];
                    renderFilters();
                    renderSorts();
                    
                    // Reset all columns to checked
                    const selectAll = document.getElementById('selectAllColumns');
                    if (selectAll) selectAll.checked = true;
                    toggleAllColumns(true);
                }

                function previewFetchXml() {
                    const selectedColumns = getSelectedColumns();
                    const fetchXml = generateFetchXml(selectedColumns, fetchXmlBuilderFilters, fetchXmlBuilderSorts);
                    
                    // Show preview in a dialog or console
                    console.log('Generated FetchXML:');
                    console.log(fetchXml);
                    
                    // For now, just alert the FetchXML - could be enhanced with a modal
                    alert('Generated FetchXML (check console for full XML):\\n\\n' + fetchXml.substring(0, 500) + '...');
                }

                function getSelectedColumns() {
                    const checkboxes = document.querySelectorAll('#columnsCheckboxes input[type="checkbox"]:checked');
                    return Array.from(checkboxes).map(cb => cb.value);
                }

                function generateFetchXml(columns, filters, sorts) {
                    if (!currentEntity) return '';

                    let xml = \`<fetch version="1.0" output-format="xml-platform" mapping="logical">\\n\`;
                    xml += \`  <entity name="\${currentEntity.logicalName}">\\n\`;
                    
                    // Add columns
                    if (columns && columns.length > 0) {
                        columns.forEach(col => {
                            xml += \`    <attribute name="\${col}" />\\n\`;
                        });
                    } else {
                        xml += \`    <all-attributes />\\n\`;
                    }
                    
                    // Add filters
                    if (filters.length > 0) {
                        xml += \`    <filter type="and">\\n\`;
                        filters.forEach(filter => {
                            if (filter.field && filter.operator) {
                                if (filter.operator === 'null' || filter.operator === 'not-null') {
                                    xml += \`      <condition attribute="\${filter.field}" operator="\${filter.operator}" />\\n\`;
                                } else if (filter.value) {
                                    xml += \`      <condition attribute="\${filter.field}" operator="\${filter.operator}" value="\${filter.value}" />\\n\`;
                                }
                            }
                        });
                        xml += \`    </filter>\\n\`;
                    }
                    
                    // Add sorts
                    if (sorts.length > 0) {
                        sorts.forEach(sort => {
                            if (sort.field) {
                                const descending = sort.direction === 'desc' ? ' descending="true"' : '';
                                xml += \`    <order attribute="\${sort.field}"\${descending} />\\n\`;
                            }
                        });
                    }
                    
                    xml += \`  </entity>\\n\`;
                    xml += \`</fetch>\`;
                    
                    return xml;
                }

                // Update the query functionality to handle custom FetchXML
                function executeCustomQuery() {
                    if (currentSelectedView && currentSelectedView.isCustom) {
                        const selectedColumns = getSelectedColumns();
                        const fetchXml = generateFetchXml(selectedColumns, fetchXmlBuilderFilters, fetchXmlBuilderSorts);
                        
                        // Create a synthetic view object with our generated FetchXML
                        const customView = {
                            id: 'custom',
                            name: 'Custom Query',
                            fetchXml: fetchXml,
                            layoutXml: null // We'll generate layout from selected columns
                        };
                        
                        console.log('Executing custom query with FetchXML:', fetchXml);
                        
                        vscode.postMessage({
                            action: 'queryData',
                            environmentId: currentEnvironmentId,
                            entitySetName: currentEntity.entitySetName,
                            selectedView: customView
                        });
                    }
                }
            </script>
        </body>
        </html>`;
    }
}