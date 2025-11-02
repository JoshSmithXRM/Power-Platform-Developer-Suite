/**
 * Domain service for constructing Power Platform Maker Portal URLs.
 *
 * Handles region-specific URLs (sovereign clouds), custom domains,
 * and URL pattern changes. Keeps infrastructure concerns out of entities.
 */
export interface IMakerUrlBuilder {
  /**
   * Builds Maker Portal URL for a solution.
   * @param environmentId - Environment GUID
   * @param solutionId - Solution GUID
   * @returns Full URL to solution in Maker Portal
   */
  buildSolutionUrl(environmentId: string, solutionId: string): string;

  /**
   * Builds Dynamics 365 URL for solution editor.
   * @param environmentId - Environment GUID
   * @param solutionId - Solution GUID
   * @returns Full URL to solution in Dynamics 365
   */
  buildDynamicsUrl(environmentId: string, solutionId: string): string;

  /**
   * Builds Maker Portal URL for solutions list.
   * @param environmentId - Environment GUID
   * @returns Full URL to solutions list
   */
  buildSolutionsListUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for import history.
   * @param environmentId - Environment GUID
   * @returns Full URL to import history
   */
  buildImportHistoryUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for environment variables.
   * @param environmentId - Environment GUID
   * @returns Full URL to environment variables list
   */
  buildEnvironmentVariablesUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for flows.
   * @param environmentId - Environment GUID
   * @returns Full URL to flows list
   */
  buildFlowsUrl(environmentId: string): string;
}
