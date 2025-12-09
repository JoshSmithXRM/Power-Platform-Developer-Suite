import { ComparisonStatus } from './ComparisonStatus';

/**
 * Value object representing the result of a solution comparison.
 *
 * Immutable, validated on construction.
 *
 * Responsibilities:
 * - Store comparison status
 * - Store difference details
 * - Provide formatted summary
 */
export class ComparisonResult {
  private constructor(
    private readonly status: ComparisonStatus,
    private readonly solutionName: string,
    private readonly differences: readonly string[]
  ) {}

  /**
   * Factory: Creates result for identical solutions.
   */
  public static createIdentical(solutionName: string): ComparisonResult {
    return new ComparisonResult(ComparisonStatus.Same, solutionName, []);
  }

  /**
   * Factory: Creates result for different solutions.
   *
   * @throws {Error} When differences array is empty
   */
  public static createDifferent(
    solutionName: string,
    differences: string[]
  ): ComparisonResult {
    if (differences.length === 0) {
      throw new Error('Cannot create Different status with zero differences');
    }
    return new ComparisonResult(ComparisonStatus.Different, solutionName, differences);
  }

  /**
   * Factory: Creates result for source-only solution.
   */
  public static createSourceOnly(solutionName: string): ComparisonResult {
    return new ComparisonResult(
      ComparisonStatus.SourceOnly,
      solutionName,
      ['Solution not found in target environment']
    );
  }

  /**
   * Factory: Creates result for target-only solution.
   */
  public static createTargetOnly(solutionName: string): ComparisonResult {
    return new ComparisonResult(
      ComparisonStatus.TargetOnly,
      solutionName,
      ['Solution not found in source environment']
    );
  }

  /**
   * Generates human-readable summary.
   */
  public getSummary(): string {
    switch (this.status) {
      case ComparisonStatus.Same:
        return 'Solutions are identical';
      case ComparisonStatus.Different:
        return `${this.differences.length} difference(s) found`;
      case ComparisonStatus.SourceOnly:
        return 'Not found in target';
      case ComparisonStatus.TargetOnly:
        return 'Not found in source';
    }
  }

  public getStatus(): ComparisonStatus {
    return this.status;
  }

  public getSolutionName(): string {
    return this.solutionName;
  }

  public getDifferences(): readonly string[] {
    return this.differences;
  }
}
