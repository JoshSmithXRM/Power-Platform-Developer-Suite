import { ICancellationToken } from './ICancellationToken';
import { QueryOptions } from './QueryOptions';

/**
 * DTO for solution component data returned by repository.
 */
export interface SolutionComponentDto {
	/** Component object ID (GUID) */
	readonly objectId: string;

	/** Component type code (maps to ComponentType enum) */
	readonly componentType: number;

	/** Optional display name (null if not available) */
	readonly displayName: string | null;

	/** Parent solution ID */
	readonly solutionId: string;
}

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
	 * Finds ALL components for a specific solution (all component types).
	 * Returns component metadata including type, objectId, and optional display name.
	 *
	 * @param environmentId - Environment GUID
	 * @param solutionId - Solution GUID
	 * @param options - Optional query options
	 * @param cancellationToken - Optional cancellation token
	 * @returns Array of solution component DTOs
	 */
	findAllComponentsForSolution(
		environmentId: string,
		solutionId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<SolutionComponentDto[]>;
}
