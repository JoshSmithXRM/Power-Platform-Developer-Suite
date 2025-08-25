import { AuthenticationService } from './AuthenticationService';

export interface Solution {
    solutionId: string;
    uniqueName: string;
    friendlyName: string;
    displayName?: string;
    version: string;
    isManaged: boolean;
    publisherName: string;
    installedOn?: string;
    description?: string;
}

export class SolutionService {
    constructor(private authService: AuthenticationService) {}

    async getSolutions(environmentId: string): Promise<Solution[]> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Selected environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        const solutionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description&$expand=publisherid($select=friendlyname)&$orderby=friendlyname`;

        const response = await fetch(solutionsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const solutions = data.value || [];

        return solutions.map((solution: any) => ({
            solutionId: solution.solutionid,
            uniqueName: solution.uniquename,
            friendlyName: solution.friendlyname || solution.displayname,
            displayName: solution.displayname,
            version: solution.version,
            isManaged: solution.ismanaged,
            publisherName: solution.publisherid?.friendlyname || 'Unknown',
            installedOn: solution.installedon,
            description: solution.description
        }));
    }
}
