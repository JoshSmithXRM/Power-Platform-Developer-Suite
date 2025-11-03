/**
 * ConnectionReference entity representing a Power Platform connection reference.
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
}
