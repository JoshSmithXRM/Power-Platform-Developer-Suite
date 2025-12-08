import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { ColumnOptionViewModel } from '../viewModels/ColumnOptionViewModel';

/**
 * Maps AttributeSuggestion domain objects to ColumnOptionViewModel DTOs.
 * Handles sorting and selection state.
 */
export class ColumnOptionViewModelMapper {
	/**
	 * Maps attribute suggestions to column option view models.
	 * Sorts alphabetically by logical name for consistency.
	 *
	 * @param attributes - Available attributes from metadata
	 * @param selectedColumnNames - Names of currently selected columns (empty for SELECT *)
	 * @returns Sorted column option view models with selection state
	 */
	public toViewModels(
		attributes: readonly AttributeSuggestion[],
		selectedColumnNames: readonly string[]
	): ColumnOptionViewModel[] {
		const selectedSet = new Set(selectedColumnNames);

		return [...attributes]
			.sort((a, b) => a.logicalName.localeCompare(b.logicalName))
			.map((attr) => ({
				logicalName: attr.logicalName,
				displayName: attr.displayName,
				attributeType: attr.attributeType,
				isSelected: selectedSet.has(attr.logicalName),
			}));
	}
}
