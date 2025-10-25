import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import {
    CompleteEntityMetadata,
    EntityDefinition,
    AttributeMetadata,
    EntityKeyMetadata,
    OneToManyRelationshipMetadata,
    ManyToManyRelationshipMetadata,
    EntityPrivilegeMetadata,
    OptionSetMetadata
} from '../services/MetadataService';
import { METADATA_CONTEXT_MENU_ITEMS } from '../config/TableActions';

import { BasePanel } from './base/BasePanel';

// UI-specific types for table display
interface AttributeTableRow {
    id: string;
    displayName: string;
    logicalName: string;
    type: string;
    required: string;
    maxLength: string;
}

interface KeyTableRow {
    id: string;
    name: string;
    type: string;
    keyAttributes: string;
}

interface RelationshipTableRow {
    id: string;
    name: string;
    type: string;
    relatedEntity: string;
    referencingAttribute: string;
}

interface PrivilegeTableRow {
    id: string;
    name: string;
    privilegeType: string;
    depth: string;
}

interface ChoiceValueTableRow {
    id: string;
    label: string;
    value: string;
    description: string;
}

export class MetadataBrowserPanel extends BasePanel {
    public static readonly viewType = 'metadataBrowser';
    private static currentPanel: MetadataBrowserPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private attributesTableComponent?: DataTableComponent;
    private keysTableComponent?: DataTableComponent;
    private relationshipsTableComponent?: DataTableComponent;
    private privilegesTableComponent?: DataTableComponent;
    private choiceValuesTableComponent?: DataTableComponent;
    private componentFactory: ComponentFactory;

