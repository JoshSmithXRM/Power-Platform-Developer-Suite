/**
 * Dataverse attribute types relevant for IntelliSense display.
 * Maps Dataverse attribute types to simplified categories for UI.
 */
export type AttributeTypeHint =
	| 'String'
	| 'Integer'
	| 'Decimal'
	| 'Money'
	| 'DateTime'
	| 'Boolean'
	| 'Lookup'
	| 'Picklist'
	| 'UniqueIdentifier'
	| 'Memo'
	| 'Other';

/**
 * Value Object: Attribute Suggestion
 *
 * Represents an attribute suggestion for IntelliSense autocomplete.
 * Immutable value object containing metadata needed for SQL completion.
 *
 * Display formatting belongs in presentation layer mappers.
 * @see AttributeSuggestionCompletionMapper
 */
export class AttributeSuggestion {
	private constructor(
		public readonly logicalName: string,
		public readonly displayName: string,
		public readonly attributeType: AttributeTypeHint,
		public readonly isCustomAttribute: boolean,
		/** Parent attribute if this is a virtual field (e.g., createdbyname → createdby) */
		public readonly attributeOf: string | null
	) {}

	/**
	 * Creates an AttributeSuggestion from attribute metadata.
	 * @param logicalName - The attribute logical name (e.g., 'name')
	 * @param displayName - The attribute display name (e.g., 'Account Name')
	 * @param attributeType - The simplified type hint for display
	 * @param isCustomAttribute - True if this is a custom attribute
	 * @param attributeOf - Parent attribute if this is a virtual field
	 */
	public static create(
		logicalName: string,
		displayName: string,
		attributeType: AttributeTypeHint,
		isCustomAttribute: boolean,
		attributeOf: string | null = null
	): AttributeSuggestion {
		return new AttributeSuggestion(
			logicalName,
			displayName,
			attributeType,
			isCustomAttribute,
			attributeOf
		);
	}

	/**
	 * Returns true if this is a virtual field (has a parent attribute).
	 * Virtual fields like `createdbyname` derive their value from parent fields.
	 */
	public isVirtual(): boolean {
		return this.attributeOf !== null;
	}
}
