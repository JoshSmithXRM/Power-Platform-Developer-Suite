import { SolutionComparison } from '../../domain/entities/SolutionComparison';
import { Solution } from '../../../solutionExplorer/domain/entities/Solution';
import { ComparisonStatus } from '../../domain/valueObjects/ComparisonStatus';
import {
  SolutionComparisonViewModel,
  SolutionMetadataViewModel
} from '../viewModels/SolutionComparisonViewModel';

/**
 * Component diff summary for status calculation.
 */
export interface ComponentDiffSummary {
  readonly hasDifferences: boolean;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
}

/**
 * Mapper: Transform domain SolutionComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class SolutionComparisonViewModelMapper {
  /**
   * Transforms SolutionComparison entity to ViewModel.
   *
   * @param comparison - The metadata comparison entity
   * @param componentDiff - Optional component diff summary for combined status
   */
  public static toViewModel(
    comparison: SolutionComparison,
    componentDiff?: ComponentDiffSummary
  ): SolutionComparisonViewModel {
    const result = comparison.getResult();
    const metadataStatus = result.getStatus();

    // Determine final status considering both metadata and components
    const { status, summary } = this.calculateFinalStatus(
      metadataStatus,
      result.getSummary(),
      result.getDifferences(),
      componentDiff
    );

    return {
      solutionName: comparison.getSolutionName(),
      solutionUniqueName: comparison.getSolutionUniqueName(),
      status,
      summary,
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
   * Calculates final status considering both metadata and component differences.
   *
   * Rules:
   * - If metadata is SourceOnly/TargetOnly, keep that status
   * - If metadata is Same but components differ, status becomes Different
   * - If metadata is Different, keep Different
   */
  private static calculateFinalStatus(
    metadataStatus: ComparisonStatus,
    metadataSummary: string,
    metadataDifferences: readonly string[],
    componentDiff?: ComponentDiffSummary
  ): { status: string; summary: string } {
    // SourceOnly/TargetOnly take precedence
    if (metadataStatus === ComparisonStatus.SourceOnly ||
        metadataStatus === ComparisonStatus.TargetOnly) {
      return { status: metadataStatus, summary: metadataSummary };
    }

    // No component diff info - use metadata only
    if (componentDiff === undefined) {
      return { status: metadataStatus, summary: metadataSummary };
    }

    // Components have differences - override "Same" status
    if (componentDiff.hasDifferences) {
      const parts: string[] = [];

      if (metadataDifferences.length > 0) {
        parts.push(`${metadataDifferences.length} metadata`);
      }
      if (componentDiff.addedCount > 0) {
        parts.push(`${componentDiff.addedCount} added`);
      }
      if (componentDiff.removedCount > 0) {
        parts.push(`${componentDiff.removedCount} removed`);
      }
      if (componentDiff.modifiedCount > 0) {
        parts.push(`${componentDiff.modifiedCount} modified`);
      }

      const summary = parts.length > 0
        ? `Differences: ${parts.join(', ')}`
        : 'Components differ';

      return { status: ComparisonStatus.Different, summary };
    }

    // No component differences - use metadata status
    return { status: metadataStatus, summary: metadataSummary };
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
