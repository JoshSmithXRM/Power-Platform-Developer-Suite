import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { IntelliSenseMetadataCache } from '../services/IntelliSenseMetadataCache';

/**
 * Use Case: Get Attribute Suggestions
 *
 * Retrieves attribute suggestions for a specific entity, filtered by prefix.
 * Uses cached metadata for performance during typing.
 */
export class GetAttributeSuggestionsUseCase {
	constructor(
		private readonly metadataCache: IntelliSenseMetadataCache,
		private readonly logger: ILogger
	) {}

	/**
	 * Gets attribute suggestions for an entity, matching the given prefix.
	 *
	 * @param environmentId - The environment to get attributes from
	 * @param entityLogicalName - The entity to get attributes for
	 * @param prefix - The typed prefix to filter by (case-insensitive)
	 * @returns Filtered and sorted attribute suggestions
	 */
	public async execute(
		environmentId: string,
		entityLogicalName: string,
		prefix: string
	): Promise<AttributeSuggestion[]> {
		this.logger.debug('Getting attribute suggestions', { environmentId, entityLogicalName, prefix });

		try {
			const allAttributes = await this.metadataCache.getAttributeSuggestions(environmentId, entityLogicalName);
			const lowerPrefix = prefix.toLowerCase();

			const filtered = allAttributes.filter(
				attr =>
					attr.logicalName.toLowerCase().startsWith(lowerPrefix) ||
					attr.displayName.toLowerCase().startsWith(lowerPrefix)
			);

			const sorted = this.sortByRelevance(filtered, lowerPrefix);
			this.logger.debug('Attribute suggestions filtered', { entity: entityLogicalName, total: allAttributes.length, filtered: sorted.length });
			return sorted;
		} catch (error) {
			this.logger.error('Failed to get attribute suggestions', error);
			return [];
		}
	}

	private sortByRelevance(attributes: AttributeSuggestion[], lowerPrefix: string): AttributeSuggestion[] {
		return [...attributes].sort((a, b) => {
			const aExact = a.logicalName.toLowerCase() === lowerPrefix;
			const bExact = b.logicalName.toLowerCase() === lowerPrefix;
			if (aExact && !bExact) return -1;
			if (!aExact && bExact) return 1;

			const aStarts = a.logicalName.toLowerCase().startsWith(lowerPrefix);
			const bStarts = b.logicalName.toLowerCase().startsWith(lowerPrefix);
			if (aStarts && !bStarts) return -1;
			if (!aStarts && bStarts) return 1;

			return a.logicalName.localeCompare(b.logicalName);
		});
	}
}
