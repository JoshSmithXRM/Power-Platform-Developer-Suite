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
		const existingMap = new Map(this.environmentVariables.map(ev => [ev.SchemaName, ev.Value]));

		let added = 0;
		let preserved = 0;

		const synced: EnvironmentVariableEntry[] = [];

		// Add or preserve existing entries
		for (const entry of newEntries) {
			if (existingMap.has(entry.SchemaName)) {
				// Preserve existing value (don't overwrite with environment value)
				const existingValue = existingMap.get(entry.SchemaName);
				if (existingValue !== undefined) {
					synced.push({
						SchemaName: entry.SchemaName,
						Value: existingValue
					});
					preserved++;
				}
			} else {
				// Add new entry with environment value
				synced.push(entry);
				added++;
			}
		}

		// Calculate removed count
		const removed = this.environmentVariables.length - preserved;

		// Sort alphabetically by SchemaName
		synced.sort((a, b) => a.SchemaName.localeCompare(b.SchemaName));

		return {
			settings: new DeploymentSettings(synced, this.connectionReferences),
			syncResult: { added, removed, preserved }
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
		const existingMap = new Map(
			this.connectionReferences.map(cr => [cr.LogicalName, { ConnectionId: cr.ConnectionId, ConnectorId: cr.ConnectorId }])
		);

		let added = 0;
		let preserved = 0;

		const synced: ConnectionReferenceEntry[] = [];

		// Add or preserve existing entries
		for (const entry of newEntries) {
			if (existingMap.has(entry.LogicalName)) {
				// Preserve existing values (don't overwrite with environment values)
				const existing = existingMap.get(entry.LogicalName);
				if (existing !== undefined) {
					synced.push({
						LogicalName: entry.LogicalName,
						ConnectionId: existing.ConnectionId,
						ConnectorId: existing.ConnectorId
					});
					preserved++;
				}
			} else {
				// Add new entry with environment values
				synced.push(entry);
				added++;
			}
		}

		// Calculate removed count
		const removed = this.connectionReferences.length - preserved;

		// Sort alphabetically by LogicalName
		synced.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));

		return {
			settings: new DeploymentSettings(this.environmentVariables, synced),
			syncResult: { added, removed, preserved }
		};
	}

	/**
	 * Creates an empty DeploymentSettings instance.
	 * @returns New DeploymentSettings with empty arrays
	 */
	static createEmpty(): DeploymentSettings {
		return new DeploymentSettings([], []);
	}
}
