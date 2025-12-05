import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import type { IntelliSenseMetadataCache } from '../services/IntelliSenseMetadataCache';

/**
 * Use Case: Get Entity Suggestions
 *
 * Retrieves entity suggestions for SQL autocomplete, filtered by prefix.
 * Uses cached metadata for performance during typing.
 */
export class GetEntitySuggestionsUseCase {
	constructor(
		private readonly metadataCache: IntelliSenseMetadataCache,
		private readonly logger: ILogger
	) {}

	/**
	 * Gets entity suggestions matching the given prefix.
	 *
	 * @param environmentId - The environment to get entities from
	 * @param prefix - The typed prefix to filter by (case-insensitive)
	 * @returns Filtered and sorted entity suggestions
	 */
	public async execute(
		environmentId: string,
		prefix: string
	): Promise<EntitySuggestion[]> {
		this.logger.debug('Getting entity suggestions', { environmentId, prefix });

		try {
			const allEntities = await this.metadataCache.getEntitySuggestions(environmentId);
			const lowerPrefix = prefix.toLowerCase();

			const filtered = allEntities.filter(
				entity =>
					entity.logicalName.toLowerCase().startsWith(lowerPrefix) ||
					entity.displayName.toLowerCase().startsWith(lowerPrefix)
			);

			// Sort: exact logical name matches first, then alphabetically
			const sorted = [...filtered].sort((a, b) => {
				const aExact = a.logicalName.toLowerCase() === lowerPrefix;
				const bExact = b.logicalName.toLowerCase() === lowerPrefix;

				if (aExact && !bExact) {
					return -1;
				}
				if (!aExact && bExact) {
					return 1;
				}

				const aStarts = a.logicalName.toLowerCase().startsWith(lowerPrefix);
				const bStarts = b.logicalName.toLowerCase().startsWith(lowerPrefix);

				if (aStarts && !bStarts) {
					return -1;
				}
				if (!aStarts && bStarts) {
					return 1;
				}

				return a.logicalName.localeCompare(b.logicalName);
			});

			this.logger.debug('Entity suggestions filtered', {
				total: allEntities.length,
				filtered: sorted.length,
			});

			return sorted;
		} catch (error) {
			this.logger.error('Failed to get entity suggestions', error);
			return [];
		}
	}
}
