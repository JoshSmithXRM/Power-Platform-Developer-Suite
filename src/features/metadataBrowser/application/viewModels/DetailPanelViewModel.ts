/**
 * Metadata tab type for tab switching
 */
export type MetadataTab = 'attributes' | 'keys' | 'oneToMany' | 'manyToOne' | 'manyToMany' | 'privileges' | 'choiceValues';

/**
 * ViewModel for displaying item details in right panel.
 * Simple DTO for presentation layer.
 */
export interface DetailPanelViewModel {
    /** Item label (e.g., "Account Name") */
    readonly label: string;

    /** Raw metadata as JSON string (formatted for display) */
    readonly rawJson: string;

    /** Key-value pairs for property table */
    readonly properties: ReadonlyArray<{
        readonly key: string;
        readonly value: string;
    }>;
}
