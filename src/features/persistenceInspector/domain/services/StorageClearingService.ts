import { IStorageClearer } from '../interfaces/IStorageClearer';
import { IProtectedKeyProvider } from '../interfaces/IProtectedKeyProvider';
import { StorageEntry } from '../entities/StorageEntry';
import { StorageCollection } from '../entities/StorageCollection';
import { PropertyPath } from '../valueObjects/PropertyPath';
import { ClearAllResult } from '../results/ClearAllResult';
import { ProtectedKeyError } from '../errors/ProtectedKeyError';
import { PropertyNotFoundError } from '../errors/PropertyNotFoundError';
import { InvalidOperationError } from '../errors/InvalidOperationError';

/**
 * Domain service coordinating clearing logic
 */
export class StorageClearingService {
	public constructor(
		private readonly storageClearer: IStorageClearer,
		private readonly protectedKeyProvider: IProtectedKeyProvider
	) {}

	/**
	 * Clears a specific storage entry after validation
	 */
	public async clearEntry(
		entry: StorageEntry,
		collection: StorageCollection
	): Promise<void> {
		const validation = collection.validateClearOperation(entry.key);

		if (!validation.isAllowed) {
			throw new ProtectedKeyError(validation.reason);
		}

		if (entry.isSecret()) {
			await this.storageClearer.clearSecretKey(entry.key);
		} else {
			await this.storageClearer.clearGlobalStateKey(entry.key);
		}
	}

	/**
	 * Clears a specific property within an entry
	 */
	public async clearProperty(
		entry: StorageEntry,
		path: PropertyPath,
		collection: StorageCollection
	): Promise<void> {
		const validation = collection.validateClearOperation(entry.key);

		if (!validation.isAllowed) {
			throw new ProtectedKeyError(validation.reason);
		}

		if (entry.isSecret()) {
			throw new InvalidOperationError('Cannot clear properties of secret entries');
		}

		if (!entry.hasProperty(Array.from(path.segments))) {
			throw new PropertyNotFoundError(`Property ${path.toString()} not found`);
		}

		await this.storageClearer.clearGlobalStateProperty(entry.key, path);
	}

	/**
	 * Clears all non-protected entries
	 */
	public async clearAll(
		collection: StorageCollection
	): Promise<ClearAllResult> {
		const validation = collection.validateClearAllOperation();

		if (!validation.hasClearableEntries()) {
			throw new InvalidOperationError('No clearable entries found');
		}

		const protectedPatterns = this.protectedKeyProvider.getProtectedKeyPatterns();

		return await this.storageClearer.clearAllNonProtected(protectedPatterns);
	}
}
