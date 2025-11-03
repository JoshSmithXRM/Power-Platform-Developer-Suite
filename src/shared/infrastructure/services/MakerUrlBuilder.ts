import { IMakerUrlBuilder } from '../../domain/interfaces/IMakerUrlBuilder';

/**
 * Infrastructure implementation of IMakerUrlBuilder.
 * Constructs Power Platform Maker Portal URLs with support for sovereign clouds.
 */
export class MakerUrlBuilder implements IMakerUrlBuilder {
  constructor(private readonly baseUrl: string = 'https://make.powerapps.com') {}

  /**
   * Builds URL to view a specific solution in the Maker Portal.
   * @param environmentId - Power Platform environment ID
   * @param solutionId - Solution GUID
   * @returns Maker Portal solution URL
   */
  buildSolutionUrl(environmentId: string, solutionId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}`;
  }

  /**
   * Builds URL to edit a solution in classic Dynamics interface.
   * @param environmentId - Power Platform environment ID
   * @param solutionId - Solution GUID
   * @returns Classic Dynamics solution editor URL
   */
  buildDynamicsUrl(environmentId: string, solutionId: string): string {
    return `https://${environmentId}.dynamics.com/tools/solution/edit.aspx?id=${solutionId}`;
  }

  /**
   * Builds URL to view all solutions in an environment.
   * @param environmentId - Power Platform environment ID
   * @returns Maker Portal solutions list URL
   */
  buildSolutionsListUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions`;
  }

  /**
   * Builds URL to view solution import history.
   * @param environmentId - Power Platform environment ID
   * @returns Maker Portal import history URL
   */
  buildImportHistoryUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/importhistory`;
  }

  /**
   * Builds URL to view environment variables.
   * @param environmentId - Power Platform environment ID
   * @returns Maker Portal environment variables URL
   */
  buildEnvironmentVariablesUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/environmentvariables`;
  }

  /**
   * Builds URL to view flows (Power Automate) in an environment.
   * @param environmentId - Power Platform environment ID
   * @returns Maker Portal flows URL
   */
  buildFlowsUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/flows`;
  }
}
