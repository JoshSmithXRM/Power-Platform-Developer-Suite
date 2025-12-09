import { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import { SolutionComparison } from '../../domain/entities/SolutionComparison';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

/**
 * Use case: Compare solution metadata between two environments.
 *
 * Orchestrates:
 * 1. Fetch solution from source environment (by uniqueName)
 * 2. Fetch solution from target environment (by uniqueName)
 * 3. Create SolutionComparison domain entity
 * 4. Return comparison entity
 *
 * Business logic is IN SolutionComparison entity, NOT here.
 */
export class CompareSolutionMetadataUseCase {
  constructor(
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes solution metadata comparison.
   *
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @param solutionUniqueName - Solution unique name (e.g., 'MyCustomSolution')
   * @param cancellationToken - Optional cancellation token
   * @returns SolutionComparison entity with comparison results
   */
  public async execute(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    solutionUniqueName: string,
    cancellationToken?: ICancellationToken
  ): Promise<SolutionComparison> {
    this.logger.info('Comparing solution metadata', {
      sourceEnvironmentId,
      targetEnvironmentId,
      solutionUniqueName
    });

    // Fetch solutions from both environments in parallel for performance
    const [sourceSolutions, targetSolutions] = await Promise.all([
      this.solutionRepository.findAll(
        sourceEnvironmentId,
        { filter: `uniquename eq '${solutionUniqueName}'` },
        cancellationToken
      ),
      this.solutionRepository.findAll(
        targetEnvironmentId,
        { filter: `uniquename eq '${solutionUniqueName}'` },
        cancellationToken
      )
    ]);

    const sourceSolution = sourceSolutions[0] ?? null;
    const targetSolution = targetSolutions[0] ?? null;

    // Domain entity handles comparison logic
    const comparison = new SolutionComparison(
      sourceSolution,
      targetSolution,
      sourceEnvironmentId,
      targetEnvironmentId
    );

    this.logger.info('Solution comparison completed', {
      status: comparison.getResult().getStatus(),
      hasDifferences: comparison.hasDifferences()
    });

    return comparison;
  }
}
