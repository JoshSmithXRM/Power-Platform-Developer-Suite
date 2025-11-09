/**
 * ViewModel representing an entity attribute in the attributes table.
 * Simple DTO for presentation layer (not a domain model).
 */
export interface EntityAttributeViewModel {
    readonly logicalName: string;
    readonly displayName: string;
    readonly schemaName: string;
    readonly attributeType: string;
    readonly attributeTypeDisplay: string;
    readonly isRequired: boolean;
    readonly requiredLevel: string;
    readonly requiredLevelDisplay: string;
    readonly isCustomAttribute: boolean;
    readonly isPrimaryId: boolean;
    readonly isPrimaryName: boolean;
    readonly maxLength: number | null;
    readonly targets: readonly string[] | null;
}
