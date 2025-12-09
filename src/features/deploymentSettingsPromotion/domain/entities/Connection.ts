/**
 * Connection entity representing a Power Platform connection instance.
 * Retrieved from Power Platform Admin API.
 *
 * Responsibilities:
 * - Determine if connection is active and usable
 * - Check connector membership for matching
 * - Provide connection metadata for display
 *
 * Business Rules:
 * - Connections with status 'Connected' are active and usable
 * - Each connection belongs to exactly one connector
 */
export class Connection {
	private constructor(
		public readonly id: string,
		public readonly displayName: string,
		public readonly connectorId: string,
		public readonly status: ConnectionStatus,
		public readonly createdBy: string
	) {}

	/**
	 * Factory method to create a Connection instance.
	 *
	 * @param id - Unique connection identifier (ConnectionId in deployment settings)
	 * @param displayName - Human-readable name for UI display
	 * @param connectorId - The connector this connection belongs to
	 * @param status - Current connection status
	 * @param createdBy - Display name of user who created the connection
	 */
	public static create(
		id: string,
		displayName: string,
		connectorId: string,
		status: ConnectionStatus,
		createdBy: string
	): Connection {
		return new Connection(id, displayName, connectorId, status, createdBy);
	}

	/**
	 * Determines if this connection is active and usable.
	 * Only connections with 'Connected' status can be used in deployment settings.
	 */
	public isActive(): boolean {
		return this.status === 'Connected';
	}

	/**
	 * Determines if this connection belongs to the specified connector.
	 * Used for grouping connections by connector during matching.
	 *
	 * @param connectorId - The connector ID to check against
	 */
	public belongsToConnector(connectorId: string): boolean {
		return this.connectorId === connectorId;
	}
}

/**
 * Valid connection statuses from Power Platform API.
 * - Connected: Active and usable
 * - Error: Connection has an error, needs attention
 * - Unknown: Status not recognized
 */
export type ConnectionStatus = 'Connected' | 'Error' | 'Unknown';
