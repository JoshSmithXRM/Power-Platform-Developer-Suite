import type { ConnectionReference } from '../../domain/entities/ConnectionReference';
import type { ConnectionReferenceEntry } from '../../../../shared/domain/entities/DeploymentSettings';

/**
 * Maps ConnectionReference domain entities to deployment settings entry format.
 *
 * Exists in the application layer because deployment settings format
 * is a presentation concern, not domain logic.
 */
export class ConnectionReferenceToDeploymentSettingsMapper {
	/**
	 * Maps a single connection reference to deployment settings entry format.
	 *
	 * @param connectionReference - Domain entity to map
	 * @returns Deployment settings entry with LogicalName, ConnectionId, and ConnectorId
	 */
	static toDeploymentSettingsEntry(connectionReference: ConnectionReference): ConnectionReferenceEntry {
		return {
			LogicalName: connectionReference.connectionReferenceLogicalName,
			ConnectionId: connectionReference.connectionId ?? '',
			ConnectorId: connectionReference.connectorId ?? ''
		};
	}

	/**
	 * Maps an array of connection references to deployment settings entries.
	 *
	 * @param connectionReferences - Array of domain entities to map
	 * @returns Array of deployment settings entries
	 */
	static toDeploymentSettingsEntries(connectionReferences: ConnectionReference[]): ConnectionReferenceEntry[] {
		return connectionReferences.map(cr => this.toDeploymentSettingsEntry(cr));
	}
}
