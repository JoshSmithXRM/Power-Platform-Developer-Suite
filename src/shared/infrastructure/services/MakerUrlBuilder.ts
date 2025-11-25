import { IMakerUrlBuilder } from '../../domain/interfaces/IMakerUrlBuilder';

/**
 * Infrastructure implementation of IMakerUrlBuilder.
 * Constructs Power Platform Maker Portal URLs with support for sovereign clouds.
 */
export class MakerUrlBuilder implements IMakerUrlBuilder {
  constructor(private readonly baseUrl = 'https://make.powerapps.com') {}

  /**
   * Builds Power Platform Maker Portal URL for a solution.
   * Pattern: make.powerapps.com/environments/{envId}/solutions/{solutionId}
   *
   * @param environmentId - Power Platform environment GUID
   * @param solutionId - Solution GUID
   * @returns Maker Portal solution URL
   */
  buildSolutionUrl(environmentId: string, solutionId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}`;
  }

  /**
   * Builds classic Dynamics 365 solution editor URL.
   * Pattern: {envId}.dynamics.com/tools/solution/edit.aspx?id={solutionId}
   *
   * Uses environmentId as subdomain (not baseUrl) as Dynamics URLs follow
   * different pattern than Maker Portal.
   *
   * @param environmentId - Power Platform environment GUID (used as subdomain)
   * @param solutionId - Solution GUID
   * @returns Dynamics 365 solution editor URL
   */
  buildDynamicsUrl(environmentId: string, solutionId: string): string {
    return `https://${environmentId}.dynamics.com/tools/solution/edit.aspx?id=${solutionId}`;
  }

  /**
   * Builds Maker Portal URL for solutions list view.
   * Pattern: make.powerapps.com/environments/{envId}/solutions
   *
   * @param environmentId - Power Platform environment GUID
   * @returns Maker Portal solutions list URL
   */
  buildSolutionsListUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions`;
  }

  /**
   * Builds Maker Portal URL for solution import history.
   * Pattern: make.powerapps.com/environments/{envId}/solutionsHistory
   *
   * @param environmentId - Power Platform environment GUID
   * @returns Maker Portal import history URL
   */
  buildImportHistoryUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutionsHistory`;
  }

  /**
   * Builds Maker Portal URL for environment variables list.
   * Pattern: make.powerapps.com/environments/{envId}/environmentvariables
   *
   * @param environmentId - Power Platform environment GUID
   * @returns Maker Portal environment variables URL
   */
  buildEnvironmentVariablesUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/environmentvariables`;
  }

  /**
   * Builds Maker Portal URL for flows list.
   * Pattern: make.powerapps.com/environments/{envId}/flows
   *
   * @param environmentId - Power Platform environment GUID
   * @returns Maker Portal flows URL
   */
  buildFlowsUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/flows`;
  }

  /**
   * Builds Maker Portal URL for connection references.
   *
   * Two patterns based on context:
   * - With solution: /environments/{envId}/solutions/{solutionId}/objects/connectionreferences
   * - Without solution: /environments/{envId}/connections
   *
   * @param environmentId - Power Platform environment GUID
   * @param solutionId - Optional solution GUID for solution-scoped view
   * @returns Maker Portal connection references URL
   */
  buildConnectionReferencesUrl(environmentId: string, solutionId?: string): string {
    if (solutionId) {
      return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}/objects/connectionreferences`;
    }
    return `${this.baseUrl}/environments/${environmentId}/connections`;
  }

  /**
   * Builds Maker Portal URL for environment variables in solution context.
   *
   * Two patterns based on context:
   * - With solution: /environments/{envId}/solutions/{solutionId}/objects/environment%20variables
   * - Without solution: /environments/{envId}/environmentvariables
   *
   * Note: Solution-scoped URL uses URL-encoded space (%20) in "environment variables".
   *
   * @param environmentId - Power Platform environment GUID
   * @param solutionId - Optional solution GUID for solution-scoped view
   * @returns Maker Portal environment variables URL
   */
  buildEnvironmentVariablesObjectsUrl(environmentId: string, solutionId?: string): string {
    if (solutionId) {
      return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}/objects/environment%20variables`;
    }
    return `${this.baseUrl}/environments/${environmentId}/environmentvariables`;
  }

  /**
   * Builds Maker Portal URL for editing a cloud flow.
   * Pattern: make.powerapps.com/environments/{envId}/solutions/{solutionId}/objects/cloudflows/{flowId}/edit
   *
   * @param environmentId - Power Platform environment GUID
   * @param solutionId - Solution GUID containing the flow
   * @param flowId - Cloud flow GUID
   * @returns Maker Portal flow editor URL
   */
  buildFlowUrl(environmentId: string, solutionId: string, flowId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}/objects/cloudflows/${flowId}/edit`;
  }
}
