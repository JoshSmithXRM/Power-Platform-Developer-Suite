import { ICancellationToken } from './ICancellationToken';
import { QueryOptions } from './QueryOptions';

/**
 * Repository for fetching solution component metadata from Dataverse.
 * Used for filtering entities by solution membership.
 */
export interface ISolutionComponentRepository {
	/**
	 * Gets the ObjectTypeCode for a given entity logical name.
	 * ObjectTypeCode is required to query solution components by entity type.
	 *
	 * @param environmentId - Environment GUID
	 * @param entityLogicalName - Entity logical name (e.g., 'environmentvariabledefinition', 'connectionreference', 'subscription')
	 * @param options - Optional query options
	 * @param cancellationToken - Optional cancellation token
	 * @returns ObjectTypeCode for the entity, or null if not found
	 */
	getObjectTypeCode(
		environmentId: string,
		entityLogicalName: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number | null>;

	/**
	 * Finds all component IDs of a specific entity type within a solution.
	 * Returns the objectid field from solutioncomponent records.
	 *
	 * @param environmentId - Environment GUID
	 * @param solutionId - Solution GUID
	 * @param entityLogicalName - Entity logical name to filter by
	 * @param options - Optional query options
	 * @param cancellationToken - Optional cancellation token
	 * @returns Array of component object IDs (GUIDs)
	 */
	findComponentIdsBySolution(
		environmentId: string,
		solutionId: string,
		entityLogicalName: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<string[]>;

	/**
	 * Finds all solution components for specified component types.
	 * Used for building a solution membership cache for client-side filtering.
	 *
	 * Returns a map of solutionId -> Set of objectIds for each component type.
	 *
	 * @param environmentId - Environment GUID
	 * @param componentTypes - Array of component type codes (e.g., 91=Assembly, 93=Step)
	 * @param cancellationToken - Optional cancellation token
	 * @returns Map of solutionId to Set of component objectIds
	 */
	findAllByComponentTypes(
		environmentId: string,
		componentTypes: number[],
		cancellationToken?: ICancellationToken
	): Promise<Map<string, Set<string>>>;
}
