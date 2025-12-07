/**
 * Value Object: FetchXML Element Suggestion
 *
 * Represents an XML element suggestion for FetchXML IntelliSense.
 * Immutable value object containing element metadata.
 *
 * Display formatting belongs in presentation layer mappers.
 */
export class FetchXmlElementSuggestion {
	private constructor(
		/** The element tag name (e.g., 'entity', 'attribute', 'filter') */
		public readonly name: string,
		/** Human-readable description of the element */
		public readonly description: string,
		/** Whether this element can contain child elements */
		public readonly hasChildren: boolean
	) {}

	/**
	 * Creates a FetchXmlElementSuggestion.
	 */
	public static create(
		name: string,
		description: string,
		hasChildren: boolean
	): FetchXmlElementSuggestion {
		return new FetchXmlElementSuggestion(name, description, hasChildren);
	}

	// =========================================================================
	// Factory Methods for Common Elements
	// =========================================================================

	/** Pre-defined element suggestions with descriptions */
	private static readonly ELEMENT_METADATA: Record<string, { description: string; hasChildren: boolean }> = {
		'fetch': {
			description: 'Root element for FetchXML query',
			hasChildren: true,
		},
		'entity': {
			description: 'Primary entity to query',
			hasChildren: true,
		},
		'attribute': {
			description: 'Column to retrieve from entity',
			hasChildren: false,
		},
		'all-attributes': {
			description: 'Retrieve all columns from entity',
			hasChildren: false,
		},
		'order': {
			description: 'Sort results by an attribute',
			hasChildren: false,
		},
		'filter': {
			description: 'Filter conditions (AND/OR group)',
			hasChildren: true,
		},
		'condition': {
			description: 'Single filter condition',
			hasChildren: false,
		},
		'link-entity': {
			description: 'Join to related entity',
			hasChildren: true,
		},
	};

	/**
	 * Creates element suggestions from element names.
	 * Uses pre-defined metadata for known elements.
	 */
	public static fromElementNames(elementNames: readonly string[]): FetchXmlElementSuggestion[] {
		return elementNames.map(name => {
			const metadata = FetchXmlElementSuggestion.ELEMENT_METADATA[name];
			if (metadata !== undefined) {
				return FetchXmlElementSuggestion.create(name, metadata.description, metadata.hasChildren);
			}
			// Unknown element - provide minimal suggestion
			return FetchXmlElementSuggestion.create(name, `FetchXML ${name} element`, false);
		});
	}
}
