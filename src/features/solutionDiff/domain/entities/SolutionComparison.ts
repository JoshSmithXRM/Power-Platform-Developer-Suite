import { Solution } from '../../../solutionExplorer/domain/entities/Solution';
import { ComparisonResult } from '../valueObjects/ComparisonResult';
import { ComparisonStatus } from '../valueObjects/ComparisonStatus';

/**
 * Domain entity representing a solution comparison between two environments.
 *
 * Responsibilities:
 * - Compare two Solution entities
 * - Identify differences in metadata (version, managed state, timestamps)
 * - Calculate comparison status (Same, Different, SourceOnly, TargetOnly)
 *
 * Business Rules:
 * - Solutions are matched by uniqueName (NOT by ID - different across environments)
 * - Version comparison uses string equality (1.0.0.0 format)
 * - Comparison considers: version, isManaged, installedOn, modifiedOn
 * - Missing solution in either environment is a valid state
 */
export class SolutionComparison {
  private readonly result: ComparisonResult;

  /**
   * Creates a new SolutionComparison.
   *
   * @param sourceSolution - Solution from source environment (null if not found)
   * @param targetSolution - Solution from target environment (null if not found)
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @throws {Error} When both solutions are null
   */
  constructor(
    private readonly sourceSolution: Solution | null,
    private readonly targetSolution: Solution | null,
    private readonly sourceEnvironmentId: string,
    private readonly targetEnvironmentId: string
  ) {
    if (sourceSolution === null && targetSolution === null) {
      throw new Error('At least one solution must be provided for comparison');
    }

    this.result = this.calculateDifferences();
  }

  /**
   * Calculates differences between source and target solutions.
   *
   * Business Logic:
   * - Compares version, isManaged, installedOn, modifiedOn
   * - Generates human-readable difference messages
   */
  private calculateDifferences(): ComparisonResult {
    // Source-only (solution exists in source but not target)
    if (this.sourceSolution !== null && this.targetSolution === null) {
      return ComparisonResult.createSourceOnly(this.sourceSolution.friendlyName);
    }

    // Target-only (solution exists in target but not source)
    if (this.sourceSolution === null && this.targetSolution !== null) {
      return ComparisonResult.createTargetOnly(this.targetSolution.friendlyName);
    }

    // Both exist - compare metadata
    // TypeScript knows both are non-null here due to constructor validation
    const source = this.sourceSolution as Solution;
    const target = this.targetSolution as Solution;

    const differences: string[] = [];

    // Compare version
    if (source.version !== target.version) {
      differences.push(`Version: ${source.version} → ${target.version}`);
    }

    // Compare managed state
    if (source.isManaged !== target.isManaged) {
      const sourceState = source.isManaged ? 'Managed' : 'Unmanaged';
      const targetState = target.isManaged ? 'Managed' : 'Unmanaged';
      differences.push(`Type: ${sourceState} → ${targetState}`);
    }

    // Compare installation date
    const sourceInstalled = source.installedOn?.toISOString() ?? 'Not installed';
    const targetInstalled = target.installedOn?.toISOString() ?? 'Not installed';
    if (sourceInstalled !== targetInstalled) {
      differences.push(`Installed: ${this.formatDate(source.installedOn)} → ${this.formatDate(target.installedOn)}`);
    }

    // Compare modification date
    if (source.modifiedOn.getTime() !== target.modifiedOn.getTime()) {
      differences.push(`Modified: ${this.formatDate(source.modifiedOn)} → ${this.formatDate(target.modifiedOn)}`);
    }

    return differences.length === 0
      ? ComparisonResult.createIdentical(source.friendlyName)
      : ComparisonResult.createDifferent(source.friendlyName, differences);
  }

  /**
   * Formats a date for display in difference messages.
   */
  private formatDate(date: Date | null): string {
    if (date === null) {
      return 'N/A';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Checks if solutions are identical in both environments.
   *
   * Business Rule: Identical means same version, managed state, and timestamps
   */
  public areIdentical(): boolean {
    return this.result.getStatus() === ComparisonStatus.Same;
  }

  /**
   * Checks if solutions have differences.
   */
  public hasDifferences(): boolean {
    return this.result.getStatus() === ComparisonStatus.Different;
  }

  /**
   * Checks if solution exists only in source environment.
   */
  public isSourceOnly(): boolean {
    return this.result.getStatus() === ComparisonStatus.SourceOnly;
  }

  /**
   * Checks if solution exists only in target environment.
   */
  public isTargetOnly(): boolean {
    return this.result.getStatus() === ComparisonStatus.TargetOnly;
  }

  /**
   * Gets the solution name being compared.
   *
   * Business Rule: Use source name if available, otherwise target name
   */
  public getSolutionName(): string {
    if (this.sourceSolution !== null) {
      return this.sourceSolution.friendlyName;
    }
    return (this.targetSolution as Solution).friendlyName;
  }

  /**
   * Gets the solution unique name being compared.
   */
  public getSolutionUniqueName(): string {
    if (this.sourceSolution !== null) {
      return this.sourceSolution.uniqueName;
    }
    return (this.targetSolution as Solution).uniqueName;
  }

  public getSourceSolution(): Solution | null {
    return this.sourceSolution;
  }

  public getTargetSolution(): Solution | null {
    return this.targetSolution;
  }

  public getSourceEnvironmentId(): string {
    return this.sourceEnvironmentId;
  }

  public getTargetEnvironmentId(): string {
    return this.targetEnvironmentId;
  }

  public getResult(): ComparisonResult {
    return this.result;
  }
}
