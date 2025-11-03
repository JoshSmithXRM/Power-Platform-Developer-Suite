/**
 * Deployment settings entry for environment variables.
 */
export interface EnvironmentVariableEntry {
	readonly SchemaName: string;
	readonly Value: string;
}

/**
 * Deployment settings entry for connection references.
 */
export interface ConnectionReferenceEntry {
	readonly LogicalName: string;
	readonly ConnectionId: string;
	readonly ConnectorId: string;
}

/**
 * Result of a deployment settings sync operation.
 */
export interface SyncResult {
	readonly added: number;
	readonly removed: number;
	readonly preserved: number;
}

/**
 * Map of entry keys to their preserved values.
 * Used during sync to preserve existing values when entries exist in both old and new data.
 */
type PreservedValueMap = Map<string, unknown>;

/**
 * Statistics tracking sync operation progress.
 */
interface SyncStatistics {
	added: number;
	preserved: number;
}

/**
 * DeploymentSettings entity representing a Power Platform deployment settings file.
 *
 * Responsibilities:
 * - Store environment variables and connection references for deployment
 * - Sync entries (add/remove/preserve values)
 * - Maintain alphabetical sorting for consistent source control diffs
 */
export class DeploymentSettings {
	/**
	 * Creates a new DeploymentSettings entity.
	 * @param environmentVariables - Array of environment variable entries
	 * @param connectionReferences - Array of connection reference entries
	 */
	constructor(
		public readonly environmentVariables: EnvironmentVariableEntry[],
		public readonly connectionReferences: ConnectionReferenceEntry[]
	) {}

	/**
	 * Syncs environment variables with new data.
	 * Business rules:
	 * - Add entries for variables not in file
	 * - Remove entries in file that aren't in new data
	 * - Preserve existing values for entries that remain (don't overwrite)
	 * - Sort alphabetically by SchemaName
	 *
	 * @param newEntries - New environment variable entries from environment
	 * @returns New DeploymentSettings with synced data and sync stats
	 */
	syncEnvironmentVariables(newEntries: EnvironmentVariableEntry[]): {
		settings: DeploymentSettings;
		syncResult: SyncResult;
	} {
		const { synced, syncResult } = this.syncEntries(
			this.environmentVariables,
			newEntries,
			(entry) => entry.SchemaName,
			(entry) => entry.Value,
			(entry, preservedValue) => ({
				SchemaName: entry.SchemaName,
				Value: preservedValue as string
			}),
			(a, b) => a.SchemaName.localeCompare(b.SchemaName)
		);

		return {
			settings: new DeploymentSettings(synced, this.connectionReferences),
			syncResult
		};
	}

	/**
	 * Syncs connection references with new data.
	 * Business rules:
	 * - Add entries for connection references not in file
	 * - Remove entries in file that aren't in new data
	 * - Preserve existing ConnectionId and ConnectorId for entries that remain
	 * - Sort alphabetically by LogicalName
	 *
	 * @param newEntries - New connection reference entries from environment
	 * @returns New DeploymentSettings with synced data and sync stats
	 */
	syncConnectionReferences(newEntries: ConnectionReferenceEntry[]): {
		settings: DeploymentSettings;
		syncResult: SyncResult;
	} {
		const { synced, syncResult } = this.syncEntries(
			this.connectionReferences,
			newEntries,
			(entry) => entry.LogicalName,
			(entry) => ({ ConnectionId: entry.ConnectionId, ConnectorId: entry.ConnectorId }),
			(entry, preservedValue) => {
				const existing = preservedValue as { ConnectionId: string; ConnectorId: string };
				return {
					LogicalName: entry.LogicalName,
					ConnectionId: existing.ConnectionId,
					ConnectorId: existing.ConnectorId
				};
			},
			(a, b) => a.LogicalName.localeCompare(b.LogicalName)
		);

		return {
			settings: new DeploymentSettings(this.environmentVariables, synced),
			syncResult
		};
	}

	/**
	 * Generic sync pattern for deployment settings entries.
	 * Business rules:
	 * - Add entries not in existing array
	 * - Remove entries in existing array that aren't in new data
	 * - Preserve existing values for entries that remain (via preserveValue callback)
	 * - Sort by provided comparator
	 *
	 * @param existing - Existing entries in deployment settings
	 * @param newEntries - New entries from environment
	 * @param keySelector - Extracts unique key from entry
	 * @param valueExtractor - Extracts value(s) to preserve from existing entry
	 * @param createPreservedEntry - Creates entry with preserved values
	 * @param comparator - Sort comparator for final array
	 * @returns Synced entries and sync statistics
	 */
	private syncEntries<T>(
		existing: T[],
		newEntries: T[],
		keySelector: (entry: T) => string,
		valueExtractor: (entry: T) => unknown,
		createPreservedEntry: (newEntry: T, preservedValue: unknown) => T,
		comparator: (a: T, b: T) => number
	): { synced: T[]; syncResult: SyncResult } {
		const existingMap: PreservedValueMap = new Map(
			existing.map(entry => [keySelector(entry), valueExtractor(entry)])
		);

		const stats: SyncStatistics = {
			added: 0,
			preserved: 0
		};

		const synced: T[] = [];

		// Add or preserve existing entries
		for (const entry of newEntries) {
			const key: string = keySelector(entry);
			if (existingMap.has(key)) {
				// Preserve existing value (don't overwrite with environment value)
				const existingValue: unknown = existingMap.get(key);
				if (existingValue !== undefined) {
					synced.push(createPreservedEntry(entry, existingValue));
					stats.preserved++;
				}
			} else {
				// Add new entry with environment value
				synced.push(entry);
				stats.added++;
			}
		}

		// Calculate removed count
		const removed: number = existing.length - stats.preserved;

		// Sort alphabetically
		synced.sort(comparator);

		return {
			synced,
			syncResult: { added: stats.added, removed, preserved: stats.preserved }
		};
	}
}
