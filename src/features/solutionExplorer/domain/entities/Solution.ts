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
  /**
   * The GUID of the Default Solution across all Dataverse environments.
   * This solution contains all unmanaged customizations not part of other solutions.
   * This GUID is consistent across all Dataverse instances.
   */
  public static readonly DEFAULT_SOLUTION_ID = 'fd140aaf-4df4-11dd-bd17-0019b9312238';

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
   * @param modifiedOn - Last modified date
   * @param isVisible - Whether solution is visible in UI
   * @param isApiManaged - Whether solution is API-managed
   * @param solutionType - Type of solution
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
    public readonly description: string,
    public readonly modifiedOn: Date,
    public readonly isVisible: boolean,
    public readonly isApiManaged: boolean,
    public readonly solutionType: string | null
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

  /**
   * Sorts solutions by business rules: Default solution last (by priority), then alphabetically by friendly name.
   * Creates a defensive copy to avoid mutating the original array.
   * @param solutions - Array of Solution entities to sort
   * @returns New sorted array
   */
  static sort(solutions: Solution[]): Solution[] {
    return [...solutions].sort((a, b) => {
      const priorityDiff = a.getSortPriority() - b.getSortPriority();
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.friendlyName.localeCompare(b.friendlyName);
    });
  }
}
