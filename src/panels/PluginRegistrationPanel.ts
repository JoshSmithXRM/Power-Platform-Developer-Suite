import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { TreeViewComponent } from '../components/trees/TreeView/TreeViewComponent';
import { JsonViewerComponent } from '../components/viewers/JsonViewer/JsonViewerComponent';
import { TreeNode } from '../components/trees/TreeView/TreeViewConfig';
import { PluginRegistrationService, PluginAssembly, PluginType, PluginStep, PluginImage } from '../services/PluginRegistrationService';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

interface PluginRegistrationInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

interface PluginRegistrationPreferences {
    [key: string]: unknown;
}

export class PluginRegistrationPanel extends BasePanel<PluginRegistrationInstanceState, PluginRegistrationPreferences> {
    public static readonly viewType = 'pluginRegistration';
    private static currentPanel: PluginRegistrationPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private treeViewComponent?: TreeViewComponent;
    private jsonViewerComponent?: JsonViewerComponent;
    private componentFactory: ComponentFactory;

    // Services
    private pluginService: PluginRegistrationService;

    // State
    private assemblies: PluginAssembly[] = [];
    private selectedNode?: TreeNode;

    // In-memory data for lazy rendering
    private typesByAssembly = new Map<string, PluginType[]>();
    private stepsByType = new Map<string, PluginStep[]>();
    private imagesByStep = new Map<string, PluginImage[]>();

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: PluginRegistrationPanel.viewType,
                title: 'Plugin Registration',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new PluginRegistrationPanel(panel, uri),
            () => PluginRegistrationPanel.currentPanel,
            (panel) => { PluginRegistrationPanel.currentPanel = panel; },
            false
        );
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: PluginRegistrationPanel.viewType,
                title: 'Plugin Registration',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new PluginRegistrationPanel(panel, uri),
            () => PluginRegistrationPanel.currentPanel,
            (panel) => { PluginRegistrationPanel.currentPanel = panel; },
            true
        );
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: PluginRegistrationPanel.viewType,
            title: 'Plugin Registration'
        });

        this.panel.onDidDispose(() => {
            PluginRegistrationPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');

        // Create per-panel ComponentFactory instance
        this.componentFactory = new ComponentFactory();

        // Initialize service
        this.pluginService = new PluginRegistrationService(this._authService);

        this.initializeComponents();

        // Set up event bridges for component communication
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.actionBarComponent,
            this.treeViewComponent,
            this.jsonViewerComponent
        ]);

        // Initialize the panel (restores state and renders initial HTML)
        this.initialize();

        this.componentLogger.debug('Constructor completed');
    }

    private initializeComponents(): void {
        this.componentLogger.info('Initializing components');

        // Environment Selector - onChange handles both auto-selection and manual changes
        this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
            id: 'pluginRegistration-environmentSelector',
            variant: 'default',
            label: 'Environment:',
            showRefreshButton: true,
            onChange: async (environmentId: string) => {
                this.componentLogger.debug('Environment onChange triggered', { environmentId });
                await this.processEnvironmentSelection(environmentId);
            }
        });

        // Action Bar
        this.actionBarComponent = this.componentFactory.createActionBar({
            id: 'pluginRegistration-actionBar',
            actions: [
                this.getStandardRefreshAction()
            ]
        });

        // Tree View
        this.treeViewComponent = this.componentFactory.createTreeView({
            id: 'pluginRegistration-treeView',
            nodes: [],
            searchEnabled: true,
            multiSelect: false,
            lazyLoad: false, // Load all data upfront
            onNodeSelect: (node) => this.handleNodeSelected(node)
        });

        // JSON Viewer
        this.jsonViewerComponent = this.componentFactory.createJsonViewer({
            id: 'pluginRegistration-jsonViewer',
            data: null,
            collapsible: true,
            showCopy: false,
            maxHeight: 'none'
        });

        // Note: SplitPanel is NOT created as a component - it's just HTML with SplitPanelBehavior
        // The behavior automatically picks up elements with data-component-type="SplitPanel"

        this.componentLogger.info('Components initialized');
    }

    /**
     * Hook called when environment changes (with switching side effects)
     * State is automatically managed by BasePanel
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        this.componentLogger.info('Environment changed', { environmentId });

        if (!environmentId) {
            this.currentEnvironmentId = undefined;
            this.treeViewComponent?.setNodes([]);
            return;
        }

        this.currentEnvironmentId = environmentId;
        await this.loadEnvironmentData(environmentId);
    }

    /**
     * Apply preferences to restore panel state (Template Method Pattern)
     * Called automatically by BasePanel after environment load/switch
     */
    protected async applyPreferences(prefs: PluginRegistrationPreferences | null): Promise<void> {
        // No preferences to restore for this panel yet
        // Future: Could restore expanded nodes, selected assembly, sort order, etc.
        this.componentLogger.debug('applyPreferences called (no preferences defined yet)', { hasPrefs: !!prefs });
    }

    /**
     * Load data for an environment (PURE data loading, no switching side effects)
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        this.componentLogger.info('Loading environment data', { environmentId });
        await this.loadAssemblies();
    }

    protected getHtmlContent(): string {
        const detailsHTML = this.selectedNode ? this.generateDetailsHTML(this.selectedNode) : this.generateEmptyDetailsHTML();

        const customHTML = `
    <div class="panel-container">
        <div class="panel-controls">
            ${this.actionBarComponent!.generateHTML()}
            ${this.environmentSelectorComponent!.generateHTML()}
        </div>

        <div class="panel-content">
            <!-- Split Panel: Tree + Details -->
            <div id="pluginRegistrationSplitPanel" class="split-panel split-panel-horizontal split-panel-resizable split-panel-right-hidden"
                 data-component-type="SplitPanel"
                 data-component-id="pluginRegistration-splitPanel"
                 data-orientation="horizontal"
                 data-min-size="250"
                 data-resizable="true"
                 data-split-ratio="60">

                <!-- Left: Tree View -->
                <div class="split-panel-left" data-panel="left">
                    ${this.treeViewComponent!.generateHTML()}
                </div>

                <!-- Divider -->
                <div class="split-panel-divider" data-divider>
                    <div class="split-panel-divider-handle"></div>
                </div>

                <!-- Right: Details Panel -->
                <div class="split-panel-right detail-panel" data-panel="right">
                    <div class="detail-panel-header">
                        <span class="detail-panel-title">Properties</span>
                        <button class="detail-panel-close" data-action="closeRightPanel" title="Close" aria-label="Close">
                            ×
                        </button>
                    </div>
                    <div class="detail-panel-content" id="detail-panel-content">
                        ${detailsHTML}
                    </div>
                </div>
            </div>
        </div>
    </div>
        `;

        return PanelComposer.composeWithCustomHTML(
            customHTML,
            [
                this.environmentSelectorComponent!,
                this.actionBarComponent!,
                this.treeViewComponent!,
                this.jsonViewerComponent!
            ],
            ['css/panels/plugin-registration.css', 'css/components/split-panel.css', 'css/components/detail-panel-tabs.css'],
            ['js/panels/pluginRegistrationBehavior.js', 'js/components/SplitPanelBehavior.js'],
            this.getCommonWebviewResources(),
            'Plugin Registration'
        );
    }

    private generateEmptyDetailsHTML(): string {
        return `
            <div class="empty-details">
                <p>Select an assembly, plugin type, step, or image to view its properties</p>
            </div>
        `;
    }

    private generateDetailsHTML(node: TreeNode): string {
        const propertiesHTML = this.generatePropertiesContent(node);

        return `
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
                    ${propertiesHTML}
                </div>
                <div id="detail-json-content" style="display: none;">
                    ${this.jsonViewerComponent?.generateHTML() || ''}
                </div>
            </div>
        `;
    }

    private generatePropertiesContent(node: TreeNode): string {
        switch (node.type) {
            case 'assembly':
                return this.generateAssemblyDetailsHTML(node.data as PluginAssembly);
            case 'plugintype':
                return this.generatePluginTypeDetailsHTML(node.data as PluginType);
            case 'step':
                return this.generateStepDetailsHTML(node.data as PluginStep);
            case 'image':
                return this.generateImageDetailsHTML(node.data as PluginImage);
            default:
                return this.generateEmptyDetailsHTML();
        }
    }

    /**
     * Convert camelCase/PascalCase field names to friendly Title Case with spaces
     */
    private toFriendlyName(fieldName: string): string {
        // Handle specific mappings first
        const mappings: Record<string, string> = {
            'pluginassemblyid': 'Plugin Assembly ID',
            'plugintypeid': 'Plugin Type ID',
            'sdkmessageprocessingstepid': 'Step ID',
            'sdkmessageprocessingstepimageid': 'Image ID',
            'sdkmessageid': 'SDK Message ID',
            'ismanaged': 'Is Managed',
            'isolationmode': 'Isolation Mode',
            'sourcetype': 'Source Type',
            'publickeytoken': 'Public Key Token',
            'typename': 'Type Name',
            'friendlyname': 'Friendly Name',
            'statecode': 'State',
            'filteringattributes': 'Filtering Attributes',
            'entitylogicalname': 'Entity',
            'entityalias': 'Entity Alias',
            'imagetype': 'Image Type',
            'createdon': 'Created On',
            'modifiedon': 'Modified On'
        };

        const lower = fieldName.toLowerCase();
        if (mappings[lower]) {
            return mappings[lower];
        }

        // Split on capital letters and underscores, then title case
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Generate property rows with friendly names, hiding OData metadata
     */
    private generateAllPropertiesHTML(data: Record<string, unknown>, title: string, icon: string): string {
        const rows = Object.entries(data)
            // Filter out OData metadata and lookup value fields
            .filter(([key]) => {
                return !key.startsWith('@odata') && !key.startsWith('_') && !key.endsWith('_value');
            })
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort alphabetically
            .map(([key, value]) => {
                // Format the value appropriately
                let displayValue: string;
                if (value === null || value === undefined) {
                    displayValue = '<span class="property-null">null</span>';
                } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                } else if (typeof value === 'object') {
                    displayValue = `<code>${this.escapeHtml(JSON.stringify(value))}</code>`;
                } else {
                    displayValue = this.escapeHtml(String(value));
                }

                // Style GUID-like values
                const isGuid = typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
                const valueClass = isGuid ? 'property-value property-id' : 'property-value';

                // Get friendly name
                const friendlyName = this.toFriendlyName(key);

                return `
                    <div class="property-row">
                        <span class="property-label">${this.escapeHtml(friendlyName)}:</span>
                        <span class="${valueClass}">${displayValue}</span>
                    </div>
                `;
            })
            .join('');

        return `
            <div class="property-section">
                <h4>${icon} ${this.escapeHtml(title)}</h4>
                <div class="property-grid">
                    ${rows}
                </div>
            </div>
        `;
    }

    private generateAssemblyDetailsHTML(assembly: PluginAssembly): string {
        return this.generateAllPropertiesHTML(assembly as unknown as Record<string, unknown>, 'Assembly Information', '📦');
    }

    private generatePluginTypeDetailsHTML(pluginType: PluginType): string {
        return this.generateAllPropertiesHTML(pluginType as unknown as Record<string, unknown>, 'Plugin Type Information', '🔌');
    }

    private generateStepDetailsHTML(step: PluginStep): string {
        return this.generateAllPropertiesHTML(step as unknown as Record<string, unknown>, 'SDK Message Processing Step', '⚡');
    }

    private generateImageDetailsHTML(image: PluginImage): string {
        return this.generateAllPropertiesHTML(image as unknown as Record<string, unknown>, 'Entity Image', '🖼️');
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        this.componentLogger.info('Handling message', { command: message.command });

        switch (message.command) {
            // 'environment-changed' is handled by BasePanel.handleCommonMessages()

            case 'node-selected':
                this.componentLogger.info('node-selected message data:', message.data);
                if (message.data?.node) {
                    this.handleNodeSelected(message.data.node as TreeNode);
                } else {
                    this.componentLogger.warn('node-selected received but no node data', message);
                }
                break;

            // node-expanded handler removed - complete tree built upfront, no lazy loading needed

            case 'close-details':
                this.closeDetailsPanel();
                break;

            // 'component-event' is now handled by BasePanel.handleCommonMessages()
        }
    }

    /**
     * Override BasePanel's handleComponentEvent to handle plugin registration-specific component events
     */
    protected async handleComponentEvent(message: WebviewMessage): Promise<void> {
        const { componentId, eventType } = message.data || {};

        // Let BasePanel handle actionClicked events (calls handleStandardActions + handlePanelAction)
        if (eventType === 'actionClicked') {
            await super.handleComponentEvent(message);
            return;
        }

        // Handle SplitPanel events
        if (componentId === 'pluginRegistration-splitPanel') {
            if (eventType === 'rightPanelClosed') {
                this.selectedNode = undefined;
            }
            return;
        }

        // Other component events
        this.componentLogger.trace('Component event not handled', { componentId, eventType });
    }

    /**
     * Override BasePanel's handlePanelAction - no custom actions for plugin registration
     */
    protected async handlePanelAction(_componentId: string, actionId: string): Promise<void> {
        // No panel-specific actions in plugin registration
        this.componentLogger.warn('Unknown action ID', { actionId });
    }

    /**
     * Load all plugin data using bulk queries and in-memory joining
     * Much faster than individual queries per assembly/type/step
     */
    private async loadAssemblies(): Promise<void> {
        if (!this.currentEnvironmentId) {
            return;
        }

        try {
            this.componentLogger.info('Loading plugin data with bulk queries');

            // Load all data in parallel (4 queries total)
            this.treeViewComponent!.setLoading(true, 'Loading plugin data...');
            const [assemblies, allTypes, allSteps, allImages] = await Promise.all([
                this.pluginService.getAssemblies(this.currentEnvironmentId),
                this.pluginService.getAllPluginTypes(this.currentEnvironmentId),
                this.pluginService.getAllSteps(this.currentEnvironmentId),
                this.pluginService.getAllImages(this.currentEnvironmentId)
            ]);

            this.assemblies = assemblies;
            this.componentLogger.info('Plugin data loaded successfully', {
                assemblies: assemblies.length,
                types: allTypes.length,
                steps: allSteps.length,
                images: allImages.length
            });

            if (assemblies.length === 0) {
                this.treeViewComponent!.setLoading(false);
                this.treeViewComponent!.setNodes([]);
                return;
            }

            // Build lookup maps for fast in-memory joining (optimized)
            this.treeViewComponent!.setLoading(true, 'Building lookup maps...');
            const startMapBuild = Date.now();

            // Group types by assembly (optimized - single lookup per item)
            this.typesByAssembly.clear();
            for (const type of allTypes) {
                let assemblyTypes = this.typesByAssembly.get(type.pluginassemblyid);
                if (!assemblyTypes) {
                    assemblyTypes = [];
                    this.typesByAssembly.set(type.pluginassemblyid, assemblyTypes);
                }
                assemblyTypes.push(type);
            }

            // Group steps by type (optimized - single lookup per item)
            this.stepsByType.clear();
            for (const step of allSteps) {
                let typeSteps = this.stepsByType.get(step.plugintypeid);
                if (!typeSteps) {
                    typeSteps = [];
                    this.stepsByType.set(step.plugintypeid, typeSteps);
                }
                typeSteps.push(step);
            }

            // Group images by step (optimized - single lookup per item)
            this.imagesByStep.clear();
            for (const image of allImages) {
                let stepImages = this.imagesByStep.get(image.sdkmessageprocessingstepid);
                if (!stepImages) {
                    stepImages = [];
                    this.imagesByStep.set(image.sdkmessageprocessingstepid, stepImages);
                }
                stepImages.push(image);
            }

            this.componentLogger.info('Lookup maps built', { durationMs: Date.now() - startMapBuild });

            // Build complete tree structure (all levels) for comprehensive search
            this.treeViewComponent!.setLoading(true, 'Building tree structure...');
            const startTreeBuild = Date.now();
            const treeNodes = this.buildCompleteTree(
                assemblies,
                this.typesByAssembly,
                this.stepsByType,
                this.imagesByStep
            );
            this.componentLogger.info('Complete tree built', { durationMs: Date.now() - startTreeBuild, nodeCount: treeNodes.length });

            // Update tree view
            this.treeViewComponent!.setLoading(false);
            this.treeViewComponent!.setNodes(treeNodes);

        } catch (error) {
            this.componentLogger.error('Failed to load plugin data', error instanceof Error ? error : new Error(String(error)));
            this.treeViewComponent!.setLoading(false);
            vscode.window.showErrorMessage(`Failed to load plugin data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Build only root nodes (assemblies) - children loaded on expand
     * DEPRECATED: Now using buildCompleteTree() for comprehensive search support
     */
    private buildRootNodes(assemblies: PluginAssembly[]): TreeNode[] {
        return assemblies.map(assembly => {
            const types = this.typesByAssembly.get(assembly.pluginassemblyid) || [];

            return {
                id: `assembly-${assembly.pluginassemblyid}`,
                label: `${assembly.name} v${assembly.version}`,
                icon: '📦',
                type: 'assembly',
                expanded: false,
                selectable: true,
                hasChildren: types.length > 0,
                data: assembly
                // No children - loaded on expand
            };
        });
    }

    /**
     * Handle node expansion - load children dynamically from in-memory data
     * DEPRECATED: No longer needed - complete tree built upfront by buildCompleteTree()
     */
    private async handleNodeExpanded(node: TreeNode): Promise<void> {
        // Check if children already loaded
        if (node.children && node.children.length > 0) {
            return; // Already loaded
        }

        let children: TreeNode[] = [];

        switch (node.type) {
            case 'assembly': {
                // Load plugin types for this assembly
                const assembly = node.data as PluginAssembly;
                const types = this.typesByAssembly.get(assembly.pluginassemblyid) || [];
                children = types.map(type => {
                    const steps = this.stepsByType.get(type.plugintypeid) || [];

                    // Determine label: name > typename > friendlyname > plugintypeid as fallback
                    // Matches XRM Toolbox behavior: uses 'name' field first
                    const label = type.name || type.typename || type.friendlyname || type.plugintypeid;

                    return {
                        id: `plugintype-${type.plugintypeid}`,
                        label,
                        icon: '🔌',
                        type: 'plugintype',
                        expanded: false,
                        selectable: true,
                        hasChildren: steps.length > 0,
                        data: type
                        // No children - loaded on expand
                    };
                })
                // Sort by display label (case-insensitive)
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
                break;
            }

            case 'plugintype': {
                // Load steps for this plugin type
                const type = node.data as PluginType;
                const steps = this.stepsByType.get(type.plugintypeid) || [];
                children = steps.map(step => {
                    const images = this.imagesByStep.get(step.sdkmessageprocessingstepid) || [];
                    return {
                        id: `step-${step.sdkmessageprocessingstepid}`,
                        label: step.name,
                        icon: step.statecode === 0 ? '⚡' : '⚫',
                        type: 'step',
                        expanded: false,
                        selectable: true,
                        hasChildren: images.length > 0,
                        data: step
                        // No children - loaded on expand
                    };
                })
                // Sort by step name (case-insensitive)
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
                break;
            }

            case 'step': {
                // Load images for this step
                const step = node.data as PluginStep;
                const images = this.imagesByStep.get(step.sdkmessageprocessingstepid) || [];
                children = this.transformImagesToTreeNodes(images);
                break;
            }
        }

        // Update the node with children
        if (children.length > 0) {
            this.treeViewComponent?.updateNodeChildren(node.id, children);
        }
    }

    /**
     * Build complete tree structure from in-memory lookup maps
     * Builds ALL levels upfront for comprehensive search support
     */
    private buildCompleteTree(
        assemblies: PluginAssembly[],
        typesByAssembly: Map<string, PluginType[]>,
        stepsByType: Map<string, PluginStep[]>,
        imagesByStep: Map<string, PluginImage[]>
    ): TreeNode[] {
        // Build tree from bottom up, including all children recursively
        return assemblies.map(assembly => {
            const types = typesByAssembly.get(assembly.pluginassemblyid) || [];

            const typeNodes: TreeNode[] = types.map(type => {
                const steps = stepsByType.get(type.plugintypeid) || [];

                const stepNodes: TreeNode[] = steps.map(step => {
                    const images = imagesByStep.get(step.sdkmessageprocessingstepid) || [];
                    const imageNodes = this.transformImagesToTreeNodes(images);

                    // Include filtering attributes and entity name in searchText for comprehensive search
                    const searchParts: string[] = [];
                    if (step.filteringattributes) {
                        searchParts.push(step.filteringattributes);
                    }
                    if (step.entityLogicalName) {
                        searchParts.push(step.entityLogicalName);
                    }
                    const searchText = searchParts.length > 0 ? searchParts.join(' ') : undefined;

                    return {
                        id: `step-${step.sdkmessageprocessingstepid}`,
                        label: step.name,
                        icon: step.statecode === 0 ? '⚡' : '⚫',
                        type: 'step',
                        expanded: false,
                        selectable: true,
                        hasChildren: imageNodes.length > 0,
                        searchText: searchText,
                        data: step,
                        children: imageNodes
                    };
                })
                // Sort steps by name (case-insensitive)
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

                // Determine label: name > typename > friendlyname > plugintypeid as fallback
                // Matches XRM Toolbox behavior: uses 'name' field first
                const label = type.name || type.typename || type.friendlyname || type.plugintypeid;

                return {
                    id: `plugintype-${type.plugintypeid}`,
                    label,
                    icon: '🔌',
                    type: 'plugintype',
                    expanded: false,
                    selectable: true,
                    hasChildren: stepNodes.length > 0,
                    data: type,
                    children: stepNodes
                };
            })
            // Sort plugin types by display label (case-insensitive)
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

            return {
                id: `assembly-${assembly.pluginassemblyid}`,
                label: `${assembly.name} v${assembly.version}`,
                icon: '📦',
                type: 'assembly',
                expanded: false,
                selectable: true,
                hasChildren: typeNodes.length > 0,
                data: assembly,
                children: typeNodes
            };
        });
    }

    private transformImagesToTreeNodes(images: PluginImage[]): TreeNode[] {
        return images.map(image => {
            // Format attributes list (truncate if too long for display)
            const attrs = image.attributes || '';
            const attrDisplay = attrs.length > 80 ? `${attrs.substring(0, 77)}...` : attrs;

            // Get image type context label
            const contextLabel = this.getImageContextLabel(image.imagetype);

            // Format: {name} ({attributes}) - {context}
            const label = `${image.name} (${attrDisplay}) - ${contextLabel}`;

            // Include FULL attributes in searchText (not truncated) for comprehensive search
            const searchText = attrs ? attrs : undefined;

            return {
                id: `image-${image.sdkmessageprocessingstepimageid}`,
                label,
                icon: '🖼️',
                type: 'image',
                expanded: false,
                selectable: true,
                hasChildren: false, // Images are leaf nodes
                searchText: searchText,
                data: image
            };
        })
        // Sort by image name (case-insensitive)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }

    private getImageContextLabel(imageType: number): string {
        switch (imageType) {
            case 0:
                return 'Pre Entity Image';
            case 1:
                return 'Post Entity Image';
            case 2:
                return 'Pre and Post Entity Image';
            default:
                return 'Unknown';
        }
    }

    private getImageTypeLabel(imageType: number): string {
        switch (imageType) {
            case 0:
                return 'PreImage';
            case 1:
                return 'PostImage';
            case 2:
                return 'Both';
            default:
                return 'Unknown';
        }
    }

    private handleNodeSelected(node: TreeNode): void {
        this.componentLogger.info('handleNodeSelected called', { nodeId: node.id, nodeType: node.type, hasData: !!node.data });

        // Update selected node state
        this.selectedNode = node;

        // Update JsonViewerComponent with raw data
        if (node.data && this.jsonViewerComponent) {
            this.jsonViewerComponent.setData(node.data);
        }

        // Generate details HTML
        const detailsHTML = this.generateDetailsHTML(node);
        this.componentLogger.info('Generated HTML', { htmlLength: detailsHTML.length });

        // Send data to webview - webview behavior handles BOTH content AND visibility
        this.postMessage({
            command: 'show-node-details',
            action: 'show-node-details',
            data: {
                html: detailsHTML,
                nodeType: node.type,
                nodeId: node.id
                // rawData removed - JsonViewerComponent now handles this via event bridge
            }
        });
        this.componentLogger.info('Sent show-node-details message');
    }

    private closeDetailsPanel(): void {
        this.componentLogger.info('Closing details panel');
        this.selectedNode = undefined;
        // Extension Host just clears state - webview already closed panel
    }
}
