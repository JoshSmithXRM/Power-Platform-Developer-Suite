/**
 * ConnectionReference entity representing a Power Platform connection reference.
 *
 * Responsibilities:
 * - Determine if connection is configured
 * - Check solution membership
 * - Provide connection reference metadata
 *
 * Business Rules:
 * - Connection references require an associated connection to be usable
 * - Can be filtered by solution for deployment scenarios
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
	 * Connection references without connections cannot be used by flows and must
	 * be configured before the flow can run.
	 *
	 * @returns True if connectionId is set, false otherwise
	 */
	hasConnection(): boolean {
		return this.connectionId !== null;
	}

	/**
	 * Checks if this connection reference exists in the specified solution.
	 * Used for solution-based filtering when exporting deployment settings.
	 *
	 * @param solutionComponentIds - Set of component IDs from solution
	 * @returns True if this connection reference's ID is in the solution
	 */
	isInSolution(solutionComponentIds: Set<string>): boolean {
		return solutionComponentIds.has(this.id);
	}
}
