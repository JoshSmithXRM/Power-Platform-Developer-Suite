import { IMakerUrlBuilder } from '../../domain/interfaces/IMakerUrlBuilder';

/**
 * Infrastructure implementation of IMakerUrlBuilder.
 * Constructs Power Platform Maker Portal URLs with support for sovereign clouds.
 */
export class MakerUrlBuilder implements IMakerUrlBuilder {
  constructor(private readonly baseUrl: string = 'https://make.powerapps.com') {}

  buildSolutionUrl(environmentId: string, solutionId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}`;
  }

  buildDynamicsUrl(environmentId: string, solutionId: string): string {
    return `https://${environmentId}.dynamics.com/tools/solution/edit.aspx?id=${solutionId}`;
  }

  buildSolutionsListUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions`;
  }

  buildImportHistoryUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/importhistory`;
  }

  buildEnvironmentVariablesUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/environmentvariables`;
  }

  buildFlowsUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/flows`;
  }
}
