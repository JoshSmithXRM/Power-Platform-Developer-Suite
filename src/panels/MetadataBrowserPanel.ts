import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';
import { MetadataService, EntityDefinition, AttributeMetadata, OneToManyRelationshipMetadata, ManyToManyRelationshipMetadata, EntityKeyMetadata, EntityPrivilegeMetadata, OptionSetMetadata } from '../services/MetadataService';

export class MetadataBrowserPanel extends BasePanel {
    public static readonly viewType = 'metadataBrowser';

    private _selectedEnvironmentId: string | undefined;
    private _metadataService: MetadataService;
    private _selectedEntity: string | undefined;
    private _selectedTab: string | undefined;
    private _selectedDetailItem: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(MetadataBrowserPanel.viewType);
        if (existing) return;
        MetadataBrowserPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new MetadataBrowserPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser'
        });

        this._metadataService = ServiceFactory.getMetadataService();
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.action) {
                case 'loadEnvironments':
                    await this.handleLoadEnvironments();
                    break;

                case 'loadEntities':
                    await this.handleLoadEntities(message.environmentId);
                    break;

                case 'loadChoices':
                    await this.handleLoadChoices(message.environmentId);
                    break;

                case 'selectEntity':
                    await this.handleSelectEntity(message.environmentId, message.entityLogicalName);
                    break;

                case 'loadEntityTab':
                    await this.handleLoadEntityTab(message.environmentId, message.entityLogicalName, message.tabName);
                    break;

                case 'selectDetailItem':
                    await this.handleSelectDetailItem(message.environmentId, message.entityLogicalName, message.tabName, message.itemId);
                    break;

                case 'exportData':
                    await this.handleExportData(message.data, message.filename);
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

            // Get previously selected environment from state
            const cachedState = await this._stateService.getPanelState(MetadataBrowserPanel.viewType);
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

    private async handleLoadEntities(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        this._selectedEnvironmentId = environmentId;

        // Save environment selection
        await this.updateState({ selectedEnvironmentId: environmentId });

        const entities = await this._metadataService.getEntityDefinitions(environmentId);

        this.postMessage({
            action: 'entitiesLoaded',
            data: entities
        });
    }

    private async handleLoadChoices(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        const choices = await this._metadataService.getGlobalOptionSets(environmentId);

        this.postMessage({
            action: 'choicesLoaded',
            data: choices
        });
    }

    private async handleSelectEntity(environmentId: string, entityLogicalName: string): Promise<void> {
        if (!environmentId || !entityLogicalName) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID and Entity Logical Name are required'
            });
            return;
        }

        this._selectedEntity = entityLogicalName;
        this._selectedTab = undefined;
        this._selectedDetailItem = undefined;

        const entityMetadata = await this._metadataService.getEntityMetadata(environmentId, entityLogicalName);

        this.postMessage({
            action: 'entitySelected',
            data: entityMetadata
        });
    }

    private async handleLoadEntityTab(environmentId: string, entityLogicalName: string, tabName: string): Promise<void> {
        if (!environmentId || !entityLogicalName || !tabName) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID, Entity Logical Name, and Tab Name are required'
            });
            return;
        }

        this._selectedTab = tabName;
        this._selectedDetailItem = undefined;

        let data: any;

        switch (tabName) {
            case 'columns':
                data = await this._metadataService.getEntityAttributes(environmentId, entityLogicalName);
                break;
            case 'keys':
                data = await this._metadataService.getEntityKeys(environmentId, entityLogicalName);
                break;
            case 'oneToMany':
                data = await this._metadataService.getOneToManyRelationships(environmentId, entityLogicalName);
                break;
            case 'manyToOne':
                data = await this._metadataService.getManyToOneRelationships(environmentId, entityLogicalName);
                break;
            case 'manyToMany':
                data = await this._metadataService.getManyToManyRelationships(environmentId, entityLogicalName);
                break;
            case 'privileges':
                data = await this._metadataService.getEntityPrivileges(environmentId, entityLogicalName);
                break;
            default:
                throw new Error(`Unknown tab: ${tabName}`);
        }

        this.postMessage({
            action: 'entityTabLoaded',
            tabName: tabName,
            data: data
        });
    }

    private async handleSelectDetailItem(environmentId: string, entityLogicalName: string, tabName: string, itemId: string): Promise<void> {
        if (!environmentId || !entityLogicalName || !tabName || !itemId) {
            this.postMessage({
                action: 'error',
                message: 'All parameters are required for detail item selection'
            });
            return;
        }

        this._selectedDetailItem = itemId;

        // For now, we'll load the tab data and let the client-side handle filtering
        // In a more advanced implementation, we could fetch specific item details
        await this.handleLoadEntityTab(environmentId, entityLogicalName, tabName);

        this.postMessage({
            action: 'detailItemSelected',
            itemId: itemId
        });
    }

    private async handleExportData(data: any[], filename: string): Promise<void> {
        // This would typically trigger a download in the webview
        // For now, we'll just acknowledge the export request
        this.postMessage({
            action: 'exportReady',
            message: `Export prepared for ${filename}`,
            data: data
        });
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
            <title>Metadata Browser</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>
                /* Three-panel layout */
                .metadata-container {
                    display: grid;
                    grid-template-columns: 300px 1fr 400px;
                    height: calc(100vh - 120px);
                    gap: 8px;
                    margin-top: 8px;
                }

                .metadata-panel {
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    border-radius: 6px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .panel-header {
                    background: var(--vscode-tab-activeBackground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-height: 32px;
                }

                .panel-title {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    margin: 0;
                    font-size: 13px;
                }

                .panel-content {
                    flex: 1;
                    overflow: hidden;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                }

                /* Left Panel - Entity/Choice Tree */
                .left-panel {
                    min-width: 250px;
                }

                .metadata-tree {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }

                .tree-section {
                    margin-bottom: 8px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                }

                .tree-section-header {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    padding: 4px 8px;
                    background: var(--vscode-tab-inactiveBackground);
                    border-radius: 3px;
                    margin-bottom: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .tree-section-header:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .tree-section-header.collapsed .expand-icon::before {
                    content: '▶';
                }

                .tree-section-header:not(.collapsed) .expand-icon::before {
                    content: '▼';
                }

                .expand-icon {
                    width: 12px;
                    font-size: 10px;
                }

                .tree-items {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .tree-items.collapsed {
                    display: none;
                }

                .tree-item {
                    padding: 2px 16px;
                    cursor: pointer;
                    color: var(--vscode-foreground);
                    font-size: 12px;
                    border-radius: 3px;
                    margin: 1px 0;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .tree-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .tree-item.selected {
                    background: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .tree-item-icon {
                    width: 12px;
                    flex-shrink: 0;
                    font-size: 10px;
                }

                .search-box {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: 12px;
                    margin-bottom: 8px;
                    flex-shrink: 0;
                    box-sizing: border-box;
                }

                /* Main Panel - Entity Details & Tabs */
                .main-panel {
                    display: flex;
                    flex-direction: column;
                }

                .entity-info {
                    background: var(--vscode-tab-inactiveBackground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    padding: 8px 12px;
                    font-size: 12px;
                    display: none;
                }

                .entity-info.visible {
                    display: block;
                }

                .entity-name {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 2px;
                }

                .entity-description {
                    color: var(--vscode-descriptionForeground);
                    font-size: 11px;
                }

                .metadata-tabs {
                    display: flex;
                    background: var(--vscode-tab-inactiveBackground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    overflow-x: auto;
                    min-height: 32px;
                    display: none;
                }

                .metadata-tabs.visible {
                    display: flex;
                }

                .metadata-tab {
                    padding: 6px 12px;
                    background: var(--vscode-tab-inactiveBackground);
                    color: var(--vscode-tab-inactiveForeground);
                    border: none;
                    cursor: pointer;
                    font-size: 11px;
                    white-space: nowrap;
                    border-right: 1px solid var(--vscode-editorWidget-border);
                    min-width: fit-content;
                }

                .metadata-tab:hover {
                    background: var(--vscode-tab-hoverBackground);
                }

                .metadata-tab.active {
                    background: var(--vscode-tab-activeBackground);
                    color: var(--vscode-tab-activeForeground);
                }

                .tab-content {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                /* Right Panel - Detail Properties */
                .right-panel {
                    min-width: 300px;
                }

                .property-grid {
                    font-size: 11px;
                }

                .property-section {
                    margin-bottom: 16px;
                }

                .property-section-title {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    padding: 4px 0;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    margin-bottom: 8px;
                    font-size: 12px;
                }

                .property-row {
                    display: grid;
                    grid-template-columns: 140px 1fr;
                    gap: 8px;
                    padding: 3px 0;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    align-items: start;
                }

                .property-label {
                    font-weight: 500;
                    color: var(--vscode-textLink-foreground);
                    word-break: break-word;
                }

                .property-value {
                    color: var(--vscode-foreground);
                    word-break: break-word;
                    font-family: var(--vscode-editor-font-family);
                }

                .property-value.boolean-true {
                    color: var(--vscode-charts-green);
                    font-weight: 500;
                }

                .property-value.boolean-false {
                    color: var(--vscode-charts-red);
                    font-weight: 500;
                }

                .property-value.guid {
                    font-family: var(--vscode-editor-font-family);
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                }

                /* Loading and empty states */
                .panel-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }

                /* Responsive adjustments */
                @media (max-width: 1200px) {
                    .metadata-container {
                        grid-template-columns: 250px 1fr 300px;
                    }
                }

                @media (max-width: 900px) {
                    .metadata-container {
                        grid-template-columns: 1fr;
                        grid-template-rows: 300px 1fr 300px;
                        height: auto;
                        min-height: calc(100vh - 120px);
                    }
                    
                    .metadata-panel {
                        min-height: 200px;
                    }
                }

                /* Table styling */
                .table-container {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .table-search-container {
                    padding: 8px;
                    flex-shrink: 0;
                }
                
                .table-search {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: 12px;
                }
                
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    flex: 1;
                }
                
                .data-table th,
                .data-table td {
                    padding: 6px 8px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                }
                
                .data-table th {
                    background: var(--vscode-tab-inactiveBackground);
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                
                .data-table tbody tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                
                .row-action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 2px 4px;
                    border-radius: 2px;
                }
                
                .row-action-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .table-footer {
                    padding: 8px;
                    background: var(--vscode-tab-inactiveBackground);
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    flex-shrink: 0;
                }

                /* Utility classes */
                .hidden { display: none !important; }
                .text-muted { color: var(--vscode-descriptionForeground); }
                .text-success { color: var(--vscode-charts-green); }
                .text-warning { color: var(--vscode-charts-orange); }
                .text-error { color: var(--vscode-charts-red); }
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector({
                id: 'environmentSelect',
                label: 'Environment:',
                placeholder: 'Loading environments...'
            })}
            
            <div class="header">
                <h1 class="title">Metadata Browser</h1>
            </div>
            
            <div class="metadata-container">
                <!-- Left Panel - Entity/Choice Tree -->
                <div class="metadata-panel left-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Tables & Choices</h3>
                    </div>
                    <div class="panel-content">
                        <input type="text" id="treeSearch" class="search-box" placeholder="Search tables and choices...">
                        
                        <ul class="metadata-tree">
                            <!-- Tables Section -->
                            <li class="tree-section">
                                <div class="tree-section-header" onclick="toggleTreeSection('tables')">
                                    <span class="expand-icon"></span>
                                    <span>Tables</span>
                                    <span id="tablesCount" class="text-muted">(0)</span>
                                </div>
                                <ul id="tablesTree" class="tree-items"></ul>
                            </li>
                            
                            <!-- Choices Section -->
                            <li class="tree-section">
                                <div class="tree-section-header" onclick="toggleTreeSection('choices')">
                                    <span class="expand-icon"></span>
                                    <span>Choices</span>
                                    <span id="choicesCount" class="text-muted">(0)</span>
                                </div>
                                <ul id="choicesTree" class="tree-items collapsed"></ul>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Main Panel - Entity Details & Tabs -->
                <div class="metadata-panel main-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Metadata Details</h3>
                        <button id="exportBtn" class="btn btn-sm" onclick="exportCurrentData()" style="display: none;">Export</button>
                    </div>
                    
                    <!-- Entity Info Header -->
                    <div id="entityInfo" class="entity-info">
                        <div class="entity-name" id="entityName"></div>
                        <div class="entity-description" id="entityDescription"></div>
                    </div>
                    
                    <!-- Tabs -->
                    <div id="metadataTabs" class="metadata-tabs">
                        <button class="metadata-tab" onclick="selectTab('table')" id="tab-table">Table</button>
                        <button class="metadata-tab" onclick="selectTab('columns')" id="tab-columns">Columns</button>
                        <button class="metadata-tab" onclick="selectTab('keys')" id="tab-keys">Keys</button>
                        <button class="metadata-tab" onclick="selectTab('oneToMany')" id="tab-oneToMany">1:N Relationships</button>
                        <button class="metadata-tab" onclick="selectTab('manyToOne')" id="tab-manyToOne">N:1 Relationships</button>
                        <button class="metadata-tab" onclick="selectTab('manyToMany')" id="tab-manyToMany">N:N Relationships</button>
                        <button class="metadata-tab" onclick="selectTab('privileges')" id="tab-privileges">Privileges</button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div class="tab-content">
                        <div id="tabContentArea" class="panel-loading">
                            <p>Select a table or choice to view metadata...</p>
                        </div>
                    </div>
                </div>

                <!-- Right Panel - Detail Properties -->
                <div class="metadata-panel right-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Properties</h3>
                    </div>
                    <div class="panel-content">
                        <div id="propertyGrid" class="panel-loading">
                            <p>Select an item to view properties...</p>
                        </div>
                    </div>
                </div>
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                let currentEntities = [];
                let currentChoices = [];
                let selectedEntity = null;
                let selectedTab = 'table';
                let currentTabData = null;
                let selectedDetailItem = null;
                
                // Initialize panel
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to browse metadata...'
                });
                
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                    setupSearchFilter();
                });
                
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    
                    if (environmentId) {
                        loadEntitiesAndChoices(environmentId);
                    } else {
                        clearAllPanels();
                    }
                }
                
                function loadEntitiesAndChoices(environmentId) {
                    panelUtils.showLoading('Loading metadata...');
                    
                    // Load entities first
                    PanelUtils.sendMessage('loadEntities', { 
                        environmentId: environmentId 
                    });
                    
                    // Load choices
                    PanelUtils.sendMessage('loadChoices', {
                        environmentId: environmentId
                    });
                }
                
                function setupSearchFilter() {
                    const searchBox = document.getElementById('treeSearch');
                    searchBox.addEventListener('input', (e) => {
                        const query = e.target.value.toLowerCase();
                        filterTree(query);
                    });
                }
                
                function filterTree(query) {
                    const tablesTree = document.getElementById('tablesTree');
                    const choicesTree = document.getElementById('choicesTree');
                    
                    filterTreeItems(tablesTree, query);
                    filterTreeItems(choicesTree, query);
                }
                
                function filterTreeItems(container, query) {
                    const items = container.querySelectorAll('.tree-item');
                    items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        if (query === '' || text.includes(query)) {
                            item.style.display = 'flex';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                }
                
                function toggleTreeSection(sectionId) {
                    const header = document.querySelector(\`[onclick="toggleTreeSection('\${sectionId}')"]\`);
                    const items = document.getElementById(\`\${sectionId}Tree\`);
                    
                    header.classList.toggle('collapsed');
                    items.classList.toggle('collapsed');
                }
                
                function selectEntity(logicalName, displayName) {
                    // Update UI selection
                    document.querySelectorAll('.tree-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    document.querySelector(\`[data-entity="\${logicalName}"]\`).classList.add('selected');
                    
                    selectedEntity = logicalName;
                    selectedTab = 'table';
                    
                    // Update entity info
                    document.getElementById('entityName').textContent = displayName || logicalName;
                    document.getElementById('entityInfo').classList.add('visible');
                    document.getElementById('metadataTabs').classList.add('visible');
                    document.getElementById('exportBtn').style.display = 'block';
                    
                    // Select table tab and load entity
                    selectTab('table');
                    
                    // Load entity metadata
                    PanelUtils.sendMessage('selectEntity', {
                        environmentId: currentEnvironmentId,
                        entityLogicalName: logicalName
                    });
                }
                
                function selectTab(tabName) {
                    selectedTab = tabName;
                    
                    // Update tab UI
                    document.querySelectorAll('.metadata-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.getElementById(\`tab-\${tabName}\`).classList.add('active');
                    
                    if (tabName === 'table') {
                        // Show entity properties
                        showEntityProperties();
                    } else if (selectedEntity) {
                        // Load tab data
                        document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>Loading...</p></div>';
                        
                        PanelUtils.sendMessage('loadEntityTab', {
                            environmentId: currentEnvironmentId,
                            entityLogicalName: selectedEntity,
                            tabName: tabName
                        });
                    }
                }
                
                function showEntityProperties() {
                    if (selectedEntity && currentEntities.length > 0) {
                        const entity = currentEntities.find(e => e.LogicalName === selectedEntity);
                        if (entity) {
                            showPropertiesInRightPanel(entity, 'Entity');
                            
                            // Show basic entity info in main panel
                            document.getElementById('tabContentArea').innerHTML = \`
                                <div style="padding: 16px;">
                                    <div class="property-section">
                                        <div class="property-section-title">Basic Information</div>
                                        <div class="property-row">
                                            <div class="property-label">Logical Name</div>
                                            <div class="property-value">\${entity.LogicalName}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Schema Name</div>
                                            <div class="property-value">\${entity.SchemaName}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Display Name</div>
                                            <div class="property-value">\${getDisplayName(entity.DisplayName)}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Description</div>
                                            <div class="property-value">\${getDisplayName(entity.Description) || 'No description'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Object Type Code</div>
                                            <div class="property-value">\${entity.ObjectTypeCode}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Custom</div>
                                            <div class="property-value \${entity.IsCustomEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomEntity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Managed</div>
                                            <div class="property-value \${entity.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.IsManaged ? 'True' : 'False'}</div>
                                        </div>
                                    </div>
                                </div>
                            \`;
                        }
                    }
                }
                
                function showPropertiesInRightPanel(item, itemType) {
                    selectedDetailItem = item;
                    const propertyGrid = document.getElementById('propertyGrid');
                    
                    let html = \`<div class="property-grid">\`;
                    
                    // Generate property sections based on item type
                    if (itemType === 'Entity') {
                        html += generateEntityProperties(item);
                    } else if (itemType === 'Attribute') {
                        html += generateAttributeProperties(item);
                    } else if (itemType === 'Relationship') {
                        html += generateRelationshipProperties(item);
                    } else if (itemType === 'Key') {
                        html += generateKeyProperties(item);
                    } else {
                        html += generateGenericProperties(item);
                    }
                    
                    html += \`</div>\`;
                    propertyGrid.innerHTML = html;
                }
                
                function generateEntityProperties(entity) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General</div>
                            <div class="property-row">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${entity.MetadataId}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Logical Name</div>
                                <div class="property-value">\${entity.LogicalName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Schema Name</div>
                                <div class="property-value">\${entity.SchemaName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Set Name</div>
                                <div class="property-value">\${entity.EntitySetName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Object Type Code</div>
                                <div class="property-value">\${entity.ObjectTypeCode}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Attributes</div>
                            <div class="property-row">
                                <div class="property-label">Primary ID</div>
                                <div class="property-value">\${entity.PrimaryIdAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Primary Name</div>
                                <div class="property-value">\${entity.PrimaryNameAttribute || 'None'}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Capabilities</div>
                            <div class="property-row">
                                <div class="property-label">Is Custom</div>
                                <div class="property-value \${entity.IsCustomEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomEntity ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${entity.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Activity</div>
                                <div class="property-value \${entity.IsActivity ? 'boolean-true' : 'boolean-false'}">\${entity.IsActivity ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value \${getBooleanValue(entity.IsCustomizable) ? 'boolean-true' : 'boolean-false'}">\${getBooleanValue(entity.IsCustomizable) ? 'True' : 'False'}</div>
                            </div>
                        </div>
                    \`;
                }
                
                function generateAttributeProperties(attribute) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General</div>
                            <div class="property-row">
                                <div class="property-label">Logical Name</div>
                                <div class="property-value">\${attribute.LogicalName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Schema Name</div>
                                <div class="property-value">\${attribute.SchemaName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value">\${getDisplayName(attribute.DisplayName)}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Attribute Type</div>
                                <div class="property-value">\${attribute.AttributeType}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Required Level</div>
                                <div class="property-value">\${getRequiredLevel(attribute.RequiredLevel)}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Properties</div>
                            <div class="property-row">
                                <div class="property-label">Is Custom</div>
                                <div class="property-value \${attribute.IsCustomAttribute ? 'boolean-true' : 'boolean-false'}">\${attribute.IsCustomAttribute ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Primary ID</div>
                                <div class="property-value \${attribute.IsPrimaryId ? 'boolean-true' : 'boolean-false'}">\${attribute.IsPrimaryId ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Primary Name</div>
                                <div class="property-value \${attribute.IsPrimaryName ? 'boolean-true' : 'boolean-false'}">\${attribute.IsPrimaryName ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Valid for Create</div>
                                <div class="property-value \${attribute.IsValidForCreate ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForCreate ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Valid for Read</div>
                                <div class="property-value \${attribute.IsValidForRead ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForRead ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Valid for Update</div>
                                <div class="property-value \${attribute.IsValidForUpdate ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForUpdate ? 'True' : 'False'}</div>
                            </div>
                        </div>
                    \`;
                }
                
                function generateGenericProperties(item) {
                    let html = '<div class="property-section"><div class="property-section-title">Properties</div>';
                    
                    Object.keys(item).forEach(key => {
                        if (key !== 'MetadataId') {
                            const value = item[key];
                            html += \`
                                <div class="property-row">
                                    <div class="property-label">\${key}</div>
                                    <div class="property-value">\${formatPropertyValue(value)}</div>
                                </div>
                            \`;
                        }
                    });
                    
                    html += '</div>';
                    return html;
                }
                
                function formatPropertyValue(value) {
                    if (value === null || value === undefined) {
                        return '<span class="text-muted">null</span>';
                    }
                    if (typeof value === 'boolean') {
                        return \`<span class="\${value ? 'boolean-true' : 'boolean-false'}">\${value ? 'True' : 'False'}</span>\`;
                    }
                    if (typeof value === 'object') {
                        if (value.UserLocalizedLabel && value.UserLocalizedLabel.Label) {
                            return value.UserLocalizedLabel.Label;
                        }
                        if (value.Value !== undefined) {
                            return formatPropertyValue(value.Value);
                        }
                        return JSON.stringify(value, null, 2);
                    }
                    return String(value);
                }
                
                function getDisplayName(displayNameObject) {
                    return displayNameObject?.UserLocalizedLabel?.Label || '';
                }
                
                function getBooleanValue(booleanProperty) {
                    if (typeof booleanProperty === 'boolean') return booleanProperty;
                    return booleanProperty?.Value || false;
                }
                
                function getRequiredLevel(requiredLevel) {
                    const value = requiredLevel?.Value;
                    switch (value) {
                        case 'None': return 'Optional';
                        case 'SystemRequired': return 'System Required';
                        case 'ApplicationRequired': return 'Business Required';
                        case 'Recommended': return 'Business Recommended';
                        default: return value || 'Unknown';
                    }
                }
                
                function clearAllPanels() {
                    document.getElementById('tablesTree').innerHTML = '';
                    document.getElementById('choicesTree').innerHTML = '';
                    document.getElementById('tablesCount').textContent = '(0)';
                    document.getElementById('choicesCount').textContent = '(0)';
                    document.getElementById('entityInfo').classList.remove('visible');
                    document.getElementById('metadataTabs').classList.remove('visible');
                    document.getElementById('exportBtn').style.display = 'none';
                    document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>Select a table or choice to view metadata...</p></div>';
                    document.getElementById('propertyGrid').innerHTML = '<div class="panel-loading"><p>Select an item to view properties...</p></div>';
                }
                
                function exportCurrentData() {
                    if (selectedDetailItem) {
                        PanelUtils.sendMessage('exportData', {
                            data: [selectedDetailItem],
                            filename: \`\${selectedEntity || 'metadata'}_export.json\`
                        });
                    }
                }
                
                // Message handlers
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            loadEntitiesAndChoices(message.selectedEnvironmentId);
                        }
                    },
                    
                    'entitiesLoaded': (message) => {
                        currentEntities = message.data;
                        const tablesTree = document.getElementById('tablesTree');
                        const tablesCount = document.getElementById('tablesCount');
                        
                        tablesTree.innerHTML = '';
                        currentEntities.forEach(entity => {
                            const displayName = getDisplayName(entity.DisplayName) || entity.LogicalName;
                            const li = document.createElement('li');
                            li.className = 'tree-item';
                            li.setAttribute('data-entity', entity.LogicalName);
                            li.onclick = () => selectEntity(entity.LogicalName, displayName);
                            li.innerHTML = \`
                                <span class="tree-item-icon">\${entity.IsCustomEntity ? '🏷️' : '📋'}</span>
                                <span title="\${displayName} (\${entity.LogicalName})">\${displayName}</span>
                            \`;
                            tablesTree.appendChild(li);
                        });
                        
                        tablesCount.textContent = \`(\${currentEntities.length})\`;
                        panelUtils.clearContent();
                    },
                    
                    'choicesLoaded': (message) => {
                        currentChoices = message.data;
                        const choicesTree = document.getElementById('choicesTree');
                        const choicesCount = document.getElementById('choicesCount');
                        
                        choicesTree.innerHTML = '';
                        currentChoices.forEach(choice => {
                            const displayName = getDisplayName(choice.DisplayName) || choice.Name;
                            const li = document.createElement('li');
                            li.className = 'tree-item';
                            li.innerHTML = \`
                                <span class="tree-item-icon">🎯</span>
                                <span title="\${displayName} (\${choice.Name})">\${displayName}</span>
                            \`;
                            choicesTree.appendChild(li);
                        });
                        
                        choicesCount.textContent = \`(\${currentChoices.length})\`;
                    },
                    
                    'entitySelected': (message) => {
                        const entity = message.data;
                        document.getElementById('entityDescription').textContent = getDisplayName(entity.Description) || 'No description available';
                    },
                    
                    'entityTabLoaded': (message) => {
                        currentTabData = message.data;
                        const tabContentArea = document.getElementById('tabContentArea');
                        
                        if (message.tabName === 'columns') {
                            displayAttributesTable(message.data);
                        } else if (message.tabName === 'keys') {
                            displayKeysTable(message.data);
                        } else if (message.tabName.includes('Relationship') || message.tabName.includes('ToMany') || message.tabName.includes('ToOne')) {
                            displayRelationshipsTable(message.data, message.tabName);
                        } else if (message.tabName === 'privileges') {
                            displayPrivilegesTable(message.data);
                        } else {
                            displayGenericTable(message.data, message.tabName);
                        }
                    }
                });
                
                function displayAttributesTable(attributes) {
                    const tableData = attributes.map(attr => ({
                        id: attr.MetadataId,
                        LogicalName: attr.LogicalName,
                        SchemaName: attr.SchemaName,
                        DisplayName: getDisplayName(attr.DisplayName),
                        AttributeType: attr.AttributeType,
                        RequiredLevel: getRequiredLevel(attr.RequiredLevel),
                        IsCustom: attr.IsCustomAttribute ? 'Yes' : 'No',
                        IsPrimaryId: attr.IsPrimaryId ? 'Yes' : 'No',
                        IsPrimaryName: attr.IsPrimaryName ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, [
                        { key: 'LogicalName', label: 'Logical Name', sortable: true },
                        { key: 'SchemaName', label: 'Schema Name', sortable: true },
                        { key: 'DisplayName', label: 'Display Name', sortable: true },
                        { key: 'AttributeType', label: 'Type', sortable: true },
                        { key: 'RequiredLevel', label: 'Required', sortable: true },
                        { key: 'IsCustom', label: 'Custom', sortable: true },
                        { key: 'IsPrimaryId', label: 'Primary ID', sortable: true },
                        { key: 'IsPrimaryName', label: 'Primary Name', sortable: true }
                    ], attributes);
                }
                
                function displayKeysTable(keys) {
                    const tableData = keys.map(key => ({
                        id: key.MetadataId || key.LogicalName,
                        LogicalName: key.LogicalName,
                        SchemaName: key.SchemaName,
                        DisplayName: getDisplayName(key.DisplayName),
                        KeyAttributes: Array.isArray(key.KeyAttributes) ? key.KeyAttributes.join(', ') : key.KeyAttributes,
                        IsManaged: key.IsManaged ? 'Yes' : 'No',
                        IntroducedVersion: key.IntroducedVersion
                    }));
                    
                    displayTable(tableData, [
                        { key: 'LogicalName', label: 'Logical Name', sortable: true },
                        { key: 'SchemaName', label: 'Schema Name', sortable: true },
                        { key: 'DisplayName', label: 'Display Name', sortable: true },
                        { key: 'KeyAttributes', label: 'Attributes', sortable: true },
                        { key: 'IsManaged', label: 'Managed', sortable: true },
                        { key: 'IntroducedVersion', label: 'Version', sortable: true }
                    ], keys);
                }
                
                function displayRelationshipsTable(relationships, tabName) {
                    const tableData = relationships.map(rel => ({
                        id: rel.MetadataId || rel.SchemaName,
                        SchemaName: rel.SchemaName,
                        ReferencingEntity: rel.ReferencingEntity,
                        ReferencedEntity: rel.ReferencedEntity,
                        ReferencingAttribute: rel.ReferencingAttribute,
                        ReferencedAttribute: rel.ReferencedAttribute,
                        IsCustomRelationship: rel.IsCustomRelationship ? 'Yes' : 'No',
                        IsManaged: rel.IsManaged ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, [
                        { key: 'SchemaName', label: 'Schema Name', sortable: true },
                        { key: 'ReferencingEntity', label: 'From Entity', sortable: true },
                        { key: 'ReferencedEntity', label: 'To Entity', sortable: true },
                        { key: 'ReferencingAttribute', label: 'From Field', sortable: true },
                        { key: 'ReferencedAttribute', label: 'To Field', sortable: true },
                        { key: 'IsCustomRelationship', label: 'Custom', sortable: true },
                        { key: 'IsManaged', label: 'Managed', sortable: true }
                    ], relationships);
                }
                
                function displayPrivilegesTable(privileges) {
                    const tableData = privileges.map(priv => ({
                        id: priv.PrivilegeId || priv.Name,
                        Name: priv.Name,
                        PrivilegeType: priv.PrivilegeType,
                        CanBeBasic: priv.CanBeBasic ? 'Yes' : 'No',
                        CanBeLocal: priv.CanBeLocal ? 'Yes' : 'No',
                        CanBeDeep: priv.CanBeDeep ? 'Yes' : 'No',
                        CanBeGlobal: priv.CanBeGlobal ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, [
                        { key: 'Name', label: 'Name', sortable: true },
                        { key: 'PrivilegeType', label: 'Type', sortable: true },
                        { key: 'CanBeBasic', label: 'Basic', sortable: true },
                        { key: 'CanBeLocal', label: 'Local', sortable: true },
                        { key: 'CanBeDeep', label: 'Deep', sortable: true },
                        { key: 'CanBeGlobal', label: 'Global', sortable: true }
                    ], privileges);
                }
                
                // Create a simple ComponentFactory for client-side use
                const ClientComponentFactory = {
                    createDataTable: (config) => {
                        const rowActionsHtml = config.rowActions?.map(action => 
                            \`<button class="row-action-btn" data-action="\${action.id}" title="\${action.label}">\${action.icon}</button>\`
                        ).join('') || '';
                        
                        const columnsHtml = config.columns.map(col => 
                            \`<th class="sortable-header" data-column="\${col.key}" style="width: \${col.width || 'auto'}">\${col.label}</th>\`
                        ).join('');
                        
                        return \`
                            <div class="table-container">
                                <div class="table-search-container">
                                    <input type="text" class="table-search" placeholder="Search..." />
                                </div>
                                <table id="\${config.id}" class="data-table">
                                    <thead>
                                        <tr>
                                            \${columnsHtml}
                                            \${config.rowActions ? '<th class="actions-column">Actions</th>' : ''}
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                                \${config.showFooter ? '<div class="table-footer"><span class="row-count"></span></div>' : ''}
                            </div>
                        \`;
                    }
                };
                
                function displayTable(tableData, columns, originalData) {
                    const tabContentArea = document.getElementById('tabContentArea');
                    const tableHtml = ClientComponentFactory.createDataTable({
                        id: 'metadataTable',
                        columns: columns,
                        stickyHeader: true,
                        filterable: true,
                        showFooter: true,
                        rowActions: [
                            { id: 'viewDetails', label: 'View Details', icon: '👁️', action: 'viewDetails' }
                        ]
                    });
                    
                    tabContentArea.innerHTML = tableHtml;
                    
                    // Simple table population
                    const tbody = document.querySelector('#metadataTable tbody');
                    tbody.innerHTML = '';
                    
                    tableData.forEach(row => {
                        const tr = document.createElement('tr');
                        tr.setAttribute('data-row-id', row.id);
                        tr.style.cursor = 'pointer';
                        
                        columns.forEach(col => {
                            const td = document.createElement('td');
                            td.textContent = row[col.key] || '';
                            tr.appendChild(td);
                        });
                        
                        // Add actions column
                        const actionsTd = document.createElement('td');
                        actionsTd.innerHTML = '<button class="row-action-btn" data-action="viewDetails" title="View Details">👁️</button>';
                        tr.appendChild(actionsTd);
                        
                        // Add click handler
                        tr.addEventListener('click', () => {
                            const originalItem = originalData.find(item => item.MetadataId === row.id);
                            if (originalItem) {
                                showPropertiesInRightPanel(originalItem, 'Attribute');
                            }
                        });
                        
                        tbody.appendChild(tr);
                    });
                    
                    // Update row count
                    const rowCount = document.querySelector('.row-count');
                    if (rowCount) {
                        rowCount.textContent = \`\${tableData.length} rows\`;
                    }
                }
                
                function displayGenericTable(data, tabName) {
                    if (!data || data.length === 0) {
                        document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>No data available</p></div>';
                        return;
                    }
                    
                    // Create generic columns based on first item
                    const firstItem = data[0];
                    const columns = Object.keys(firstItem)
                        .filter(key => key !== 'MetadataId')
                        .slice(0, 6) // Limit to first 6 columns for display
                        .map(key => ({
                            key: key,
                            label: key,
                            sortable: true
                        }));
                    
                    const tableData = data.map(item => {
                        const row = { id: item.MetadataId || item.Name || Math.random().toString() };
                        columns.forEach(col => {
                            row[col.key] = formatPropertyValue(item[col.key]);
                        });
                        return row;
                    });
                    
                    displayTable(tableData, columns, data);
                }
            </script>
        </body>
        </html>`;
    }
}
