import { BaseComponentConfig } from '../../base/BaseComponent';

/**
 * TreeNode - Represents a node in the tree hierarchy
 */
export interface TreeNode {
    id: string;
    label: string;
    icon: string;
    type: string;
    children?: TreeNode[];
    expanded: boolean;
    selectable: boolean;
    hasChildren?: boolean; // For lazy loading - indicates node can have children even if not loaded yet
    searchText?: string; // Additional searchable text (not displayed, but included in search) - e.g., filtering attributes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any; // Original business object - can be any entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>; // Custom metadata - flexible key-value pairs
}

/**
 * Configuration for TreeViewComponent
 */
export interface TreeViewConfig extends BaseComponentConfig {
    id: string;
    className?: string;
    nodes: TreeNode[];
    searchEnabled?: boolean;
    multiSelect?: boolean;
    lazyLoad?: boolean; // Load children on expand
    onNodeSelect?: (node: TreeNode) => void;
    onNodeExpand?: (node: TreeNode) => void;
    onNodeCollapse?: (node: TreeNode) => void;
    onNodeContextMenu?: (node: TreeNode) => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_TREE_VIEW_CONFIG: Partial<TreeViewConfig> = {
    nodes: [],
    searchEnabled: true,
    multiSelect: false,
    lazyLoad: false
};
