import type { ConnectionReference } from '../entities/ConnectionReference';

/**
 * Domain service for managing collections of ConnectionReference entities.
 */
export class ConnectionReferenceCollectionService {
	/**
	 * Sorts connection references alphabetically by logical name (defensive copy).
	 */
	sort(refs: ConnectionReference[]): ConnectionReference[] {
		return [...refs].sort((a, b) =>
			a.connectionReferenceLogicalName.localeCompare(b.connectionReferenceLogicalName)
		);
	}
}
