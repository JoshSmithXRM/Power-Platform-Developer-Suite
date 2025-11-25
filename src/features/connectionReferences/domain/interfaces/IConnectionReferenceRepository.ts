import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { ConnectionReference } from '../entities/ConnectionReference';

/**
 * Repository interface for fetching Power Platform connection references.
 * Domain defines the contract, infrastructure implements it.
 */
export interface IConnectionReferenceRepository {
	/**
	 * Retrieves all connection references from the specified environment.
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of ConnectionReference entities
	 */
	findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ConnectionReference[]>;
}
