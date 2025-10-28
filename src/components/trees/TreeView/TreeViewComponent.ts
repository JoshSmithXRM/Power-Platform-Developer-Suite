import { BaseDataComponent } from '../../base/BaseDataComponent';

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

    constructor(config: TreeViewConfig) {
        const mergedConfig = { ...DEFAULT_TREE_VIEW_CONFIG, ...config };
        super(mergedConfig);
        this.config = mergedConfig as TreeViewConfig;
        this.nodes = this.config.nodes || [];
        this.expandedNodes = new Set();
        this.validateConfig();
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return TreeViewView.generateHTML(this.config, this.nodes, this.loading, this.loadingMessage);
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
            action: 'setNodes',
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
                action: 'expandNode',
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
                action: 'collapseNode',
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
            action: 'selectNode',
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
            action: 'clearSelection',
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
                action: 'addChildren',
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
            action: 'expandAll'
        });
    }

    /**
     * Collapse all nodes
     */
    public collapseAll(): void {
        this.expandedNodes.clear();

        this.notifyStateChange({
            action: 'collapseAll'
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
}
