import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import { Solution } from '../../domain/entities/Solution';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for listing all solutions in an environment.
 * Orchestrates repository call only. Returns unsorted domain entities.
 * Sorting business logic (Solution.sort) is invoked by mapper when converting to ViewModels.
 */
export class ListSolutionsUseCase {
  constructor(
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes the use case to list solutions.
   * @param environmentId - Power Platform environment GUID
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to array of Solution entities
   */
  async execute(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<Solution[]> {
    this.logger.info('ListSolutionsUseCase started', { environmentId });

    try {
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListSolutionsUseCase cancelled before execution');
        throw new OperationCancelledException();
      }

      const solutions = await this.solutionRepository.findAll(
        environmentId,
        undefined,
        cancellationToken
      );

      this.logger.info('ListSolutionsUseCase completed', { count: solutions.length });

      return solutions;
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('ListSolutionsUseCase failed', normalizedError);
      throw normalizedError;
    }
  }
}
