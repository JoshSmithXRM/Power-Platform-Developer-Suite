/**
 * ViewModel representing an entity in the tree navigation.
 * Simple DTO for presentation layer (not a domain model).
 * Index signature required for compatibility with DataTableSection.
 */
export interface EntityTreeItemViewModel {
    readonly [key: string]: unknown;
    readonly logicalName: string;
    readonly displayName: string;
    readonly schemaName: string;
    readonly isCustomEntity: boolean;
    readonly attributeCount: number;
}
