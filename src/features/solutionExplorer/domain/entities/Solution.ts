import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Solution entity representing a Power Platform solution with rich business behavior.
 *
 * Responsibilities:
 * - Validate version format in constructor (fail fast)
 * - Identify default solution
 * - Provide sort priority for UI ordering
 */
export class Solution {
  public readonly version: string;

  /**
   * Creates a new Solution entity.
   * Validates version format and enforces business rules.
   * @param id - Solution GUID
   * @param uniqueName - Unique name identifier
   * @param friendlyName - Display name
   * @param version - Version string (must have at least 2 numeric segments)
   * @param isManaged - Whether the solution is managed
   * @param publisherId - Publisher GUID
   * @param publisherName - Publisher display name
   * @param installedOn - Installation date (null if not installed)
   * @param description - Solution description
   * @throws {ValidationError} When version format is invalid
   */
  constructor(
    public readonly id: string,
    public readonly uniqueName: string,
    public readonly friendlyName: string,
    version: string,
    public readonly isManaged: boolean,
    public readonly publisherId: string,
    public readonly publisherName: string,
    public readonly installedOn: Date | null,
    public readonly description: string
  ) {
    // Trim whitespace from version (API may include trailing/leading spaces)
    this.version = version.trim();

    // Version must have at least 2 segments (X.X minimum per Microsoft requirements)
    // Segments can have multiple digits (e.g., 9.0.2404.3002)
    if (!/^\d+(\.\d+)+$/.test(this.version)) {
      throw new ValidationError('Solution', 'version', this.version, 'Must have at least 2 numeric segments (e.g., 1.0 or 9.0.2404.3002)');
    }
  }

  /**
   * Determines if this is the default solution.
   * The default solution has special significance in Power Platform as it contains
   * all unmanaged customizations that are not part of other solutions.
   * @returns True if this is the Default solution, false otherwise
   */
  isDefaultSolution(): boolean {
    return this.uniqueName === 'Default';
  }

  /**
   * Gets sort priority for UI ordering.
   * Business rule: Default solution should appear first in lists,
   * followed by all other solutions in alphabetical order.
   * @returns 0 for Default solution (highest priority), 1 for all others
   */
  getSortPriority(): number {
    return this.isDefaultSolution() ? 0 : 1;
  }
}