    // State
    private selectedEntityLogicalName?: string;
    private selectedEntityMetadataId?: string;
    private selectedEntityDisplayName?: string;
    private selectedChoiceName?: string;
    private selectedChoiceDisplayName?: string;
    private currentMetadata?: CompleteEntityMetadata;
    private currentChoiceMetadata?: OptionSetMetadata;
    private collapsedSections: Set<string> = new Set(['keys', 'relationships', 'privileges', 'choices']);

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (MetadataBrowserPanel.currentPanel) {
            MetadataBrowserPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = BasePanel.createWebviewPanel({
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser',
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        MetadataBrowserPanel.currentPanel = new MetadataBrowserPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri): void {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser'
        });

        this.panel.onDidDispose(() => {
            MetadataBrowserPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');

        // Create per-panel ComponentFactory instance
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges for component communication
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.actionBarComponent,
            this.attributesTableComponent,
            this.keysTableComponent,
            this.relationshipsTableComponent,
            this.privilegesTableComponent,
            this.choiceValuesTableComponent
        ]);

        // Initialize the panel
        this.initialize();

        // Load environments after initialization
        this.loadEnvironments();

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');
        try {
            // Environment Selector Component
            this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
                id: 'metadata-envSelector',
                label: 'Environment',
                placeholder: 'Choose an environment to browse metadata...',
                environments: [],
                showRefreshButton: true,
                className: 'metadata-env-selector',
                onChange: (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    this.handleEnvironmentSelection(environmentId);
                }
            });

            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'metadata-actions',
                actions: [
                    {
                        id: 'openInMaker',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: true
                    },
                    {
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'secondary',
                        disabled: true
                    }
                ],
                layout: 'horizontal',
                className: 'metadata-actions'
            });

            // Attributes Table Component
            this.attributesTableComponent = this.componentFactory.createDataTable({
                id: 'metadata-attributes-table',
                columns: [
                    {
                        id: 'displayName',
                        label: 'Display Name',
                        field: 'displayName',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'logicalName',
                        label: 'Logical Name',
                        field: 'logicalName',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'type',
                        label: 'Type',
                        field: 'type',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    },
                    {
                        id: 'required',
                        label: 'Required',
                        field: 'required',
                        sortable: true,
                        filterable: true,
                        width: '120px',
                        align: 'center'
                    },
                    {
                        id: 'maxLength',
                        label: 'Max Length',
                        field: 'maxLength',
                        sortable: true,
                        filterable: false,
                        width: '120px',
                        align: 'center'
                    }
                ],
                data: [],
                sortable: true,
                searchable: true,
                showFooter: true,
                contextMenu: true,
                contextMenuItems: METADATA_CONTEXT_MENU_ITEMS.attributes,
                className: 'metadata-attributes-table',
                defaultSort: [{ column: 'displayName', direction: 'asc' }]
            });

            // Keys Table Component
            this.keysTableComponent = this.componentFactory.createDataTable({
                id: 'metadata-keys-table',
                columns: [
                    {
                        id: 'name',
                        label: 'Name',
                        field: 'name',
                        sortable: true,
                        filterable: true,
                        width: '250px'
                    },
                    {
                        id: 'type',
                        label: 'Type',
                        field: 'type',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    },
                    {
                        id: 'keyAttributes',
                        label: 'Key Attributes',
                        field: 'keyAttributes',
                        sortable: false,
                        filterable: true,
                        width: '400px'
                    }
                ],
                data: [],
                sortable: true,
                searchable: true,
                showFooter: true,
                className: 'metadata-keys-table',
                defaultSort: [{ column: 'name', direction: 'asc' }]
            });

            // Relationships Table Component
            this.relationshipsTableComponent = this.componentFactory.createDataTable({
                id: 'metadata-relationships-table',
                columns: [
                    {
                        id: 'name',
                        label: 'Name',
                        field: 'name',
                        sortable: true,
                        filterable: true,
                        width: '250px'
                    },
                    {
                        id: 'type',
                        label: 'Type',
                        field: 'type',
                        sortable: true,
                        filterable: true,
                        width: '100px',
                        align: 'center'
                    },
                    {
                        id: 'relatedEntity',
                        label: 'Related Entity',
                        field: 'relatedEntity',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'referencingAttribute',
                        label: 'Referencing Attribute',
                        field: 'referencingAttribute',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    }
                ],
                data: [],
                sortable: true,
                searchable: true,
                showFooter: true,
                contextMenu: true,
                contextMenuItems: METADATA_CONTEXT_MENU_ITEMS.relationships,
                className: 'metadata-relationships-table',
                defaultSort: [{ column: 'name', direction: 'asc' }]
            });

            // Privileges Table Component
            this.privilegesTableComponent = this.componentFactory.createDataTable({
                id: 'metadata-privileges-table',
                columns: [
                    {
                        id: 'name',
                        label: 'Name',
                        field: 'name',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'privilegeType',
                        label: 'Privilege Type',
                        field: 'privilegeType',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'depth',
                        label: 'Depth',
                        field: 'depth',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    }
                ],
                data: [],
                sortable: true,
                searchable: true,
                showFooter: true,
                className: 'metadata-privileges-table',
                defaultSort: [{ column: 'name', direction: 'asc' }]
            });

            // Choice Values Table Component
            this.choiceValuesTableComponent = this.componentFactory.createDataTable({
                id: 'metadata-choice-values-table',
                columns: [
                    {
                        id: 'label',
                        label: 'Label',
                        field: 'label',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'value',
                        label: 'Value',
                        field: 'value',
                        sortable: true,
                        filterable: false,
                        width: '120px',
                        align: 'center'
                    },
                    {
                        id: 'description',
                        label: 'Description',
                        field: 'description',
                        sortable: false,
                        filterable: true,
                        width: '400px'
                    }
                ],
                data: [],
                sortable: true,
                searchable: true,
                showFooter: true,
                className: 'metadata-choice-values-table',
                defaultSort: [{ column: 'label', direction: 'asc' }]
            });

            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Metadata Browser panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            // Ignore empty/malformed messages
            if (!message || !message.command) {
                this.componentLogger.trace('Received message without command, ignoring', { message });
                return;
            }

            switch (message.command) {
                case 'environment-selected':
                case 'environment-changed':
                    // Only sync component state - onChange callback will handle data loading
                    if (this.environmentSelectorComponent && message.data?.environmentId) {
                        this.environmentSelectorComponent.setSelectedEnvironment(message.data.environmentId);
                    }
                    break;

                case 'browse-tables':
                    await this.showTableChoicePicker();
                    break;

                case 'toggle-section':
                    this.toggleSection(message.data?.sectionId);
                    break;

                case 'refresh-data':
                    await this.refreshCurrentMetadata();
                    break;

                case 'select-entity':
                    if (message.data) {
                        await this.handleEntitySelection(message.data);
                    }
                    break;

                case 'select-choice':
                    if (message.data) {
                        await this.handleChoiceSelection(message.data);
                    }
                    break;

                case 'metadata-row-click':
                    if (message.data) {
                        await this.handleMetadataRowClick(message.data);
                    }
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    break;

                case 'component-event':
                    this.componentLogger.debug('Component event received', { data: message.data });
                    await this.handleComponentEvent(message);
                    break;

                default:
                    this.componentLogger.warn('Unknown message command', { command: message.command });
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
            this.postMessage({
                command: 'error',
                action: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, eventType, data } = message.data || {};

            // Log based on event significance
            if (eventType === 'actionClicked') {
                this.componentLogger.info(`Action clicked: ${data?.actionId}`, { componentId });
            } else if (eventType === 'contextMenuItemClicked') {
                this.componentLogger.info(`Context menu item clicked: ${data?.itemId}`, { componentId });
            } else {
                this.componentLogger.debug('Component event received', { componentId, eventType });
            }

            // Handle action bar events
            if (componentId === 'metadata-actions' && eventType === 'actionClicked') {
                const { actionId } = data;

                switch (actionId) {
                    case 'refresh':
                        await this.refreshCurrentMetadata();
                        break;
                    case 'openInMaker':
                        await this.handleOpenInMaker();
                        break;
                    default:
                        this.componentLogger.warn('Unknown action ID', { actionId });
                }
                return;
            }

            // Handle context menu events
            if (eventType === 'contextMenuItemClicked') {
                const { itemId, rowData } = data;

                switch (itemId) {
                    case 'copyLogicalName':
                        await this.handleCopyLogicalName(rowData);
                        break;
                    case 'openAttributeInMaker':
                        await this.handleOpenAttributeInMaker(rowData);
                        break;
                    case 'openRelatedEntity':
                        await this.handleOpenRelatedEntity(rowData);
                        break;
                    default:
                        this.componentLogger.warn('Unknown context menu item ID', { itemId });
                }
                return;
            }

            // Other component events
            this.componentLogger.trace('Component event not handled', { componentId, eventType });

        } catch (error) {
            this.componentLogger.error('Error handling component event', error as Error, {
                componentId: message.componentId,
                eventType: message.eventType
            });
        }
    }

    private getPanelSpecificResources(): {
        metadataBrowserStylesSheet: vscode.Uri;
    } {
        return {
            metadataBrowserStylesSheet: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'panels', 'metadata-browser.css')
            )
        };
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.actionBarComponent ||
                !this.attributesTableComponent || !this.keysTableComponent ||
                !this.relationshipsTableComponent || !this.privilegesTableComponent ||
                !this.choiceValuesTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Metadata Browser', 'Failed to initialize components');
            }

            const panelResources = this.getPanelSpecificResources();
            const currentSelection = this.selectedEntityDisplayName || this.selectedChoiceDisplayName || 'None selected';
            const isAttributesExpanded = !this.collapsedSections.has('attributes');
            const isKeysExpanded = !this.collapsedSections.has('keys');
            const isRelationshipsExpanded = !this.collapsedSections.has('relationships');
            const isPrivilegesExpanded = !this.collapsedSections.has('privileges');
            const isChoicesExpanded = !this.collapsedSections.has('choices');

            // Determine what type of metadata is selected
            const isEntitySelected = !!this.selectedEntityLogicalName;
            const isChoiceSelected = !!this.selectedChoiceName;

            // Build custom HTML layout with two-panel design: left sidebar + main content
            const customHTML = `
    <div class="panel-container">
        <div class="panel-controls">
            ${this.actionBarComponent.generateHTML()}
            ${this.environmentSelectorComponent.generateHTML()}
        </div>

        <div class="panel-content">
            <div class="metadata-container">
        <button class="panel-collapse-btn" id="left-panel-collapse" onclick="toggleLeftPanel()" title="Collapse sidebar" aria-label="Collapse sidebar">
            ◀
        </button>

        <!-- Left Panel: Entity/Choice Tree -->
        <div class="left-panel" id="left-panel">
            <div class="left-panel-header">
                <input
                    type="text"
                    class="entity-search"
                    id="entity-search"
                    placeholder="Search tables and choices..."
                    oninput="filterEntityTree(this.value)"
                />
            </div>
            <div class="entity-tree-container">
                <div class="tree-section">
                    <div class="tree-section-header">TABLES</div>
                    <ul class="tree-section-list" id="tables-list">
                        <!-- Populated dynamically -->
                    </ul>
                </div>
                <div class="tree-section">
                    <div class="tree-section-header">CHOICES</div>
                    <ul class="tree-section-list" id="choices-list">
                        <!-- Populated dynamically -->
                    </ul>
                </div>
            </div>
        </div>

        <!-- Right Panel: Metadata Content (Split Panel Container) -->
        <div class="right-panel-container"
             data-component-type="SplitPanel"
             data-component-id="metadata-detail-split-panel"
             data-orientation="horizontal"
             data-min-size="400"
             data-resizable="true">

            <div class="right-panel" data-panel="left">
                <div class="selection-header">
                    <span class="selection-label">Selected:</span>
                    <span class="selection-value" id="current-selection">${currentSelection}</span>
                </div>

                <div class="metadata-sections ${isEntitySelected ? 'entity-mode' : ''} ${isChoiceSelected ? 'choice-mode' : ''}">
        <!-- Attributes Section (Entity Only) -->
        <div class="section entity-only ${isAttributesExpanded ? 'expanded' : ''}" data-section="attributes">
            <div class="section-header" onclick="toggleSection('attributes')">
                <span class="section-icon">▶</span>
                <span class="section-title">Attributes</span>
                <span class="section-count" id="attributes-count">0</span>
            </div>
            <div class="section-content">
                ${this.attributesTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Keys Section (Entity Only) -->
        <div class="section entity-only ${isKeysExpanded ? 'expanded' : ''}" data-section="keys">
            <div class="section-header" onclick="toggleSection('keys')">
                <span class="section-icon">▶</span>
                <span class="section-title">Keys</span>
                <span class="section-count" id="keys-count">0</span>
            </div>
            <div class="section-content">
                ${this.keysTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Relationships Section (Entity Only) -->
        <div class="section entity-only ${isRelationshipsExpanded ? 'expanded' : ''}" data-section="relationships">
            <div class="section-header" onclick="toggleSection('relationships')">
                <span class="section-icon">▶</span>
                <span class="section-title">Relationships</span>
                <span class="section-count" id="relationships-count">0</span>
            </div>
            <div class="section-content">
                ${this.relationshipsTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Privileges Section (Entity Only) -->
        <div class="section entity-only ${isPrivilegesExpanded ? 'expanded' : ''}" data-section="privileges">
            <div class="section-header" onclick="toggleSection('privileges')">
                <span class="section-icon">▶</span>
                <span class="section-title">Privileges</span>
                <span class="section-count" id="privileges-count">0</span>
            </div>
            <div class="section-content">
                ${this.privilegesTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Choice Values Section (Choice Only) -->
        <div class="section choice-only ${isChoicesExpanded ? 'expanded' : ''}" data-section="choices">
            <div class="section-header" onclick="toggleSection('choices')">
                <span class="section-icon">▶</span>
                <span class="section-title">Choice Values</span>
                <span class="section-count" id="choices-count">0</span>
            </div>
            <div class="section-content">
                ${this.choiceValuesTableComponent.generateHTML()}
            </div>
        </div>
                </div>
            </div>

            <!-- Split Panel Divider -->
            <div class="split-panel-divider" data-divider></div>

            <!-- Detail Panel (3rd column) -->
            <div class="detail-panel hidden" id="detail-panel" data-panel="right">
                <div class="detail-panel-header">
                    <span class="detail-panel-title" id="detail-panel-title">Details</span>
                    <button class="detail-panel-close" data-action="closeRightPanel" onclick="closeDetailPanel()" title="Close" aria-label="Close">
                        ×
                    </button>
                </div>
            <div class="detail-panel-tabs">
                <button class="detail-panel-tab active" data-tab="properties" onclick="switchDetailTab('properties')">
                    Properties
                </button>
                <button class="detail-panel-tab" data-tab="json" onclick="switchDetailTab('json')">
                    Raw Data
                </button>
            </div>
            <div class="detail-panel-content">
                <div id="detail-properties-content" style="display: block;">
                    <!-- Properties will be rendered here by JavaScript -->
                </div>
                <div id="detail-json-content" style="display: none;">
                    <!-- JSON will be rendered here by JavaScript -->
                </div>
            </div>
            </div>

        </div> <!-- end right-panel-container (split panel) -->

            </div>
        </div>
    </div>`;

            // Use PanelComposer with custom HTML layout
            // This follows SOLID principles by reusing PanelComposer's script/CSS collection logic
            return PanelComposer.composeWithCustomHTML(
                customHTML,
                [
                    this.environmentSelectorComponent,
                    this.actionBarComponent,
                    this.attributesTableComponent,
                    this.keysTableComponent,
                    this.relationshipsTableComponent,
                    this.privilegesTableComponent,
                    this.choiceValuesTableComponent
                ],
                ['css/panels/metadata-browser.css'],  // Additional panel-specific CSS
                [
                    'js/panels/metadataBrowserBehavior.js',
                    'js/components/SplitPanelBehavior.js'
                ],  // Additional panel-specific behavior scripts
                this.getCommonWebviewResources(),
                'Metadata Browser'
            );

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Metadata Browser', 'Failed to generate panel content: ' + error);
        }
    }

    private async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent, this.componentLogger);
        }
    }

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment selected', { environmentId });

            // Load entities and choices for the tree
            await this.loadEntityChoiceTree(environmentId);

            // Keep action buttons disabled until an entity/choice is selected
            this.updateActionBar(false, false);

            // Save state
            await this._stateService.savePanelState(MetadataBrowserPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
    }

    private async loadEntityChoiceTree(environmentId: string): Promise<void> {
        try {
            this.componentLogger.info('Loading entity and choice tree', { environmentId });

            const metadataService = ServiceFactory.getMetadataService();
            const [entities, choices] = await Promise.all([
                metadataService.getEntityDefinitions(environmentId),
                metadataService.getGlobalOptionSets(environmentId)
            ]);

            // Send to webview to populate tree
            this.postMessage({
                action: 'populate-tree',
                command: 'populate-tree',
                data: {
                    entities: entities.map(e => ({
                        logicalName: e.LogicalName,
                        displayName: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName,
                        metadataId: e.MetadataId,
                        isManaged: e.IsManaged,
                        isCustom: e.IsCustomEntity
                    })),
                    choices: choices.map(c => ({
                        name: c.Name,
                        displayName: c.DisplayName?.UserLocalizedLabel?.Label || c.Name,
                        isManaged: c.IsManaged,
                        isCustom: c.IsCustomOptionSet
                    }))
                }
            });

            this.componentLogger.info('Entity and choice tree populated', {
                entitiesCount: entities.length,
                choicesCount: choices.length
            });

        } catch (error) {
            this.componentLogger.error('Error loading entity/choice tree', error as Error, { environmentId });
            vscode.window.showErrorMessage(`Failed to load tables and choices: ${(error as Error).message}`);
        }
    }

    private async handleEntitySelection(data: any): Promise<void> {
        const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
        if (!selectedEnvironment) {
            return;
        }

        const { logicalName, displayName, metadataId } = data;
        if (!logicalName) {
            return;
        }

        await this.loadEntityMetadata(selectedEnvironment.id, logicalName, metadataId, displayName);
    }

    private async handleChoiceSelection(data: any): Promise<void> {
        const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
        if (!selectedEnvironment) {
            return;
        }

        const { name, displayName } = data;
        if (!name) {
            return;
        }

        await this.loadChoiceMetadata(selectedEnvironment.id, name, displayName);
    }

    private async handleMetadataRowClick(data: any): Promise<void> {
        const { tableId, rowId } = data;
        if (!tableId || !rowId) {
            return;
        }

        try {
            // Determine which table was clicked and get the metadata
            let metadata: any = null;
            let title: string = '';

            if (tableId === 'metadata-attributes-table') {
                // Find attribute in current metadata
                const attribute = this.currentMetadata?.attributes.find(a => a.LogicalName === rowId);
                if (attribute) {
                    metadata = attribute;
                    title = `Attribute: ${attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.LogicalName}`;
                }
            } else if (tableId === 'metadata-keys-table') {
                // Find key in current metadata
                const key = this.currentMetadata?.keys.find(k => k.LogicalName === rowId);
                if (key) {
                    metadata = key;
                    title = `Key: ${key.DisplayName?.UserLocalizedLabel?.Label || key.LogicalName}`;
                }
            } else if (tableId === 'metadata-relationships-table') {
                // Find relationship in current metadata
                const relationship = [
                    ...(this.currentMetadata?.oneToManyRelationships || []),
                    ...(this.currentMetadata?.manyToOneRelationships || []),
                    ...(this.currentMetadata?.manyToManyRelationships || [])
                ].find(r => r.SchemaName === rowId);
                if (relationship) {
                    metadata = relationship;
                    title = `Relationship: ${relationship.SchemaName}`;
                }
            } else if (tableId === 'metadata-privileges-table') {
                // Find privilege in current metadata
                const privilege = this.currentMetadata?.privileges.find(p => p.Name === rowId);
                if (privilege) {
                    metadata = privilege;
                    title = `Privilege: ${privilege.Name}`;
                }
            } else if (tableId === 'metadata-choice-values-table') {
                // Find the option in current choice metadata
                if (this.currentChoiceMetadata?.Options) {
                    const option = this.currentChoiceMetadata.Options.find(o => o.Value?.toString() === rowId);
                    if (option) {
                        metadata = option;
                        title = `Choice Value: ${option.Label?.UserLocalizedLabel?.Label || rowId}`;
                    }
                }
            }

            if (metadata) {
                // Send to webview to display
                this.postMessage({
                    command: 'show-detail',
                    action: 'showDetail',
                    data: {
                        title,
                        metadata
                    }
                });
            }
        } catch (error) {
            this.componentLogger.error('Error handling metadata row click', error as Error, { tableId, rowId });
        }
    }

    private async showTableChoicePicker(): Promise<void> {
        try {
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (!selectedEnvironment) {
                vscode.window.showWarningMessage('Please select an environment first');
                return;
            }

            this.componentLogger.info('Showing table/choice picker');

            // Load entities and choices
            const metadataService = ServiceFactory.getMetadataService();
            const [entities, choices] = await Promise.all([
                metadataService.getEntityDefinitions(selectedEnvironment.id),
                metadataService.getGlobalOptionSets(selectedEnvironment.id)
            ]);

            // Build quick pick items
            const items: vscode.QuickPickItem[] = [
                { label: 'TABLES', kind: vscode.QuickPickItemKind.Separator },
                ...entities.map(e => ({
                    label: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName,
                    description: e.LogicalName,
                    detail: `${e.IsManaged ? 'Managed' : 'Unmanaged'} | ${e.IsCustomEntity ? 'Custom' : 'System'}`,
                    metadata: { type: 'entity', logicalName: e.LogicalName, metadataId: e.MetadataId, displayName: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName }
                } as any)),
                { label: 'CHOICES', kind: vscode.QuickPickItemKind.Separator },
                ...choices.map(c => ({
                    label: c.DisplayName?.UserLocalizedLabel?.Label || c.Name,
                    description: c.Name,
                    detail: `${c.IsManaged ? 'Managed' : 'Unmanaged'} | ${c.IsCustomOptionSet ? 'Custom' : 'System'}`,
                    metadata: { type: 'choice', name: c.Name, displayName: c.DisplayName?.UserLocalizedLabel?.Label || c.Name }
                } as any))
            ];

            // Show quick pick
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a table or choice to view metadata',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected || !('metadata' in selected)) {
                return;
            }

            const metadata = (selected as any).metadata;

            if (metadata.type === 'entity') {
                await this.loadEntityMetadata(selectedEnvironment.id, metadata.logicalName, metadata.metadataId, metadata.displayName);
            } else if (metadata.type === 'choice') {
                await this.loadChoiceMetadata(selectedEnvironment.id, metadata.name, metadata.displayName);
            }

        } catch (error) {
            this.componentLogger.error('Error showing table/choice picker', error as Error);
            vscode.window.showErrorMessage(`Failed to load tables/choices: ${(error as Error).message}`);
        }
    }

    private async loadEntityMetadata(environmentId: string, logicalName: string, metadataId: string, displayName: string): Promise<void> {
        try {
            this.componentLogger.info('Loading entity metadata', { logicalName });

            // Show loading state
            this.setAllTablesLoading(true);

            // Fetch complete entity metadata
            const metadataService = ServiceFactory.getMetadataService();
            const metadata = await metadataService.getCompleteEntityMetadata(environmentId, logicalName);

            this.currentMetadata = metadata;
            this.currentChoiceMetadata = undefined;
            this.selectedEntityLogicalName = logicalName;
            this.selectedEntityMetadataId = metadataId;
            this.selectedEntityDisplayName = displayName;
            this.selectedChoiceName = undefined;
            this.selectedChoiceDisplayName = undefined;

            // Transform and update tables
            const attributesData = this.transformAttributesData(metadata.attributes);
            const keysData = this.transformKeysData(metadata.keys);
            const relationshipsData = this.transformRelationshipsData(
                metadata.oneToManyRelationships,
                metadata.manyToOneRelationships,
                metadata.manyToManyRelationships
            );
            const privilegesData = this.transformPrivilegesData(metadata.privileges);

            if (this.attributesTableComponent) {
                this.attributesTableComponent.setData(attributesData);
                this.attributesTableComponent.setLoading(false);
            }

            if (this.keysTableComponent) {
                this.keysTableComponent.setData(keysData);
                this.keysTableComponent.setLoading(false);
            }

            if (this.relationshipsTableComponent) {
                this.relationshipsTableComponent.setData(relationshipsData);
                this.relationshipsTableComponent.setLoading(false);
            }

            if (this.privilegesTableComponent) {
                this.privilegesTableComponent.setData(privilegesData);
                this.privilegesTableComponent.setLoading(false);
            }

            if (this.choiceValuesTableComponent) {
                this.choiceValuesTableComponent.setData([]);
                this.choiceValuesTableComponent.setLoading(false);
            }

            // Enable refresh and open in maker buttons
            this.updateActionBar(true, true);

            // Update selection display
            this.updateSelection(displayName, {
                attributes: attributesData.length,
                keys: keysData.length,
                relationships: relationshipsData.length,
                privileges: privilegesData.length,
                choices: 0
            });

            // Expand attributes section by default (no updateWebview needed - counts message triggers UI update)
            this.collapsedSections.delete('attributes');

            this.componentLogger.info('Entity metadata loaded successfully', { logicalName, attributesCount: attributesData.length });

        } catch (error) {
            this.componentLogger.error('Error loading entity metadata', error as Error, { logicalName });
            this.setAllTablesLoading(false);
            vscode.window.showErrorMessage(`Failed to load entity metadata: ${(error as Error).message}`);
        }
    }

    private async loadChoiceMetadata(environmentId: string, name: string, displayName: string): Promise<void> {
        try {
            this.componentLogger.info('Loading choice metadata', { name });

            // Show loading state for choice values table
            if (this.choiceValuesTableComponent) {
                this.choiceValuesTableComponent.setLoading(true, 'Loading choice values...');
            }

            // Clear other tables
            this.setAllTablesLoading(false);
            if (this.attributesTableComponent) this.attributesTableComponent.setData([]);
            if (this.keysTableComponent) this.keysTableComponent.setData([]);
            if (this.relationshipsTableComponent) this.relationshipsTableComponent.setData([]);
            if (this.privilegesTableComponent) this.privilegesTableComponent.setData([]);

            // Fetch choice metadata
            const metadataService = ServiceFactory.getMetadataService();
            const choice = await metadataService.getOptionSetMetadata(environmentId, name);

            this.currentMetadata = undefined;
            this.currentChoiceMetadata = choice;
            this.selectedEntityLogicalName = undefined;
            this.selectedEntityMetadataId = undefined;
            this.selectedEntityDisplayName = undefined;
            this.selectedChoiceName = name;
            this.selectedChoiceDisplayName = displayName;

            // Transform and update choice values table
            const choiceValuesData = this.transformChoiceValuesData(choice);

            if (this.choiceValuesTableComponent) {
                this.choiceValuesTableComponent.setData(choiceValuesData);
                this.choiceValuesTableComponent.setLoading(false);
            }

            // Enable refresh, disable open in maker (no maker URL for choices)
            this.updateActionBar(true, false);

            // Update selection display
            this.updateSelection(displayName, {
                attributes: 0,
                keys: 0,
                relationships: 0,
                privileges: 0,
                choices: choiceValuesData.length
            });

            // Expand choices section (no updateWebview needed - counts message triggers UI update)
            this.collapsedSections.delete('choices');

            this.componentLogger.info('Choice metadata loaded successfully', { name, valuesCount: choiceValuesData.length });

        } catch (error) {
            this.componentLogger.error('Error loading choice metadata', error as Error, { name });
            if (this.choiceValuesTableComponent) {
                this.choiceValuesTableComponent.setLoading(false);
            }
            vscode.window.showErrorMessage(`Failed to load choice metadata: ${(error as Error).message}`);
        }
    }

    private transformAttributesData(attributes: AttributeMetadata[]): AttributeTableRow[] {
        return attributes.map(attr => ({
            id: attr.LogicalName,  // Use LogicalName as ID for row click matching
            displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
            logicalName: attr.LogicalName,
            type: attr.AttributeType || attr.AttributeTypeName?.Value,
            required: attr.RequiredLevel?.Value || 'None',
            maxLength: attr.MaxLength?.toString() || '-'
        }));
    }

    private transformKeysData(keys: EntityKeyMetadata[]): KeyTableRow[] {
        return keys.map(key => ({
            id: key.LogicalName,  // Use LogicalName as ID for row click matching
            name: key.LogicalName,
            type: key.KeyAttributes && key.KeyAttributes.length === 1 ? 'Primary' : 'Alternate',
            keyAttributes: key.KeyAttributes?.join(', ') || ''
        }));
    }

    private transformRelationshipsData(
        oneToMany: OneToManyRelationshipMetadata[],
        manyToOne: OneToManyRelationshipMetadata[],
        manyToMany: ManyToManyRelationshipMetadata[]
    ): RelationshipTableRow[] {
        const rows: RelationshipTableRow[] = [];

        // 1:N relationships
        oneToMany.forEach(rel => {
            rows.push({
                id: rel.SchemaName,  // Use SchemaName as ID for row click matching
                name: rel.SchemaName,
                type: '1:N',
                relatedEntity: rel.ReferencedEntity || '',
                referencingAttribute: rel.ReferencingAttribute || ''
            });
        });

        // N:1 relationships
        manyToOne.forEach(rel => {
            rows.push({
                id: rel.SchemaName,  // Use SchemaName as ID for row click matching
                name: rel.SchemaName,
                type: 'N:1',
                relatedEntity: rel.ReferencedEntity || '',
                referencingAttribute: rel.ReferencingAttribute || ''
            });
        });

        // N:N relationships
        manyToMany.forEach(rel => {
            rows.push({
                id: rel.SchemaName,  // Use SchemaName as ID for row click matching
                name: rel.SchemaName,
                type: 'N:N',
                relatedEntity: `${rel.Entity1LogicalName} ↔ ${rel.Entity2LogicalName}`,
                referencingAttribute: rel.IntersectEntityName || ''
            });
        });

        return rows;
    }

    private transformPrivilegesData(privileges: EntityPrivilegeMetadata[]): PrivilegeTableRow[] {
        return privileges.map(priv => ({
            id: priv.PrivilegeId,
            name: priv.Name,
            privilegeType: priv.PrivilegeType?.toString() || 'Unknown',
            depth: this.getPrivilegeDepthLabel(priv)
        }));
    }

    private transformChoiceValuesData(choice: OptionSetMetadata): ChoiceValueTableRow[] {
        if (!choice.Options) {
            return [];
        }

        return choice.Options.map(option => ({
            id: option.Value?.toString() || '',
            label: option.Label?.UserLocalizedLabel?.Label || '',
            value: option.Value?.toString() || '',
            description: option.Description?.UserLocalizedLabel?.Label || ''
        }));
    }

    private getPrivilegeDepthLabel(priv: EntityPrivilegeMetadata): string {
        const depths: string[] = [];
        if (priv.CanBeBasic) depths.push('Basic');
        if (priv.CanBeLocal) depths.push('Local');
        if (priv.CanBeDeep) depths.push('Deep');
        if (priv.CanBeGlobal) depths.push('Global');
        return depths.length > 0 ? depths.join(', ') : 'None';
    }

    private setAllTablesLoading(loading: boolean, message?: string): void {
        const tables = [
            this.attributesTableComponent,
            this.keysTableComponent,
            this.relationshipsTableComponent,
            this.privilegesTableComponent,
            this.choiceValuesTableComponent
        ];

        tables.forEach(table => {
            if (table) {
                table.setLoading(loading, message);
                if (!loading) table.setData([]);
            }
        });
    }

    private updateSelection(displayName: string, counts: {
        attributes: number;
        keys: number;
        relationships: number;
        privileges: number;
        choices: number;
    }): void {
        this.postMessage({
            action: 'update-selection',
            command: 'update-selection',
            data: { displayName, counts }
        });
    }

    private updateActionBar(enableRefresh: boolean, enableOpenInMaker: boolean): void {
        if (this.actionBarComponent) {
            this.actionBarComponent.setActionDisabled('refresh', !enableRefresh);
            this.actionBarComponent.setActionDisabled('openInMaker', !enableOpenInMaker);
        }
    }

    private toggleSection(sectionId: string): void {
        if (this.collapsedSections.has(sectionId)) {
            this.collapsedSections.delete(sectionId);
        } else {
            this.collapsedSections.add(sectionId);
        }

        // No updateWebview() needed - webview behavior handles visual toggle optimistically
        // State is tracked here for persistence when getHtmlContent() is called again
        this.componentLogger.debug('Section toggled', { sectionId, isExpanded: !this.collapsedSections.has(sectionId) });
    }

    private async refreshCurrentMetadata(): Promise<void> {
        // First refresh the environment list
        await this.loadEnvironments();

        const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
        if (!selectedEnvironment) {
            vscode.window.showWarningMessage('Please select an environment first');
            return;
        }

        if (this.selectedEntityLogicalName) {
            await this.loadEntityMetadata(
                selectedEnvironment.id,
                this.selectedEntityLogicalName,
                this.selectedEntityMetadataId || '',
                this.selectedEntityDisplayName || this.selectedEntityLogicalName
            );
            vscode.window.showInformationMessage('Entity metadata refreshed');
        } else if (this.selectedChoiceName) {
            await this.loadChoiceMetadata(
                selectedEnvironment.id,
                this.selectedChoiceName,
                this.selectedChoiceDisplayName || this.selectedChoiceName
            );
            vscode.window.showInformationMessage('Choice metadata refreshed');
        } else {
            vscode.window.showWarningMessage('Please select a table or choice first');
        }
    }

    private async handleOpenInMaker(): Promise<void> {
        try {
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (!selectedEnvironment || !selectedEnvironment.environmentId) {
                vscode.window.showErrorMessage('Environment ID not found. Please configure the Environment ID in environment settings.');
                return;
            }

            // Action bar "Open in Maker" always goes to entities list
            const url = `https://make.powerapps.com/environments/${selectedEnvironment.environmentId}/entities`;
            this.componentLogger.info('Opening entities page in Maker', { url });

            await vscode.env.openExternal(vscode.Uri.parse(url));

        } catch (error) {
            this.componentLogger.error('Error opening in Maker', error as Error);
            vscode.window.showErrorMessage(`Failed to open in Maker: ${(error as Error).message}`);
        }
    }

    private async handleCopyLogicalName(rowData: any): Promise<void> {
        try {
            const logicalName = rowData.logicalName;
            if (logicalName) {
                await vscode.env.clipboard.writeText(logicalName);
                vscode.window.showInformationMessage(`Copied logical name: ${logicalName}`);
            }
        } catch (error) {
            this.componentLogger.error('Error copying logical name', error as Error);
            vscode.window.showErrorMessage('Failed to copy logical name');
        }
    }

    private async handleOpenAttributeInMaker(rowData: any): Promise<void> {
        try {
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (!selectedEnvironment || !selectedEnvironment.environmentId || !this.selectedEntityMetadataId) {
                vscode.window.showErrorMessage('Missing environment or entity information');
                return;
            }

            // Note: Attribute-specific URLs might not work in Maker, fallback to entity page
            const url = `https://make.powerapps.com/environments/${selectedEnvironment.environmentId}/entities/${this.selectedEntityMetadataId}`;
            await vscode.env.openExternal(vscode.Uri.parse(url));

        } catch (error) {
            this.componentLogger.error('Error opening attribute in Maker', error as Error);
            vscode.window.showErrorMessage('Failed to open attribute in Maker');
        }
    }

    private async handleOpenRelatedEntity(rowData: any): Promise<void> {
        try {
            const relatedEntity = rowData.relatedEntity;
            if (!relatedEntity) {
                vscode.window.showWarningMessage('Related entity not found');
                return;
            }

            // Extract entity name (handle N:N format)
            let entityName = relatedEntity;
            if (relatedEntity.includes('↔')) {
                const entities = relatedEntity.split('↔').map((e: string) => e.trim());
                const selected = await vscode.window.showQuickPick(entities, {
                    placeHolder: 'Select which entity to open'
                });
                if (!selected) return;
                entityName = selected;
            }

            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (!selectedEnvironment) {
                vscode.window.showWarningMessage('Please select an environment first');
                return;
            }

            // Load the related entity's metadata
            const metadataService = ServiceFactory.getMetadataService();
            const entities = await metadataService.getEntityDefinitions(selectedEnvironment.id);
            const entity = entities.find(e => e.LogicalName === entityName);

            if (entity) {
                await this.loadEntityMetadata(
                    selectedEnvironment.id,
                    entity.LogicalName,
                    entity.MetadataId,
                    entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
                );
            } else {
                vscode.window.showWarningMessage(`Entity ${entityName} not found`);
            }

        } catch (error) {
            this.componentLogger.error('Error opening related entity', error as Error);
            vscode.window.showErrorMessage('Failed to open related entity');
        }
    }

    public dispose(): void {
        MetadataBrowserPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.attributesTableComponent?.dispose();
        this.keysTableComponent?.dispose();
        this.relationshipsTableComponent?.dispose();
        this.privilegesTableComponent?.dispose();
        this.choiceValuesTableComponent?.dispose();

        super.dispose();
    }
}
