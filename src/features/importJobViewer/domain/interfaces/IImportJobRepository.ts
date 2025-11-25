import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { ImportJob } from '../entities/ImportJob';

/**
 * Repository interface for fetching Power Platform import jobs.
 * Domain defines the contract, infrastructure implements it.
 */
export interface IImportJobRepository {
	/**
	 * Retrieves all import jobs from the specified environment.
	 * Note: Does NOT include importLogXml data to minimize payload size.
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of ImportJob entities (without log data)
	 */
	findAll(environmentId: string, options?: QueryOptions, cancellationToken?: ICancellationToken): Promise<ImportJob[]>;

	/**
	 * Retrieves a single import job WITH import log XML data.
	 * Used when user wants to view the import log details.
	 * @param environmentId - Power Platform environment GUID
	 * @param importJobId - Import job GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to ImportJob entity with importLogXml populated
	 */
	findByIdWithLog(
		environmentId: string,
		importJobId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ImportJob>;
}
