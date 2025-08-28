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
                    font-weight: 700;
                    color: var(--vscode-textLink-activeForeground);
                    background: var(--vscode-editorWidget-background);
                    padding: 10px 16px;
                    margin: 0 -16px 16px -16px;
                    border-left: 4px solid var(--vscode-textLink-foreground);
                    border-bottom: 2px solid var(--vscode-editorWidget-border);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
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
                    font-weight: 700;
                    color: var(--vscode-textLink-activeForeground);
                    background: var(--vscode-editorWidget-background);
                    padding: 8px 12px;
                    margin: 0 -12px 12px -12px;
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .property-subsection {
                    margin: 16px 0 12px 12px;
                    border-left: 2px solid var(--vscode-editorWidget-border);
                    padding-left: 12px;
                }
                
                .property-subsection-title {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    padding: 4px 0 8px 0;
                    font-size: 12px;
                    opacity: 0.8;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
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

                .property-row.property-sub-details {
                    margin-left: 20px;
                    border-bottom: none;
                    padding: 3px 0;
                    opacity: 0.9;
                    font-size: 12px;
                }

                .property-row.property-sub-details .property-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .property-row.property-sub-details .property-value {
                    font-size: 12px;
                }

                .property-row.property-container-details {
                    margin-left: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 4px 0;
                    opacity: 0.95;
                    font-size: 12px;
                }

                .property-row.property-container-details .property-label {
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                    font-weight: 500;
                    opacity: 0.8;
                }

                .property-row.property-container-details .property-value {
                    font-size: 12px;
                }

                .property-row.property-deep-details {
                    margin-left: 40px;
                    border-bottom: none;
                    padding: 2px 0;
                    opacity: 0.85;
                    font-size: 11px;
                }

                .property-row.property-deep-details .property-label {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .property-row.property-deep-details .property-value {
                    font-size: 11px;
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

            <!-- Hidden templates for different table types -->
            <script type="text/template" id="attributesTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'DisplayName', label: 'Display Name', sortable: true, width: '200px' },
                        { key: 'LogicalName', label: 'Logical Name', sortable: true, width: '200px' },
                        { key: 'SchemaName', label: 'Schema Name', sortable: true, width: '200px' },
                        { key: 'Type', label: 'Type', sortable: true, width: '120px' },
                        { key: 'RequiredLevel', label: 'Required Level', sortable: true, width: '120px' },
                        { key: 'HasChanged', label: 'Has Changed', sortable: true, width: '100px' },
                        { key: 'IsManaged', label: 'Is Managed', sortable: true, width: '100px' },
                        { key: 'IsCustomizable', label: 'Is Customizable', sortable: true, width: '120px' },
                        { key: 'IsCustomAttribute', label: 'Is Custom Attribute', sortable: true, width: '140px' }
                    ],
                    defaultSort: { column: 'LogicalName', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <script type="text/template" id="keysTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'DisplayName', label: 'Display Name', sortable: true, width: '200px' },
                        { key: 'LogicalName', label: 'Logical Name', sortable: true, width: '200px' },
                        { key: 'SchemaName', label: 'Schema Name', sortable: true, width: '200px' },
                        { key: 'HasChanged', label: 'Has Changed', sortable: true, width: '120px' },
                        { key: 'IsManaged', label: 'Is Managed', sortable: true, width: '100px' },
                        { key: 'IsCustomizable', label: 'Is Customizable', sortable: true, width: '120px' }
                    ],
                    defaultSort: { column: 'LogicalName', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <script type="text/template" id="oneToManyTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'SchemaName', label: 'Schema Name', sortable: true, width: '200px' },
                        { key: 'ReferencedEntity', label: 'Referenced Entity', sortable: true, width: '150px' },
                        { key: 'ReferencedAttribute', label: 'Referenced Attribute', sortable: true, width: '150px' },
                        { key: 'ReferencingEntity', label: 'Referencing Entity', sortable: true, width: '150px' },
                        { key: 'ReferencingAttribute', label: 'Referencing Attribute', sortable: true, width: '150px' },
                        { key: 'HasChanged', label: 'Has Changed', sortable: true, width: '120px' },
                        { key: 'IsManaged', label: 'Is Managed', sortable: true, width: '100px' },
                        { key: 'IsCustomizable', label: 'Is Customizable', sortable: true, width: '120px' },
                        { key: 'IsCustomRelationship', label: 'Is Custom Relationship', sortable: true, width: '150px' }
                    ],
                    defaultSort: { column: 'SchemaName', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <script type="text/template" id="manyToOneTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'SchemaName', label: 'Schema Name', sortable: true, width: '200px' },
                        { key: 'ReferencedEntity', label: 'Referenced Entity', sortable: true, width: '150px' },
                        { key: 'ReferencedAttribute', label: 'Referenced Attribute', sortable: true, width: '150px' },
                        { key: 'ReferencingEntity', label: 'Referencing Entity', sortable: true, width: '150px' },
                        { key: 'ReferencingAttribute', label: 'Referencing Attribute', sortable: true, width: '150px' },
                        { key: 'HasChanged', label: 'Has Changed', sortable: true, width: '120px' },
                        { key: 'IsManaged', label: 'Is Managed', sortable: true, width: '100px' },
                        { key: 'IsCustomizable', label: 'Is Customizable', sortable: true, width: '120px' },
                        { key: 'IsCustomRelationship', label: 'Is Custom Relationship', sortable: true, width: '150px' }
                    ],
                    defaultSort: { column: 'SchemaName', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <script type="text/template" id="manyToManyTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'SchemaName', label: 'Schema Name', sortable: true, width: '180px' },
                        { key: 'IntersectEntityName', label: 'Intersect Entity Name', sortable: true, width: '140px' },
                        { key: 'Entity1LogicalName', label: 'Entity 1 Logical Name', sortable: true, width: '140px' },
                        { key: 'Entity1IntersectAttribute', label: 'Entity 1 Intersect Attribute', sortable: true, width: '150px' },
                        { key: 'Entity1NavigationPropertyName', label: 'Entity 1 Navigation Property', sortable: true, width: '170px' },
                        { key: 'Entity2LogicalName', label: 'Entity 2 Logical Name', sortable: true, width: '140px' },
                        { key: 'Entity2IntersectAttribute', label: 'Entity 2 Intersect Attribute', sortable: true, width: '150px' },
                        { key: 'Entity2NavigationPropertyName', label: 'Entity 2 Navigation Property', sortable: true, width: '170px' },
                        { key: 'HasChanged', label: 'Has Changed', sortable: true, width: '120px' },
                        { key: 'IsManaged', label: 'Is Managed', sortable: true, width: '100px' },
                        { key: 'IsCustomizable', label: 'Is Customizable', sortable: true, width: '120px' },
                        { key: 'IsCustomRelationship', label: 'Is Custom Relationship', sortable: true, width: '150px' }
                    ],
                    defaultSort: { column: 'SchemaName', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <script type="text/template" id="privilegesTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'metadataTable',
                    columns: [
                        { key: 'Name', label: 'Name', sortable: true, width: '200px' },
                        { key: 'PrivilegeType', label: 'Type', sortable: true, width: '120px' },
                        { key: 'CanBeBasic', label: 'Can Be Basic', sortable: true, width: '120px' },
                        { key: 'CanBeDeep', label: 'Can Be Deep', sortable: true, width: '120px' },
                        { key: 'CanBeLocal', label: 'Can Be Local', sortable: true, width: '120px' },
                        { key: 'CanBeEntityReference', label: 'Can Be Entity Reference', sortable: true, width: '180px' },
                        { key: 'CanBeParentEntityReference', label: 'Can Be Parent Entity Reference', sortable: true, width: '220px' },
                        { key: 'CanBeRecordFilter', label: 'Can Be Record Filter', sortable: true, width: '160px' }
                    ],
                    defaultSort: { column: 'Name', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} items'
                })}
            </script>

            <!-- Hidden template for choice options table -->
            <script type="text/template" id="choiceOptionsTableTemplate">
                ${ComponentFactory.createDataTable({
                    id: 'choiceOptionsTable',
                    columns: [
                        { key: 'Value', label: 'Value', sortable: true, width: '100px' },
                        { key: 'Label', label: 'Label', sortable: true, width: '200px' },
                        { key: 'Description', label: 'Description', sortable: true, width: '300px' }
                    ],
                    defaultSort: { column: 'Value', direction: 'asc' },
                    stickyHeader: true,
                    stickyFirstColumn: false,
                    filterable: true,
                    showFooter: true,
                    footerText: 'Showing {filteredCount} of {totalCount} options'
                })}
            </script>

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
                            
                            // Show comprehensive entity metadata in main panel
                            document.getElementById('tabContentArea').innerHTML = \`
                                <div class="main-content">
                                    <div class="property-section">
                                        <div class="property-section-title">General</div>
                                        <div class="property-row">
                                            <div class="property-label">Metadata ID</div>
                                            <div class="property-value">\${entity.MetadataId || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Has Changed</div>
                                            <div class="property-value \${entity.HasChanged ? 'boolean-true' : 'boolean-false'}">\${entity.HasChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Activity Type Mask</div>
                                            <div class="property-value">\${entity.ActivityTypeMask || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Logical Name</div>
                                            <div class="property-value">\${entity.LogicalName}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Schema Name</div>
                                            <div class="property-value">\${entity.SchemaName}</div>
                                        </div>
                                        \${entity.DisplayName ? \`
                                        <div class="property-row">
                                            <div class="property-label">Display Name</div>
                                            <div class="property-value"></div>
                                        </div>
                                        \${entity.DisplayName.UserLocalizedLabel ? \`
                                        <div class="property-row property-container-details">
                                            <div class="property-label">User Localized Label</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Label</div>
                                            <div class="property-value">\${entity.DisplayName.UserLocalizedLabel.Label}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Language Code</div>
                                            <div class="property-value">\${entity.DisplayName.UserLocalizedLabel.LanguageCode}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Is Managed</div>
                                            <div class="property-value \${entity.DisplayName.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.DisplayName.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Metadata ID</div>
                                            <div class="property-value guid">\${entity.DisplayName.UserLocalizedLabel.MetadataId}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Has Changed</div>
                                            <div class="property-value">\${entity.DisplayName.UserLocalizedLabel.HasChanged !== null ? (entity.DisplayName.UserLocalizedLabel.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.DisplayName.LocalizedLabels && entity.DisplayName.LocalizedLabels.length > 1 ? \`
                                        <div class="property-row property-container-details">
                                            <div class="property-label">All Localized Labels</div>
                                            <div class="property-value"></div>
                                        </div>
                                        \${entity.DisplayName.LocalizedLabels.map((label, index) => \`
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">\${label.LanguageCode} (\${label.Label})</div>
                                            <div class="property-value \${label.IsManaged ? 'boolean-true' : 'boolean-false'}">\${label.IsManaged ? 'Managed' : 'Unmanaged'}</div>
                                        </div>
                                        \`).join('')}
                                        \` : ''}
                                        \` : ''}
                                        \${entity.DisplayCollectionName ? \`
                                        <div class="property-row">
                                            <div class="property-label">Display Collection Name</div>
                                            <div class="property-value"></div>
                                        </div>
                                        \${entity.DisplayCollectionName.UserLocalizedLabel ? \`
                                        <div class="property-row property-container-details">
                                            <div class="property-label">User Localized Label</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Label</div>
                                            <div class="property-value">\${entity.DisplayCollectionName.UserLocalizedLabel.Label}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Language Code</div>
                                            <div class="property-value">\${entity.DisplayCollectionName.UserLocalizedLabel.LanguageCode}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Is Managed</div>
                                            <div class="property-value \${entity.DisplayCollectionName.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.DisplayCollectionName.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Metadata ID</div>
                                            <div class="property-value guid">\${entity.DisplayCollectionName.UserLocalizedLabel.MetadataId}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Has Changed</div>
                                            <div class="property-value">\${entity.DisplayCollectionName.UserLocalizedLabel.HasChanged !== null ? (entity.DisplayCollectionName.UserLocalizedLabel.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \` : ''}
                                        \${entity.Description ? \`
                                        <div class="property-row">
                                            <div class="property-label">Description</div>
                                            <div class="property-value"></div>
                                        </div>
                                        \${entity.Description.UserLocalizedLabel ? \`
                                        <div class="property-row property-container-details">
                                            <div class="property-label">User Localized Label</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Label</div>
                                            <div class="property-value">\${entity.Description.UserLocalizedLabel.Label}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Language Code</div>
                                            <div class="property-value">\${entity.Description.UserLocalizedLabel.LanguageCode}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Is Managed</div>
                                            <div class="property-value \${entity.Description.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.Description.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Metadata ID</div>
                                            <div class="property-value guid">\${entity.Description.UserLocalizedLabel.MetadataId}</div>
                                        </div>
                                        <div class="property-row property-deep-details">
                                            <div class="property-label">Has Changed</div>
                                            <div class="property-value">\${entity.Description.UserLocalizedLabel.HasChanged !== null ? (entity.Description.UserLocalizedLabel.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \` : ''}
                                        <div class="property-row">
                                            <div class="property-label">Object Type Code</div>
                                            <div class="property-value">\${entity.ObjectTypeCode}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Table Type</div>
                                            <div class="property-value">\${entity.TableType || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Entity Color</div>
                                            <div class="property-value">
                                                \${entity.EntityColor ? \`
                                                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                                                        <span style="display: inline-block; width: 20px; height: 20px; background-color: \${entity.EntityColor}; border: 1px solid #ccc; border-radius: 3px;"></span>
                                                        <span>\${entity.EntityColor}</span>
                                                    </span>
                                                \` : 'Not specified'}
                                            </div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Entity Set Name</div>
                                            <div class="property-value">\${entity.EntitySetName}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Logical Collection Name</div>
                                            <div class="property-value">\${entity.LogicalCollectionName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Collection Schema Name</div>
                                            <div class="property-value">\${entity.CollectionSchemaName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Report View Name</div>
                                            <div class="property-value">\${entity.ReportViewName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Primary ID Attribute</div>
                                            <div class="property-value">\${entity.PrimaryIdAttribute}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Primary Name Attribute</div>
                                            <div class="property-value">\${entity.PrimaryNameAttribute || 'None'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Primary Image Attribute</div>
                                            <div class="property-value">\${entity.PrimaryImageAttribute || 'None'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Introduced Version</div>
                                            <div class="property-value">\${entity.IntroducedVersion}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Created On</div>
                                            <div class="property-value">\${entity.CreatedOn ? new Date(entity.CreatedOn).toLocaleString() : 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Modified On</div>
                                            <div class="property-value">\${entity.ModifiedOn ? new Date(entity.ModifiedOn).toLocaleString() : 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is AIR Updated</div>
                                            <div class="property-value \${entity.IsAIRUpdated ? 'boolean-true' : 'boolean-false'}">\${entity.IsAIRUpdated ? 'True' : 'False'}</div>
                                        </div>
                                    </div>


                                    <div class="property-section">
                                        <div class="property-section-title">Entity Classification</div>
                                        <div class="property-row">
                                            <div class="property-label">Is Custom Entity</div>
                                            <div class="property-value \${entity.IsCustomEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomEntity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Managed</div>
                                            <div class="property-value \${entity.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.IsManaged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Activity Entity</div>
                                            <div class="property-value \${entity.IsActivity ? 'boolean-true' : 'boolean-false'}">\${entity.IsActivity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Activity Party</div>
                                            <div class="property-value \${entity.IsActivityParty ? 'boolean-true' : 'boolean-false'}">\${entity.IsActivityParty ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Child Entity</div>
                                            <div class="property-value \${entity.IsChildEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsChildEntity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Intersect Entity</div>
                                            <div class="property-value \${entity.IsIntersect ? 'boolean-true' : 'boolean-false'}">\${entity.IsIntersect ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Logical Entity</div>
                                            <div class="property-value \${entity.IsLogicalEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsLogicalEntity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Private</div>
                                            <div class="property-value \${entity.IsPrivate ? 'boolean-true' : 'boolean-false'}">\${entity.IsPrivate ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Solution Aware</div>
                                            <div class="property-value \${entity.IsSolutionAware ? 'boolean-true' : 'boolean-false'}">\${entity.IsSolutionAware ? 'True' : 'False'}</div>
                                        </div>
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Ownership & Security</div>
                                        <div class="property-row">
                                            <div class="property-label">Ownership Type</div>
                                            <div class="property-value">\${getOwnershipTypeName(entity.OwnershipType)}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Auto Create Access Teams</div>
                                            <div class="property-value \${entity.AutoCreateAccessTeams ? 'boolean-true' : 'boolean-false'}">\${entity.AutoCreateAccessTeams ? 'True' : 'False'}</div>
                                        </div>
                                        \${entity.IsAuditEnabled ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Audit Enabled</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsAuditEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsAuditEnabled.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsAuditEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsAuditEnabled.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsAuditEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        <div class="property-row">
                                            <div class="property-label">Is Retrieve Audit Enabled</div>
                                            <div class="property-value \${entity.IsRetrieveAuditEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetrieveAuditEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Retrieve Multiple Audit Enabled</div>
                                            <div class="property-value \${entity.IsRetrieveMultipleAuditEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetrieveMultipleAuditEnabled ? 'True' : 'False'}</div>
                                        </div>
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Entity Capabilities</div>
                                        \${entity.IsCustomizable ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Customizable</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomizable.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsRenameable ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Renameable</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsRenameable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsRenameable.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsRenameable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsRenameable.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsRenameable.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsMappable ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Mappable</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsMappable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsMappable.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsMappable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsMappable.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsMappable.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanCreateAttributes ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Create Attributes</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanCreateAttributes.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateAttributes.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanCreateAttributes.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateAttributes.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanCreateAttributes.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanCreateForms ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Create Forms</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanCreateForms.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateForms.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanCreateForms.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateForms.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanCreateForms.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanCreateViews ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Create Views</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanCreateViews.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateViews.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanCreateViews.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateViews.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanCreateViews.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanCreateCharts ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Create Charts</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanCreateCharts.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateCharts.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanCreateCharts.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateCharts.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanCreateCharts.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanBeRelatedEntityInRelationship ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Be in Relationships</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanBeRelatedEntityInRelationship.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeRelatedEntityInRelationship.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanBeRelatedEntityInRelationship.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeRelatedEntityInRelationship.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanBeRelatedEntityInRelationship.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanBePrimaryEntityInRelationship ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Be Primary in Relationships</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanBePrimaryEntityInRelationship.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBePrimaryEntityInRelationship.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanBePrimaryEntityInRelationship.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBePrimaryEntityInRelationship.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanBePrimaryEntityInRelationship.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.CanBeInManyToMany ? \`
                                        <div class="property-row">
                                            <div class="property-label">Can Be in Many-to-Many</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.CanBeInManyToMany.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInManyToMany.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.CanBeInManyToMany.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInManyToMany.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.CanBeInManyToMany.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Feature Integration</div>
                                        <div class="property-row">
                                            <div class="property-label">Is Enabled for Charts</div>
                                            <div class="property-value \${entity.IsEnabledForCharts ? 'boolean-true' : 'boolean-false'}">\${entity.IsEnabledForCharts ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Valid for Advanced Find</div>
                                            <div class="property-value \${entity.IsValidForAdvancedFind ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForAdvancedFind ? 'True' : 'False'}</div>
                                        </div>
                                        \${entity.IsValidForQueue ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Valid for Queue</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsValidForQueue.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForQueue.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsValidForQueue.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForQueue.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsValidForQueue.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsConnectionsEnabled ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Connections Enabled</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsConnectionsEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsConnectionsEnabled.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsConnectionsEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsConnectionsEnabled.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsConnectionsEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        <div class="property-row">
                                            <div class="property-label">Is Document Management Enabled</div>
                                            <div class="property-value \${entity.IsDocumentManagementEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsDocumentManagementEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is OneNote Integration Enabled</div>
                                            <div class="property-value \${entity.IsOneNoteIntegrationEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsOneNoteIntegrationEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is MS Teams Integration Enabled</div>
                                            <div class="property-value \${entity.IsMSTeamsIntegrationEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsMSTeamsIntegrationEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        \${entity.IsMailMergeEnabled ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Mail Merge Enabled</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsMailMergeEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsMailMergeEnabled.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsMailMergeEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsMailMergeEnabled.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsMailMergeEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        <div class="property-row">
                                            <div class="property-label">Has Notes</div>
                                            <div class="property-value \${entity.HasNotes ? 'boolean-true' : 'boolean-false'}">\${entity.HasNotes ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Has Activities</div>
                                            <div class="property-value \${entity.HasActivities ? 'boolean-true' : 'boolean-false'}">\${entity.HasActivities ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Has Email Addresses</div>
                                            <div class="property-value \${entity.HasEmailAddresses ? 'boolean-true' : 'boolean-false'}">\${entity.HasEmailAddresses ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Has Feedback</div>
                                            <div class="property-value \${entity.HasFeedback ? 'boolean-true' : 'boolean-false'}">\${entity.HasFeedback ? 'True' : 'False'}</div>
                                        </div>
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Mobile Configuration</div>
                                        <div class="property-row">
                                            <div class="property-label">Mobile Offline Filters</div>
                                            <div class="property-value">
                                                \${entity.MobileOfflineFilters ? \`
                                                    <div style="
                                                        background-color: #1e1e1e; 
                                                        border: 1px solid #404040; 
                                                        border-radius: 4px; 
                                                        padding: 12px; 
                                                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
                                                        font-size: 0.85em; 
                                                        line-height: 1.4; 
                                                        color: #d4d4d4;
                                                        overflow-x: auto;
                                                        white-space: pre;
                                                        margin-top: 4px;
                                                    ">\${highlightXml(decodeUnicodeEscapes(entity.MobileOfflineFilters))}</div>
                                                \` : 'Not specified'}
                                            </div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Available Offline</div>
                                            <div class="property-value \${entity.IsAvailableOffline ? 'boolean-true' : 'boolean-false'}">\${entity.IsAvailableOffline ? 'True' : 'False'}</div>
                                        </div>
                                        \${entity.IsVisibleInMobile ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Visible in Mobile</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsVisibleInMobile.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobile.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsVisibleInMobile.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobile.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsVisibleInMobile.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsVisibleInMobileClient ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Visible in Mobile Client</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsVisibleInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobileClient.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsVisibleInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsVisibleInMobileClient.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsReadOnlyInMobileClient ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Read Only in Mobile Client</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsReadOnlyInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsReadOnlyInMobileClient.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsReadOnlyInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsReadOnlyInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsReadOnlyInMobileClient.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                        \${entity.IsOfflineInMobileClient ? \`
                                        <div class="property-row">
                                            <div class="property-label">Is Offline in Mobile Client</div>
                                            <div class="property-value"></div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Value</div>
                                            <div class="property-value \${entity.IsOfflineInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsOfflineInMobileClient.Value ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Can Be Changed</div>
                                            <div class="property-value \${entity.IsOfflineInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsOfflineInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row property-sub-details">
                                            <div class="property-label">Managed Property Logical Name</div>
                                            <div class="property-value">\${entity.IsOfflineInMobileClient.ManagedPropertyLogicalName || 'Not specified'}</div>
                                        </div>
                                        \` : ''}
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Workflow & Automation</div>
                                        <div class="property-row">
                                            <div class="property-label">Can Trigger Workflow</div>
                                            <div class="property-value \${entity.CanTriggerWorkflow ? 'boolean-true' : 'boolean-false'}">\${entity.CanTriggerWorkflow ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is State Model Aware</div>
                                            <div class="property-value \${entity.IsStateModelAware ? 'boolean-true' : 'boolean-false'}">\${entity.IsStateModelAware ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Enforce State Transitions</div>
                                            <div class="property-value \${entity.EnforceStateTransitions ? 'boolean-true' : 'boolean-false'}">\${entity.EnforceStateTransitions ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Business Process Enabled</div>
                                            <div class="property-value \${entity.IsBusinessProcessEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsBusinessProcessEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is BPF Entity</div>
                                            <div class="property-value \${entity.IsBPFEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsBPFEntity ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Auto Route to Owner Queue</div>
                                            <div class="property-value \${entity.AutoRouteToOwnerQueue ? 'boolean-true' : 'boolean-false'}">\${entity.AutoRouteToOwnerQueue ? 'True' : 'False'}</div>
                                        </div>
                                    </div>

                                    <div class="property-section">
                                        <div class="property-section-title">Data Management</div>
                                        <div class="property-row">
                                            <div class="property-label">Is Importable</div>
                                            <div class="property-value \${entity.IsImportable ? 'boolean-true' : 'boolean-false'}">\${entity.IsImportable ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Change Tracking Enabled</div>
                                            <div class="property-value \${entity.ChangeTrackingEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.ChangeTrackingEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Optimistic Concurrency Enabled</div>
                                            <div class="property-value \${entity.IsOptimisticConcurrencyEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsOptimisticConcurrencyEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Duplicate Detection Enabled</div>
                                            <div class="property-value \${getBooleanValue(entity.IsDuplicateDetectionEnabled) ? 'boolean-true' : 'boolean-false'}">\${getBooleanValue(entity.IsDuplicateDetectionEnabled) ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Archival Enabled</div>
                                            <div class="property-value \${entity.IsArchivalEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsArchivalEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Retention Enabled</div>
                                            <div class="property-value \${entity.IsRetentionEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetentionEnabled ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Days Since Record Last Modified</div>
                                            <div class="property-value">\${entity.DaysSinceRecordLastModified !== null && entity.DaysSinceRecordLastModified !== undefined ? entity.DaysSinceRecordLastModified : 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Is Enabled for External Channels</div>
                                            <div class="property-value \${entity.IsEnabledForExternalChannels ? 'boolean-true' : 'boolean-false'}">\${entity.IsEnabledForExternalChannels ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Sync to External Search Index</div>
                                            <div class="property-value \${entity.SyncToExternalSearchIndex ? 'boolean-true' : 'boolean-false'}">\${entity.SyncToExternalSearchIndex ? 'True' : 'False'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Uses Business Data Label Table</div>
                                            <div class="property-value \${entity.UsesBusinessDataLabelTable ? 'boolean-true' : 'boolean-false'}">\${entity.UsesBusinessDataLabelTable ? 'True' : 'False'}</div>
                                        </div>
                                    </div>


                                    <div class="property-section">
                                        <div class="property-section-title">Icon & Appearance</div>
                                        <div class="property-row">
                                            <div class="property-label">Icon Large Name</div>
                                            <div class="property-value">\${entity.IconLargeName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Icon Medium Name</div>
                                            <div class="property-value">\${entity.IconMediumName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Icon Small Name</div>
                                            <div class="property-value">\${entity.IconSmallName || 'Not specified'}</div>
                                        </div>
                                        <div class="property-row">
                                            <div class="property-label">Icon Vector Name</div>
                                            <div class="property-value">\${entity.IconVectorName || 'Not specified'}</div>
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
                            
                            // Show basic entity info in main panel (limited data)
                            document.getElementById('tabContentArea').innerHTML = \`
                                <div class="main-content">
                                    <div class="property-section">
                                        <div class="property-section-title">Basic Information (Limited Data)</div>
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
                                        <p class="text-muted" style="margin-top: 16px; font-style: italic;">Note: This is showing limited data from the entity list. Select the entity to load complete metadata.</p>
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
                    } else if (itemType === 'ManyToManyRelationship') {
                        html += generateManyToManyProperties(item);
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
                            <div class="property-section-title">General Information</div>
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
                                <div class="property-value">\${entity.EntitySetName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Object Type Code</div>
                                <div class="property-value">\${entity.ObjectTypeCode !== undefined ? entity.ObjectTypeCode : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Table Type</div>
                                <div class="property-value">\${entity.TableType || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Color</div>
                                <div class="property-value">\${entity.EntityColor || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${entity.HasChanged !== null && entity.HasChanged !== undefined ? (entity.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">External Name</div>
                                <div class="property-value">\${entity.ExternalName || 'Not specified'}</div>
                            </div>
                            \${entity.DisplayName ? \`
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value"></div>
                            </div>
                            \${entity.DisplayName.UserLocalizedLabel ? \`
                            <div class="property-row property-container-details">
                                <div class="property-label">User Localized Label</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${entity.DisplayName.UserLocalizedLabel.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${entity.DisplayName.UserLocalizedLabel.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${entity.DisplayName.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${entity.DisplayName.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.DisplayName.LocalizedLabels && entity.DisplayName.LocalizedLabels.length > 0 ? entity.DisplayName.LocalizedLabels.map((label, index) => \`
                            <div class="property-row property-container-details">
                                <div class="property-label">Localized Label \${index + 1}</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${label.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${label.LanguageCode}</div>
                            </div>
                            \`).join('') : ''}
                            \` : ''}
                            \${entity.DisplayCollectionName ? \`
                            <div class="property-row">
                                <div class="property-label">Display Collection Name</div>
                                <div class="property-value">\${entity.DisplayCollectionName.UserLocalizedLabel?.Label || ''}</div>
                            </div>
                            \` : ''}
                            \${entity.Description ? \`
                            <div class="property-row">
                                <div class="property-label">Description</div>
                                <div class="property-value">\${entity.Description.UserLocalizedLabel?.Label || 'No description'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Primary Attributes & Collections</div>
                            <div class="property-row">
                                <div class="property-label">Primary ID Attribute</div>
                                <div class="property-value">\${entity.PrimaryIdAttribute || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Primary Name Attribute</div>
                                <div class="property-value">\${entity.PrimaryNameAttribute || 'None'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Primary Image Attribute</div>
                                <div class="property-value">\${entity.PrimaryImageAttribute || 'None'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Logical Collection Name</div>
                                <div class="property-value">\${entity.LogicalCollectionName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Collection Schema Name</div>
                                <div class="property-value">\${entity.CollectionSchemaName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">External Collection Name</div>
                                <div class="property-value">\${entity.ExternalCollectionName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Report View Name</div>
                                <div class="property-value">\${entity.ReportViewName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Primary Key</div>
                                <div class="property-value">\${entity.PrimaryKey && entity.PrimaryKey.length > 0 ? entity.PrimaryKey.join(', ') : 'Not specified'}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Ownership & Security</div>
                            <div class="property-row">
                                <div class="property-label">Ownership Type</div>
                                <div class="property-value">\${entity.OwnershipType || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Owner ID</div>
                                <div class="property-value">\${entity.OwnerId || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Owner ID Type</div>
                                <div class="property-value">\${entity.OwnerIdType !== undefined ? entity.OwnerIdType : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Owning Business Unit</div>
                                <div class="property-value">\${entity.OwningBusinessUnit || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Privileges</div>
                                <div class="property-value">\${entity.Privileges && entity.Privileges.length > 0 ? entity.Privileges.length + ' privileges defined' : 'None'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Entity Classification</div>
                            <div class="property-row">
                                <div class="property-label">Is Custom Entity</div>
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
                                <div class="property-label">Is Activity Party</div>
                                <div class="property-value \${entity.IsActivityParty ? 'boolean-true' : 'boolean-false'}">\${entity.IsActivityParty ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Activity Type Mask</div>
                                <div class="property-value">\${entity.ActivityTypeMask !== undefined ? entity.ActivityTypeMask : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Intersect</div>
                                <div class="property-value \${entity.IsIntersect ? 'boolean-true' : 'boolean-false'}">\${entity.IsIntersect ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Private</div>
                                <div class="property-value \${entity.IsPrivate ? 'boolean-true' : 'boolean-false'}">\${entity.IsPrivate ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Logical Entity</div>
                                <div class="property-value \${entity.IsLogicalEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsLogicalEntity ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Child Entity</div>
                                <div class="property-value \${entity.IsChildEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsChildEntity ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is BPF Entity</div>
                                <div class="property-value \${entity.IsBPFEntity ? 'boolean-true' : 'boolean-false'}">\${entity.IsBPFEntity ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Solution Aware</div>
                                <div class="property-value \${entity.IsSolutionAware ? 'boolean-true' : 'boolean-false'}">\${entity.IsSolutionAware ? 'True' : 'False'}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Entity Capabilities</div>
                            \${entity.IsCustomizable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomizable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${entity.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsRenameable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Renameable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsRenameable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsRenameable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsRenameable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsRenameable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsMappable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Mappable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsMappable.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsMappable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsMappable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsMappable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanCreateAttributes ? \`
                            <div class="property-row">
                                <div class="property-label">Can Create Attributes</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanCreateAttributes.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateAttributes.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanCreateAttributes.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateAttributes.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanCreateForms ? \`
                            <div class="property-row">
                                <div class="property-label">Can Create Forms</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanCreateForms.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateForms.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanCreateForms.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateForms.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanCreateViews ? \`
                            <div class="property-row">
                                <div class="property-label">Can Create Views</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanCreateViews.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateViews.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanCreateViews.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateViews.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanCreateCharts ? \`
                            <div class="property-row">
                                <div class="property-label">Can Create Charts</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanCreateCharts.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateCharts.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanCreateCharts.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanCreateCharts.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Relationship Capabilities</div>
                            \${entity.CanBeRelatedEntityInRelationship ? \`
                            <div class="property-row">
                                <div class="property-label">Can Be Related Entity In Relationship</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanBeRelatedEntityInRelationship.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeRelatedEntityInRelationship.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanBeRelatedEntityInRelationship.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeRelatedEntityInRelationship.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanBePrimaryEntityInRelationship ? \`
                            <div class="property-row">
                                <div class="property-label">Can Be Primary Entity In Relationship</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanBePrimaryEntityInRelationship.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBePrimaryEntityInRelationship.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanBePrimaryEntityInRelationship.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBePrimaryEntityInRelationship.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanBeInManyToMany ? \`
                            <div class="property-row">
                                <div class="property-label">Can Be In Many To Many</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanBeInManyToMany.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInManyToMany.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanBeInManyToMany.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInManyToMany.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanBeInCustomEntityAssociation ? \`
                            <div class="property-row">
                                <div class="property-label">Can Be In Custom Entity Association</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanBeInCustomEntityAssociation.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInCustomEntityAssociation.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanBeInCustomEntityAssociation.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanBeInCustomEntityAssociation.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.CanChangeHierarchicalRelationship ? \`
                            <div class="property-row">
                                <div class="property-label">Can Change Hierarchical Relationship</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanChangeHierarchicalRelationship.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanChangeHierarchicalRelationship.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanChangeHierarchicalRelationship.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanChangeHierarchicalRelationship.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Feature Integration</div>
                            \${entity.IsAuditEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Is Audit Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsAuditEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsAuditEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsAuditEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsAuditEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Is Retrieve Audit Enabled</div>
                                <div class="property-value \${entity.IsRetrieveAuditEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetrieveAuditEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Retrieve Multiple Audit Enabled</div>
                                <div class="property-value \${entity.IsRetrieveMultipleAuditEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetrieveMultipleAuditEnabled ? 'True' : 'False'}</div>
                            </div>
                            \${entity.IsValidForQueue ? \`
                            <div class="property-row">
                                <div class="property-label">Is Valid For Queue</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsValidForQueue.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForQueue.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsValidForQueue.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForQueue.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsConnectionsEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Is Connections Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsConnectionsEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsConnectionsEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsConnectionsEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsConnectionsEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsDuplicateDetectionEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Is Duplicate Detection Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsDuplicateDetectionEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsDuplicateDetectionEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsDuplicateDetectionEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsDuplicateDetectionEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsMailMergeEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Is Mail Merge Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsMailMergeEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsMailMergeEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsMailMergeEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsMailMergeEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Has Activities</div>
                                <div class="property-value \${entity.HasActivities ? 'boolean-true' : 'boolean-false'}">\${entity.HasActivities ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Notes</div>
                                <div class="property-value \${entity.HasNotes ? 'boolean-true' : 'boolean-false'}">\${entity.HasNotes ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Feedback</div>
                                <div class="property-value \${entity.HasFeedback ? 'boolean-true' : 'boolean-false'}">\${entity.HasFeedback ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Email Addresses</div>
                                <div class="property-value \${entity.HasEmailAddresses ? 'boolean-true' : 'boolean-false'}">\${entity.HasEmailAddresses ? 'True' : 'False'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Workflow & Business Process</div>
                            <div class="property-row">
                                <div class="property-label">Can Trigger Workflow</div>
                                <div class="property-value \${entity.CanTriggerWorkflow ? 'boolean-true' : 'boolean-false'}">\${entity.CanTriggerWorkflow ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Business Process Enabled</div>
                                <div class="property-value \${entity.IsBusinessProcessEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsBusinessProcessEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is State Model Aware</div>
                                <div class="property-value \${entity.IsStateModelAware ? 'boolean-true' : 'boolean-false'}">\${entity.IsStateModelAware ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Enforce State Transitions</div>
                                <div class="property-value \${entity.EnforceStateTransitions ? 'boolean-true' : 'boolean-false'}">\${entity.EnforceStateTransitions ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Auto Route To Owner Queue</div>
                                <div class="property-value \${entity.AutoRouteToOwnerQueue ? 'boolean-true' : 'boolean-false'}">\${entity.AutoRouteToOwnerQueue ? 'True' : 'False'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Data Management</div>
                            <div class="property-row">
                                <div class="property-label">Is Importable</div>
                                <div class="property-value \${entity.IsImportable ? 'boolean-true' : 'boolean-false'}">\${entity.IsImportable ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Change Tracking Enabled</div>
                                <div class="property-value \${entity.ChangeTrackingEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.ChangeTrackingEnabled ? 'True' : 'False'}</div>
                            </div>
                            \${entity.CanChangeTrackingBeEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Can Change Tracking Be Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanChangeTrackingBeEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanChangeTrackingBeEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanChangeTrackingBeEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanChangeTrackingBeEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Is Optimistic Concurrency Enabled</div>
                                <div class="property-value \${entity.IsOptimisticConcurrencyEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsOptimisticConcurrencyEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Sync To External Search Index</div>
                                <div class="property-value \${entity.SyncToExternalSearchIndex ? 'boolean-true' : 'boolean-false'}">\${entity.SyncToExternalSearchIndex ? 'True' : 'False'}</div>
                            </div>
                            \${entity.CanEnableSyncToExternalSearchIndex ? \`
                            <div class="property-row">
                                <div class="property-label">Can Enable Sync To External Search Index</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanEnableSyncToExternalSearchIndex.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanEnableSyncToExternalSearchIndex.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanEnableSyncToExternalSearchIndex.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanEnableSyncToExternalSearchIndex.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Days Since Record Last Modified</div>
                                <div class="property-value">\${entity.DaysSinceRecordLastModified !== undefined ? entity.DaysSinceRecordLastModified : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Data Provider ID</div>
                                <div class="property-value">\${entity.DataProviderId || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Data Source ID</div>
                                <div class="property-value">\${entity.DataSourceId || 'Not specified'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Search & Advanced Find</div>
                            <div class="property-row">
                                <div class="property-label">Is Valid for Advanced Find</div>
                                <div class="property-value \${entity.IsValidForAdvancedFind ? 'boolean-true' : 'boolean-false'}">\${entity.IsValidForAdvancedFind ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Enabled for Charts</div>
                                <div class="property-value \${entity.IsEnabledForCharts ? 'boolean-true' : 'boolean-false'}">\${entity.IsEnabledForCharts ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Enabled for Trace</div>
                                <div class="property-value \${entity.IsEnabledForTrace ? 'boolean-true' : 'boolean-false'}">\${entity.IsEnabledForTrace ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Enabled for External Channels</div>
                                <div class="property-value \${entity.IsEnabledForExternalChannels ? 'boolean-true' : 'boolean-false'}">\${entity.IsEnabledForExternalChannels ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is AIR Updated</div>
                                <div class="property-value \${entity.IsAIRUpdated ? 'boolean-true' : 'boolean-false'}">\${entity.IsAIRUpdated ? 'True' : 'False'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Integration Settings</div>
                            <div class="property-row">
                                <div class="property-label">Is Document Management Enabled</div>
                                <div class="property-value \${entity.IsDocumentManagementEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsDocumentManagementEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is OneNote Integration Enabled</div>
                                <div class="property-value \${entity.IsOneNoteIntegrationEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsOneNoteIntegrationEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is MS Teams Integration Enabled</div>
                                <div class="property-value \${entity.IsMSTeamsIntegrationEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsMSTeamsIntegrationEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Knowledge Management Enabled</div>
                                <div class="property-value \${entity.IsKnowledgeManagementEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsKnowledgeManagementEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Interaction Centric Enabled</div>
                                <div class="property-value \${entity.IsInteractionCentricEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsInteractionCentricEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Document Recommendations Enabled</div>
                                <div class="property-value \${entity.IsDocumentRecommendationsEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsDocumentRecommendationsEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is SLA Enabled</div>
                                <div class="property-value \${entity.IsSLAEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsSLAEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Help URL Enabled</div>
                                <div class="property-value \${entity.EntityHelpUrlEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.EntityHelpUrlEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Help URL</div>
                                <div class="property-value">\${entity.EntityHelpUrl || 'Not specified'}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Mobile Configuration</div>
                            <div class="property-row">
                                <div class="property-label">Is Available Offline</div>
                                <div class="property-value \${entity.IsAvailableOffline ? 'boolean-true' : 'boolean-false'}">\${entity.IsAvailableOffline ? 'True' : 'False'}</div>
                            </div>
                            \${entity.IsVisibleInMobile ? \`
                            <div class="property-row">
                                <div class="property-label">Is Visible In Mobile</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsVisibleInMobile.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobile.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsVisibleInMobile.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobile.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsVisibleInMobileClient ? \`
                            <div class="property-row">
                                <div class="property-label">Is Visible In Mobile Client</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsVisibleInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobileClient.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsVisibleInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsVisibleInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsReadOnlyInMobileClient ? \`
                            <div class="property-row">
                                <div class="property-label">Is Read Only In Mobile Client</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsReadOnlyInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsReadOnlyInMobileClient.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsReadOnlyInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsReadOnlyInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            \${entity.IsOfflineInMobileClient ? \`
                            <div class="property-row">
                                <div class="property-label">Is Offline In Mobile Client</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.IsOfflineInMobileClient.Value ? 'boolean-true' : 'boolean-false'}">\${entity.IsOfflineInMobileClient.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.IsOfflineInMobileClient.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.IsOfflineInMobileClient.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Is Reading Pane Enabled</div>
                                <div class="property-value \${entity.IsReadingPaneEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsReadingPaneEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Quick Create Enabled</div>
                                <div class="property-value \${entity.IsQuickCreateEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsQuickCreateEnabled ? 'True' : 'False'}</div>
                            </div>
                            \${entity.MobileOfflineFilters ? \`
                            <div class="property-row">
                                <div class="property-label">Mobile Offline Filters</div>
                                <div class="property-value"><span style="font-style: italic">XML filter definition present</span></div>
                            </div>
                            \` : ''}
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Advanced Settings</div>
                            <div class="property-row">
                                <div class="property-label">Auto Create Access Teams</div>
                                <div class="property-value \${entity.AutoCreateAccessTeams ? 'boolean-true' : 'boolean-false'}">\${entity.AutoCreateAccessTeams ? 'True' : 'False'}</div>
                            </div>
                            \${entity.CanModifyAdditionalSettings ? \`
                            <div class="property-row">
                                <div class="property-label">Can Modify Additional Settings</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${entity.CanModifyAdditionalSettings.Value ? 'boolean-true' : 'boolean-false'}">\${entity.CanModifyAdditionalSettings.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${entity.CanModifyAdditionalSettings.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${entity.CanModifyAdditionalSettings.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Is Archival Enabled</div>
                                <div class="property-value \${entity.IsArchivalEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsArchivalEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Retention Enabled</div>
                                <div class="property-value \${entity.IsRetentionEnabled ? 'boolean-true' : 'boolean-false'}">\${entity.IsRetentionEnabled ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Cluster Mode</div>
                                <div class="property-value">\${entity.ClusterMode || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Change Cluster Mode</div>
                                <div class="property-value \${entity.CanChangeClusterMode ? 'boolean-true' : 'boolean-false'}">\${entity.CanChangeClusterMode ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Auto Replicate Cluster Records</div>
                                <div class="property-value \${entity.AutoReplicateClusterRecords ? 'boolean-true' : 'boolean-false'}">\${entity.AutoReplicateClusterRecords ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Uses Business Data Label Table</div>
                                <div class="property-value \${entity.UsesBusinessDataLabelTable ? 'boolean-true' : 'boolean-false'}">\${entity.UsesBusinessDataLabelTable ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Setting Of</div>
                                <div class="property-value">\${entity.SettingOf || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Recurrence Base Entity Logical Name</div>
                                <div class="property-value">\${entity.RecurrenceBaseEntityLogicalName || 'Not specified'}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Icons</div>
                            <div class="property-row">
                                <div class="property-label">Icon Large Name</div>
                                <div class="property-value">\${entity.IconLargeName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Icon Medium Name</div>
                                <div class="property-value">\${entity.IconMediumName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Icon Small Name</div>
                                <div class="property-value">\${entity.IconSmallName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Icon Vector Name</div>
                                <div class="property-value">\${entity.IconVectorName || 'Not specified'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Timestamps</div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${entity.IntroducedVersion || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Created On</div>
                                <div class="property-value">\${entity.CreatedOn ? new Date(entity.CreatedOn).toLocaleDateString() + ' ' + new Date(entity.CreatedOn).toLocaleTimeString() : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Modified On</div>
                                <div class="property-value">\${entity.ModifiedOn ? new Date(entity.ModifiedOn).toLocaleDateString() + ' ' + new Date(entity.ModifiedOn).toLocaleTimeString() : 'Not specified'}</div>
                            </div>
                        </div>
                        
                        \${entity.Settings && entity.Settings.length > 0 ? \`
                        <div class="property-section">
                            <div class="property-section-title">Settings</div>
                            <div class="property-row">
                                <div class="property-label">Settings Count</div>
                                <div class="property-value">\${entity.Settings.length} settings defined</div>
                            </div>
                        </div>
                        \` : ''}
                    \`;
                }
                
                function generateAttributeDataTypeProperties(attribute) {
                    const attributeType = attribute.AttributeType;
                    let dataTypeSection = '';
                    
                    if (attributeType === 'String') {
                        dataTypeSection = \`
                            <div class="property-section">
                                <div class="property-section-title">String Properties</div>
                                <div class="property-row">
                                    <div class="property-label">Format</div>
                                    <div class="property-value">\${attribute.Format || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Format Name</div>
                                    <div class="property-value">\${attribute.FormatName?.Value || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Max Length</div>
                                    <div class="property-value">\${attribute.MaxLength !== null && attribute.MaxLength !== undefined ? attribute.MaxLength : 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Database Length</div>
                                    <div class="property-value">\${attribute.DatabaseLength !== null && attribute.DatabaseLength !== undefined ? attribute.DatabaseLength : 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">IME Mode</div>
                                    <div class="property-value">\${attribute.ImeMode || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Yomi Of</div>
                                    <div class="property-value">\${attribute.YomiOf || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Is Localizable</div>
                                    <div class="property-value \${attribute.IsLocalizable ? 'boolean-true' : 'boolean-false'}">\${attribute.IsLocalizable ? 'True' : 'False'}</div>
                                </div>
                            </div>
                        \`;
                    } else if (attributeType === 'Picklist' || attributeType === 'Status' || attributeType === 'State') {
                        dataTypeSection = \`
                            <div class="property-section">
                                <div class="property-section-title">Choice Properties</div>
                                <div class="property-row">
                                    <div class="property-label">Default Form Value</div>
                                    <div class="property-value">\${attribute.DefaultFormValue !== null && attribute.DefaultFormValue !== undefined ? attribute.DefaultFormValue : 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Parent Picklist Logical Name</div>
                                    <div class="property-value">\${attribute.ParentPicklistLogicalName || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Child Picklist Logical Names</div>
                                    <div class="property-value">\${attribute.ChildPicklistLogicalNames && attribute.ChildPicklistLogicalNames.length > 0 ? attribute.ChildPicklistLogicalNames.join(', ') : 'None'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Source Type Mask</div>
                                    <div class="property-value">\${attribute.SourceTypeMask !== null && attribute.SourceTypeMask !== undefined ? attribute.SourceTypeMask : 'Not specified'}</div>
                                </div>
                            </div>
                        \`;
                    } else if (attributeType === 'Integer' || attributeType === 'BigInt' || attributeType === 'Decimal' || attributeType === 'Double' || attributeType === 'Money') {
                        dataTypeSection = \`
                            <div class="property-section">
                                <div class="property-section-title">Numeric Properties</div>
                                \${attribute.MinValue !== null && attribute.MinValue !== undefined ? \`
                                <div class="property-row">
                                    <div class="property-label">Min Value</div>
                                    <div class="property-value">\${attribute.MinValue}</div>
                                </div>
                                \` : ''}
                                \${attribute.MaxValue !== null && attribute.MaxValue !== undefined ? \`
                                <div class="property-row">
                                    <div class="property-label">Max Value</div>
                                    <div class="property-value">\${attribute.MaxValue}</div>
                                </div>
                                \` : ''}
                                \${attribute.Precision !== null && attribute.Precision !== undefined ? \`
                                <div class="property-row">
                                    <div class="property-label">Precision</div>
                                    <div class="property-value">\${attribute.Precision}</div>
                                </div>
                                \` : ''}
                                \${attribute.Format ? \`
                                <div class="property-row">
                                    <div class="property-label">Format</div>
                                    <div class="property-value">\${attribute.Format}</div>
                                </div>
                                \` : ''}
                            </div>
                        \`;
                    } else if (attributeType === 'DateTime') {
                        dataTypeSection = \`
                            <div class="property-section">
                                <div class="property-section-title">DateTime Properties</div>
                                <div class="property-row">
                                    <div class="property-label">Format</div>
                                    <div class="property-value">\${attribute.Format || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Date Behavior</div>
                                    <div class="property-value">\${attribute.DateTimeBehavior?.Value || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Can Change Date Time Behavior</div>
                                    <div class="property-value \${attribute.CanChangeDateTimeBehavior ? 'boolean-true' : 'boolean-false'}">\${attribute.CanChangeDateTimeBehavior ? 'True' : 'False'}</div>
                                </div>
                            </div>
                        \`;
                    } else if (attributeType === 'Memo') {
                        dataTypeSection = \`
                            <div class="property-section">
                                <div class="property-section-title">Memo Properties</div>
                                <div class="property-row">
                                    <div class="property-label">Format</div>
                                    <div class="property-value">\${attribute.Format || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Max Length</div>
                                    <div class="property-value">\${attribute.MaxLength !== null && attribute.MaxLength !== undefined ? attribute.MaxLength : 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">IME Mode</div>
                                    <div class="property-value">\${attribute.ImeMode || 'Not specified'}</div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    return dataTypeSection;
                }
                
                function generateAttributeProperties(attribute) {
                    return \`
                        <div class="property-section">
                            <div class="property-section-title">General Information</div>
                            <div class="property-row">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value">\${attribute.MetadataId || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Logical Name</div>
                                <div class="property-value">\${attribute.LogicalName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Schema Name</div>
                                <div class="property-value">\${attribute.SchemaName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">External Name</div>
                                <div class="property-value">\${attribute.ExternalName || 'Not specified'}</div>
                            </div>
                            \${attribute.DisplayName ? \`
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value"></div>
                            </div>
                            \${attribute.DisplayName.UserLocalizedLabel ? \`
                            <div class="property-row property-container-details">
                                <div class="property-label">User Localized Label</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${attribute.DisplayName.UserLocalizedLabel.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${attribute.DisplayName.UserLocalizedLabel.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${attribute.DisplayName.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${attribute.DisplayName.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value">\${attribute.DisplayName.UserLocalizedLabel.MetadataId || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.DisplayName.LocalizedLabels && attribute.DisplayName.LocalizedLabels.length > 0 ? attribute.DisplayName.LocalizedLabels.map((label, index) => \`
                            <div class="property-row property-container-details">
                                <div class="property-label">Localized Label \${index + 1}</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${label.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${label.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${label.IsManaged ? 'boolean-true' : 'boolean-false'}">\${label.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${label.MetadataId}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${label.HasChanged !== null ? (label.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            \`).join('') : ''}
                            \` : \`
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value">Not specified</div>
                            </div>
                            \`}
                            \${attribute.Description ? \`
                            <div class="property-row">
                                <div class="property-label">Description</div>
                                <div class="property-value"></div>
                            </div>
                            \${attribute.Description.UserLocalizedLabel ? \`
                            <div class="property-row property-container-details">
                                <div class="property-label">User Localized Label</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${attribute.Description.UserLocalizedLabel.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${attribute.Description.UserLocalizedLabel.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${attribute.Description.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${attribute.Description.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value">\${attribute.Description.UserLocalizedLabel.MetadataId || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.Description.LocalizedLabels && attribute.Description.LocalizedLabels.length > 0 ? attribute.Description.LocalizedLabels.map((label, index) => \`
                            <div class="property-row property-container-details">
                                <div class="property-label">Localized Label \${index + 1}</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${label.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${label.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${label.IsManaged ? 'boolean-true' : 'boolean-false'}">\${label.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${label.MetadataId}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${label.HasChanged !== null ? (label.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            \`).join('') : ''}
                            \` : \`
                            <div class="property-row">
                                <div class="property-label">Description</div>
                                <div class="property-value">Not specified</div>
                            </div>
                            \`}
                            <div class="property-row">
                                <div class="property-label">Attribute Type</div>
                                <div class="property-value">\${attribute.AttributeType || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Attribute Type Name</div>
                                <div class="property-value">\${attribute.AttributeTypeName?.Value || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Logical Name</div>
                                <div class="property-value">\${attribute.EntityLogicalName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Column Number</div>
                                <div class="property-value">\${attribute.ColumnNumber !== null && attribute.ColumnNumber !== undefined ? attribute.ColumnNumber : 'Not specified'}</div>
                            </div>
                        </div>

                        \${generateAttributeDataTypeProperties(attribute)}

                        <div class="property-section">
                            <div class="property-section-title">Validation & Requirements</div>
                            \${attribute.RequiredLevel ? \`
                            <div class="property-row">
                                <div class="property-label">Required Level</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value">\${getRequiredLevel(attribute.RequiredLevel)}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.RequiredLevel.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.RequiredLevel.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.RequiredLevel.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
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
                            <div class="property-row">
                                <div class="property-label">Valid for Form</div>
                                <div class="property-value \${attribute.IsValidForForm ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForForm ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Required for Form</div>
                                <div class="property-value \${attribute.IsRequiredForForm ? 'boolean-true' : 'boolean-false'}">\${attribute.IsRequiredForForm ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Valid for Grid</div>
                                <div class="property-value \${attribute.IsValidForGrid ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForGrid ? 'True' : 'False'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Security & Permissions</div>
                            <div class="property-row">
                                <div class="property-label">Can Be Secured for Create</div>
                                <div class="property-value \${attribute.CanBeSecuredForCreate ? 'boolean-true' : 'boolean-false'}">\${attribute.CanBeSecuredForCreate ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Secured for Read</div>
                                <div class="property-value \${attribute.CanBeSecuredForRead ? 'boolean-true' : 'boolean-false'}">\${attribute.CanBeSecuredForRead ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Secured for Update</div>
                                <div class="property-value \${attribute.CanBeSecuredForUpdate ? 'boolean-true' : 'boolean-false'}">\${attribute.CanBeSecuredForUpdate ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Secured</div>
                                <div class="property-value \${attribute.IsSecured ? 'boolean-true' : 'boolean-false'}">\${attribute.IsSecured ? 'True' : 'False'}</div>
                            </div>
                            \${attribute.IsCustomizable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsCustomizable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.IsRenameable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Renameable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsRenameable.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsRenameable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsRenameable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsRenameable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsRenameable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Search & Filtering</div>
                            <div class="property-row">
                                <div class="property-label">Is Searchable</div>
                                <div class="property-value \${attribute.IsSearchable ? 'boolean-true' : 'boolean-false'}">\${attribute.IsSearchable ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Filterable</div>
                                <div class="property-value \${attribute.IsFilterable ? 'boolean-true' : 'boolean-false'}">\${attribute.IsFilterable ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Retrievable</div>
                                <div class="property-value \${attribute.IsRetrievable ? 'boolean-true' : 'boolean-false'}">\${attribute.IsRetrievable ? 'True' : 'False'}</div>
                            </div>
                            \${attribute.IsValidForAdvancedFind ? \`
                            <div class="property-row">
                                <div class="property-label">Valid for Advanced Find</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsValidForAdvancedFind.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForAdvancedFind.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsValidForAdvancedFind.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidForAdvancedFind.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsValidForAdvancedFind.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.IsGlobalFilterEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Global Filter Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsGlobalFilterEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsGlobalFilterEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsGlobalFilterEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsGlobalFilterEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsGlobalFilterEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.IsSortableEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Sortable Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsSortableEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsSortableEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsSortableEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsSortableEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsSortableEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Auditing & Tracking</div>
                            \${attribute.IsAuditEnabled ? \`
                            <div class="property-row">
                                <div class="property-label">Audit Enabled</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.IsAuditEnabled.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.IsAuditEnabled.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.IsAuditEnabled.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsAuditEnabled.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.IsAuditEnabled.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            <div class="property-row">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${attribute.HasChanged !== null && attribute.HasChanged !== undefined ? (attribute.HasChanged ? 'Yes' : 'No') : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Created On</div>
                                <div class="property-value">\${attribute.CreatedOn ? new Date(attribute.CreatedOn).toLocaleDateString() + ' ' + new Date(attribute.CreatedOn).toLocaleTimeString() : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Modified On</div>
                                <div class="property-value">\${attribute.ModifiedOn ? new Date(attribute.ModifiedOn).toLocaleDateString() + ' ' + new Date(attribute.ModifiedOn).toLocaleTimeString() : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${attribute.IntroducedVersion || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Deprecated Version</div>
                                <div class="property-value">\${attribute.DeprecatedVersion || 'Not specified'}</div>
                            </div>
                        </div>

                        <div class="property-section">
                            <div class="property-section-title">Advanced Properties</div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${attribute.IsManaged ? 'boolean-true' : 'boolean-false'}">\${attribute.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Custom Attribute</div>
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
                                <div class="property-label">Is Valid OData Attribute</div>
                                <div class="property-value \${attribute.IsValidODataAttribute ? 'boolean-true' : 'boolean-false'}">\${attribute.IsValidODataAttribute ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Logical</div>
                                <div class="property-value \${attribute.IsLogical ? 'boolean-true' : 'boolean-false'}">\${attribute.IsLogical ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Data Source Secret</div>
                                <div class="property-value \${attribute.IsDataSourceSecret ? 'boolean-true' : 'boolean-false'}">\${attribute.IsDataSourceSecret ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Attribute Of</div>
                                <div class="property-value">\${attribute.AttributeOf || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Linked Attribute ID</div>
                                <div class="property-value">\${attribute.LinkedAttributeId || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Inherits From</div>
                                <div class="property-value">\${attribute.InheritsFrom || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Source Type</div>
                                <div class="property-value">\${attribute.SourceType !== null && attribute.SourceType !== undefined ? attribute.SourceType : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Auto Number Format</div>
                                <div class="property-value">\${attribute.AutoNumberFormat || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Formula Definition</div>
                                <div class="property-value">\${attribute.FormulaDefinition || 'Not specified'}</div>
                            </div>
                            \${attribute.CanModifyAdditionalSettings ? \`
                            <div class="property-row">
                                <div class="property-label">Can Modify Additional Settings</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${attribute.CanModifyAdditionalSettings.Value ? 'boolean-true' : 'boolean-false'}">\${attribute.CanModifyAdditionalSettings.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${attribute.CanModifyAdditionalSettings.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${attribute.CanModifyAdditionalSettings.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${attribute.CanModifyAdditionalSettings.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${attribute.Settings && attribute.Settings.length > 0 ? \`
                            <div class="property-row">
                                <div class="property-label">Settings</div>
                                <div class="property-value">\${attribute.Settings.length} settings defined</div>
                            </div>
                            \` : ''}
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
                                <div class="property-label">Entity Logical Name</div>
                                <div class="property-value">\${key.EntityLogicalName || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${key.HasChanged !== null ? (key.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${key.IsManaged ? 'boolean-true' : 'boolean-false'}">\${key.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${key.IntroducedVersion}</div>
                            </div>
                            \${key.IsCustomizable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${key.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${key.IsCustomizable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${key.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${key.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${key.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${key.DisplayName ? \`
                            <div class="property-row">
                                <div class="property-label">Display Name</div>
                                <div class="property-value"></div>
                            </div>
                            \${key.DisplayName.UserLocalizedLabel ? \`
                            <div class="property-row property-container-details">
                                <div class="property-label">User Localized Label</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${key.DisplayName.UserLocalizedLabel.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${key.DisplayName.UserLocalizedLabel.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${key.DisplayName.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${key.DisplayName.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${key.DisplayName.UserLocalizedLabel.MetadataId}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${key.DisplayName.UserLocalizedLabel.HasChanged !== null ? (key.DisplayName.UserLocalizedLabel.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${key.DisplayName.LocalizedLabels && key.DisplayName.LocalizedLabels.length > 0 ? key.DisplayName.LocalizedLabels.map((label, index) => \`
                            <div class="property-row property-container-details">
                                <div class="property-label">Localized Label \${index + 1}</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Label</div>
                                <div class="property-value">\${label.Label}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Language Code</div>
                                <div class="property-value">\${label.LanguageCode}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${label.IsManaged ? 'boolean-true' : 'boolean-false'}">\${label.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Metadata ID</div>
                                <div class="property-value guid">\${label.MetadataId}</div>
                            </div>
                            <div class="property-row property-deep-details">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${label.HasChanged !== null ? (label.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            \`).join('') : ''}
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Key Configuration</div>
                            <div class="property-row">
                                <div class="property-label">Key Attributes</div>
                                <div class="property-value">\${Array.isArray(key.KeyAttributes) ? key.KeyAttributes.join(', ') : key.KeyAttributes}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity Key Index Status</div>
                                <div class="property-value">\${key.EntityKeyIndexStatus || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Async Job</div>
                                <div class="property-value guid">\${key.AsyncJob || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Synchronous</div>
                                <div class="property-value \${key.IsSynchronous ? 'boolean-true' : 'boolean-false'}">\${key.IsSynchronous ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Export Key</div>
                                <div class="property-value \${key.IsExportKey ? 'boolean-true' : 'boolean-false'}">\${key.IsExportKey ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Secondary Key</div>
                                <div class="property-value \${key.IsSecondaryKey ? 'boolean-true' : 'boolean-false'}">\${key.IsSecondaryKey ? 'True' : 'False'}</div>
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
                            <div class="property-row">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${relationship.HasChanged !== null ? (relationship.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${relationship.IntroducedVersion}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${relationship.IsManaged ? 'boolean-true' : 'boolean-false'}">\${relationship.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Custom Relationship</div>
                                <div class="property-value \${relationship.IsCustomRelationship ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomRelationship ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Valid for Advanced Find</div>
                                <div class="property-value \${relationship.IsValidForAdvancedFind ? 'boolean-true' : 'boolean-false'}">\${relationship.IsValidForAdvancedFind ? 'True' : 'False'}</div>
                            </div>
                            \${relationship.IsCustomizable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${relationship.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomizable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${relationship.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${relationship.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Entity Mapping</div>
                            <div class="property-row">
                                <div class="property-label">Referenced Entity</div>
                                <div class="property-value">\${relationship.ReferencedEntity}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referenced Attribute</div>
                                <div class="property-value">\${relationship.ReferencedAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referenced Entity Navigation Property</div>
                                <div class="property-value">\${relationship.ReferencedEntityNavigationPropertyName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referencing Entity</div>
                                <div class="property-value">\${relationship.ReferencingEntity}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referencing Attribute</div>
                                <div class="property-value">\${relationship.ReferencingAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Referencing Entity Navigation Property</div>
                                <div class="property-value">\${relationship.ReferencingEntityNavigationPropertyName}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Relationship Configuration</div>
                            <div class="property-row">
                                <div class="property-label">Behavior</div>
                                <div class="property-value">\${relationship.RelationshipBehavior !== undefined ? relationship.RelationshipBehavior + ' (' + (relationship.RelationshipBehavior === 0 ? 'Parental' : relationship.RelationshipBehavior === 1 ? 'Referential' : relationship.RelationshipBehavior === 2 ? 'Configurable Cascading' : 'Unknown') + ')' : 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Security Types</div>
                                <div class="property-value">\${relationship.SecurityTypes || 'Not specified'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Hierarchical</div>
                                <div class="property-value \${relationship.IsHierarchical ? 'boolean-true' : 'boolean-false'}">\${relationship.IsHierarchical ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Relationship Attribute Denormalized</div>
                                <div class="property-value \${relationship.IsRelationshipAttributeDenormalized ? 'boolean-true' : 'boolean-false'}">\${relationship.IsRelationshipAttributeDenormalized ? 'True' : 'False'}</div>
                            </div>
                            \${relationship.CascadeConfiguration ? \`
                            <div class="property-row">
                                <div class="property-label">Cascade Configuration</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Assign</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Assign || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Delete</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Delete || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Archive</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Archive || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Merge</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Merge || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Reparent</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Reparent || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Share</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Share || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Unshare</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.Unshare || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Rollup View</div>
                                <div class="property-value">\${relationship.CascadeConfiguration.RollupView || 'Not specified'}</div>
                            </div>
                            \` : ''}
                            \${relationship.AssociatedMenuConfiguration ? \`
                            <div class="property-row">
                                <div class="property-label">Associated Menu Configuration</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Behavior</div>
                                <div class="property-value">\${relationship.AssociatedMenuConfiguration.Behavior || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Group</div>
                                <div class="property-value">\${relationship.AssociatedMenuConfiguration.Group || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Order</div>
                                <div class="property-value">\${relationship.AssociatedMenuConfiguration.Order !== undefined ? relationship.AssociatedMenuConfiguration.Order : 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value \${relationship.AssociatedMenuConfiguration.IsCustomizable ? 'boolean-true' : 'boolean-false'}">\${relationship.AssociatedMenuConfiguration.IsCustomizable ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">View ID</div>
                                <div class="property-value guid">\${relationship.AssociatedMenuConfiguration.ViewId || 'Not specified'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Available Offline</div>
                                <div class="property-value \${relationship.AssociatedMenuConfiguration.AvailableOffline ? 'boolean-true' : 'boolean-false'}">\${relationship.AssociatedMenuConfiguration.AvailableOffline ? 'True' : 'False'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                    \`;
                }
                
                function generateManyToManyProperties(relationship) {
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
                                <div class="property-label">Intersect Entity Name</div>
                                <div class="property-value">\${relationship.IntersectEntityName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Introduced Version</div>
                                <div class="property-value">\${relationship.IntroducedVersion}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Managed</div>
                                <div class="property-value \${relationship.IsManaged ? 'boolean-true' : 'boolean-false'}">\${relationship.IsManaged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Custom Relationship</div>
                                <div class="property-value \${relationship.IsCustomRelationship ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomRelationship ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Is Valid for Advanced Find</div>
                                <div class="property-value \${relationship.IsValidForAdvancedFind ? 'boolean-true' : 'boolean-false'}">\${relationship.IsValidForAdvancedFind ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Has Changed</div>
                                <div class="property-value">\${relationship.HasChanged !== null && relationship.HasChanged !== undefined ? (relationship.HasChanged ? 'True' : 'False') : 'Not specified'}</div>
                            </div>
                            \${relationship.IsCustomizable ? \`
                            <div class="property-row">
                                <div class="property-label">Is Customizable</div>
                                <div class="property-value"></div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Value</div>
                                <div class="property-value \${relationship.IsCustomizable.Value ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomizable.Value ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Can Be Changed</div>
                                <div class="property-value \${relationship.IsCustomizable.CanBeChanged ? 'boolean-true' : 'boolean-false'}">\${relationship.IsCustomizable.CanBeChanged ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row property-sub-details">
                                <div class="property-label">Managed Property Logical Name</div>
                                <div class="property-value">\${relationship.IsCustomizable.ManagedPropertyLogicalName || 'Not specified'}</div>
                            </div>
                            \` : ''}
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Entity Mapping</div>
                            <div class="property-row">
                                <div class="property-label">Entity 1 Logical Name</div>
                                <div class="property-value">\${relationship.Entity1LogicalName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity 1 Intersect Attribute</div>
                                <div class="property-value">\${relationship.Entity1IntersectAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity 1 Navigation Property</div>
                                <div class="property-value">\${relationship.Entity1NavigationPropertyName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity 2 Logical Name</div>
                                <div class="property-value">\${relationship.Entity2LogicalName}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity 2 Intersect Attribute</div>
                                <div class="property-value">\${relationship.Entity2IntersectAttribute}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Entity 2 Navigation Property</div>
                                <div class="property-value">\${relationship.Entity2NavigationPropertyName}</div>
                            </div>
                        </div>
                        
                        <div class="property-section">
                            <div class="property-section-title">Menu Configuration</div>
                            \${relationship.Entity1AssociatedMenuConfiguration ? \`
                            <div class="property-subsection">
                                <div class="property-subsection-title">Entity 1 Associated Menu Configuration</div>
                                <div class="property-row">
                                    <div class="property-label">Behavior</div>
                                    <div class="property-value">\${relationship.Entity1AssociatedMenuConfiguration.Behavior || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Group</div>
                                    <div class="property-value">\${relationship.Entity1AssociatedMenuConfiguration.Group || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Order</div>
                                    <div class="property-value">\${relationship.Entity1AssociatedMenuConfiguration.Order !== undefined ? relationship.Entity1AssociatedMenuConfiguration.Order : 'Not specified'}</div>
                                </div>
                                \${relationship.Entity1AssociatedMenuConfiguration.Label ? \`
                                <div class="property-row">
                                    <div class="property-label">Label</div>
                                    <div class="property-value"></div>
                                </div>
                                \${relationship.Entity1AssociatedMenuConfiguration.Label.UserLocalizedLabel ? \`
                                <div class="property-row property-container-details">
                                    <div class="property-label">User Localized Label</div>
                                    <div class="property-value"></div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Label</div>
                                    <div class="property-value">\${relationship.Entity1AssociatedMenuConfiguration.Label.UserLocalizedLabel.Label}</div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Language Code</div>
                                    <div class="property-value">\${relationship.Entity1AssociatedMenuConfiguration.Label.UserLocalizedLabel.LanguageCode}</div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Is Managed</div>
                                    <div class="property-value \${relationship.Entity1AssociatedMenuConfiguration.Label.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${relationship.Entity1AssociatedMenuConfiguration.Label.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                                </div>
                                \` : ''}
                                \` : ''}
                            </div>
                            \` : ''}
                            \${relationship.Entity2AssociatedMenuConfiguration ? \`
                            <div class="property-subsection">
                                <div class="property-subsection-title">Entity 2 Associated Menu Configuration</div>
                                <div class="property-row">
                                    <div class="property-label">Behavior</div>
                                    <div class="property-value">\${relationship.Entity2AssociatedMenuConfiguration.Behavior || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Group</div>
                                    <div class="property-value">\${relationship.Entity2AssociatedMenuConfiguration.Group || 'Not specified'}</div>
                                </div>
                                <div class="property-row">
                                    <div class="property-label">Order</div>
                                    <div class="property-value">\${relationship.Entity2AssociatedMenuConfiguration.Order !== undefined ? relationship.Entity2AssociatedMenuConfiguration.Order : 'Not specified'}</div>
                                </div>
                                \${relationship.Entity2AssociatedMenuConfiguration.Label ? \`
                                <div class="property-row">
                                    <div class="property-label">Label</div>
                                    <div class="property-value"></div>
                                </div>
                                \${relationship.Entity2AssociatedMenuConfiguration.Label.UserLocalizedLabel ? \`
                                <div class="property-row property-container-details">
                                    <div class="property-label">User Localized Label</div>
                                    <div class="property-value"></div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Label</div>
                                    <div class="property-value">\${relationship.Entity2AssociatedMenuConfiguration.Label.UserLocalizedLabel.Label}</div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Language Code</div>
                                    <div class="property-value">\${relationship.Entity2AssociatedMenuConfiguration.Label.UserLocalizedLabel.LanguageCode}</div>
                                </div>
                                <div class="property-row property-deep-details">
                                    <div class="property-label">Is Managed</div>
                                    <div class="property-value \${relationship.Entity2AssociatedMenuConfiguration.Label.UserLocalizedLabel.IsManaged ? 'boolean-true' : 'boolean-false'}">\${relationship.Entity2AssociatedMenuConfiguration.Label.UserLocalizedLabel.IsManaged ? 'True' : 'False'}</div>
                                </div>
                                \` : ''}
                                \` : ''}
                            </div>
                            \` : ''}
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
                                <div class="property-label">Type</div>
                                <div class="property-value">\${privilege.PrivilegeType}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Basic</div>
                                <div class="property-value \${privilege.CanBeBasic ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeBasic ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Deep</div>
                                <div class="property-value \${privilege.CanBeDeep ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeDeep ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Local</div>
                                <div class="property-value \${privilege.CanBeLocal ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeLocal ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Global</div>
                                <div class="property-value \${privilege.CanBeGlobal ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeGlobal ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Entity Reference</div>
                                <div class="property-value \${privilege.CanBeEntityReference ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeEntityReference ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Parent Entity Reference</div>
                                <div class="property-value \${privilege.CanBeParentEntityReference ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeParentEntityReference ? 'True' : 'False'}</div>
                            </div>
                            <div class="property-row">
                                <div class="property-label">Can Be Record Filter</div>
                                <div class="property-value \${privilege.CanBeRecordFilter ? 'boolean-true' : 'boolean-false'}">\${privilege.CanBeRecordFilter ? 'True' : 'False'}</div>
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
                    // Handle both numeric and string values
                    switch (ownershipType) {
                        case 1:
                        case 'UserOwned': 
                            return 'User or Team Owned';
                        case 2:
                        case 'BusinessOwned': 
                            return 'Business Owned';
                        case 4:
                        case 'OrganizationOwned': 
                            return 'Organization Owned';
                        case 8:
                        case 'None': 
                            return 'None';
                        default: 
                            return ownershipType || 'Unknown';
                    }
                }
                
                function decodeUnicodeEscapes(str) {
                    if (!str) return str;
                    // Decode Unicode escape sequences like \u003C to <
                    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, unicode) => {
                        return String.fromCharCode(parseInt(unicode, 16));
                    });
                }
                
                function highlightXml(xmlString) {
                    if (!xmlString) return xmlString;
                    
                    // First format with proper indentation
                    const formatted = formatXmlSimple(xmlString);
                    
                    // Split into tokens and process each one
                    let result = '';
                    let i = 0;
                    
                    while (i < formatted.length) {
                        if (formatted[i] === '<') {
                            // Find the end of this tag
                            let tagEnd = formatted.indexOf('>', i);
                            if (tagEnd === -1) tagEnd = formatted.length;
                            
                            let tagContent = formatted.substring(i + 1, tagEnd);
                            let isClosing = tagContent.startsWith('/');
                            let isSelfClosing = tagContent.endsWith('/');
                            
                            // Parse tag name and attributes
                            let parts = tagContent.split(/\\s+/);
                            let tagName = parts[0];
                            
                            // Start building the highlighted tag
                            result += '&lt;<span style="color: #569cd6;">' + tagName + '</span>';
                            
                            // Add attributes with highlighting
                            for (let j = 1; j < parts.length; j++) {
                                let part = parts[j].trim();
                                if (part && !part.endsWith('/')) {
                                    let match = part.match(/^([\\w-]+)=("[^"]*")$/);
                                    if (match) {
                                        result += ' <span style="color: #92c5f7;">' + match[1] + '</span>=<span style="color: #ce9178;">' + match[2] + '</span>';
                                    } else {
                                        result += ' ' + part;
                                    }
                                }
                            }
                            
                            if (isSelfClosing) {
                                result += '<span style="color: #569cd6;">/</span>';
                            }
                            result += '<span style="color: #569cd6;">&gt;</span>';
                            
                            i = tagEnd + 1;
                        } else {
                            // Regular character, just add it (escaping special HTML chars)
                            let char = formatted[i];
                            if (char === '&') {
                                result += '&amp;';
                            } else {
                                result += char;
                            }
                            i++;
                        }
                    }
                    
                    return result;
                }
                
                function formatXmlSimple(xml) {
                    let formatted = '';
                    let indent = 0;
                    const tab = '  '; // 2 spaces for indentation
                    
                    // Split by tags
                    const parts = xml.split(/(<[^>]*>)/);
                    
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i].trim();
                        if (!part) continue;
                        
                        if (part.startsWith('<')) {
                            if (part.startsWith('</')) {
                                // Closing tag - decrease indent first
                                indent = Math.max(0, indent - 1);
                                formatted += tab.repeat(indent) + part + '\\n';
                            } else if (part.endsWith('/>')) {
                                // Self-closing tag - same indent
                                formatted += tab.repeat(indent) + part + '\\n';
                            } else {
                                // Opening tag - add with current indent, then increase
                                formatted += tab.repeat(indent) + part + '\\n';
                                indent++;
                            }
                        } else if (part.length > 0) {
                            // Text content
                            formatted += tab.repeat(indent) + part + '\\n';
                        }
                    }
                    
                    return formatted.trim();
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
                    // Sort attributes by logical name ascending
                    const sortedAttributes = [...attributes].sort((a, b) => 
                        (a.LogicalName || '').localeCompare(b.LogicalName || '')
                    );
                    
                    const tableData = sortedAttributes.map(attr => ({
                        id: attr.MetadataId,
                        DisplayName: getDisplayName(attr.DisplayName),
                        LogicalName: attr.LogicalName,
                        SchemaName: attr.SchemaName,
                        Type: attr.AttributeType,
                        RequiredLevel: getRequiredLevel(attr.RequiredLevel),
                        HasChanged: attr.HasChanged !== null && attr.HasChanged !== undefined ? (attr.HasChanged ? 'Yes' : 'No') : 'Not specified',
                        IsManaged: attr.IsManaged ? 'Yes' : 'No',
                        IsCustomizable: attr.IsCustomizable?.Value !== undefined ? (attr.IsCustomizable.Value ? 'Yes' : 'No') : 'Not specified',
                        IsCustomAttribute: attr.IsCustomAttribute ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, 'attributesTableTemplate', sortedAttributes);
                }
                
                function displayKeysTable(keys) {
                    const tableData = keys.map(key => ({
                        id: key.MetadataId || key.LogicalName,
                        DisplayName: getDisplayName(key.DisplayName),
                        LogicalName: key.LogicalName,
                        SchemaName: key.SchemaName,
                        HasChanged: key.HasChanged !== null && key.HasChanged !== undefined ? (key.HasChanged ? 'Yes' : 'No') : 'Not specified',
                        IsManaged: key.IsManaged ? 'Yes' : 'No',
                        IsCustomizable: key.IsCustomizable?.Value ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, 'keysTableTemplate', keys);
                }
                
                function displayRelationshipsTable(relationships, tabName) {
                    if (tabName === 'oneToMany') {
                        // OneToMany specific columns: SchemaName, Referenced Entity, ReferencedAttribute, Referencing Entity, HasChanged, IsManaged, IsCustomizable, IsCustomRelationship
                        const tableData = relationships.map(rel => ({
                            id: rel.MetadataId || rel.SchemaName,
                            SchemaName: rel.SchemaName,
                            ReferencedEntity: rel.ReferencedEntity,
                            ReferencedAttribute: rel.ReferencedAttribute,
                            ReferencingEntity: rel.ReferencingEntity,
                            HasChanged: rel.HasChanged !== null && rel.HasChanged !== undefined ? 'Yes' : 'No',
                            IsManaged: rel.IsManaged ? 'Yes' : 'No',
                            IsCustomizable: rel.IsCustomizable?.Value ? 'Yes' : 'No',
                            IsCustomRelationship: rel.IsCustomRelationship ? 'Yes' : 'No'
                        }));
                        
                        displayTable(tableData, 'oneToManyTableTemplate', relationships);
                    } else if (tabName === 'manyToOne') {
                        // ManyToOne relationships - same columns as OneToMany
                        const tableData = relationships.map(rel => ({
                            id: rel.MetadataId || rel.SchemaName,
                            SchemaName: rel.SchemaName,
                            ReferencedEntity: rel.ReferencedEntity,
                            ReferencedAttribute: rel.ReferencedAttribute,
                            ReferencingEntity: rel.ReferencingEntity,
                            ReferencingAttribute: rel.ReferencingAttribute,
                            HasChanged: rel.HasChanged !== null && rel.HasChanged !== undefined ? 'Yes' : 'No',
                            IsManaged: rel.IsManaged ? 'Yes' : 'No',
                            IsCustomizable: rel.IsCustomizable?.Value ? 'Yes' : 'No',
                            IsCustomRelationship: rel.IsCustomRelationship ? 'Yes' : 'No'
                        }));
                        
                        displayTable(tableData, 'manyToOneTableTemplate', relationships);
                    } else if (tabName === 'manyToMany') {
                        // ManyToMany relationships
                        const tableData = relationships.map(rel => ({
                            id: rel.MetadataId || rel.SchemaName,
                            SchemaName: rel.SchemaName,
                            IntersectEntityName: rel.IntersectEntityName,
                            Entity1LogicalName: rel.Entity1LogicalName,
                            Entity1IntersectAttribute: rel.Entity1IntersectAttribute,
                            Entity1NavigationPropertyName: rel.Entity1NavigationPropertyName,
                            Entity2LogicalName: rel.Entity2LogicalName,
                            Entity2IntersectAttribute: rel.Entity2IntersectAttribute,
                            Entity2NavigationPropertyName: rel.Entity2NavigationPropertyName,
                            HasChanged: rel.HasChanged !== null && rel.HasChanged !== undefined ? (rel.HasChanged ? 'Yes' : 'No') : 'Not specified',
                            IsManaged: rel.IsManaged ? 'Yes' : 'No',
                            IsCustomizable: rel.IsCustomizable?.Value !== undefined ? (rel.IsCustomizable.Value ? 'Yes' : 'No') : 'Not specified',
                            IsCustomRelationship: rel.IsCustomRelationship ? 'Yes' : 'No'
                        }));
                        
                        displayTable(tableData, 'manyToManyTableTemplate', relationships);
                    }
                }
                
                function displayPrivilegesTable(privileges) {
                    const tableData = privileges.map(priv => ({
                        id: priv.PrivilegeId || priv.Name,
                        Name: priv.Name,
                        PrivilegeType: priv.PrivilegeType,
                        CanBeBasic: priv.CanBeBasic ? 'Yes' : 'No',
                        CanBeDeep: priv.CanBeDeep ? 'Yes' : 'No',
                        CanBeLocal: priv.CanBeLocal ? 'Yes' : 'No',
                        CanBeEntityReference: priv.CanBeEntityReference ? 'Yes' : 'No',
                        CanBeParentEntityReference: priv.CanBeParentEntityReference ? 'Yes' : 'No',
                        CanBeRecordFilter: priv.CanBeRecordFilter ? 'Yes' : 'No'
                    }));
                    
                    displayTable(tableData, 'privilegesTableTemplate', privileges);
                }
                
                function displayTable(tableData, templateId, originalData) {
                    const tabContentArea = document.getElementById('tabContentArea');
                    
                    // Use the specified template
                    const template = document.getElementById(templateId);
                    if (!template) {
                        console.error('Template not found:', templateId);
                        return;
                    }
                    
                    tabContentArea.innerHTML = template.innerHTML;
                    
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
                    
                    // Use pre-generated choice options table template
                    const template = document.getElementById('choiceOptionsTableTemplate');
                    tabContentArea.innerHTML = template.innerHTML;
                    
                    // Prepare table data
                    const tableData = choice.Options.map(option => ({
                        id: option.Value.toString(),
                        Value: option.Value,
                        Label: getDisplayName(option.Label) || option.Value,
                        Description: getDisplayName(option.Description) || ''
                    }));
                    
                    // Initialize and populate table with shared ComponentFactory logic
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
                        case 'manyToOne': return 'Relationship';
                        case 'manyToMany': return 'ManyToManyRelationship';
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
