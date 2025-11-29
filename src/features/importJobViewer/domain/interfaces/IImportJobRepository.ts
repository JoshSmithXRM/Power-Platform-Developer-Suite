import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
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

	/**
	 * Retrieves a paginated subset of import jobs from the specified environment.
	 * Used for virtual scrolling with large datasets.
	 *
	 * Note: Dataverse importjobs entity may not support $skip pagination.
	 * Implementation loads all in page 1, returns empty for subsequent pages.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param page - Page number (1-based)
	 * @param pageSize - Number of records per page
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to PaginatedResult containing ImportJob entities
	 */
	findPaginated(
		environmentId: string,
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<ImportJob>>;

	/**
	 * Gets the total count of import jobs in the specified environment.
	 * Used for pagination calculations and UI display.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to the total count
	 */
	getCount(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number>;
}
