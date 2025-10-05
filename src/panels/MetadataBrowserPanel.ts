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
    private collapsedSections: Set<string> = new Set(['keys', 'relationships', 'privileges', 'choices']);

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (MetadataBrowserPanel.currentPanel) {
            MetadataBrowserPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            MetadataBrowserPanel.viewType,
            'Metadata Browser',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            }
        );

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
                label: 'Select Environment',
                placeholder: 'Choose an environment to browse metadata...',
                required: true,
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
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'secondary',
                        disabled: true
                    },
                    {
                        id: 'openInMaker',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: true
                    },
                    {
                        id: 'browseTables',
                        label: 'Browse Tables...',
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
                className: 'metadata-attributes-table'
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
                className: 'metadata-keys-table'
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
                className: 'metadata-relationships-table'
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
                className: 'metadata-privileges-table'
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
                className: 'metadata-choice-values-table'
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
                    case 'browseTables':
                        await this.showTableChoicePicker();
                        break;
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

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource}; script-src ${this._panel.webview.cspSource};">
    <title>Metadata Browser</title>
    <link rel="stylesheet" href="${this.getCommonWebviewResources().panelStylesSheet}">
    <style>
        body {
            padding: 0;
            margin: 0;
            overflow-x: hidden;
        }

        .sticky-header {
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 16px 20px;
            z-index: 100;
        }

        .header-row {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .table-selector {
            flex: 1;
            min-width: 200px;
        }

        .table-selector-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .table-selector-value {
            font-size: 14px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .metadata-sections {
            padding: 20px;
        }

        .section {
            margin-bottom: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--vscode-tab-activeBackground);
            cursor: pointer;
            user-select: none;
        }

        .section-header:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .section-icon {
            font-size: 12px;
            width: 16px;
            transition: transform 0.2s;
        }

        .section.expanded .section-icon {
            transform: rotate(90deg);
        }

        .section-title {
            flex: 1;
            font-weight: 600;
            font-size: 14px;
        }

        .section-count {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .section-content {
            display: none;
            padding: 16px;
            background: var(--vscode-editor-background);
        }

        .section.expanded .section-content {
            display: block;
        }

        .component-loading-container,
        .component-error-container {
            display: none;
        }
    </style>
</head>
<body>
    <div class="sticky-header">
        <div class="header-row">
            ${this.environmentSelectorComponent.generateHTML()}

            <div class="table-selector">
                <div class="table-selector-label">Selected:</div>
                <div class="table-selector-value" id="current-selection">${currentSelection}</div>
            </div>

            ${this.actionBarComponent.generateHTML()}
        </div>
    </div>

    <div class="metadata-sections">
        <!-- Attributes Section -->
        <div class="section ${isAttributesExpanded ? 'expanded' : ''}" data-section="attributes">
            <div class="section-header" onclick="toggleSection('attributes')">
                <span class="section-icon">▶</span>
                <span class="section-title">Attributes</span>
                <span class="section-count" id="attributes-count">0</span>
            </div>
            <div class="section-content">
                ${this.attributesTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Keys Section -->
        <div class="section ${isKeysExpanded ? 'expanded' : ''}" data-section="keys">
            <div class="section-header" onclick="toggleSection('keys')">
                <span class="section-icon">▶</span>
                <span class="section-title">Keys</span>
                <span class="section-count" id="keys-count">0</span>
            </div>
            <div class="section-content">
                ${this.keysTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Relationships Section -->
        <div class="section ${isRelationshipsExpanded ? 'expanded' : ''}" data-section="relationships">
            <div class="section-header" onclick="toggleSection('relationships')">
                <span class="section-icon">▶</span>
                <span class="section-title">Relationships</span>
                <span class="section-count" id="relationships-count">0</span>
            </div>
            <div class="section-content">
                ${this.relationshipsTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Privileges Section -->
        <div class="section ${isPrivilegesExpanded ? 'expanded' : ''}" data-section="privileges">
            <div class="section-header" onclick="toggleSection('privileges')">
                <span class="section-icon">▶</span>
                <span class="section-title">Privileges</span>
                <span class="section-count" id="privileges-count">0</span>
            </div>
            <div class="section-content">
                ${this.privilegesTableComponent.generateHTML()}
            </div>
        </div>

        <!-- Choices Section -->
        <div class="section ${isChoicesExpanded ? 'expanded' : ''}" data-section="choices">
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

    <script>
        const vscode = acquireVsCodeApi();

        function toggleSection(sectionId) {
            vscode.postMessage({
                command: 'toggle-section',
                data: { sectionId }
            });
        }

        // Send panel ready message
        vscode.postMessage({ command: 'panel-ready' });
    </script>
</body>
</html>`;

            return html;

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

            // Enable action bar buttons
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('browseTables', false);
            }

            // Save state
            await this._stateService.savePanelState(MetadataBrowserPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
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
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('refresh', false);
                this.actionBarComponent.setActionDisabled('openInMaker', false);
            }

            // Update selection display
            this.postMessage({
                action: 'update-selection',
                command: 'update-selection',
                data: { displayName, counts: {
                    attributes: attributesData.length,
                    keys: keysData.length,
                    relationships: relationshipsData.length,
                    privileges: privilegesData.length,
                    choices: 0
                }}
            });

            // Expand attributes section by default
            if (this.collapsedSections.has('attributes')) {
                this.collapsedSections.delete('attributes');
                this.updateWebview();
            }

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

            // Disable entity-specific actions
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('refresh', false);
                this.actionBarComponent.setActionDisabled('openInMaker', true); // No maker URL for choices
            }

            // Update selection display
            this.postMessage({
                action: 'update-selection',
                command: 'update-selection',
                data: { displayName, counts: {
                    attributes: 0,
                    keys: 0,
                    relationships: 0,
                    privileges: 0,
                    choices: choiceValuesData.length
                }}
            });

            // Expand choices section
            if (this.collapsedSections.has('choices')) {
                this.collapsedSections.delete('choices');
                this.updateWebview();
            }

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
            id: attr.MetadataId,
            displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
            logicalName: attr.LogicalName,
            type: attr.AttributeTypeName?.Value || attr.AttributeType,
            required: attr.RequiredLevel?.Value || 'None',
            maxLength: attr.MaxLength?.toString() || '-'
        }));
    }

    private transformKeysData(keys: EntityKeyMetadata[]): KeyTableRow[] {
        return keys.map(key => ({
            id: key.MetadataId,
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
                id: rel.MetadataId,
                name: rel.SchemaName,
                type: '1:N',
                relatedEntity: rel.ReferencedEntity || '',
                referencingAttribute: rel.ReferencingAttribute || ''
            });
        });

        // N:1 relationships
        manyToOne.forEach(rel => {
            rows.push({
                id: rel.MetadataId,
                name: rel.SchemaName,
                type: 'N:1',
                relatedEntity: rel.ReferencedEntity || '',
                referencingAttribute: rel.ReferencingAttribute || ''
            });
        });

        // N:N relationships
        manyToMany.forEach(rel => {
            rows.push({
                id: rel.MetadataId,
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
        if (this.attributesTableComponent) {
            this.attributesTableComponent.setLoading(loading, message);
            if (!loading) this.attributesTableComponent.setData([]);
        }
        if (this.keysTableComponent) {
            this.keysTableComponent.setLoading(loading, message);
            if (!loading) this.keysTableComponent.setData([]);
        }
        if (this.relationshipsTableComponent) {
            this.relationshipsTableComponent.setLoading(loading, message);
            if (!loading) this.relationshipsTableComponent.setData([]);
        }
        if (this.privilegesTableComponent) {
            this.privilegesTableComponent.setLoading(loading, message);
            if (!loading) this.privilegesTableComponent.setData([]);
        }
        if (this.choiceValuesTableComponent) {
            this.choiceValuesTableComponent.setLoading(loading, message);
            if (!loading) this.choiceValuesTableComponent.setData([]);
        }
    }

    private toggleSection(sectionId: string): void {
        if (this.collapsedSections.has(sectionId)) {
            this.collapsedSections.delete(sectionId);
        } else {
            this.collapsedSections.add(sectionId);
        }

        // Update the webview to reflect collapsed state
        this.updateWebview();
    }

    private async refreshCurrentMetadata(): Promise<void> {
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

            let url: string;

            if (this.selectedEntityMetadataId) {
                // Entity-specific URL
                url = `https://make.powerapps.com/environments/${selectedEnvironment.environmentId}/entities/${this.selectedEntityMetadataId}`;
                this.componentLogger.info('Opening entity in Maker', { url, entity: this.selectedEntityLogicalName });
            } else {
                // Global entities page
                url = `https://make.powerapps.com/environments/${selectedEnvironment.environmentId}/entities`;
                this.componentLogger.info('Opening entities page in Maker', { url });
            }

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
