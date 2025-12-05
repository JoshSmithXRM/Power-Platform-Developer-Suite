import type { EntitySuggestion } from '../valueObjects/EntitySuggestion';
import type { AttributeSuggestion } from '../valueObjects/AttributeSuggestion';

/**
 * Domain Repository Interface: IntelliSense Metadata Repository
 *
 * Defines contract for fetching metadata needed for SQL IntelliSense.
 * Domain layer defines the interface, infrastructure layer implements it.
 *
 * Implementations should use minimal OData $select for performance.
 */
export interface IIntelliSenseMetadataRepository {
	/**
	 * Fetches all entity names for autocomplete suggestions.
	 * Should use: GET /EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity
	 *
	 * @param environmentId - The environment to fetch from
	 * @returns Array of entity suggestions
	 */
	getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]>;

	/**
	 * Fetches attribute names for a specific entity.
	 * Should use: GET /EntityDefinitions(LogicalName='x')/Attributes?$select=...
	 *
	 * @param environmentId - The environment to fetch from
	 * @param entityLogicalName - The entity to get attributes for
	 * @returns Array of attribute suggestions
	 */
	getAttributeSuggestions(
		environmentId: string,
		entityLogicalName: string
	): Promise<AttributeSuggestion[]>;
}
