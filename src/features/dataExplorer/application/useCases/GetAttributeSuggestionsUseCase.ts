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

			// Use 'includes' instead of 'startsWith' for broader matching
			// This allows typing "name" to find "primarycontactidname"
			const filtered = allAttributes.filter(
				attr =>
					attr.logicalName.toLowerCase().includes(lowerPrefix) ||
					attr.displayName.toLowerCase().includes(lowerPrefix)
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
			const aLower = a.logicalName.toLowerCase();
			const bLower = b.logicalName.toLowerCase();

			// 1. Exact match first
			const aExact = aLower === lowerPrefix;
			const bExact = bLower === lowerPrefix;
			if (aExact && !bExact) return -1;
			if (!aExact && bExact) return 1;

			// 2. StartsWith second (prioritize prefix matches)
			const aStarts = aLower.startsWith(lowerPrefix);
			const bStarts = bLower.startsWith(lowerPrefix);
			if (aStarts && !bStarts) return -1;
			if (!aStarts && bStarts) return 1;

			// 3. Alphabetically within same category
			return a.logicalName.localeCompare(b.logicalName);
		});
	}
}
