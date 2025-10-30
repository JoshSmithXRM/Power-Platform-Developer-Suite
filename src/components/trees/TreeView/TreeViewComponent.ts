import { BaseDataComponent } from '../../base/BaseDataComponent';
import { IRenderable } from '../../base/BaseComponent';
import { SearchInputComponent } from '../../inputs/SearchInput/SearchInputComponent';

import { TreeViewConfig, TreeNode, DEFAULT_TREE_VIEW_CONFIG } from './TreeViewConfig';
import { TreeViewView } from './TreeViewView';

/**
 * Type-safe data structure returned by TreeViewComponent.getData()
 */
export interface TreeViewData {
    nodes: TreeNode[];
    selectedNodeId?: string;
    expandedNodes: string[];
    loading: boolean;
    loadingMessage: string;
}

/**
 * Persisted state structure for TreeViewComponent
 */
interface TreeViewState {
    id: string;
    expandedNodes: string[]; // IDs of expanded nodes
    selectedNodeId?: string;
}

/**
 * TreeViewComponent - Reusable hierarchical tree view
 * Provides expand/collapse, selection, and lazy loading
 * Generic component usable for plugins, solutions, or any hierarchical data
 *
 * Extends BaseDataComponent to inherit loading state management
 */
export class TreeViewComponent extends BaseDataComponent<TreeViewData> {
    protected config: TreeViewConfig;
    private nodes: TreeNode[];
    private expandedNodes: Set<string>; // Track expanded node IDs
    private selectedNodeId?: string;
    private searchInput?: SearchInputComponent;

    constructor(config: TreeViewConfig) {
        const mergedConfig = { ...DEFAULT_TREE_VIEW_CONFIG, ...config };
        super(mergedConfig);
        this.config = mergedConfig as TreeViewConfig;
        this.nodes = this.config.nodes || [];
        this.expandedNodes = new Set();

        // Create SearchInputComponent if search is enabled
        if (this.config.searchEnabled) {
            this.searchInput = new SearchInputComponent({
                id: `${this.config.id}-search`,
                placeholder: 'Search...',
                debounceMs: 300, // 300ms default (user requested for plugin registration)
                minChars: 3,     // TreeView requires min 3 chars
                iconPosition: 'left',
                ariaLabel: 'Search tree'
            });
        }

        this.validateConfig();
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return TreeViewView.generateHTML(
            this.config,
            this.nodes,
            this.loading,
            this.loadingMessage,
            this.searchInput
        );
    }

    /**
     * Get the SearchInputComponent instance (if search is enabled)
     */
    public getSearchInput(): SearchInputComponent | undefined {
        return this.searchInput;
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/tree-view.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/TreeViewBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'tree-view';
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'TreeView';
    }

    /**
     * Get component data for event bridge updates
     */
    public getData(): TreeViewData {
        const loadingState = this.getLoadingState();
        return {
            nodes: this.nodes,
            selectedNodeId: this.selectedNodeId,
            expandedNodes: Array.from(this.expandedNodes),
            loading: loadingState.loading,
            loadingMessage: loadingState.loadingMessage
        };
    }

    /**
     * Validate component configuration
     */
    protected validateConfig(): void {
        if (!this.config.id) {
            throw new Error('TreeView: id is required');
        }
    }

    /**
     * Set tree nodes (triggers update via event bridge)
     */
    public setNodes(nodes: TreeNode[]): void {
        this.nodes = nodes;

        this.notifyStateChange({
            action: 'set-nodes',
            nodes: this.nodes
        });
        // notifyUpdate() called automatically by notifyStateChange()
    }

    /**
     * Get current tree nodes
     */
    public getNodes(): TreeNode[] {
        return this.nodes;
    }

    /**
     * Expand a node by ID
     */
    public expandNode(nodeId: string): void {
        if (!this.expandedNodes.has(nodeId)) {
            this.expandedNodes.add(nodeId);

            // Find the node and trigger callback if configured
            const node = this.findNodeById(nodeId, this.nodes);
            if (node && this.config.onNodeExpand) {
                this.config.onNodeExpand(node);
            }

            this.notifyStateChange({
                action: 'expand-node',
                nodeId: nodeId
            });
        }
    }

    /**
     * Collapse a node by ID
     */
    public collapseNode(nodeId: string): void {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);

            // Find the node and trigger callback if configured
            const node = this.findNodeById(nodeId, this.nodes);
            if (node && this.config.onNodeCollapse) {
                this.config.onNodeCollapse(node);
            }

