import { ComponentType } from '../enums/ComponentType';

import { ColumnDiff } from './ColumnDiff';

/**
 * Value object representing fetched component data for comparison.
 *
 * Immutable holder of component record data from Dataverse.
 * Contains only the comparable columns (excludes timestamps, owner, etc.).
 */
export class ComponentData {
  constructor(
    private readonly objectId: string,
    private readonly componentType: ComponentType,
    private readonly displayName: string,
    private readonly columnValues: Readonly<Record<string, unknown>>
  ) {}

  /**
   * Gets the component object ID (GUID).
   */
  public getObjectId(): string {
    return this.objectId;
  }

  /**
   * Gets the component type.
   */
  public getComponentType(): ComponentType {
    return this.componentType;
  }

  /**
   * Gets the name for this component.
   */
  public getName(): string {
    return this.displayName;
  }

  /**
   * Gets a specific column value.
   *
   * @param columnName - Name of the column to retrieve
   * @returns The column value, or undefined if not present
   */
  public getColumnValue(columnName: string): unknown {
    return this.columnValues[columnName];
  }

  /**
   * Gets all column names that have values.
   */
  public getColumnNames(): readonly string[] {
    return Object.keys(this.columnValues);
  }

  /**
   * Checks if column values match another ComponentData.
   *
   * Business Rule: All comparable columns must match.
   * Used by ComponentComparison for Modified detection.
   *
   * @param other - The ComponentData to compare against
   * @returns true if all column values match
   */
  public hasMatchingValues(other: ComponentData): boolean {
    const myColumns = this.getColumnNames();
    const theirColumns = other.getColumnNames();

    // Different column sets means different
    if (myColumns.length !== theirColumns.length) {
      return false;
    }

    for (const col of myColumns) {
      if (!this.valuesMatch(this.getColumnValue(col), other.getColumnValue(col))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets column differences compared to another ComponentData.
   *
   * @param other - The ComponentData to compare against
   * @returns Array of ColumnDiff for each differing column
   */
  public getColumnDifferences(other: ComponentData): readonly ColumnDiff[] {
    const diffs: ColumnDiff[] = [];

    for (const col of this.getColumnNames()) {
      const myValue = this.getColumnValue(col);
      const theirValue = other.getColumnValue(col);

      if (!this.valuesMatch(myValue, theirValue)) {
        diffs.push(new ColumnDiff(col, myValue, theirValue));
      }
    }

    return diffs;
  }

  /**
   * Compares two values for equality.
   *
   * Business Rules:
   * - null and undefined are equivalent
   * - Strings, numbers, booleans use strict equality
   * - Objects/arrays are compared by JSON serialization
   */
  private valuesMatch(a: unknown, b: unknown): boolean {
    // Handle null/undefined equivalence
    if (a === null || a === undefined) {
      return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
      return false;
    }

    // String comparison (handles base64, JSON, etc.)
    if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
    }

    // Number comparison
    if (typeof a === 'number' && typeof b === 'number') {
      return a === b;
    }

    // Boolean comparison
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b;
    }

    // Object/array - compare JSON strings
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
