import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { Solution } from '../entities/Solution';

/**
 * Repository interface for fetching Power Platform solutions.
 * Domain defines the contract, infrastructure implements it.
 */
export interface ISolutionRepository {
  /**
   * Retrieves all solutions from the specified environment.
   * @param environmentId - Power Platform environment GUID
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to array of Solution entities
   */
  findAll(environmentId: string, cancellationToken?: ICancellationToken): Promise<Solution[]>;
}
