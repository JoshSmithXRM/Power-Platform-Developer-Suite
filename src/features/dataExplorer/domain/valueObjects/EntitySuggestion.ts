/**
 * Value Object: Entity Suggestion
 *
 * Represents an entity suggestion for IntelliSense autocomplete.
 * Immutable value object containing metadata needed for SQL completion.
 *
 * Display formatting belongs in presentation layer mappers.
 * @see EntitySuggestionCompletionMapper
 */
export class EntitySuggestion {
	private constructor(
		public readonly logicalName: string,
		public readonly displayName: string,
		public readonly isCustomEntity: boolean
	) {}

	/**
	 * Creates an EntitySuggestion from entity metadata.
	 * @param logicalName - The entity logical name (e.g., 'account')
	 * @param displayName - The entity display name (e.g., 'Account')
	 * @param isCustomEntity - True if this is a custom entity
	 */
	public static create(
		logicalName: string,
		displayName: string,
		isCustomEntity: boolean
	): EntitySuggestion {
		return new EntitySuggestion(logicalName, displayName, isCustomEntity);
	}
}
