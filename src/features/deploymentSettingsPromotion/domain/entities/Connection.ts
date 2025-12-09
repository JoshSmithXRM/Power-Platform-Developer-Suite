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
		private readonly _id: string,
		private readonly _displayName: string,
		private readonly _connectorId: string,
		private readonly _status: ConnectionStatus,
		private readonly _createdBy: string
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
		return this._status === 'Connected';
	}

	/**
	 * Determines if this connection belongs to the specified connector.
	 * Used for grouping connections by connector during matching.
	 *
	 * @param connectorId - The connector ID to check against
	 */
	public belongsToConnector(connectorId: string): boolean {
		return this._connectorId === connectorId;
	}

	public getId(): string {
		return this._id;
	}

	public getDisplayName(): string {
		return this._displayName;
	}

	public getConnectorId(): string {
		return this._connectorId;
	}

	public getStatus(): ConnectionStatus {
		return this._status;
	}

	public getCreatedBy(): string {
		return this._createdBy;
	}
}

/**
 * Valid connection statuses from Power Platform API.
 * - Connected: Active and usable
 * - Error: Connection has an error, needs attention
 * - Unknown: Status not recognized
 */
export type ConnectionStatus = 'Connected' | 'Error' | 'Unknown';
