import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { JsonViewerComponent } from '../components/viewers/JsonViewer/JsonViewerComponent';
import {
    CompleteEntityMetadata,
    AttributeMetadata,
    EntityKeyMetadata,
    OneToManyRelationshipMetadata,
    ManyToManyRelationshipMetadata,
    EntityPrivilegeMetadata,
    OptionSetMetadata
} from '../services/MetadataService';
import { METADATA_CONTEXT_MENU_ITEMS } from '../config/TableActions';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

/**
 * Instance state for MetadataBrowserPanel
 * Tracks which environment this specific panel instance is viewing
 */
interface MetadataBrowserInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

/**
 * Persistent preferences for Metadata Browser in a specific environment
 * These preferences follow the environment, not the panel instance
 */
interface MetadataBrowserPreferences {
    collapsedSections?: string[];
    splitRatio?: number;
}

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

interface QuickPickItemWithMetadata extends vscode.QuickPickItem {
    metadata?: {
        type: 'entity' | 'choice';
        logicalName?: string;
        metadataId?: string;
        displayName?: string;
        name?: string;
    };
}

export class MetadataBrowserPanel extends BasePanel<MetadataBrowserInstanceState, MetadataBrowserPreferences> {
    public static readonly viewType = 'metadataBrowser';
    private static currentPanel: MetadataBrowserPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private attributesTableComponent?: DataTableComponent;
    private keysTableComponent?: DataTableComponent;
    private relationshipsTableComponent?: DataTableComponent;
    private privilegesTableComponent?: DataTableComponent;
    private choiceValuesTableComponent?: DataTableComponent;
    private jsonViewerComponent?: JsonViewerComponent;
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
        BasePanel.handlePanelCreation(
            {
                viewType: MetadataBrowserPanel.viewType,
                title: 'Metadata Browser',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new MetadataBrowserPanel(panel, uri),
            () => MetadataBrowserPanel.currentPanel,
            (panel) => { MetadataBrowserPanel.currentPanel = panel; },
            false
        );
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: MetadataBrowserPanel.viewType,
                title: 'Metadata Browser',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new MetadataBrowserPanel(panel, uri),
            () => MetadataBrowserPanel.currentPanel,
            (panel) => { MetadataBrowserPanel.currentPanel = panel; },
            true
        );
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
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
            this.choiceValuesTableComponent,
            this.jsonViewerComponent
        ]);

        // Initialize the panel
        this.initialize();

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
                onChange: async (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    await this.processEnvironmentSelection(environmentId);
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
                        disabled: false
                    },
                    this.getStandardRefreshAction()
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

            // JSON Viewer Component for detail panel
            this.jsonViewerComponent = this.componentFactory.createJsonViewer({
                id: 'metadata-json-viewer',
                data: null,
                collapsible: true,
                showCopy: false,
                maxHeight: 'none'
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
                // 'environment-changed' is handled by BasePanel.handleCommonMessages()

                case 'browse-tables':
                    await this.showTableChoicePicker();
                    break;

                case 'toggle-section':
                    this.toggleSection(message.data?.sectionId);
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

                // ROW CLICK DISABLED - Use context menu "View Details" instead
                // case 'metadata-row-click':
                //     if (message.data) {
                //         await this.handleMetadataRowClick(message.data);
                //     }
                //     break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    break;

                case 'component-event':
                    this.componentLogger.debug('Component event received', { data: message.data });
                    await this.handleComponentEvent(message);
                    break;

                case 'table-search':
                    if (message.tableId) {
                        // Determine which table to search based on tableId
                        switch (message.tableId) {
                            case 'metadata-attributes-table':
                                if (this.attributesTableComponent) {
                                    this.attributesTableComponent.search(message.searchQuery || '');
                                }
                                break;
                            case 'metadata-keys-table':
                                if (this.keysTableComponent) {
                                    this.keysTableComponent.search(message.searchQuery || '');
                                }
                                break;
                            case 'metadata-relationships-table':
                                if (this.relationshipsTableComponent) {
                                    this.relationshipsTableComponent.search(message.searchQuery || '');
                                }
                                break;
                            case 'metadata-privileges-table':
                                if (this.privilegesTableComponent) {
                                    this.privilegesTableComponent.search(message.searchQuery || '');
                                }
                                break;
                            case 'metadata-choice-values-table':
                                if (this.choiceValuesTableComponent) {
                                    this.choiceValuesTableComponent.search(message.searchQuery || '');
                                }
                                break;
                        }
                    }
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

    /**
     * Handle non-action component events (optional hook from BasePanel)
     * Used for handling context menu clicks and split panel events
     */
    protected async handleOtherComponentEvent(componentId: string, eventType: string, data?: unknown): Promise<void> {
        // Validate data parameter
        if (!data || typeof data !== 'object') {
            this.componentLogger.warn('Invalid component event data', { componentId, eventType });
            return;
        }

        // Handle context menu events
        if (eventType === 'contextMenuItemClicked') {
            const { itemId, rowData } = data as { itemId?: string; rowData?: unknown };
            this.componentLogger.info(`Context menu item clicked: ${itemId}`, { componentId });

            switch (itemId) {
                case 'viewDetails':
                    await this.handleViewDetails(componentId, rowData);
                    break;
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

        // Handle split panel events using BasePanel abstraction
        if (componentId === 'metadata-detail-split-panel') {
            const handled = await this.handleStandardSplitPanelEvents(eventType, data);
            if (handled) {
                if (eventType === 'splitRatioChanged') {
                    const { splitRatio } = data as { splitRatio?: number };
                    this.componentLogger.debug('Split ratio changed', { splitRatio });
                } else {
                    const { rightPanelVisible } = data as { rightPanelVisible?: boolean };
                    this.componentLogger.debug('Split panel visibility changed', { rightPanelVisible });
                }
                return;
            }
        }

        // Other component events
        this.componentLogger.trace('Component event not handled', { componentId, eventType });
    }

    /**
     * Handle panel-specific action bar actions (optional hook from BasePanel)
     */
    protected async handlePanelAction(_componentId: string, actionId: string): Promise<void> {
        switch (actionId) {
            case 'openInMaker':
                await this.handleOpenInMaker();
                break;
            default:
                this.componentLogger.warn('Unknown action ID', { actionId });
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
            <div class="metadata-container detail-hidden">
        <button class="panel-collapse-btn" id="left-panel-collapse" data-action="toggle-left-panel" title="Collapse sidebar" aria-label="Collapse sidebar">
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
                    data-action="filter-entity-tree"
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

        <!-- Split Panel: Metadata Content + Detail Panel -->
        <div id="metadataSplitPanelContainer" class="split-panel split-panel-horizontal split-panel-resizable split-panel-right-hidden"
             data-component-type="SplitPanel"
             data-component-id="metadata-detail-split-panel"
             data-orientation="horizontal"
             data-min-size="400"
             data-resizable="true"
             data-split-ratio="70">

            <!-- Left: Metadata Tables -->
            <div class="split-panel-left right-panel" data-panel="left">
                <div class="selection-header">
                    <span class="selection-label">Selected:</span>
                    <span class="selection-value" id="current-selection">${currentSelection}</span>
                </div>

                <div class="metadata-sections ${isEntitySelected ? 'entity-mode' : ''} ${isChoiceSelected ? 'choice-mode' : ''}">
        <!-- Attributes Section (Entity Only) -->
        <div class="section entity-only ${isAttributesExpanded ? 'expanded' : ''}" data-section="attributes">
            <div class="section-header" data-action="toggle-section" data-section="attributes">
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
            <div class="section-header" data-action="toggle-section" data-section="keys">
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
            <div class="section-header" data-action="toggle-section" data-section="relationships">
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
            <div class="section-header" data-action="toggle-section" data-section="privileges">
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
            <div class="section-header" data-action="toggle-section" data-section="choices">
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

            <!-- Divider -->
            <div class="split-panel-divider" data-divider>
                <div class="split-panel-divider-handle"></div>
            </div>

            <!-- Right: Detail Panel -->
            <div class="split-panel-right detail-panel" data-panel="right" id="detail-panel">
                <div class="detail-panel-header">
                    <span class="detail-panel-title" id="detail-panel-title">Details</span>
                    <button class="detail-panel-close" data-action="closeRightPanel" title="Close" aria-label="Close">
                        ×
                    </button>
                </div>
                <div class="detail-panel-tabs">
                    <button class="detail-panel-tab active" data-tab="properties" data-action="switch-detail-tab">
                        Properties
                    </button>
                    <button class="detail-panel-tab" data-tab="json" data-action="switch-detail-tab">
                        Raw Data
                    </button>
                </div>
                <div class="detail-panel-content">
                    <div id="detail-properties-content" style="display: block;">
                        <!-- Properties will be rendered here by JavaScript -->
                    </div>
                    <div id="detail-json-content" style="display: none;">
                        ${this.jsonViewerComponent?.generateHTML() || ''}
                    </div>
                </div>
            </div>
        </div>

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
                    this.choiceValuesTableComponent,
                    this.jsonViewerComponent!
                ],
                [
                    'css/panels/metadata-browser.css',
                    'css/components/split-panel.css',
                    'css/components/detail-panel-tabs.css'
                ],  // Additional panel-specific CSS
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

    /**
     * Hook called when environment changes (with switching side effects)
     * State is automatically managed by BasePanel
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment changed', { environmentId });

            // Load data
            await this.loadEnvironmentData(environmentId);

            // Keep action buttons disabled until an entity/choice is selected
            this.updateActionBar(false, false);

        } catch (error) {
            this.componentLogger.error('Error handling environment change', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment data');
        }
    }

    /**
     * Apply preferences to restore panel state (Template Method Pattern)
     * Called automatically by BasePanel after environment load/switch
     */
    protected async applyPreferences(prefs: MetadataBrowserPreferences | null): Promise<void> {
        if (!prefs) {
            this.componentLogger.debug('No preferences to apply');
            return;
        }

        this.componentLogger.info('Applying preferences', { prefs });

        // 1. Restore collapsed sections state
        if (prefs.collapsedSections && Array.isArray(prefs.collapsedSections)) {
            this.collapsedSections = new Set(prefs.collapsedSections);
            this.componentLogger.debug('Restored collapsed sections', {
                sections: Array.from(this.collapsedSections)
            });
        }

        // 2. Restore split panel state (layout)
        // Note: Detail panel always starts hidden - user must select an entity and attribute to view details
        this.restoreSplitPanelState('metadata-detail-split-panel', prefs, false);

        this.componentLogger.info('✅ Preferences applied successfully');
    }

    /**
     * Load data for an environment (PURE data loading, no switching side effects)
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        this.componentLogger.info('Loading environment data', { environmentId });
        await this.loadEntityChoiceTree(environmentId);
    }

    private async loadEntityChoiceTree(environmentId: string): Promise<void> {
        try {
            this.componentLogger.info('Loading entity and choice tree', { environmentId });

            // Show loading state for tree
            this.postMessage({
                action: 'tree-loading',
                loading: true
            });

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

    private async handleEntitySelection(data: unknown): Promise<void> {
        const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
        if (!selectedEnvironment) {
            return;
        }

        if (!data || typeof data !== 'object') {
            return;
        }

        const entityData = data as Record<string, unknown>;
        const { logicalName, displayName, metadataId } = entityData;
        if (!logicalName) {
            return;
        }

        // Set entity mode FIRST so sections become visible
        this.postMessage({
            action: 'set-mode',
            mode: 'entity'
        });

        // Open the right panel to show entity details
        this.postMessage({
            action: 'show-right-panel',
            componentId: 'metadata-detail-split-panel'
        });

        // Show loading state immediately (important for first load when tables are empty)
        this.setAllTablesLoading(true, 'Loading entity metadata...');

        await this.loadEntityMetadata(selectedEnvironment.id, logicalName as string, metadataId as string, displayName as string);
    }

    private async handleChoiceSelection(data: unknown): Promise<void> {
        const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
        if (!selectedEnvironment) {
            return;
        }

        if (!data || typeof data !== 'object') {
            return;
        }

        const choiceData = data as Record<string, unknown>;
        const { name, displayName } = choiceData;
        if (!name) {
            return;
        }

        // Set choice mode FIRST so sections become visible
        this.postMessage({
            action: 'set-mode',
            mode: 'choice'
        });

        // Open the right panel to show choice details
        this.postMessage({
            action: 'show-right-panel',
            componentId: 'metadata-detail-split-panel'
        });

        // Show loading state immediately (important for first load)
        if (this.choiceValuesTableComponent) {
            this.choiceValuesTableComponent.setLoading(true, 'Loading choice values...');
        }

        await this.loadChoiceMetadata(selectedEnvironment.id, name as string, displayName as string);
    }

    /**
     * Handle View Details context menu action
     * Opens the detail panel showing full metadata for the selected row
     */
    private async handleViewDetails(componentId: string, rowData: unknown): Promise<void> {
        if (!rowData || typeof rowData !== 'object') {
            return;
        }

        const row = rowData as Record<string, unknown>;
        const rowId = row.id as string;
        if (!rowId) {
            return;
        }

        try {
            // Determine which table the row is from and get the full metadata
            let metadata: unknown = null;
            let title: string = '';

            if (componentId === 'metadata-attributes-table') {
                // Find attribute in current metadata
                const attribute = this.currentMetadata?.attributes.find(a => a.LogicalName === rowId);
                if (attribute) {
                    metadata = attribute;
                    title = `Attribute: ${attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.LogicalName}`;
                }
            } else if (componentId === 'metadata-relationships-table') {
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
            }

            if (metadata) {
                // Update JSON viewer component with metadata
                if (this.jsonViewerComponent) {
                    this.jsonViewerComponent.setData(metadata);
                }

                // Send to webview to display in split panel (for title and properties tab)
                this.postMessage({
                    command: 'show-detail',
                    action: 'show-detail',
                    data: {
                        title,
                        metadata
                    }
                });
            }
        } catch (error) {
            this.componentLogger.error('Error handling view details', error as Error, { componentId, rowId });
        }
    }

    // ROW CLICK DISABLED - Use context menu "View Details" instead
    // private async handleMetadataRowClick(data: unknown): Promise<void> {
    //     ...row click implementation removed...
    // }

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
            const items: QuickPickItemWithMetadata[] = [
                { label: 'TABLES', kind: vscode.QuickPickItemKind.Separator },
                ...entities.map(e => ({
                    label: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName,
                    description: e.LogicalName,
                    detail: `${e.IsManaged ? 'Managed' : 'Unmanaged'} | ${e.IsCustomEntity ? 'Custom' : 'System'}`,
                    metadata: { type: 'entity' as const, logicalName: e.LogicalName, metadataId: e.MetadataId, displayName: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName }
                })),
                { label: 'CHOICES', kind: vscode.QuickPickItemKind.Separator },
                ...choices.map(c => ({
                    label: c.DisplayName?.UserLocalizedLabel?.Label || c.Name,
                    description: c.Name,
                    detail: `${c.IsManaged ? 'Managed' : 'Unmanaged'} | ${c.IsCustomOptionSet ? 'Custom' : 'System'}`,
                    metadata: { type: 'choice' as const, name: c.Name, displayName: c.DisplayName?.UserLocalizedLabel?.Label || c.Name }
                }))
            ];

            // Show quick pick
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a table or choice to view metadata',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected || !selected.metadata) {
                return;
            }

            const metadata = selected.metadata;

            if (metadata.type === 'entity' && metadata.logicalName && metadata.metadataId) {
                await this.loadEntityMetadata(selectedEnvironment.id, metadata.logicalName, metadata.metadataId, metadata.displayName || '');
            } else if (metadata.type === 'choice' && metadata.name) {
                await this.loadChoiceMetadata(selectedEnvironment.id, metadata.name, metadata.displayName || '');
            }

        } catch (error) {
            this.componentLogger.error('Error showing table/choice picker', error as Error);
            vscode.window.showErrorMessage(`Failed to load tables/choices: ${(error as Error).message}`);
        }
    }

    private async loadEntityMetadata(environmentId: string, logicalName: string, metadataId: string, displayName: string): Promise<void> {
        try {
            this.componentLogger.info('Loading entity metadata', { logicalName });

            // Clear all tables first
            if (this.attributesTableComponent) this.attributesTableComponent.setData([]);
            if (this.keysTableComponent) this.keysTableComponent.setData([]);
            if (this.relationshipsTableComponent) this.relationshipsTableComponent.setData([]);
            if (this.privilegesTableComponent) this.privilegesTableComponent.setData([]);
            if (this.choiceValuesTableComponent) this.choiceValuesTableComponent.setData([]);

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

            // Clear all tables first
            if (this.attributesTableComponent) this.attributesTableComponent.setData([]);
            if (this.keysTableComponent) this.keysTableComponent.setData([]);
            if (this.relationshipsTableComponent) this.relationshipsTableComponent.setData([]);
            if (this.privilegesTableComponent) this.privilegesTableComponent.setData([]);
            if (this.choiceValuesTableComponent) this.choiceValuesTableComponent.setData([]);

            // Show loading state for choice values table
            if (this.choiceValuesTableComponent) {
                this.choiceValuesTableComponent.setLoading(true, 'Loading choice values...');
            }

            // Turn off loading for other tables
            this.setAllTablesLoading(false);

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

    private async toggleSection(sectionId: string): Promise<void> {
        if (this.collapsedSections.has(sectionId)) {
            this.collapsedSections.delete(sectionId);
        } else {
            this.collapsedSections.add(sectionId);
        }

        // Save collapsed sections to preferences
        await this.stateManager.updateCurrentPreferences({
            collapsedSections: Array.from(this.collapsedSections)
        });

        // No updateWebview() needed - webview behavior handles visual toggle optimistically
        // State is tracked here for persistence when getHtmlContent() is called again
        this.componentLogger.debug('Section toggled', { sectionId, isExpanded: !this.collapsedSections.has(sectionId) });
    }

    protected async handleRefresh(): Promise<void> {
        // Clear all tables first
        if (this.attributesTableComponent) this.attributesTableComponent.setData([]);
        if (this.keysTableComponent) this.keysTableComponent.setData([]);
        if (this.relationshipsTableComponent) this.relationshipsTableComponent.setData([]);
        if (this.privilegesTableComponent) this.privilegesTableComponent.setData([]);
        if (this.choiceValuesTableComponent) this.choiceValuesTableComponent.setData([]);

        // Show loading state
        this.setAllTablesLoading(true, 'Refreshing metadata...');

        this.actionBarComponent?.setActionLoading('refresh', true);
        try {
            await this.refreshCurrentMetadata();
        } finally {
            this.actionBarComponent?.setActionLoading('refresh', false);
            this.setAllTablesLoading(false);
        }
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

    private async handleCopyLogicalName(rowData: unknown): Promise<void> {
        try {
            if (!rowData || typeof rowData !== 'object') {
                return;
            }

            const row = rowData as Record<string, unknown>;
            const logicalName = row.logicalName;
            if (logicalName) {
                await vscode.env.clipboard.writeText(String(logicalName));
                vscode.window.showInformationMessage(`Copied logical name: ${logicalName}`);
            }
        } catch (error) {
            this.componentLogger.error('Error copying logical name', error as Error);
            vscode.window.showErrorMessage('Failed to copy logical name');
        }
    }

    private async handleOpenAttributeInMaker(_rowData: unknown): Promise<void> {
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

    private async handleOpenRelatedEntity(rowData: unknown): Promise<void> {
        try {
            if (!rowData || typeof rowData !== 'object') {
                return;
            }

            const row = rowData as Record<string, unknown>;
            const relatedEntity = row.relatedEntity;
            if (!relatedEntity) {
                vscode.window.showWarningMessage('Related entity not found');
                return;
            }

            const relatedEntityStr = String(relatedEntity);

            // Extract entity name (handle N:N format)
            let entityName = relatedEntityStr;
            if (relatedEntityStr.includes('↔')) {
                const entities = relatedEntityStr.split('↔').map((e: string) => e.trim());
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
