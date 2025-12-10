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
 *
 * Note: ConnectorIds come in different formats from different APIs:
 * - Dataverse API: `/providers/Microsoft.PowerApps/apis/shared_dataverse`
 * - Power Apps Admin API: `/providers/Microsoft.PowerApps/scopes/admin/environments/{guid}/apis/shared_dataverse`
 * We normalize by extracting the connector name after `/apis/` for matching.
 */
export class ConnectorMappingService {
	/**
	 * Matches connectors from source deployment settings against target environment connections.
	 *
	 * Algorithm:
	 * 1. Normalize ConnectorIds to extract connector name (after /apis/)
	 * 2. Group target connections by normalized ConnectorId
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
		// Group target connections by normalized ConnectorId
		const targetByNormalizedId = this.groupByNormalizedConnectorId(targetConnections);

		// Find auto-matched and unmatched source
		const autoMatched = new Map<string, Connection[]>();
		const unmatchedSource = new Set<string>();

		for (const sourceConnectorId of sourceConnectorIds) {
			const normalizedSourceId = this.normalizeConnectorId(sourceConnectorId);
			const targetConns = targetByNormalizedId.get(normalizedSourceId);
			if (targetConns !== undefined) {
				// Store with original sourceConnectorId as key (for output)
				autoMatched.set(sourceConnectorId, targetConns);
			} else {
				unmatchedSource.add(sourceConnectorId);
			}
		}

		// Find unmatched target (candidates for manual mapping)
		// Build set of normalized source IDs for comparison
		const normalizedSourceIds = new Set<string>();
		for (const sourceId of sourceConnectorIds) {
			normalizedSourceIds.add(this.normalizeConnectorId(sourceId));
		}

		const unmatchedTarget = new Map<string, Connection[]>();
		for (const conn of targetConnections) {
			const normalizedTargetId = this.normalizeConnectorId(conn.connectorId);
			if (!normalizedSourceIds.has(normalizedTargetId)) {
				const existing = unmatchedTarget.get(conn.connectorId);
				if (existing !== undefined) {
					existing.push(conn);
				} else {
					unmatchedTarget.set(conn.connectorId, [conn]);
				}
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
	 * Normalizes a ConnectorId by extracting the connector name.
	 *
	 * Handles different API formats:
	 * - `/providers/Microsoft.PowerApps/apis/shared_dataverse` → `shared_dataverse`
	 * - `/providers/Microsoft.PowerApps/scopes/admin/environments/{guid}/apis/shared_dataverse` → `shared_dataverse`
	 *
	 * @param connectorId - Full ConnectorId path from API
	 * @returns Normalized connector name for comparison
	 */
	public normalizeConnectorId(connectorId: string): string {
		const apisMarker = '/apis/';
		const lastApisIndex = connectorId.lastIndexOf(apisMarker);
		if (lastApisIndex === -1) {
			// No /apis/ found, return as-is (might be a different format)
			return connectorId.toLowerCase();
		}
		// Extract everything after /apis/
		return connectorId.substring(lastApisIndex + apisMarker.length).toLowerCase();
	}

	/**
	 * Groups connections by their normalized ConnectorId.
	 * Used internally for efficient lookup during matching.
	 */
	private groupByNormalizedConnectorId(connections: readonly Connection[]): Map<string, Connection[]> {
		const grouped = new Map<string, Connection[]>();

		for (const conn of connections) {
			const normalizedId = this.normalizeConnectorId(conn.connectorId);
			const existing = grouped.get(normalizedId);
			if (existing !== undefined) {
				existing.push(conn);
			} else {
				grouped.set(normalizedId, [conn]);
			}
		}

		return grouped;
	}
}
