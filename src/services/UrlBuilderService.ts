import { EnvironmentConnection } from '../types';

export class UrlBuilderService {
    static buildMakerSolutionUrl(environment: EnvironmentConnection, solutionId: string): string {
        if (!environment.environmentId) {
            throw new Error('Environment ID not found');
        }
        return `https://make.powerapps.com/environments/${environment.environmentId}/solutions/${solutionId}`;
    }

    static buildClassicSolutionUrl(environment: EnvironmentConnection, solutionId: string): string {
        return `${environment.settings.dataverseUrl}/tools/solution/edit.aspx?id=${solutionId}`;
    }

    static buildDataverseApiUrl(environment: EnvironmentConnection, endpoint: string): string {
        return `${environment.settings.dataverseUrl}/api/data/v9.2/${endpoint}`;
    }

    static buildSolutionHistoryUrl(environment: EnvironmentConnection): string {
        if (!environment.environmentId) {
            throw new Error('Environment ID not found. Please configure the Environment ID in environment settings to view Solution History.');
        }
        return `https://make.powerapps.com/environments/${environment.environmentId}/solutionsHistory`;
    }
}
