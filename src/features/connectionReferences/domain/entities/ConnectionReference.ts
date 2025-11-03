/**
 * ConnectionReference entity representing a Power Platform connection reference.
 *
 * Responsibilities:
 * - Store connection reference metadata
 * - Provide connection reference identification
 */
export class ConnectionReference {
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
	 * Determines if this connection reference has an associated connection.
	 * Connection references without connections cannot be used by flows.
	 */
	hasConnection(): boolean {
		return this.connectionId !== null;
	}

	/**
	 * Checks if this connection reference exists in the specified solution.
	 * @param solutionComponentIds - Set of component IDs from solution
	 */
	isInSolution(solutionComponentIds: Set<string>): boolean {
		return solutionComponentIds.has(this.id);
	}

	/**
	 * Converts to deployment settings entry format.
	 * Empty strings for null values ensure valid JSON structure for deployment.
	 */
	toDeploymentSettingsEntry(): { LogicalName: string; ConnectionId: string; ConnectorId: string } {
		return {
			LogicalName: this.connectionReferenceLogicalName,
			ConnectionId: this.connectionId ?? '',
			ConnectorId: this.connectorId ?? ''
		};
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
