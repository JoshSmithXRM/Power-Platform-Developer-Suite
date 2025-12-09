import { Connection } from '../entities/Connection';
import { ConnectorMatchResult } from '../valueObjects/ConnectorMatchResult';

/**
 * Domain service for matching connectors between source and target environments.
 * Implements the "compare ConnectorId sets" algorithm.
 *
 * Business Rules:
 * - Standard connectors have identical ConnectorIds across environments → auto-match
 * - Custom connectors have different ConnectorIds per environment → flagged for manual mapping
 * - Unmatched target connectors become candidates for manual mapping
 */
export class ConnectorMappingService {
	/**
	 * Matches connectors from source deployment settings against target environment connections.
	 *
	 * Algorithm:
	 * 1. Extract unique ConnectorIds from source file
	 * 2. Extract unique ConnectorIds from target connections
	 * 3. Compare sets:
	 *    - MATCHED: ConnectorId in BOTH → Standard connector, auto-resolve
	 *    - UNMATCHED SOURCE: ConnectorId only in source → Needs manual mapping
	 *    - UNMATCHED TARGET: ConnectorId only in target → Candidates for mapping
	 *
	 * @param sourceConnectorIds - Set of ConnectorIds from source deployment settings
	 * @param targetConnections - Array of connections from target environment
	 */
	public matchConnectors(
		sourceConnectorIds: ReadonlySet<string>,
		targetConnections: readonly Connection[]
	): ConnectorMatchResult {
		// Group target connections by ConnectorId
		const targetByConnectorId = this.groupByConnectorId(targetConnections);
		const targetConnectorIds = new Set(targetByConnectorId.keys());

		// Find auto-matched and unmatched source
		const autoMatched = new Map<string, Connection[]>();
		const unmatchedSource = new Set<string>();

		for (const sourceConnectorId of sourceConnectorIds) {
			const targetConns = targetByConnectorId.get(sourceConnectorId);
			if (targetConns !== undefined) {
				autoMatched.set(sourceConnectorId, targetConns);
			} else {
				unmatchedSource.add(sourceConnectorId);
			}
		}

		// Find unmatched target (candidates for manual mapping)
		const unmatchedTarget = new Map<string, Connection[]>();
		for (const [connectorId, connections] of targetByConnectorId) {
			if (!sourceConnectorIds.has(connectorId)) {
				unmatchedTarget.set(connectorId, connections);
			}
		}

		return ConnectorMatchResult.create(autoMatched, unmatchedSource, unmatchedTarget);
	}

	/**
	 * Selects the default connection for a connector.
	 *
	 * Business Rule: Prefer first active (status = 'Connected') connection.
	 * Returns null if no active connections are available.
	 *
	 * @param connections - Array of connections for a connector
	 */
	public selectDefaultConnection(connections: readonly Connection[]): Connection | null {
		const activeConnections = connections.filter((c) => c.isActive());
		const firstActive = activeConnections[0];
		if (firstActive === undefined) {
			return null;
		}
		return firstActive;
	}

	/**
	 * Groups connections by their ConnectorId.
	 * Used internally for efficient lookup during matching.
	 */
	private groupByConnectorId(connections: readonly Connection[]): Map<string, Connection[]> {
		const grouped = new Map<string, Connection[]>();

		for (const conn of connections) {
			const connectorId = conn.getConnectorId();
			const existing = grouped.get(connectorId);
			if (existing !== undefined) {
				existing.push(conn);
			} else {
				grouped.set(connectorId, [conn]);
			}
		}

		return grouped;
	}
}
