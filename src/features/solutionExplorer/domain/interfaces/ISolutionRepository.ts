import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import { Solution } from '../entities/Solution';

/**
 * Repository interface for fetching Power Platform solutions.
 * Domain defines the contract, infrastructure implements it.
 */
export interface ISolutionRepository {
  /**
   * Retrieves all solutions from the specified environment.
   * @param environmentId - Power Platform environment GUID
   * @param options - Optional query options for filtering, selection, ordering
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to array of Solution entities
   */
  findAll(environmentId: string, options?: QueryOptions, cancellationToken?: ICancellationToken): Promise<Solution[]>;

  /**
   * Retrieves minimal solution data for dropdown display (only visible solutions).
   * Optimized query fetching only: id, friendlyName, uniqueName.
   * Filters to isvisible = true.
   * @param environmentId - Power Platform environment GUID
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to array of solution dropdown data
   */
  findAllForDropdown(environmentId: string, cancellationToken?: ICancellationToken): Promise<Array<{ id: string; name: string; uniqueName: string }>>;

  /**
   * Retrieves a paginated subset of solutions from the specified environment.
   * Used for virtual scrolling with large datasets.
   *
   * @param environmentId - Power Platform environment GUID
   * @param page - Page number (1-based)
   * @param pageSize - Number of records per page
   * @param options - Optional query options for filtering, selection, ordering
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to PaginatedResult containing Solution entities
   */
  findPaginated(
    environmentId: string,
    page: number,
    pageSize: number,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<PaginatedResult<Solution>>;

  /**
   * Gets the total count of solutions in the specified environment.
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

  /**
   * Retrieves unmanaged solutions with their publisher customization prefix.
   * Used for plugin registration where components must use publisher prefix.
   * @param environmentId - Power Platform environment GUID
   * @returns Promise resolving to array of solutions with prefix
   */
  findUnmanagedWithPublisherPrefix(
    environmentId: string
  ): Promise<Array<{ id: string; name: string; uniqueName: string; publisherPrefix: string }>>;
}
