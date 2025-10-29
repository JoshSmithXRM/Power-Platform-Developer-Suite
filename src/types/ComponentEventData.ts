/**
 * Common event data types for component events
 * Used across panels to ensure type safety and consistency
 */

/**
 * Solution selector selection changed event data
 */
export interface SolutionSelectorEventData {
    selectedSolutions?: Array<{
        id?: string;
        displayName?: string;
        uniqueName?: string;
    }>;
}

/**
 * Split panel events data
 */
export interface SplitPanelEventData {
    splitRatio?: number;
    rightPanelVisible?: boolean;
}

/**
 * Context menu item clicked event data
 */
export interface ContextMenuEventData {
    itemId?: string;
    rowData?: unknown;
    rowId?: string;
}

/**
 * Data table row selected event data
 */
export interface RowSelectionEventData {
    rowId?: string;
    rowData?: unknown;
}

/**
 * Search/filter event data
 */
export interface SearchEventData {
    query?: string;
}

/**
 * Tree node events data
 */
export interface TreeNodeEventData {
    node?: unknown;
    nodeId?: string;
}
