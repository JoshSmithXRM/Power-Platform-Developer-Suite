import { IStorageReader } from '../interfaces/IStorageReader';
import { IProtectedKeyProvider } from '../interfaces/IProtectedKeyProvider';
import { StorageCollection } from '../entities/StorageCollection';
import { StorageEntry } from '../entities/StorageEntry';

/**
 * Domain service coordinating storage inspection logic.
 *
 * Domain services are stateless and contain pure business logic with
 * ZERO infrastructure dependencies (uses interfaces, not concrete implementations).
 *
 * Domain Service Rationale: Inspection logic coordinates multiple repositories
 * (global state and secrets) to build the StorageCollection aggregate.
 * This coordination logic belongs in a domain service.
 *
 * Responsibilities:
 * - Read all storage entries (global and secret)
 * - Build StorageCollection aggregate with protection rules
 * - Reveal secret values when requested
 *
 * Note: Uses repository interfaces (IStorageReader, IProtectedKeyProvider)
 * defined in domain layer. Actual implementations are in infrastructure layer.
 */
export class StorageInspectionService {
	public constructor(
		private readonly storageReader: IStorageReader,
		private readonly protectedKeyProvider: IProtectedKeyProvider
	) {}

	/**
	 * Inspects all storage and builds a StorageCollection aggregate.
	 *
	 * Reads from both global state and secret storage, combining them into
	 * a single collection with protection rules applied.
	 *
	 * Provides unified view of all extension storage for debugging
	 * and troubleshooting. Secret values are hidden ('***') by default.
	 *
	 * @returns {Promise<StorageCollection>} Collection of all storage entries
	 */
	public async inspectStorage(): Promise<StorageCollection> {
		const globalState = await this.storageReader.readAllGlobalState();
		const secretKeys = await this.storageReader.readAllSecretKeys();

		const entries: StorageEntry[] = [];

		// Add global state entries
		for (const [key, value] of globalState) {
			entries.push(StorageEntry.create(key, value, 'global'));
		}

		// Add secret entries (values hidden) - only if they actually exist
		for (const key of secretKeys) {
			// Verify secret exists before adding to list
			// This filters out deleted secrets that may still be referenced in configs
			const secretValue = await this.storageReader.revealSecret(key);
			if (secretValue !== undefined) {
				entries.push(StorageEntry.create(key, '***', 'secret'));
			}
		}

		const protectedPatterns = this.protectedKeyProvider.getProtectedKeyPatterns();

		return StorageCollection.create(entries, protectedPatterns);
	}

	/**
	 * Reveals a secret value for display.
	 *
	 * Secrets are hidden by default ('***') for security.
	 * This method allows revealing the actual value when explicitly requested.
	 *
	 * @param {string} key - Secret storage key
	 * @returns {Promise<string | undefined>} Secret value or undefined if not found
	 */
	public async revealSecret(key: string): Promise<string | undefined> {
		return await this.storageReader.revealSecret(key);
	}
}
