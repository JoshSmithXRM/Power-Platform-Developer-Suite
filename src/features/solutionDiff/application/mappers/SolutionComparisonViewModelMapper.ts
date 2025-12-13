import { SolutionComparison } from '../../domain/entities/SolutionComparison';
import { Solution } from '../../../solutionExplorer/domain/entities/Solution';
import {
  SolutionComparisonViewModel,
  SolutionMetadataViewModel
} from '../viewModels/SolutionComparisonViewModel';

/**
 * Mapper: Transform domain SolutionComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class SolutionComparisonViewModelMapper {
  /**
   * Transforms SolutionComparison entity to ViewModel.
   */
  public static toViewModel(comparison: SolutionComparison): SolutionComparisonViewModel {
    const result = comparison.getResult();

    return {
      solutionName: comparison.getSolutionName(),
      solutionUniqueName: comparison.getSolutionUniqueName(),
      status: result.getStatus(),
      summary: result.getSummary(),
      source: comparison.getSourceSolution() !== null
        ? this.toMetadataViewModel(comparison.getSourceSolution() as Solution)
        : null,
      target: comparison.getTargetSolution() !== null
        ? this.toMetadataViewModel(comparison.getTargetSolution() as Solution)
        : null,
      differences: result.getDifferences(),
      sourceEnvironmentId: comparison.getSourceEnvironmentId(),
      targetEnvironmentId: comparison.getTargetEnvironmentId()
    };
  }

  /**
   * Transforms Solution entity to SolutionMetadataViewModel.
   */
  private static toMetadataViewModel(solution: Solution): SolutionMetadataViewModel {
    return {
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
      version: solution.version,
      isManaged: solution.isManaged,
      managedStateDisplay: solution.isManaged ? 'Managed' : 'Unmanaged',
      installedOn: solution.installedOn !== null
        ? this.dateToString(solution.installedOn)
        : null,
      modifiedOn: this.dateToString(solution.modifiedOn),
      publisherName: solution.publisherName
    };
  }

  /**
   * Converts a date to a localized string for display.
   */
  private static dateToString(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
