import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';
import { MetadataService, EntityDefinition, AttributeMetadata, OneToManyRelationshipMetadata, ManyToManyRelationshipMetadata, EntityKeyMetadata, EntityPrivilegeMetadata, OptionSetMetadata, CompleteEntityMetadata } from '../services/MetadataService';

export class MetadataBrowserPanel extends BasePanel {
    public static readonly viewType = 'metadataBrowser';

    private _selectedEnvironmentId: string | undefined;
    private _metadataService: MetadataService;
    private _selectedEntity: string | undefined;
    private _selectedTab: string | undefined;
    private _selectedDetailItem: string | undefined;
    private _currentEntityMetadata: CompleteEntityMetadata | undefined;

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

                case 'selectChoice':
                    await this.handleSelectChoice(message.environmentId, message.choiceName);
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

    private async handleSelectChoice(environmentId: string, choiceName: string): Promise<void> {
        if (!environmentId || !choiceName) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID and Choice Name are required'
            });
            return;
        }

        try {
            // Get the choice metadata
            const choice = await this._metadataService.getOptionSetMetadata(environmentId, choiceName);
            
            this.postMessage({
                action: 'choiceSelected',
                data: choice
            });
        } catch (error) {
            this.postMessage({
                action: 'error',
                message: `Failed to load choice: ${error}`
            });
        }
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

        // Load all metadata at once for better user experience
        const completeMetadata = await this._metadataService.getCompleteEntityMetadata(environmentId, entityLogicalName);
        this._currentEntityMetadata = completeMetadata;

        this.postMessage({
            action: 'entitySelected',
            data: completeMetadata
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

        // Use cached complete metadata instead of making new API calls
        if (!this._currentEntityMetadata) {
            // Fallback: load complete metadata if not already loaded
            this._currentEntityMetadata = await this._metadataService.getCompleteEntityMetadata(environmentId, entityLogicalName);
        }

        let data: any;

        switch (tabName) {
            case 'columns':
                data = this._currentEntityMetadata.attributes;
                break;
            case 'keys':
                data = this._currentEntityMetadata.keys;
                break;
            case 'oneToMany':
                data = this._currentEntityMetadata.oneToManyRelationships;
                break;
            case 'manyToOne':
                data = this._currentEntityMetadata.manyToOneRelationships;
                break;
            case 'manyToMany':
                data = this._currentEntityMetadata.manyToManyRelationships;
                break;
            case 'privileges':
                data = this._currentEntityMetadata.privileges;
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
                    grid-template-columns: 280px 1fr 380px;
                    height: calc(100vh - 140px);
                    max-height: calc(100vh - 140px);
                    gap: 12px;
                    margin-top: 8px;
                    transition: grid-template-columns 0.3s ease;
                    overflow: hidden;
                }
                
                .metadata-container.properties-hidden {
                    grid-template-columns: 280px 1fr 0px;
                }
                
                .metadata-container.properties-hidden .right-panel {
                    overflow: hidden;
                    width: 0;
                    min-width: 0;
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
                    min-height: 0;
                }

                /* Left Panel - Entity/Choice Tree */
                .left-panel {
                    min-width: 250px;
                    overflow: hidden;
                }

                .metadata-tree {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }

                .tree-section {
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                }
                
                .tree-section:first-child {
                    flex: 2 1 0;
                    margin-bottom: 8px;
                }
                
                .tree-section:last-child {
                    flex: 1 1 0;
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
                    min-height: 0;
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
                    flex-shrink: 0;
                    margin-bottom: 8px;
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

                #tabContentArea {
                    flex: 1;
                    width: 100%;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                /* Main panel content styling */
                .main-content {
                    padding: 16px 12px;
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    width: 100%;
                    box-sizing: border-box;
                }

                .main-content .property-section {
                    margin-bottom: 24px;
                    flex-shrink: 0;
                }

                .main-content .property-section:last-child {
                    flex: 1;
                    margin-bottom: 0;
                }

                .main-content .property-section-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    padding: 8px 0;
                    border-bottom: 2px solid var(--vscode-editorWidget-border);
                    margin-bottom: 16px;
                }

                .main-content .property-row {
                    display: grid;
                    grid-template-columns: 250px 1fr;
                    gap: 20px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    align-items: start;
                    min-height: 28px;
                    width: 100%;
                }

                .main-content .property-label {
                    font-weight: 500;
                    color: var(--vscode-textLink-foreground);
                    font-size: 14px;
                }

                .main-content .property-value {
                    color: var(--vscode-foreground);
                    font-size: 14px;
                    line-height: 1.4;
                    font-family: var(--vscode-editor-font-family);
                }

                /* Right Panel - Detail Properties */
                .right-panel {
                    min-width: 350px;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: var(--vscode-foreground);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 3px;
                    line-height: 1;
                }
                
                .close-btn:hover {
                    background: var(--vscode-list-hoverBackground);
                    color: var(--vscode-list-hoverForeground);
                }
                
                .close-btn:active {
                    background: var(--vscode-list-activeSelectionBackground);
                }

                .property-grid {
                    font-size: 13px;
                    height: 100%;
                    overflow-y: auto;
                    padding: 12px;
                }

                .property-section {
                    margin-bottom: 20px;
                }

                .property-section-title {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    padding: 6px 0;
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    margin-bottom: 12px;
                    font-size: 14px;
                }

                .property-row {
                    display: grid;
                    grid-template-columns: 180px 1fr;
                    gap: 12px;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    align-items: start;
                    min-height: 24px;
                }

                .property-label {
                    font-weight: 500;
                    color: var(--vscode-textLink-foreground);
                    word-break: break-word;
                    font-size: 13px;
                }

                .property-value {
                    color: var(--vscode-foreground);
                    word-break: break-word;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 13px;
                    line-height: 1.4;
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
                @media (max-width: 1400px) {
                    .metadata-container {
                        grid-template-columns: 260px 1fr 350px;
                    }
                }

                @media (max-width: 1200px) {
                    .metadata-container {
                        grid-template-columns: 250px 1fr 320px;
                    }
                    
                    .property-row {
                        grid-template-columns: 160px 1fr;
                    }
                    
                    .main-content .property-row {
                        grid-template-columns: 180px 1fr;
                    }
                }

                @media (max-width: 900px) {
                    .metadata-container {
                        grid-template-columns: 1fr;
                        grid-template-rows: 300px 1fr 350px;
                        height: auto;
                        min-height: calc(100vh - 120px);
                    }
                    
                    .metadata-panel {
                        min-height: 200px;
                    }
                    
                    .property-row,
                    .main-content .property-row {
                        grid-template-columns: 140px 1fr;
                        gap: 8px;
                    }
                }

                /* Table styling */

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
                                <ul id="choicesTree" class="tree-items"></ul>
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
                        <button id="closePropertiesBtn" class="close-btn" title="Close Properties">×</button>
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
                let tabSelectionContext = {}; // Remember selected items per tab { tabName: { id: ..., data: ... } }
                let completeEntityMetadata = null; // Cache for complete entity metadata
                
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
                    
                    // Clear cached metadata when environment changes
                    completeEntityMetadata = null;
                    
                    // Clear selection context when environment changes
                    tabSelectionContext = {};
                    
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
                    completeEntityMetadata = null; // Clear previous cache
                    
                    // Clear selection context for new entity
                    tabSelectionContext = {};
                    
                    // Update entity info
                    document.getElementById('entityName').textContent = displayName || logicalName;
                    document.getElementById('entityInfo').classList.add('visible');
                    document.getElementById('metadataTabs').classList.add('visible');
                    document.getElementById('exportBtn').style.display = 'block';
                    
                    // Select table tab and show loading
                    selectTab('table');
                    document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>Loading complete metadata...</p></div>';
                    document.getElementById('propertyGrid').innerHTML = '<div class="panel-loading"><p>Loading properties...</p></div>';
                    
                    // Load complete entity metadata (all tabs at once)
                    PanelUtils.sendMessage('selectEntity', {
                        environmentId: currentEnvironmentId,
                        entityLogicalName: logicalName
                    });
                }
                
                function selectChoice(choiceName, displayName) {
                    // Update UI selection
                    document.querySelectorAll('.tree-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    document.querySelector(\`[data-choice="\${choiceName}"]\`).classList.add('selected');
                    
                    // Clear previous entity selection
                    selectedEntity = null;
                    selectedTab = null;
                    completeEntityMetadata = null;
                    tabSelectionContext = {};
                    
                    // Update choice info
                    document.getElementById('entityName').textContent = displayName || choiceName;
                    document.getElementById('entityInfo').classList.add('visible');
                    document.getElementById('metadataTabs').classList.remove('visible');
                    document.getElementById('exportBtn').style.display = 'block';
                    
                    // Load choice details
                    document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>Loading choice metadata...</p></div>';
                    document.getElementById('propertyGrid').innerHTML = '<div class="panel-loading"><p>Loading properties...</p></div>';
                    
                    // Load choice metadata
                    PanelUtils.sendMessage('selectChoice', {
                        environmentId: currentEnvironmentId,
                        choiceName: choiceName
                    });
                }
                
                function selectTab(tabName) {
                    selectedTab = tabName;
                    
                    // Hide properties panel when switching tabs
                    hidePropertiesPanel();
                    
                    // Update tab UI
                    document.querySelectorAll('.metadata-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.getElementById(\`tab-\${tabName}\`).classList.add('active');
                    
                    if (tabName === 'table') {
                        // Show entity properties
                        showEntityProperties();
                    } else if (selectedEntity && completeEntityMetadata) {
                        // Use cached data for immediate display
                        let data;
                        switch (tabName) {
                            case 'columns':
                                data = completeEntityMetadata.attributes;
                                break;
                            case 'keys':
                                data = completeEntityMetadata.keys;
                                break;
                            case 'oneToMany':
                                data = completeEntityMetadata.oneToManyRelationships;
                                break;
                            case 'manyToOne':
                                data = completeEntityMetadata.manyToOneRelationships;
                                break;
                            case 'manyToMany':
                                data = completeEntityMetadata.manyToManyRelationships;
                                break;
                            case 'privileges':
                                data = completeEntityMetadata.privileges;
                                break;
                        }
                        
                        if (data) {
                            // Display data immediately from cache
                            if (tabName === 'columns') {
                                displayAttributesTable(data);
                            } else if (tabName === 'keys') {
                                displayKeysTable(data);
                            } else if (tabName.includes('ToMany') || tabName.includes('ToOne')) {
                                displayRelationshipsTable(data, tabName);
                            } else if (tabName === 'privileges') {
                                displayPrivilegesTable(data);
                            } else {
                                displayGenericTable(data, tabName);
                            }
                            
                            // After table is displayed, try to restore previous selection for this tab
                            const tabContext = tabSelectionContext[tabName];
                            if (tabContext && tabContext.id && tabContext.data) {
                                setTimeout(() => restoreRowSelection(data, tabName), 100);
                            } else {
                                // No previous selection for this tab, hide properties panel
                                hidePropertiesPanel();
                            }
                        }
                    } else if (selectedEntity) {
                        // Fallback: show loading and request data (shouldn't happen with new approach)
                        document.getElementById('tabContentArea').innerHTML = '<div class="panel-loading"><p>Loading...</p></div>';
                        
                        PanelUtils.sendMessage('loadEntityTab', {
                            environmentId: currentEnvironmentId,
                            entityLogicalName: selectedEntity,
                            tabName: tabName
                        });
                    }
                }
                
                function showEntityProperties() {
                    if (selectedEntity && completeEntityMetadata) {
                        const entity = completeEntityMetadata.entity;
                        if (entity) {
                            showPropertiesInRightPanel(entity, 'Entity');
                            
                            // Show basic entity info in main panel
                            document.getElementById('tabContentArea').innerHTML = \`
                                <div class="main-content">
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

                                    <div class="property-section">
                                        <div class="property-section-title">Entity Attributes</div>
                                        <div class="property-row">
                                            <div class="property-label">Primary ID Attribute</div>
                                            <div class="property-value">\${entity.PrimaryIdAttribute}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Primary Name Attribute</div>
                                            <div class="property-value">\${entity.PrimaryNameAttribute || 'None'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Entity Set Name</div>
                                            <div class="property-value">\${entity.EntitySetName}</div>
                                        </div>
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Capabilities</div>
                                        <div class="property-row">
                                            <div class="property-label">Is Activity Entity</div>
                                            <div class="property-value \${entity.IsActivity ? 'boolean-true' : 'boolean-false'}">\${entity.IsActivity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Customizable</div>
                                            <div class="property-value \${getBooleanValue(entity.IsCustomizable) ? 'boolean-true' : 'boolean-false'}">\${getBooleanValue(entity.IsCustomizable) ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Ownership Type</div>
                                            <div class="property-value">\${getOwnershipTypeName(entity.OwnershipType)}</div>
                                        </div>
                                    </div>
                                </div>
                            \`;
                        }
                    } else if (selectedEntity && currentEntities.length > 0) {
                        // Fallback to entity list data if complete metadata not available
                        const entity = currentEntities.find(e => e.LogicalName === selectedEntity);
                        if (entity) {
                            showPropertiesInRightPanel(entity, 'Entity');
                            
                            // Show basic entity info in main panel
                            document.getElementById('tabContentArea').innerHTML = \`
                                <div class="main-content">
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
                    } else if (itemType === 'Privilege') {
                        html += generatePrivilegeProperties(item);
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
                
                function generateKeyProperties(key) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General</div>
                            <div class="property-row">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${key.MetadataId}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Logical Name</div>
                                <div class="property-value">\${key.LogicalName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Schema Name</div>
                                <div class="property-value">\${key.SchemaName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value">\${getDisplayName(key.DisplayName)}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Key Attributes</div>
                            <div class="property-row">
                                <div class="property-label">Attributes</div>
                                <div class="property-value">\${Array.isArray(key.KeyAttributes) ? key.KeyAttributes.join(', ') : key.KeyAttributes}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Properties</div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${key.IsManaged ? 'boolean-true' : 'boolean-false'}">\${key.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${key.IntroducedVersion}</div>
                            </div>
                        </div>
                    \`;
                }
                
                function generateRelationshipProperties(relationship) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General</div>
                            <div class="property-row">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${relationship.MetadataId}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Schema Name</div>
                                <div class="property-value">\${relationship.SchemaName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Relationship Type</div>
                                <div class="property-value">\${relationship.RelationshipType}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Entities</div>
                            <div class="property-row">
                                <div class="property-label">Referencing Entity</div>
                                <div class="property-value">\${relationship.ReferencingEntity}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referenced Entity</div>
                                <div class="property-value">\${relationship.ReferencedEntity}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referencing Attribute</div>
                                <div class="property-value">\${relationship.ReferencingAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referenced Attribute</div>
                                <div class="property-value">\${relationship.ReferencedAttribute}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Properties</div>
                            <div class="property-row">
                                <div class="property-label">Is Custom</div>
                                <div class="property-value \${relationship.IsCustomRelationship ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomRelationship ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${relationship.IsManaged ? 'boolean-true' : 'boolean-false'}">\${relationship.IsManaged ? 'True' : 'False'}</div>
                            </div>
                        </div>
                    \`;
                }
                
                function generatePrivilegeProperties(privilege) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General</div>
                            <div class="property-row">
                                <div class="property-label">Privilege ID</div>
                                <div class="property-value guid">\${privilege.PrivilegeId}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Name</div>
                                <div class="property-value">\${privilege.Name}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Privilege Type</div>
                                <div class="property-value">\${privilege.PrivilegeType}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Access Levels</div>
                            <div class="property-row">
                                <div class="property-label">Can Be Basic</div>
                                <div class="property-value \${privilege.CanBeBasic ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeBasic ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Local</div>
                                <div class="property-value \${privilege.CanBeLocal ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeLocal ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Deep</div>
                                <div class="property-value \${privilege.CanBeDeep ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeDeep ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Global</div>
                                <div class="property-value \${privilege.CanBeGlobal ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeGlobal ? 'True' : 'False'}</div>
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
                
                function getOwnershipTypeName(ownershipType) {
                    switch (ownershipType) {
                        case 1: return 'User or Team Owned';
                        case 2: return 'Business Owned';
                        case 4: return 'Organization Owned';
                        case 8: return 'None';
                        default: return 'Unknown';
                    }
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
                            const fullDisplayName = \`\${displayName} (\${entity.LogicalName})\`;
                            const li = document.createElement('li');
                            li.className = 'tree-item';
                            li.setAttribute('data-entity', entity.LogicalName);
                            li.onclick = () => selectEntity(entity.LogicalName, displayName);
                            li.innerHTML = \`
                                <span class="tree-item-icon">\${entity.IsCustomEntity ? '🏷️' : '📋'}</span>
                                <span title="\${fullDisplayName}">\${fullDisplayName}</span>
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
                            const fullDisplayName = \`\${displayName} (\${choice.Name})\`;
                            const li = document.createElement('li');
                            li.className = 'tree-item';
                            li.setAttribute('data-choice', choice.Name);
                            li.onclick = () => selectChoice(choice.Name, displayName);
                            li.innerHTML = \`
                                <span class="tree-item-icon">🎯</span>
                                <span title="\${fullDisplayName}">\${fullDisplayName}</span>
                            \`;
                            choicesTree.appendChild(li);
                        });
                        
                        choicesCount.textContent = \`(\${currentChoices.length})\`;
                    },
                    
                    'entitySelected': (message) => {
                        completeEntityMetadata = message.data;
                        const entity = completeEntityMetadata.entity;
                        
                        // Update entity description
                        document.getElementById('entityDescription').textContent = getDisplayName(entity.Description) || 'No description available';
                        
                        // Show the table tab by default with complete entity information
                        selectTab('table');
                    },
                    
                    'choiceSelected': (message) => {
                        const choice = message.data;
                        
                        // Update choice description
                        document.getElementById('entityDescription').textContent = getDisplayName(choice.Description) || 'No description available';
                        
                        // Display choice options in a table
                        displayChoiceOptions(choice);
                        
                        // Show choice properties in the right panel
                        showPropertiesPanel();
                        showChoicePropertiesInRightPanel(choice);
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
                
                // Create a simple ComponentFactory for client-side use with proper structure
                const ClientComponentFactory = {
                    createDataTable: (config) => {
                        const columnsHtml = config.columns.map(col => 
                            \`<th class="sortable" data-column="\${col.key}" style="width: \${col.width || 'auto'}">
                                \${col.label}
                                <span class="sort-indicator"></span>
                            </th>\`
                        ).join('');
                        
                        const tableClasses = [
                            'data-table',
                            config.stickyHeader ? 'sticky-header' : '',
                            'sortable-table'  // Enable sorting
                        ].filter(Boolean).join(' ');
                        
                        return \`
                            <div class="table-container">
                                <div class="table-scroll-wrapper">
                                    <table id="\${config.id}" class="\${tableClasses}">
                                        <thead>
                                            <tr>\${columnsHtml}</tr>
                                        </thead>
                                        <tbody id="\${config.id}Body"></tbody>
                                    </table>
                                </div>
                                \${config.showFooter ? '<div class="table-footer"><span class="record-count">Loading...</span></div>' : ''}
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
                        showFooter: true
                    });
                    
                    tabContentArea.innerHTML = tableHtml;
                    
                    // Initialize table with TableUtils for sorting functionality
                    TableUtils.initializeTable('metadataTable');
                    
                    // Load table data
                    TableUtils.loadTableData('metadataTable', tableData);
                    
                    // Add custom row click handlers for selection
                    const tbody = document.getElementById('metadataTableBody');
                    tbody.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        if (!row) return;
                        
                        const rowId = row.dataset.rowId;
                        const isCurrentlySelected = row.classList.contains('selected');
                        
                        if (isCurrentlySelected) {
                            // Deselect the row if it's already selected
                            row.classList.remove('selected');
                            hidePropertiesPanel();
                            delete tabSelectionContext[selectedTab];
                        } else {
                            // Clear previous selection
                            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                            
                            // Select current row
                            row.classList.add('selected');
                            
                            // Find original item and show properties
                            const originalItem = originalData.find(item => {
                                return item.MetadataId === rowId || 
                                       item.LogicalName === rowId || 
                                       item.SchemaName === rowId ||
                                       item.Name === rowId ||
                                       item.PrivilegeId === rowId;
                            });
                            if (originalItem) {
                                tabSelectionContext[selectedTab] = {
                                    id: rowId,
                                    data: originalItem
                                };
                                
                                showPropertiesPanel();
                                showPropertiesInRightPanel(originalItem, getItemTypeForCurrentTab());
                            }
                        }
                    });
                }
                
                function displayChoiceOptions(choice) {
                    const tabContentArea = document.getElementById('tabContentArea');
                    
                    if (!choice.Options || choice.Options.length === 0) {
                        tabContentArea.innerHTML = '<div class="panel-loading"><p>No options available for this choice</p></div>';
                        return;
                    }
                    
                    // Create simple table HTML for choice options (no complex entity logic)
                    const columnsHtml = \`
                        <th class="sortable" data-column="Value">Value <span class="sort-indicator"></span></th>
                        <th class="sortable" data-column="Label">Label <span class="sort-indicator"></span></th>
                        <th class="sortable" data-column="Description">Description <span class="sort-indicator"></span></th>
                    \`;
                    
                    const tableHtml = \`
                        <div class="table-container">
                            <div class="table-scroll-wrapper">
                                <table id="choiceOptionsTable" class="data-table sticky-header sortable-table">
                                    <thead>
                                        <tr>\${columnsHtml}</tr>
                                    </thead>
                                    <tbody id="choiceOptionsTableBody"></tbody>
                                </table>
                            </div>
                            <div class="table-footer"><span class="record-count">Loading...</span></div>
                        </div>
                    \`;
                    
                    tabContentArea.innerHTML = tableHtml;
                    
                    // Prepare table data
                    const tableData = choice.Options.map(option => ({
                        id: option.Value.toString(),
                        Value: option.Value,
                        Label: getDisplayName(option.Label) || option.Value,
                        Description: getDisplayName(option.Description) || ''
                    }));
                    
                    // Initialize and populate table with simple choice option logic
                    TableUtils.initializeTable('choiceOptionsTable');
                    TableUtils.loadTableData('choiceOptionsTable', tableData);
                    
                    // Add simple click handler for choice options (no entity-specific logic)
                    const tbody = document.getElementById('choiceOptionsTableBody');
                    tbody.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        if (!row) return;
                        
                        // Simple selection toggle for choice options
                        const isSelected = row.classList.contains('selected');
                        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                        
                        if (!isSelected) {
                            row.classList.add('selected');
                            // Just show that an option is selected, no complex properties
                            showPropertiesPanel();
                            showChoiceOptionPropertiesInRightPanel(row.dataset.rowId, choice.Options);
                        } else {
                            hidePropertiesPanel();
                        }
                    });
                }
                
                function showChoicePropertiesInRightPanel(choice) {
                    const propertyGrid = document.getElementById('propertyGrid');
                    
                    const html = \`
                        <div class="property-grid">
                            <div class="property-section">
                                <div class="property-section-title">General</div>
                                <div class="property-row">
                                    <div class="property-label">Name</div>
                                    <div class="property-value">\${choice.Name}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Display Name</div>
                                    <div class="property-value">\${getDisplayName(choice.DisplayName) || choice.Name}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Description</div>
                                    <div class="property-value">\${getDisplayName(choice.Description) || 'No description'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Is Global</div>
                                    <div class="property-value \${choice.IsGlobal ? 'boolean-true' : 'boolean-false'}">\${choice.IsGlobal ? 'True' : 'False'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Is Custom</div>
                                    <div class="property-value \${choice.IsCustomOptionSet ? 'boolean-true' : 'boolean-false'}">\${choice.IsCustomOptionSet ? 'True' : 'False'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Options Count</div>
                                    <div class="property-value">\${choice.Options ? choice.Options.length : 0}</div>
                                </div>
                            </div>
                        </div>
                    \`;
                    
                    propertyGrid.innerHTML = html;
                }
                
                function showChoiceOptionPropertiesInRightPanel(optionValue, options) {
                    const propertyGrid = document.getElementById('propertyGrid');
                    const option = options.find(opt => opt.Value.toString() === optionValue);
                    
                    if (!option) {
                        propertyGrid.innerHTML = '<div class="panel-loading"><p>Option not found</p></div>';
                        return;
                    }
                    
                    const html = \`
                        <div class="property-grid">
                            <div class="property-section">
                                <div class="property-section-title">Option Details</div>
                                <div class="property-row">
                                    <div class="property-label">Value</div>
                                    <div class="property-value">\${option.Value}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Label</div>
                                    <div class="property-value">\${getDisplayName(option.Label) || option.Value}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Description</div>
                                    <div class="property-value">\${getDisplayName(option.Description) || 'No description'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Color</div>
                                    <div class="property-value">\${option.Color || 'Default'}</div>
                                </div>
                            </div>
                        </div>
                    \`;
                    
                    propertyGrid.innerHTML = html;
                }
                
                function restoreRowSelection(currentTabData, tabName) {
                    const tabContext = tabSelectionContext[tabName];
                    if (!tabContext || !tabContext.id || !tabContext.data) return;
                    
                    // Find if the previously selected item exists in current tab data
                    const matchingItem = currentTabData.find(item => {
                        return item.MetadataId === tabContext.id || 
                               item.LogicalName === tabContext.id || 
                               item.SchemaName === tabContext.id ||
                               item.Name === tabContext.id ||
                               item.PrivilegeId === tabContext.id;
                    });
                    
                    if (matchingItem) {
                        // Find and select the corresponding table row
                        const tbody = document.querySelector('#metadataTable tbody');
                        if (tbody) {
                            const targetRow = tbody.querySelector(\`tr[data-row-id="\${tabContext.id}"]\`);
                            if (targetRow) {
                                // Clear any existing selection
                                tbody.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
                                
                                // Select the target row
                                targetRow.classList.add('selected');
                                
                                // Show properties panel with the restored data
                                showPropertiesPanel();
                                showPropertiesInRightPanel(tabContext.data, getItemTypeForCurrentTab());
                                
                                // Scroll row into view if needed
                                targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }
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
                
                // Properties panel management
                function showPropertiesPanel() {
                    document.querySelector('.metadata-container').classList.remove('properties-hidden');
                }
                
                function hidePropertiesPanel() {
                    document.querySelector('.metadata-container').classList.add('properties-hidden');
                    document.getElementById('propertyGrid').innerHTML = '<div class="panel-loading"><p>Select an item to view properties...</p></div>';
                }
                
                function clearAllRowSelections() {
                    // Clear visual selection from all table rows
                    const allRows = document.querySelectorAll('#metadataTable tbody tr');
                    allRows.forEach(row => row.classList.remove('selected'));
                    
                    // Clear the current tab's selection context
                    if (selectedTab) {
                        delete tabSelectionContext[selectedTab];
                    }
                }
                
                function getItemTypeForCurrentTab() {
                    switch (selectedTab) {
                        case 'columns': return 'Attribute';
                        case 'keys': return 'Key';
                        case 'oneToMany':
                        case 'manyToOne':
                        case 'manyToMany': return 'Relationship';
                        case 'privileges': return 'Privilege';
                        default: return 'Generic';
                    }
                }
                
                // Hide properties panel on initial load
                document.addEventListener('DOMContentLoaded', () => {
                    hidePropertiesPanel();
                    
                    // Add close button event handler
                    document.getElementById('closePropertiesBtn').addEventListener('click', () => {
                        hidePropertiesPanel();
                        // Clear all row selections
                        clearAllRowSelections();
                    });
                });
            </script>
        </body>
        </html>`;
    }
}
