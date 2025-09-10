import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

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
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('SolutionService');
        }
        return this._logger;
    }
    
    constructor(private authService: AuthenticationService) {}

    async getSolutions(environmentId: string): Promise<Solution[]> {
        this.logger.info('Starting solutions retrieval', { environmentId });
        
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Selected environment not found');
        }

        this.logger.debug('Environment found', { 
            environmentId, 
            environmentName: environment.name,
            dataverseUrl: environment.settings.dataverseUrl 
        });

        const token = await this.authService.getAccessToken(environment.id);

        const solutionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description&$expand=publisherid($select=friendlyname)&$orderby=friendlyname`;

        this.logger.debug('Fetching solutions data', {
            environmentId,
            environmentName: environment.name,
            solutionsUrl
        });

        const response = await fetch(solutionsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            this.logger.error('Failed to fetch solutions', new Error('API request failed'), {
                environmentId,
                status: response.status,
                statusText: response.statusText
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const solutions = data.value || [];

        this.logger.debug('Solutions data retrieved', {
            environmentId,
            solutionsCount: solutions.length
        });

        const mappedSolutions = solutions.map((solution: any) => ({
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

        // Ensure Default solution is first
        const defaultSolution = mappedSolutions.find((s: Solution) => s.uniqueName === 'Default');
        const otherSolutions = mappedSolutions.filter((s: Solution) => s.uniqueName !== 'Default');
        
        const orderedSolutions = defaultSolution ? [defaultSolution, ...otherSolutions] : mappedSolutions;

        this.logger.info('Solutions retrieval completed', {
            environmentId,
            totalSolutions: orderedSolutions.length,
            hasDefaultSolution: !!defaultSolution
        });
        
        return orderedSolutions;
    }
}
