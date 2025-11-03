import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { CloudFlow } from '../entities/CloudFlow';

/**
 * Repository interface for fetching Power Automate cloud flows.
 * Domain defines the contract, infrastructure implements it.
 */
export interface ICloudFlowRepository {
	/**
	 * Retrieves all cloud flows from the specified environment.
	 *
	 * IMPORTANT: By default, the large 'clientdata' field is EXCLUDED for performance.
	 * To include clientdata, the caller must explicitly request it via QueryOptions.select.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of CloudFlow entities
	 */
	findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<CloudFlow[]>;
}
