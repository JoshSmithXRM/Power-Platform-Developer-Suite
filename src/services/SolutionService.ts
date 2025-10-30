import { parseODataResponse } from '../utils/ODataValidator';

import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

// Dataverse API response structure for solutions
interface DataverseSolutionResponse {
    solutionid: string;
    uniquename: string;
    friendlyname?: string;
    displayname?: string;
    version?: string;
    ismanaged?: boolean;
    _publisherid_value?: string;
    'publisherid@OData.Community.Display.V1.FormattedValue'?: string;
    publisherid?: {
        friendlyname?: string;
    };
    installedon?: string;
    description?: string;
}

export interface Solution {
    id: string;              // Using 'id' to match SolutionSelectorComponent expectations
    solutionId: string;      // Keep for backward compatibility
    uniqueName: string;
    friendlyName: string;
    displayName: string;
    version: string;
    isManaged: boolean;
    isVisible: boolean;      // Required by SolutionSelectorComponent
    publisherId: string;     // Required by SolutionSelectorComponent
    publisherName: string;
    installedOn?: string;
    description?: string;
    components?: {           // Required by SolutionSelectorComponent
        entities: number;
        workflows: number;
        webResources: number;
        plugins: number;
        customControls: number;
        total: number;
    };
}

export class SolutionService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
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

        const data = parseODataResponse<DataverseSolutionResponse>(await response.json());
        const solutions = data.value || [];

        this.logger.debug('Solutions data retrieved', {
            environmentId,
            solutionsCount: solutions.length
        });

        const mappedSolutions = solutions.map((solution: DataverseSolutionResponse) => ({
            id: solution.solutionid,                                    // Primary id field for components
            solutionId: solution.solutionid,                           // Backward compatibility
            uniqueName: solution.uniquename,
            friendlyName: solution.friendlyname || solution.displayname || solution.uniquename,
            displayName: solution.friendlyname || solution.displayname || solution.uniquename,
            version: solution.version || '1.0',
            isManaged: solution.ismanaged || false,
            isVisible: true,                                           // All solutions are visible by default
            publisherId: solution._publisherid_value || '',            // Publisher GUID
            publisherName: solution.publisherid?.friendlyname || 'Unknown Publisher',
            installedOn: solution.installedon,
            description: solution.description || '',
            components: {                                              // Component stats (can be enhanced later)
                entities: 0,
                workflows: 0,
                webResources: 0,
                plugins: 0,
                customControls: 0,
                total: 0
            }
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
