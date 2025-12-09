/**
 * Enumeration of comparison statuses.
 *
 * Immutable value representing the result of a comparison operation.
 */
export enum ComparisonStatus {
  /**
   * Solutions are identical (same version, managed state, timestamps)
   */
  Same = 'Same',

  /**
   * Solutions exist in both environments but have differences
   */
  Different = 'Different',

  /**
   * Solution exists only in source environment
   */
  SourceOnly = 'SourceOnly',

  /**
   * Solution exists only in target environment
   */
  TargetOnly = 'TargetOnly'
}
