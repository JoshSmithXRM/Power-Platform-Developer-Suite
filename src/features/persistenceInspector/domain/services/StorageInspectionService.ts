import { IStorageReader } from '../interfaces/IStorageReader';
import { IProtectedKeyProvider } from '../interfaces/IProtectedKeyProvider';
import { StorageCollection } from '../entities/StorageCollection';
import { StorageEntry } from '../entities/StorageEntry';

/**
 * Domain service coordinating storage inspection logic
 */
export class StorageInspectionService {
	public constructor(
		private readonly storageReader: IStorageReader,
		private readonly protectedKeyProvider: IProtectedKeyProvider
	) {}

	/**
	 * Inspects all storage and returns a collection
	 */
	public async inspectStorage(): Promise<StorageCollection> {
		const globalState = await this.storageReader.readAllGlobalState();
		const secretKeys = await this.storageReader.readAllSecretKeys();

		const entries: StorageEntry[] = [];

		// Add global state entries
		for (const [key, value] of globalState) {
			entries.push(StorageEntry.create(key, value, 'global'));
		}

		// Add secret entries (values hidden)
		for (const key of secretKeys) {
			entries.push(StorageEntry.create(key, '***', 'secret'));
		}

		const protectedPatterns = this.protectedKeyProvider.getProtectedKeyPatterns();

		return StorageCollection.create(entries, protectedPatterns);
	}

	/**
	 * Reveals a secret value for display
	 */
	public async revealSecret(key: string): Promise<string | undefined> {
		return await this.storageReader.revealSecret(key);
	}
}
