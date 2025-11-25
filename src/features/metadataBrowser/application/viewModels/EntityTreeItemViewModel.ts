/**
 * ViewModel for displaying entity in tree.
 * Simple DTO for presentation layer.
 */
export interface EntityTreeItemViewModel {
    /** Unique identifier for tree node (same as logicalName) */
    readonly id: string;

    /** Display name shown in tree (bold) */
    readonly displayName: string;

    /** Logical name shown in tree (gray, parentheses) */
    readonly logicalName: string;

    /** Whether this is a custom entity */
    readonly isCustom: boolean;

    /** Icon emoji for tree node */
    readonly icon: string;
}
