/**
 * Simple attribute info for picker display.
 * Minimal DTO - only what's needed for the checkbox list.
 */
export interface AttributePickerItem {
	readonly logicalName: string;
	readonly displayName: string;
	readonly attributeType: string;
}

/**
 * Repository interface for fetching attributes for the attribute picker.
 * Simpler than the full IEntityMetadataRepository - focused on picker use case.
 */
export interface IAttributePickerRepository {
	/**
	 * Fetches attributes for an entity that are valid for plugin filtering.
	 * Filters out virtual/computed fields that can't be used in plugin filtering.
	 *
	 * @param environmentId - Environment GUID
	 * @param entityLogicalName - Entity logical name (e.g., 'account', 'contact')
	 * @returns Array of attributes sorted by display name
	 */
	getAttributesForPicker(
		environmentId: string,
		entityLogicalName: string
	): Promise<readonly AttributePickerItem[]>;
}
