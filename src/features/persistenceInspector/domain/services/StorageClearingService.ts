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
 * Domain service coordinating storage clearing logic.
 *
 * Domain services are stateless and contain pure business logic with
 * ZERO infrastructure dependencies (uses interfaces, not concrete implementations).
 *
 * WHY Domain Service: Clearing logic requires validation (via StorageCollection),
 * business rules enforcement, and coordination with storage repositories.
 * This orchestration logic belongs in a domain service.
 *
 * Responsibilities:
 * - Validate clear operations before execution
 * - Enforce protection rules (prevent clearing protected keys)
 * - Clear individual entries or properties
 * - Clear all non-protected entries
 *
 * Business Rules Enforced:
 * - Protected keys cannot be cleared
 * - Secret entry properties cannot be individually cleared (all or nothing)
 * - Clear all operations skip protected entries
 * - Must validate before clearing
 *
 * Note: Uses repository interfaces (IStorageClearer, IProtectedKeyProvider)
 * defined in domain layer. Actual implementations are in infrastructure layer.
 */
export class StorageClearingService {
	public constructor(
		private readonly storageClearer: IStorageClearer,
		private readonly protectedKeyProvider: IProtectedKeyProvider
	) {}

	/**
	 * Clears a specific storage entry after validation.
	 *
	 * Business Rules:
	 * - Validates entry can be cleared (not protected)
	 * - Routes to correct storage type (global vs secret)
	 *
	 * Validation before clearing prevents accidental deletion of
	 * critical data. StorageCollection aggregates validation logic.
	 *
	 * @param {StorageEntry} entry - Entry to clear
	 * @param {StorageCollection} collection - Collection for validation
	 * @throws {ProtectedKeyError} If entry is protected
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
	 * Clears a specific property within a storage entry.
	 *
	 * Business Rules:
	 * - Entry must not be protected
	 * - Entry must not be a secret (secrets are all-or-nothing)
	 * - Property must exist at the specified path
	 *
	 * Allows fine-grained clearing of nested properties within complex
	 * storage values (e.g., removing one environment from the array without
	 * clearing all environments).
	 *
	 * @param {StorageEntry} entry - Entry containing the property
	 * @param {PropertyPath} path - Path to property to clear
	 * @param {StorageCollection} collection - Collection for validation
	 * @throws {ProtectedKeyError} If entry is protected
	 * @throws {InvalidOperationError} If entry is a secret
	 * @throws {PropertyNotFoundError} If property doesn't exist
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
	 * Clears all non-protected storage entries.
	 *
	 * Business Rules:
	 * - Protected entries are automatically skipped
	 * - Must have at least one clearable entry
	 * - Returns result with counts for confirmation
	 *
	 * Provides "nuclear option" for clearing extension storage
	 * while protecting critical data. Used for troubleshooting and
	 * testing scenarios.
	 *
	 * @param {StorageCollection} collection - Collection to validate
	 * @returns {Promise<ClearAllResult>} Result with cleared/skipped counts
	 * @throws {InvalidOperationError} If no clearable entries exist
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
