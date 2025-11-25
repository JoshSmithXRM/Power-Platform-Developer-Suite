import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
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
}
