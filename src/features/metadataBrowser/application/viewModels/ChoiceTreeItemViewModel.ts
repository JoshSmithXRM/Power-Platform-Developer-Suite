/**
 * ViewModel for displaying global choice in tree.
 * Simple DTO for presentation layer.
 */
export interface ChoiceTreeItemViewModel {
    /** Unique identifier for tree node (same as name) */
    readonly id: string;

    /** Display name shown in tree (bold) */
    readonly displayName: string;

    /** Name shown in tree (gray, parentheses) */
    readonly name: string;

    /** Whether this is a custom choice */
    readonly isCustom: boolean;

    /** Icon emoji for tree node */
    readonly icon: string;
}
