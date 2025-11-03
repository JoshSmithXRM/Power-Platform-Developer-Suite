/**
 * ConnectionReference entity representing a Power Platform connection reference.
 *
 * Responsibilities:
 * - Store connection reference metadata
 * - Provide connection reference identification
 */
export class ConnectionReference {
	/**
	 * Creates a new ConnectionReference entity.
	 * @param id - Connection reference GUID
	 * @param connectionReferenceLogicalName - Logical name (unique identifier)
	 * @param displayName - Display name for UI
	 * @param connectorId - ID of the connector this references
	 * @param connectionId - ID of the actual connection (null if not set)
	 * @param isManaged - Whether the connection reference is managed
	 * @param modifiedOn - Last modified date
	 */
	constructor(
		public readonly id: string,
		public readonly connectionReferenceLogicalName: string,
		public readonly displayName: string,
		public readonly connectorId: string | null,
		public readonly connectionId: string | null,
		public readonly isManaged: boolean,
		public readonly modifiedOn: Date
	) {}

	/**
	 * Determines if this connection reference has a connection set.
	 * @returns True if connectionId is set, false otherwise
	 */
	hasConnection(): boolean {
		return this.connectionId !== null;
	}

	/**
	 * Sorts connection references alphabetically by logical name.
	 * Creates a defensive copy to avoid mutating the original array.
	 * @param refs - Array of ConnectionReference entities to sort
	 * @returns New sorted array
	 */
	static sort(refs: ConnectionReference[]): ConnectionReference[] {
		return [...refs].sort((a, b) =>
			a.connectionReferenceLogicalName.localeCompare(b.connectionReferenceLogicalName)
		);
	}
}
