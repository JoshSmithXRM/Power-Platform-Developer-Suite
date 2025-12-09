/**
 * User-provided mapping for a custom connector.
 * Immutable value object representing a source-to-target connector mapping.
 *
 * Used when a custom connector has different ConnectorIds per environment
 * and requires manual mapping by the user.
 */
export class ConnectorMapping {
	private constructor(
		private readonly _sourceConnectorId: string,
		private readonly _targetConnectorId: string,
		private readonly _targetConnectionId: string
	) {}

	/**
	 * Factory method to create a ConnectorMapping.
	 *
	 * @param sourceConnectorId - ConnectorId from source deployment settings
	 * @param targetConnectorId - ConnectorId in target environment
	 * @param targetConnectionId - ConnectionId to use in target environment
	 */
	public static create(
		sourceConnectorId: string,
		targetConnectorId: string,
		targetConnectionId: string
	): ConnectorMapping {
		return new ConnectorMapping(sourceConnectorId, targetConnectorId, targetConnectionId);
	}

	/**
	 * Get the source connector ID from deployment settings.
	 */
	public getSourceConnectorId(): string {
		return this._sourceConnectorId;
	}

	/**
	 * Get the target connector ID in the target environment.
	 */
	public getTargetConnectorId(): string {
		return this._targetConnectorId;
	}

	/**
	 * Get the target connection ID to use in promoted deployment settings.
	 */
	public getTargetConnectionId(): string {
		return this._targetConnectionId;
	}

	/**
	 * Check if this mapping maps from the specified source connector.
	 *
	 * @param sourceConnectorId - The source connector ID to check
	 */
	public mapsFromConnector(sourceConnectorId: string): boolean {
		return this._sourceConnectorId === sourceConnectorId;
	}
}
