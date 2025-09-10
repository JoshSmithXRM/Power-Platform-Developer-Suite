import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

export interface EnvironmentVariableDefinition {
    environmentvariabledefinitionid: string;
    displayname: string;
    schemaname: string;
    type: number;
    ismanaged: boolean;
    modifiedon: string;
    modifiedby: string;
    defaultvalue?: string;
}

export interface EnvironmentVariableValue {
    environmentvariablevalueid: string;
    environmentvariabledefinitionid: string;
    value: string;
    modifiedon: string;
    modifiedby: string;
}

export interface EnvironmentVariableData {
    definitions: EnvironmentVariableDefinition[];
    values: EnvironmentVariableValue[];
}

export class EnvironmentVariablesService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('EnvironmentVariablesService');
        }
        return this._logger;
    }
    
    constructor(private authService: AuthenticationService) {}

    async getEnvironmentVariables(environmentId: string, solutionId?: string): Promise<EnvironmentVariableData> {
        this.logger.info('Starting environment variables retrieval', { environmentId, solutionId });
        
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Environment not found');
        }

        this.logger.debug('Environment found', { 
            environmentId, 
            environmentName: environment.name,
            dataverseUrl: environment.settings.dataverseUrl 
        });

        const token = await this.authService.getAccessToken(environment.id);

        // Base URLs for API calls
        let definitionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariabledefinitions` +
            `?$select=environmentvariabledefinitionid,displayname,schemaname,type,ismanaged,modifiedon,defaultvalue` +
            `&$expand=modifiedby($select=fullname)`;

        let valuesUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariablevalues` +
            `?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value,modifiedon` +
            `&$expand=modifiedby($select=fullname)`;

        // If solution filtering is requested, get the solution component IDs
        if (solutionId && solutionId !== 'test-bypass') {
            const { ServiceFactory } = await import('./ServiceFactory');
            const solutionComponentService = ServiceFactory.getSolutionComponentService();
            
            // Get environment variable definition IDs in the solution
            const envVarIds = await solutionComponentService.getEnvironmentVariableIdsInSolution(environmentId, solutionId);
            this.logger.debug('Solution component environment variable IDs retrieved', { 
                environmentId, 
                solutionId, 
                environmentVariableIdsCount: envVarIds.length 
            });
            
            if (envVarIds.length > 0) {
                // Filter definitions by solution membership
                const definitionFilter = envVarIds.map(id => `environmentvariabledefinitionid eq ${id}`).join(' or ');
                definitionsUrl += `&$filter=(${definitionFilter})`;
                
                // Filter values by definition IDs
                const valueFilter = envVarIds.map(id => `_environmentvariabledefinitionid_value eq ${id}`).join(' or ');
                valuesUrl += `&$filter=(${valueFilter})`;
            } else {
                // No environment variables in solution, use impossible filter
                definitionsUrl += `&$filter=environmentvariabledefinitionid eq '00000000-0000-0000-0000-000000000000'`;
                valuesUrl += `&$filter=environmentvariablevalueid eq '00000000-0000-0000-0000-000000000000'`;
            }
        }

        this.logger.debug('Fetching environment variables data', {
            environmentId,
            solutionId,
            definitionsUrl,
            valuesUrl
        });

        const [definitionsResponse, valuesResponse] = await Promise.all([
            fetch(definitionsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            }),
            fetch(valuesUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            })
        ]);

        if (!definitionsResponse.ok) {
            this.logger.error('Failed to fetch environment variable definitions', new Error('API request failed'), {
                environmentId,
                solutionId,
                status: definitionsResponse.status,
                statusText: definitionsResponse.statusText
            });
            throw new Error(`Failed to fetch environment variable definitions: ${definitionsResponse.statusText}`);
        }

        if (!valuesResponse.ok) {
            this.logger.error('Failed to fetch environment variable values', new Error('API request failed'), {
                environmentId,
                solutionId,
                status: valuesResponse.status,
                statusText: valuesResponse.statusText
            });
            throw new Error(`Failed to fetch environment variable values: ${valuesResponse.statusText}`);
        }

        const definitionsData = await definitionsResponse.json();
        const valuesData = await valuesResponse.json();

        this.logger.debug('Environment variables data retrieved', {
            environmentId,
            solutionId,
            definitionsCount: definitionsData.value?.length || 0,
            valuesCount: valuesData.value?.length || 0
        });

        // Transform definitions data
        const definitions: EnvironmentVariableDefinition[] = (definitionsData.value || []).map((def: any) => ({
            environmentvariabledefinitionid: def.environmentvariabledefinitionid,
            displayname: def.displayname || '',
            schemaname: def.schemaname || '',
            type: def.type || 0,
            ismanaged: def.ismanaged || false,
            modifiedon: def.modifiedon || '',
            modifiedby: def.modifiedby?.fullname || '',
            defaultvalue: def.defaultvalue || ''
        }));

        // Transform values data
        const values: EnvironmentVariableValue[] = (valuesData.value || []).map((val: any) => ({
            environmentvariablevalueid: val.environmentvariablevalueid,
            environmentvariabledefinitionid: val._environmentvariabledefinitionid_value,
            value: val.value || '',
            modifiedon: val.modifiedon || '',
            modifiedby: val.modifiedby?.fullname || ''
        }));

        this.logger.info('Environment variables retrieval completed', {
            environmentId,
            solutionId,
            definitionsCount: definitions.length,
            valuesCount: values.length
        });

        return {
            definitions,
            values
        };
    }

    getTypeDisplayName(type: number): string {
        switch (type) {
            case 100000000: return 'String';
            case 100000001: return 'Number';
            case 100000002: return 'Boolean';
            case 100000003: return 'JSON';
            case 100000004: return 'Data Source';
            default: return 'Unknown';
        }
    }
}
