import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { ODataService } from '../services/ODataService';
import { WebviewMessage } from '../types';
import { EnvironmentManager } from './base/EnvironmentManager';
import { ServiceFactory } from '../services/ServiceFactory';

interface EntityMetadata {
    LogicalName: string;
    DisplayName: { UserLocalizedLabel?: { Label: string } };
    SchemaName: string;
    EntityTypeName: string;
    PrimaryIdAttribute: string;
    PrimaryNameAttribute: string;
    IsCustomEntity: boolean;
    IsManaged: boolean;
    TableType: string;
    Attributes?: AttributeMetadata[];
}

interface AttributeMetadata {
    LogicalName: string;
    DisplayName: { UserLocalizedLabel?: { Label: string } };
    SchemaName: string;
    AttributeType: string;
    IsPrimaryId: boolean;
    IsPrimaryName: boolean;
    IsCustomAttribute: boolean;
    RequiredLevel: { Value: number };
    MaxLength?: number;
}

export class MetadataBrowserPanel extends BasePanel {
    public static readonly viewType = 'metadataBrowser';
    private odataService: ODataService;
    private environmentManager: EnvironmentManager;

    public static createOrShow(extensionUri: vscode.Uri) {
        // Try to focus existing panel first
        const existing = BasePanel.focusExisting(MetadataBrowserPanel.viewType);
        if (existing) {
            return;
        }

        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new MetadataBrowserPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new MetadataBrowserPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser'
        });
        this.odataService = ServiceFactory.getODataService();
        this.environmentManager = new EnvironmentManager(ServiceFactory.getAuthService(), (message) => this.postMessage(message));

        // Initialize after everything is set up
        this.initialize();
    }

    protected async initialize(): Promise<void> {
        // Override to ensure environment manager is initialized before updating webview
        this.updateWebview();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.environmentManager.loadEnvironments();
                break;
            case 'loadEntities':
                await this.loadEntities(message.environmentId);
                break;
            case 'loadEntityDetails':
                await this.loadEntityDetails(message.entityName);
                break;
            case 'refreshMetadata':
                await this.refreshMetadata();
                break;
        }
    }

    private async loadEntities(environmentId?: string): Promise<void> {
        try {
            if (!environmentId) {
                this._panel.webview.postMessage({
                    command: 'showError',
                    data: { message: 'Please select an environment first.' }
                });
                return;
            }

            // Store the selected environment
            this.environmentManager.selectedEnvironmentId = environmentId;

            // Get the environment details
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === environmentId);

            if (!currentEnv) {
                this._panel.webview.postMessage({
                    command: 'showError',
                    data: { message: 'Selected environment not found.' }
                });
                return;
            }

            this._panel.webview.postMessage({
                command: 'showLoading',
                data: { message: 'Loading entity metadata...' }
            });

            // Get authentication token
            const accessToken = await this._authService.getAccessToken(currentEnv.id);
            if (!accessToken) {
                throw new Error('Authentication failed');
            }

            const entities = await this.odataService.getEntities(
                currentEnv.settings.dataverseUrl,
                accessToken,
                'EntityDefinitions',
                {
                    select: ['LogicalName', 'DisplayName', 'SchemaName', 'EntityTypeName', 'PrimaryIdAttribute', 'PrimaryNameAttribute', 'IsCustomEntity', 'IsManaged', 'TableType'],
                    orderby: 'LogicalName',
                    top: 500
                }
            );

            this._panel.webview.postMessage({
                command: 'entitiesLoaded',
                data: { entities: entities.value }
            });

        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showError',
                data: { message: `Failed to load entities: ${error instanceof Error ? error.message : 'Unknown error'}` }
            });
        }
    }

    private async loadEntityDetails(entityName: string): Promise<void> {
        try {
            this._panel.webview.postMessage({
                command: 'showLoading',
                data: { message: `Loading details for ${entityName}...` }
            });

            // Get environments to find current one
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments[0];

            // Get authentication token
            const accessToken = await this._authService.getAccessToken(currentEnv.id);
            if (!accessToken) {
                throw new Error('Authentication failed');
            }

            const entityDetails = await this.odataService.getEntity(
                currentEnv.settings.dataverseUrl,
                accessToken,
                'EntityDefinitions',
                `LogicalName='${entityName}'`,
                {
                    select: ['LogicalName', 'DisplayName', 'SchemaName', 'EntityTypeName', 'PrimaryIdAttribute', 'PrimaryNameAttribute', 'IsCustomEntity', 'IsManaged', 'TableType'],
                    expand: ['Attributes($select=LogicalName,DisplayName,SchemaName,AttributeType,IsPrimaryId,IsPrimaryName,IsCustomAttribute,RequiredLevel,MaxLength)']
                }
            );

            this._panel.webview.postMessage({
                command: 'entityDetailsLoaded',
                data: { entity: entityDetails }
            });

        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showError',
                data: { message: `Failed to load entity details: ${error instanceof Error ? error.message : 'Unknown error'}` }
            });
        }
    }

    private async refreshMetadata(): Promise<void> {
        if (this.environmentManager.selectedEnvironmentId) {
            await this.loadEntities(this.environmentManager.selectedEnvironmentId);
        }
    }

    protected getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src ${this._panel.webview.cspSource} 'unsafe-inline';">
            <title>Metadata Browser</title>
            <style>
                ${this.environmentManager.getBasePanelCss()}

                /* Metadata Browser Specific Styles */
                .container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .btn-primary {
                    background-color: var(--vscode-button-background);
                }

                .content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }

                .sidebar {
                    width: 300px;
                    border-right: 1px solid var(--vscode-panel-border);
                    background-color: var(--vscode-sideBar-background);
                    display: flex;
                    flex-direction: column;
                }

                .search-container {
                    padding: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .search-input {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 2px;
                    font-size: 12px;
                    box-sizing: border-box;
                }

                .entity-filters {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    font-size: 11px;
                }

                .filter-option {
                    display: block;
                    margin-bottom: 4px;
                    cursor: pointer;
                }

                .filter-option input {
                    margin-right: 6px;
                }

                .entity-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 4px;
                }

                .entity-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    margin-bottom: 2px;
                }

                .entity-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }

                .entity-item.selected {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .entity-name {
                    font-size: 12px;
                    font-weight: 500;
                    font-family: var(--vscode-editor-font-family);
                }

                .entity-display-name {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 2px;
                }

                .entity-badges {
                    margin-top: 4px;
                    display: flex;
                    gap: 4px;
                }

                .badge {
                    font-size: 9px;
                    padding: 2px 4px;
                    border-radius: 2px;
                    text-transform: uppercase;
                    font-weight: 500;
                }

                .badge.custom {
                    background-color: var(--vscode-charts-blue);
                    color: white;
                }

                .badge.managed {
                    background-color: var(--vscode-charts-orange);
                    color: white;
                }

                .badge.system {
                    background-color: var(--vscode-charts-gray);
                    color: white;
                }

                .badge.unmanaged {
                    background-color: var(--vscode-charts-green);
                    color: white;
                }

                .badge.required {
                    background-color: var(--vscode-charts-red);
                    color: white;
                }

                .badge.optional {
                    background-color: var(--vscode-charts-gray);
                    color: white;
                }

                .badge.primary {
                    background-color: var(--vscode-charts-purple);
                    color: white;
                }

                .main-content {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background-color: var(--vscode-editor-background);
                }

                .loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 12px;
                    padding: 40px;
                }

                .loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--vscode-progressBar-background);
                    border-top: 2px solid var(--vscode-progressBar-foreground);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .error {
                    color: var(--vscode-errorForeground);
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 12px;
                    border-radius: 4px;
                    margin-bottom: 16px;
                }

                .hidden {
                    display: none !important;
                }

                .welcome {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    padding: 40px 20px;
                }

                .welcome h2 {
                    color: var(--vscode-foreground);
                    margin-bottom: 16px;
                }

                .entity-details {
                    max-width: 1200px;
                }

                .entity-header {
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .entity-header h2 {
                    margin: 0 0 8px 0;
                    color: var(--vscode-foreground);
                }

                .entity-meta {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .meta-item {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    font-family: var(--vscode-editor-font-family);
                }

                .property-group {
                    margin-bottom: 32px;
                }

                .property-group h3 {
                    margin: 0 0 16px 0;
                    color: var(--vscode-foreground);
                    font-size: 14px;
                }

                .property-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .property-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background-color: var(--vscode-sideBar-background);
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                }

                .property-item label {
                    font-size: 12px;
                    color: var(--vscode-foreground);
                    font-weight: 500;
                }

                .property-item span {
                    font-size: 12px;
                    font-family: var(--vscode-editor-font-family);
                }

                .attributes-table {
                    overflow-x: auto;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                }

                .attributes-table table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .attributes-table th {
                    background-color: var(--vscode-sideBar-background);
                    padding: 8px 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }

                .attributes-table td {
                    padding: 6px 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    font-family: var(--vscode-editor-font-family);
                }

                .attributes-table tr:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }

                .attributes-table tr.primary-id {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .attributes-table tr.primary-name {
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                }

                .icon {
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${this.environmentManager.getEnvironmentSelectorHtml()}

                <div class="header">
                    <h1 class="title">Metadata Browser</h1>
                    <div class="header-actions">
                        <button id="refreshBtn" class="btn">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="content">
                    <div class="sidebar">
                        <div class="search-container">
                            <input type="text" id="entitySearch" placeholder="Search entities..." class="search-input">
                        </div>
                        
                        <div class="entity-filters">
                            <label class="filter-option">
                                <input type="checkbox" id="showCustomOnly" />
                                Custom entities only
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" id="showManagedOnly" />
                                Managed entities only
                            </label>
                        </div>

                        <div class="entity-list" id="entityList">
                            <!-- Entity list will be populated here -->
                        </div>
                    </div>

                    <div class="main-content">
                        <div id="loadingIndicator" class="loading hidden">
                            <div class="loading-spinner"></div>
                            <span id="loadingMessage">Loading...</span>
                        </div>

                        <div id="errorMessage" class="error hidden">
                            <!-- Error messages will be displayed here -->
                        </div>

                        <div id="entityDetails" class="entity-details hidden">
                            <!-- Entity details will be populated here -->
                        </div>

                        <div id="welcomeMessage" class="welcome">
                            <h2>Welcome to Metadata Browser</h2>
                            <p>Select an entity from the left panel to view its metadata details.</p>
                            <p>Use the search box to quickly find entities, or use the filters to narrow down the list.</p>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                let entities = [];
                let selectedEntity = null;

                ${EnvironmentManager.getEnvironmentSelectorJs()}

                // Override the loadDataForEnvironment function
                function loadDataForEnvironment(environmentId) {
                    if (environmentId) {
                        vscode.postMessage({
                            action: 'loadEntities',
                            environmentId: environmentId
                        });
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command || message.action) {
                        case 'environmentsLoaded':
                            populateEnvironments(message.data, message.selectedEnvironmentId);
                            break;
                        case 'entitiesLoaded':
                            handleEntitiesLoaded(message.data.entities);
                            break;
                        case 'entityDetailsLoaded':
                            handleEntityDetailsLoaded(message.data.entity);
                            break;
                        case 'showLoading':
                            showLoading(message.data.message);
                            break;
                        case 'showError':
                            showError(message.data.message);
                            break;
                    }
                });

                function handleEntitiesLoaded(loadedEntities) {
                    entities = loadedEntities;
                    renderEntityList();
                    hideLoading();
                }

                function handleEntityDetailsLoaded(entity) {
                    renderEntityDetails(entity);
                    hideLoading();
                }

                function renderEntityList() {
                    const entityList = document.getElementById('entityList');
                    const searchTerm = document.getElementById('entitySearch').value.toLowerCase();
                    const showCustomOnly = document.getElementById('showCustomOnly').checked;
                    const showManagedOnly = document.getElementById('showManagedOnly').checked;

                    const filteredEntities = entities.filter(entity => {
                        const matchesSearch = entity.LogicalName.toLowerCase().includes(searchTerm) ||
                                            (entity.DisplayName?.UserLocalizedLabel?.Label || '').toLowerCase().includes(searchTerm);
                        
                        const matchesCustomFilter = !showCustomOnly || entity.IsCustomEntity;
                        const matchesManagedFilter = !showManagedOnly || entity.IsManaged;

                        return matchesSearch && matchesCustomFilter && matchesManagedFilter;
                    });

                    entityList.innerHTML = filteredEntities.map(entity => \`
                        <div class="entity-item \${selectedEntity === entity.LogicalName ? 'selected' : ''}" 
                             onclick="selectEntity('\${entity.LogicalName}')">
                            <div class="entity-name">\${entity.LogicalName}</div>
                            <div class="entity-display-name">\${entity.DisplayName?.UserLocalizedLabel?.Label || ''}</div>
                            <div class="entity-badges">
                                \${entity.IsCustomEntity ? '<span class="badge custom">Custom</span>' : ''}
                                \${entity.IsManaged ? '<span class="badge managed">Managed</span>' : ''}
                            </div>
                        </div>
                    \`).join('');
                }

                function selectEntity(entityName) {
                    selectedEntity = entityName;
                    renderEntityList();
                    vscode.postMessage({
                        command: 'loadEntityDetails',
                        data: { entityName }
                    });
                }

                function renderEntityDetails(entity) {
                    const detailsContainer = document.getElementById('entityDetails');
                    const welcomeMessage = document.getElementById('welcomeMessage');
                    
                    welcomeMessage.classList.add('hidden');
                    detailsContainer.classList.remove('hidden');

                    detailsContainer.innerHTML = \`
                        <div class="entity-header">
                            <h2>\${entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName}</h2>
                            <div class="entity-meta">
                                <span class="meta-item">Schema: \${entity.SchemaName}</span>
                                <span class="meta-item">Logical: \${entity.LogicalName}</span>
                                <span class="meta-item">Type: \${entity.TableType || 'Standard'}</span>
                            </div>
                        </div>

                        <div class="entity-properties">
                            <div class="property-group">
                                <h3>General Properties</h3>
                                <div class="property-grid">
                                    <div class="property-item">
                                        <label>Primary ID Attribute:</label>
                                        <span>\${entity.PrimaryIdAttribute || 'N/A'}</span>
                                    </div>
                                    <div class="property-item">
                                        <label>Primary Name Attribute:</label>
                                        <span>\${entity.PrimaryNameAttribute || 'N/A'}</span>
                                    </div>
                                    <div class="property-item">
                                        <label>Entity Type Name:</label>
                                        <span>\${entity.EntityTypeName || 'N/A'}</span>
                                    </div>
                                    <div class="property-item">
                                        <label>Is Custom:</label>
                                        <span class="badge \${entity.IsCustomEntity ? 'custom' : 'system'}">\${entity.IsCustomEntity ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div class="property-item">
                                        <label>Is Managed:</label>
                                        <span class="badge \${entity.IsManaged ? 'managed' : 'unmanaged'}">\${entity.IsManaged ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>

                            \${entity.Attributes ? renderAttributes(entity.Attributes) : ''}
                        </div>
                    \`;
                }

                function renderAttributes(attributes) {
                    return \`
                        <div class="property-group">
                            <h3>Attributes (\${attributes.length})</h3>
                            <div class="attributes-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Logical Name</th>
                                            <th>Display Name</th>
                                            <th>Type</th>
                                            <th>Required</th>
                                            <th>Custom</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        \${attributes.map(attr => \`
                                            <tr class="\${attr.IsPrimaryId ? 'primary-id' : ''} \${attr.IsPrimaryName ? 'primary-name' : ''}">
                                                <td>
                                                    \${attr.LogicalName}
                                                    \${attr.IsPrimaryId ? '<span class="badge primary">ID</span>' : ''}
                                                    \${attr.IsPrimaryName ? '<span class="badge primary">Name</span>' : ''}
                                                </td>
                                                <td>\${attr.DisplayName?.UserLocalizedLabel?.Label || ''}</td>
                                                <td>\${attr.AttributeType || 'Unknown'}</td>
                                                <td>
                                                    <span class="badge \${attr.RequiredLevel?.Value === 2 ? 'required' : 'optional'}">
                                                        \${attr.RequiredLevel?.Value === 2 ? 'Required' : 'Optional'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="badge \${attr.IsCustomAttribute ? 'custom' : 'system'}">
                                                        \${attr.IsCustomAttribute ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                            </tr>
                                        \`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    \`;
                }

                function showLoading(message) {
                    const loadingIndicator = document.getElementById('loadingIndicator');
                    const loadingMessage = document.getElementById('loadingMessage');
                    const errorMessage = document.getElementById('errorMessage');
                    
                    loadingMessage.textContent = message;
                    loadingIndicator.classList.remove('hidden');
                    errorMessage.classList.add('hidden');
                }

                function hideLoading() {
                    document.getElementById('loadingIndicator').classList.add('hidden');
                }

                function showError(message) {
                    const errorMessage = document.getElementById('errorMessage');
                    errorMessage.textContent = message;
                    errorMessage.classList.remove('hidden');
                    hideLoading();
                }

                document.getElementById('refreshBtn').addEventListener('click', () => {
                    vscode.postMessage({ command: 'refreshMetadata' });
                });

                document.getElementById('entitySearch').addEventListener('input', renderEntityList);
                document.getElementById('showCustomOnly').addEventListener('change', renderEntityList);
                document.getElementById('showManagedOnly').addEventListener('change', renderEntityList);

                vscode.postMessage({ command: 'loadEntities' });
            </script>
        </body>
        </html>`;
    }
}