            this.notifyStateChange({
                action: 'collapse-node',
                nodeId: nodeId
            });
        }
    }

    /**
     * Toggle node expansion
     */
    public toggleNode(nodeId: string): void {
        if (this.expandedNodes.has(nodeId)) {
            this.collapseNode(nodeId);
        } else {
            this.expandNode(nodeId);
        }
    }

    /**
     * Update children for a specific node (for lazy loading)
     */
    public updateNodeChildren(nodeId: string, children: TreeNode[]): void {
        const node = this.findNodeById(nodeId, this.nodes);
        if (node) {
            node.children = children;
            node.hasChildren = children.length > 0;

            this.notifyStateChange({
                action: 'update-node-children',
                nodeId: nodeId,
                children: children
            });
        }
    }

    /**
     * Select a node by ID
     */
    public selectNode(nodeId: string): void {
        const oldSelectedId = this.selectedNodeId;
        this.selectedNodeId = nodeId;

        // Find the node and trigger callback if configured
        const node = this.findNodeById(nodeId, this.nodes);
        if (node && this.config.onNodeSelect) {
            this.config.onNodeSelect(node);
        }

        this.notifyStateChange({
            action: 'select-node',
            nodeId: nodeId,
            oldSelectedId: oldSelectedId
        });
    }

    /**
     * Get currently selected node ID
     */
    public getSelectedNodeId(): string | undefined {
        return this.selectedNodeId;
    }

    /**
     * Get currently selected node
     */
    public getSelectedNode(): TreeNode | undefined {
        if (!this.selectedNodeId) {
            return undefined;
        }
        return this.findNodeById(this.selectedNodeId, this.nodes);
    }

    /**
     * Clear selection
     */
    public clearSelection(): void {
        const oldSelectedId = this.selectedNodeId;
        this.selectedNodeId = undefined;

        this.notifyStateChange({
            action: 'clear-selection',
            oldSelectedId: oldSelectedId
        });
    }

    /**
     * Add children to a node (for lazy loading)
     */
    public addChildren(nodeId: string, children: TreeNode[]): void {
        const node = this.findNodeById(nodeId, this.nodes);
        if (node) {
            node.children = children;

            this.notifyStateChange({
                action: 'add-children',
                nodeId: nodeId,
                children: children
            });
            // notifyUpdate() called automatically by notifyStateChange()
        }
    }

    /**
     * Expand all nodes
     */
    public expandAll(): void {
        const allNodeIds = this.getAllNodeIds(this.nodes);
        allNodeIds.forEach(id => this.expandedNodes.add(id));

        this.notifyStateChange({
            action: 'expand-all'
        });
    }

    /**
     * Collapse all nodes
     */
    public collapseAll(): void {
        this.expandedNodes.clear();

        this.notifyStateChange({
            action: 'collapse-all'
        });
    }

    /**
     * Find a node by ID (recursive)
     */
    private findNodeById(nodeId: string, nodes: TreeNode[]): TreeNode | undefined {
        for (const node of nodes) {
            if (node.id === nodeId) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeById(nodeId, node.children);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Get all node IDs (recursive)
     */
    private getAllNodeIds(nodes: TreeNode[]): string[] {
        const ids: string[] = [];
        for (const node of nodes) {
            ids.push(node.id);
            if (node.children) {
                ids.push(...this.getAllNodeIds(node.children));
            }
        }
        return ids;
    }

    /**
     * Export component state (for persistence)
     */
    public exportState(): TreeViewState {
        return {
            id: this.config.id,
            expandedNodes: Array.from(this.expandedNodes),
            selectedNodeId: this.selectedNodeId
        };
    }

    /**
     * Import component state (from persistence)
     */
    public importState(state: unknown): void {
        if (!state || typeof state !== 'object') {
            return;
        }

        const typedState = state as Record<string, unknown>;

        if (Array.isArray(typedState.expandedNodes)) {
            this.expandedNodes = new Set(typedState.expandedNodes as string[]);
        }

        if (typeof typedState.selectedNodeId === 'string') {
            this.selectedNodeId = typedState.selectedNodeId;
        }
    }

    /**
     * Get child components for recursive resource collection
     * TreeView embeds SearchInputComponent when search is enabled
     */
    public getChildComponents(): IRenderable[] {
        return this.searchInput ? [this.searchInput] : [];
    }
}
