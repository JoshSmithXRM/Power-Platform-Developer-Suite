import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * CloudFlow entity representing a Power Automate cloud flow.
 *
 * Responsibilities:
 * - Parse clientdata JSON to extract connection reference names
 * - Provide flow metadata (name, status, etc.)
 * - Validate clientdata format when present
 */
export class CloudFlow {
	/**
	 * Creates a new CloudFlow entity.
	 * @param id - Flow GUID (workflowid)
	 * @param name - Flow display name
	 * @param modifiedOn - Last modified date
	 * @param isManaged - Whether the flow is managed
	 * @param createdBy - User who created the flow
	 * @param clientData - JSON string containing flow definition (null if not loaded)
	 * @throws {ValidationError} When clientData is present but invalid JSON
	 */
	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly modifiedOn: Date,
		public readonly isManaged: boolean,
		public readonly createdBy: string,
		public readonly clientData: string | null
	) {
		// Validate clientData is valid JSON if present
		if (clientData !== null && clientData.length > 0) {
			try {
				JSON.parse(clientData);
			} catch (_error) {
				throw new ValidationError(
					'CloudFlow',
					'clientData',
					clientData.substring(0, 100),
					'Must be valid JSON or null'
				);
			}
		}
	}

	/**
	 * Determines if this flow has clientData loaded.
	 * @returns True if clientData is present and not empty, false otherwise
	 */
	hasClientData(): boolean {
		return this.clientData !== null && this.clientData.length > 0;
	}

	/**
	 * Extracts connection reference names from the flow's clientData.
	 * Business logic: Parses the connectionReferences section of clientData JSON
	 * and returns the keys (connection reference logical names).
	 *
	 * @returns Array of connection reference logical names, or empty array if no data
	 */
	extractConnectionReferenceNames(): string[] {
		if (!this.hasClientData()) {
			return [];
		}

		try {
			const data: unknown = JSON.parse(this.clientData!);

			// Type guard: check if data has the expected structure
			if (!this.isValidClientData(data)) {
				return [];
			}

			// Navigate to connectionReferences object
			const connectionRefs = data.properties?.connectionReferences;

			if (!connectionRefs || typeof connectionRefs !== 'object' || connectionRefs === null) {
				return [];
			}

			// Return the keys (connection reference logical names)
			return Object.keys(connectionRefs);
		} catch (_error) {
			// If JSON parsing fails or structure is unexpected, return empty array
			// Error was already validated in constructor, so this is defensive
			return [];
		}
	}

	/**
	 * Type guard to check if parsed JSON has the expected structure.
	 */
	private isValidClientData(data: unknown): data is { properties?: { connectionReferences?: Record<string, unknown> } } {
		return (
			typeof data === 'object' &&
			data !== null &&
			'properties' in data
		);
	}

	/**
	 * Determines if this flow uses any connection references.
	 * @returns True if flow has at least one connection reference, false otherwise
	 */
	hasConnectionReferences(): boolean {
		return this.extractConnectionReferenceNames().length > 0;
	}

	/**
	 * Sorts flows alphabetically by name.
	 * Creates a defensive copy to avoid mutating the original array.
	 * @param flows - Array of CloudFlow entities to sort
	 * @returns New sorted array
	 */
	static sort(flows: CloudFlow[]): CloudFlow[] {
		return [...flows].sort((a, b) => a.name.localeCompare(b.name));
	}
}
