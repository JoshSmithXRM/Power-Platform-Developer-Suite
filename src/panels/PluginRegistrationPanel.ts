import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { TreeViewComponent } from '../components/trees/TreeView/TreeViewComponent';
import { TreeNode } from '../components/trees/TreeView/TreeViewConfig';
import { PluginRegistrationService, PluginAssembly, PluginType, PluginStep, PluginImage } from '../services/PluginRegistrationService';

import { BasePanel } from './base/BasePanel';

export class PluginRegistrationPanel extends BasePanel {
    public static readonly viewType = 'pluginRegistration';
    private static currentPanel: PluginRegistrationPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private treeViewComponent?: TreeViewComponent;
    private componentFactory: ComponentFactory;

    // Services
    private pluginService: PluginRegistrationService;

    // State
    private assemblies: PluginAssembly[] = [];
    protected _selectedEnvironmentId?: string;
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
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
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
            this.treeViewComponent
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
            onChange: (environmentId: string) => {
                this.handleEnvironmentSelection(environmentId);
            }
        });

        // Action Bar
        this.actionBarComponent = this.componentFactory.createActionBar({
            id: 'pluginRegistration-actionBar',
            actions: [
                {
                    id: 'refresh',
                    label: 'Refresh',
                    icon: '🔄',
                    tooltip: 'Refresh plugin list',
                    variant: 'secondary'
                }
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

        // Note: SplitPanel is NOT created as a component - it's just HTML with SplitPanelBehavior
        // The behavior automatically picks up elements with data-component-type="SplitPanel"

        this.componentLogger.info('Components initialized');
    }

    /**
     * Handles environment selection from BOTH:
     * - Initial auto-selection by BasePanel
     * - Manual user selection via dropdown
     */
    private handleEnvironmentSelection(environmentId: string): void {
        this.componentLogger.info('Environment selected', { environmentId });

        if (!environmentId) {
            this._selectedEnvironmentId = undefined;
            this.treeViewComponent?.setNodes([]);
            return;
        }

        this._selectedEnvironmentId = environmentId;
        this.loadAssemblies();
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
            [this.environmentSelectorComponent!, this.actionBarComponent!, this.treeViewComponent!],
            ['css/panels/plugin-registration.css', 'css/components/split-panel.css'],
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

    private generateAssemblyDetailsHTML(assembly: PluginAssembly): string {
        const isolationMode = assembly.isolationmode === 1 ? 'None' : assembly.isolationmode === 2 ? 'Sandbox' : 'Unknown';
        const sourceType = ['Database', 'Disk', 'GAC', 'NuGet'][assembly.sourcetype] || 'Unknown';

        return `
            <div class="property-section">
                <h4>📦 Assembly Information</h4>
                <div class="property-grid">
                    <div class="property-row">
                        <span class="property-label">Name:</span>
                        <span class="property-value">${this.escapeHtml(assembly.name)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Version:</span>
                        <span class="property-value">${this.escapeHtml(assembly.version)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Culture:</span>
                        <span class="property-value">${this.escapeHtml(assembly.culture)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Public Key Token:</span>
                        <span class="property-value">${this.escapeHtml(assembly.publickeytoken)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Isolation Mode:</span>
                        <span class="property-value">${isolationMode}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Source Type:</span>
                        <span class="property-value">${sourceType}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Managed:</span>
                        <span class="property-value">${assembly.ismanaged ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Assembly ID:</span>
                        <span class="property-value property-id">${assembly.pluginassemblyid}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private generatePluginTypeDetailsHTML(pluginType: PluginType): string {
        return `
            <div class="property-section">
                <h4>🔌 Plugin Type Information</h4>
                <div class="property-grid">
                    <div class="property-row">
                        <span class="property-label">Type Name:</span>
                        <span class="property-value">${this.escapeHtml(pluginType.typename)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Friendly Name:</span>
                        <span class="property-value">${this.escapeHtml(pluginType.friendlyname || 'N/A')}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Name:</span>
                        <span class="property-value">${this.escapeHtml(pluginType.name)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Plugin Type ID:</span>
                        <span class="property-value property-id">${pluginType.plugintypeid}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Assembly ID:</span>
                        <span class="property-value property-id">${pluginType.pluginassemblyid}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private generateStepDetailsHTML(step: PluginStep): string {
        const stageLabel = step.stage === 10 ? 'PreValidation' : step.stage === 20 ? 'PreOperation' : step.stage === 40 ? 'PostOperation' : `Unknown (${step.stage})`;
        const modeLabel = step.mode === 0 ? 'Synchronous' : step.mode === 1 ? 'Asynchronous' : `Unknown (${step.mode})`;
        const stateLabel = step.statecode === 0 ? 'Enabled ⚡' : step.statecode === 1 ? 'Disabled ⚫' : `Unknown (${step.statecode})`;

        return `
            <div class="property-section">
                <h4>⚡ SDK Message Processing Step</h4>
                <div class="property-grid">
                    <div class="property-row">
                        <span class="property-label">Name:</span>
                        <span class="property-value">${this.escapeHtml(step.name)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Stage:</span>
                        <span class="property-value">${stageLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Execution Mode:</span>
                        <span class="property-value">${modeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">State:</span>
                        <span class="property-value">${stateLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Execution Order (Rank):</span>
                        <span class="property-value">${step.rank}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Filtering Attributes:</span>
                        <span class="property-value">${step.filteringattributes ? this.escapeHtml(step.filteringattributes) : 'All attributes'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Step ID:</span>
                        <span class="property-value property-id">${step.sdkmessageprocessingstepid}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Plugin Type ID:</span>
                        <span class="property-value property-id">${step.plugintypeid}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">SDK Message ID:</span>
                        <span class="property-value property-id">${step.sdkmessageid}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private generateImageDetailsHTML(image: PluginImage): string {
        const imageTypeLabel = this.getImageTypeLabel(image.imagetype);

        return `
            <div class="property-section">
                <h4>🖼️ Entity Image</h4>
                <div class="property-grid">
                    <div class="property-row">
                        <span class="property-label">Name:</span>
                        <span class="property-value">${this.escapeHtml(image.name)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Entity Alias:</span>
                        <span class="property-value">${this.escapeHtml(image.entityalias)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Image Type:</span>
                        <span class="property-value">${imageTypeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Attributes:</span>
                        <span class="property-value">${image.attributes ? this.escapeHtml(image.attributes) : 'All attributes'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Image ID:</span>
                        <span class="property-value property-id">${image.sdkmessageprocessingstepimageid}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Step ID:</span>
                        <span class="property-value property-id">${image.sdkmessageprocessingstepid}</span>
                    </div>
                </div>
            </div>
        `;
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
            // environment-changed is now handled by onChange callback - no need to handle here

            case 'action-clicked':
                if (message.data?.buttonId === 'refresh') {
                    await this.handleRefresh();
                }
                break;

            case 'node-selected':
                this.componentLogger.info('node-selected message data:', message.data);
                if (message.data?.node) {
                    this.handleNodeSelected(message.data.node as TreeNode);
                } else {
                    this.componentLogger.warn('node-selected received but no node data', message);
                }
                break;

            case 'node-expanded':
                if (message.data?.node) {
                    await this.handleNodeExpanded(message.data.node);
                }
                break;

            case 'close-details':
                this.closeDetailsPanel();
                break;

            case 'component-event':
                // Handle SplitPanel events
                if (message.data?.componentId === 'pluginRegistration-splitPanel') {
                    const eventType = message.data.eventType;
                    if (eventType === 'rightPanelClosed') {
                        this.selectedNode = undefined;
                    }
                }
                break;
        }
    }

    private async handleRefresh(): Promise<void> {
        this.componentLogger.info('Refresh clicked');

        if (this._selectedEnvironmentId) {
            await this.loadAssemblies();
        }
    }

    /**
     * Load all plugin data using bulk queries and in-memory joining
     * Much faster than individual queries per assembly/type/step
     */
    private async loadAssemblies(): Promise<void> {
        if (!this._selectedEnvironmentId) {
            return;
        }

        try {
            this.componentLogger.info('Loading plugin data with bulk queries');

            // Load all data in parallel (4 queries total)
            this.treeViewComponent!.setLoading(true, 'Loading plugin data...');
            const [assemblies, allTypes, allSteps, allImages] = await Promise.all([
                this.pluginService.getAssemblies(this._selectedEnvironmentId),
                this.pluginService.getAllPluginTypes(this._selectedEnvironmentId),
                this.pluginService.getAllSteps(this._selectedEnvironmentId),
                this.pluginService.getAllImages(this._selectedEnvironmentId)
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

            // Build tree structure (root level only - lazy load children on expand)
            this.treeViewComponent!.setLoading(true, 'Building tree nodes...');
            const startTreeBuild = Date.now();
            const treeNodes = this.buildRootNodes(assemblies);
            this.componentLogger.info('Tree nodes built', { durationMs: Date.now() - startTreeBuild, nodeCount: treeNodes.length });

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
                    return {
                        id: `plugintype-${type.plugintypeid}`,
                        label: type.friendlyname || type.typename,
                        icon: '🔌',
                        type: 'plugintype',
                        expanded: false,
                        selectable: true,
                        hasChildren: steps.length > 0,
                        data: type
                        // No children - loaded on expand
                    };
                });
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
                });
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
     * Build tree structure from in-memory lookup maps (fast!)
     * DEPRECATED: Now using lazy rendering with buildRootNodes + handleNodeExpanded
     */
    private buildTreeFromMaps(
        assemblies: PluginAssembly[],
        typesByAssembly: Map<string, PluginType[]>,
        stepsByType: Map<string, PluginStep[]>,
        imagesByStep: Map<string, PluginImage[]>
    ): TreeNode[] {
        // Build tree from bottom up
        return assemblies.map(assembly => {
            const types = typesByAssembly.get(assembly.pluginassemblyid) || [];

            const typeNodes: TreeNode[] = types.map(type => {
                const steps = stepsByType.get(type.plugintypeid) || [];

                const stepNodes: TreeNode[] = steps.map(step => {
                    const images = imagesByStep.get(step.sdkmessageprocessingstepid) || [];
                    const imageNodes = this.transformImagesToTreeNodes(images);

                    return {
                        id: `step-${step.sdkmessageprocessingstepid}`,
                        label: step.name,
                        icon: step.statecode === 0 ? '⚡' : '⚫',
                        type: 'step',
                        expanded: false,
                        selectable: true,
                        hasChildren: imageNodes.length > 0,
                        data: step,
                        children: imageNodes
                    };
                });

                return {
                    id: `plugintype-${type.plugintypeid}`,
                    label: type.friendlyname || type.typename,
                    icon: '🔌',
                    type: 'plugintype',
                    expanded: false,
                    selectable: true,
                    hasChildren: stepNodes.length > 0,
                    data: type,
                    children: stepNodes
                };
            });

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
        return images.map(image => ({
            id: `image-${image.sdkmessageprocessingstepimageid}`,
            label: `${image.name} (${this.getImageTypeLabel(image.imagetype)})`,
            icon: '🖼️',
            type: 'image',
            expanded: false,
            selectable: true,
            hasChildren: false, // Images are leaf nodes
            data: image
        }));
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
