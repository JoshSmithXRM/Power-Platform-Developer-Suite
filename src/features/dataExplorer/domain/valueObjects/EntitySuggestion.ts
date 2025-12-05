/**
 * Value Object: Entity Suggestion
 *
 * Represents an entity suggestion for IntelliSense autocomplete.
 * Immutable value object containing metadata needed for SQL completion.
 *
 * Display formatting (e.g., completion labels) belongs in presentation layer.
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

	/**
	 * Returns the label for autocomplete display.
	 */
	public getDisplayLabel(): string {
		return this.logicalName;
	}

	/**
	 * Returns detail text (shown to the right in autocomplete).
	 */
	public getDetail(): string {
		return this.displayName;
	}

	/**
	 * Returns the text to insert on selection.
	 */
	public getInsertText(): string {
		return this.logicalName;
	}

	/**
	 * Returns documentation for the autocomplete item.
	 */
	public getDocumentation(): string {
		return this.isCustomEntity ? 'Custom Entity' : 'System Entity';
	}
}
