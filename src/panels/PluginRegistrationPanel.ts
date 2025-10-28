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
        this.componentLogger.debug('Initializing components');

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
            lazyLoad: true,
            onNodeSelect: (node) => this.handleNodeSelected(node),
            onNodeExpand: (node) => this.handleNodeExpanded(node)
        });

        this.componentLogger.debug('Components initialized');
    }

    /**
     * Handles environment selection from BOTH:
     * - Initial auto-selection by BasePanel
     * - Manual user selection via dropdown
     */
    private handleEnvironmentSelection(environmentId: string): void {
        this.componentLogger.debug('Environment selected', { environmentId });

        if (!environmentId) {
            this._selectedEnvironmentId = undefined;
            this.treeViewComponent?.setNodes([]);
            return;
        }

        this._selectedEnvironmentId = environmentId;
        this.loadAssemblies();
    }

    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelectorComponent!,
            this.actionBarComponent!,
            this.treeViewComponent!
        ], this.getCommonWebviewResources());
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        this.componentLogger.debug('Handling message', { command: message.command });

        switch (message.command) {
            // environment-changed is now handled by onChange callback - no need to handle here

            case 'action-clicked':
                if (message.data?.buttonId === 'refresh') {
                    await this.handleRefresh();
                }
                break;

            case 'nodeSelected':
                // Handle node selection from webview
                break;

            case 'nodeExpanded':
                if (message.data?.nodeId) {
                    await this.loadNodeChildren(message.data.nodeId);
                }
                break;
        }
    }

    private async handleRefresh(): Promise<void> {
        this.componentLogger.debug('Refresh clicked');

        if (this._selectedEnvironmentId) {
            await this.loadAssemblies();
        }
    }

    private async loadAssemblies(): Promise<void> {
        if (!this._selectedEnvironmentId) {
            return;
        }

        try {
            this.componentLogger.debug('Loading assemblies');

            // Fetch assemblies
            this.assemblies = await this.pluginService.getAssemblies(this._selectedEnvironmentId);

            this.componentLogger.debug('Assemblies loaded', { count: this.assemblies.length });

            // Transform to tree nodes
            const treeNodes = this.transformAssembliesToTreeNodes(this.assemblies);

            // Update tree
            this.treeViewComponent!.setNodes(treeNodes);

        } catch (error) {
            this.componentLogger.error('Failed to load assemblies', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage(`Failed to load plugin assemblies: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private transformAssembliesToTreeNodes(assemblies: PluginAssembly[]): TreeNode[] {
        return assemblies.map(assembly => ({
            id: `assembly-${assembly.pluginassemblyid}`,
            label: `${assembly.name} v${assembly.version}`,
            icon: '📦',
            type: 'assembly',
            expanded: false,
            selectable: true,
            data: assembly,
            children: [] // Will be loaded lazily
        }));
    }

    private async loadNodeChildren(nodeId: string): Promise<void> {
        this.componentLogger.debug('Loading node children', { nodeId });

        if (!this._selectedEnvironmentId) {
            return;
        }

        try {
            const [nodeType, id] = nodeId.split('-', 2);

            if (nodeType === 'assembly') {
                // Load plugin types
                const pluginTypes = await this.pluginService.getPluginTypes(this._selectedEnvironmentId, id);
                const childNodes = this.transformPluginTypesToTreeNodes(pluginTypes);
                this.treeViewComponent!.addChildren(nodeId, childNodes);

            } else if (nodeType === 'plugintype') {
                // Load steps
                const steps = await this.pluginService.getSteps(this._selectedEnvironmentId, id);
                const childNodes = this.transformStepsToTreeNodes(steps);
                this.treeViewComponent!.addChildren(nodeId, childNodes);

            } else if (nodeType === 'step') {
                // Load images
                const images = await this.pluginService.getImages(this._selectedEnvironmentId, id);
                const childNodes = this.transformImagesToTreeNodes(images);
                this.treeViewComponent!.addChildren(nodeId, childNodes);
            }

        } catch (error) {
            this.componentLogger.error('Failed to load node children', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage(`Failed to load child items: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private transformPluginTypesToTreeNodes(pluginTypes: PluginType[]): TreeNode[] {
        return pluginTypes.map(pluginType => ({
            id: `plugintype-${pluginType.plugintypeid}`,
            label: pluginType.friendlyname || pluginType.typename,
            icon: '🔌',
            type: 'plugintype',
            expanded: false,
            selectable: true,
            data: pluginType,
            children: []
        }));
    }

    private transformStepsToTreeNodes(steps: PluginStep[]): TreeNode[] {
        return steps.map(step => ({
            id: `step-${step.sdkmessageprocessingstepid}`,
            label: step.name,
            icon: step.statecode === 0 ? '⚡' : '⚫',
            type: 'step',
            expanded: false,
            selectable: true,
            data: step,
            children: []
        }));
    }

    private transformImagesToTreeNodes(images: PluginImage[]): TreeNode[] {
        return images.map(image => ({
            id: `image-${image.sdkmessageprocessingstepimageid}`,
            label: `${image.name} (${this.getImageTypeLabel(image.imagetype)})`,
            icon: '🖼️',
            type: 'image',
            expanded: false,
            selectable: true,
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
        this.componentLogger.debug('Node selected', { nodeId: node.id, nodeType: node.type });
        // Future: Show node details in a split panel
    }

    private async handleNodeExpanded(node: TreeNode): Promise<void> {
        this.componentLogger.debug('Node expanded', { nodeId: node.id, nodeType: node.type });

        // Load children if not already loaded
        if (!node.children || node.children.length === 0) {
            await this.loadNodeChildren(node.id);
        }
    }
}
