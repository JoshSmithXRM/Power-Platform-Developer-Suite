/**
 * ViewModel for a selectable column in the Visual Query Builder.
 * Simple DTO mapped from AttributeSuggestion.
 */
export interface ColumnOptionViewModel {
	readonly logicalName: string;
	readonly displayName: string;
	readonly attributeType: string;
	readonly isSelected: boolean;
}
