import { Connection } from '../entities/Connection';

/**
 * Result of connector matching algorithm.
 * Immutable value object created by ConnectorMappingService.
 *
 * Represents the outcome of comparing source deployment settings
 * ConnectorIds against target environment connections:
 * - autoMatched: Standard connectors with identical IDs in both environments
 * - unmatchedSource: Custom connectors needing manual mapping
 * - unmatchedTarget: Available connectors for manual mapping candidates
 */
export class ConnectorMatchResult {
	private constructor(
		/** ConnectorIds that exist in both source and target */
		private readonly _autoMatched: ReadonlyMap<string, readonly Connection[]>,
		/** ConnectorIds in source that don't exist in target (need manual mapping) */
		private readonly _unmatchedSource: ReadonlySet<string>,
		/** ConnectorIds in target that don't exist in source (candidates for mapping) */
		private readonly _unmatchedTarget: ReadonlyMap<string, readonly Connection[]>
	) {}

	/**
	 * Factory method to create a ConnectorMatchResult.
	 * Makes defensive copies of input collections to ensure immutability.
	 *
	 * @param autoMatched - Map of ConnectorId to Connections for auto-matched connectors
	 * @param unmatchedSource - Set of source ConnectorIds needing manual mapping
	 * @param unmatchedTarget - Map of target ConnectorIds available for mapping
	 */
	public static create(
		autoMatched: Map<string, Connection[]>,
		unmatchedSource: Set<string>,
		unmatchedTarget: Map<string, Connection[]>
	): ConnectorMatchResult {
		// Make defensive copies to ensure immutability
		const autoMatchedCopy = new Map<string, readonly Connection[]>();
		for (const [key, value] of autoMatched) {
			autoMatchedCopy.set(key, [...value]);
		}

		const unmatchedSourceCopy = new Set(unmatchedSource);

		const unmatchedTargetCopy = new Map<string, readonly Connection[]>();
		for (const [key, value] of unmatchedTarget) {
			unmatchedTargetCopy.set(key, [...value]);
		}

		return new ConnectorMatchResult(autoMatchedCopy, unmatchedSourceCopy, unmatchedTargetCopy);
	}

	/**
	 * Check if a connector is auto-matched (exists in both source and target).
	 *
	 * @param connectorId - The connector ID to check
	 */
	public isAutoMatched(connectorId: string): boolean {
		return this._autoMatched.has(connectorId);
	}

	/**
	 * Get available connections for an auto-matched connector.
	 * Returns empty array if connector is not auto-matched.
	 *
	 * @param connectorId - The connector ID to get connections for
	 */
	public getConnectionsForConnector(connectorId: string): readonly Connection[] {
		return this._autoMatched.get(connectorId) ?? [];
	}

	/**
	 * Check if there are source connectors needing manual mapping.
	 * These are typically custom connectors with different IDs per environment.
	 */
	public hasUnmatchedConnectors(): boolean {
		return this._unmatchedSource.size > 0;
	}

	/**
	 * Get source connectors needing manual mapping.
	 * User must select which target connector to map each to.
	 */
	public getUnmatchedSourceConnectors(): ReadonlySet<string> {
		return this._unmatchedSource;
	}

	/**
	 * Get target connectors available for manual mapping.
	 * These are connectors in target that don't exist in source.
	 */
	public getUnmatchedTargetConnectors(): ReadonlyMap<string, readonly Connection[]> {
		return this._unmatchedTarget;
	}

	/**
	 * Get count of auto-matched connectors.
	 * Used for summary display in UI.
	 */
	public getAutoMatchedCount(): number {
		return this._autoMatched.size;
	}

	/**
	 * Get count of connectors needing manual mapping.
	 * Used for summary display in UI.
	 */
	public getUnmatchedCount(): number {
		return this._unmatchedSource.size;
	}

	/**
	 * Get all auto-matched connectors as a map.
	 * Used for applying mappings during promotion.
	 */
	public getAutoMatchedConnectors(): ReadonlyMap<string, readonly Connection[]> {
		return this._autoMatched;
	}
}
