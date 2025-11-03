import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * CloudFlow entity representing a Power Automate cloud flow.
 *
 * Parses clientdata JSON to extract connection reference names and provides flow metadata.
 */
export class CloudFlow {
	/**
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

	hasClientData(): this is CloudFlow & { clientData: string } {
		return this.clientData !== null && this.clientData.length > 0;
	}

	/**
	 * Extracts connection reference logical names from the flow's clientData.
	 *
	 * Parses the connectionReferences section of clientData JSON to identify which
	 * connection references this flow depends on.
	 *
	 * @returns Array of connection reference logical names, or empty array if no data
	 */
	extractConnectionReferenceNames(): string[] {
		if (!this.hasClientData()) {
			return [];
		}

		try {
			const data: unknown = JSON.parse(this.clientData);

			if (!this.isValidClientData(data)) {
				return [];
			}

			const connectionRefs = data.properties?.connectionReferences;

			if (!connectionRefs || typeof connectionRefs !== 'object' || connectionRefs === null) {
				return [];
			}

			const names: string[] = [];
			Object.values(connectionRefs).forEach((connRef) => {
				if (connRef && typeof connRef === 'object' && 'connection' in connRef) {
					const connection = connRef.connection;
					if (connection && typeof connection === 'object' && 'connectionReferenceLogicalName' in connection) {
						const logicalName = connection.connectionReferenceLogicalName;
						if (typeof logicalName === 'string') {
							names.push(logicalName);
						}
					}
				}
			});

			return names;
		} catch (_error) {
			return [];
		}
	}

	private isValidClientData(data: unknown): data is { properties?: { connectionReferences?: Record<string, unknown> } } {
		return (
			typeof data === 'object' &&
			data !== null &&
			'properties' in data
		);
	}

	hasConnectionReferences(): boolean {
		return this.extractConnectionReferenceNames().length > 0;
	}
}
