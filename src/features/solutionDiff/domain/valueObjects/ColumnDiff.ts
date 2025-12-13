/**
 * Value object representing a single column difference between environments.
 *
 * Immutable holder of column-level diff information.
 * Used to show specific differences in Modified components.
 */
export class ColumnDiff {
  constructor(
    private readonly columnName: string,
    private readonly sourceValue: unknown,
    private readonly targetValue: unknown
  ) {}

  /**
   * Gets the column name (e.g., "clientdata", "version").
   */
  public getColumnName(): string {
    return this.columnName;
  }

  /**
   * Gets the source environment value.
   */
  public getSourceValue(): unknown {
    return this.sourceValue;
  }

  /**
   * Gets the target environment value.
   */
  public getTargetValue(): unknown {
    return this.targetValue;
  }
}
