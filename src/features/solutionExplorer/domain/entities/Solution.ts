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
   * The default solution has special significance in Power Platform.
   */
  isDefaultSolution(): boolean {
    return this.uniqueName === 'Default';
  }

  /**
   * Gets sort priority for UI ordering.
   * Default solution should appear first (priority 0), all others after (priority 1).
   */
  getSortPriority(): number {
    return this.isDefaultSolution() ? 0 : 1;
  }
}
