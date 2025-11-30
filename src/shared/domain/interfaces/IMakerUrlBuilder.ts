/**
 * Domain service for constructing Power Platform Maker Portal URLs.
 *
 * Handles region-specific URLs (sovereign clouds), custom domains,
 * and URL pattern changes. Keeps infrastructure concerns out of entities.
 */
export interface IMakerUrlBuilder {
  buildSolutionUrl(environmentId: string, solutionId: string): string;
  buildDynamicsUrl(environmentId: string, solutionId: string): string;
  buildSolutionsListUrl(environmentId: string): string;
  buildImportHistoryUrl(environmentId: string): string;
  buildEnvironmentVariablesUrl(environmentId: string): string;
  buildFlowsUrl(environmentId: string): string;
  buildConnectionReferencesUrl(environmentId: string, solutionId?: string): string;
  buildEnvironmentVariablesObjectsUrl(environmentId: string, solutionId?: string): string;
  buildFlowUrl(environmentId: string, solutionId: string, flowId: string): string;
  buildWebResourcesUrl(environmentId: string, solutionId?: string): string;
}
