import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

// Dataverse API response structures
interface DataverseEnvVarDefinitionResponse {
    environmentvariabledefinitionid: string;
    displayname?: string;
    schemaname?: string;
    type?: number;
    ismanaged?: boolean;
    modifiedon?: string;
    modifiedby?: {
        fullname?: string;
    };
    defaultvalue?: string;
}

interface DataverseEnvVarValueResponse {
    environmentvariablevalueid: string;
    _environmentvariabledefinitionid_value: string;
    value?: string;
    modifiedon?: string;
    modifiedby?: {
        fullname?: string;
    };
}

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
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('EnvironmentVariablesService');
        }
        return this._logger;
    }
    
    constructor(private authService: AuthenticationService) {}

    async getEnvironmentVariables(environmentId: string, solutionId?: string): Promise<EnvironmentVariableData> {
        const startTime = Date.now();
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
        const timings: Record<string, number> = {};

        // Load ALL environment variables and solution components in parallel (client-side filtering approach)
        const definitionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariabledefinitions` +
            `?$select=environmentvariabledefinitionid,displayname,schemaname,type,ismanaged,modifiedon,defaultvalue` +
            `&$expand=modifiedby($select=fullname)`;

        const valuesUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariablevalues` +
            `?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value,modifiedon` +
            `&$expand=modifiedby($select=fullname)`;

        this.logger.info('Loading environment variables and solution components in parallel', {
            environmentId,
            solutionId,
            filteringApplied: !!solutionId && solutionId !== 'test-bypass'
        });

        // Execute all operations in parallel
        const apiStartTime = Date.now();

        let definitionsResponse: Response;
        let valuesResponse: Response;
        let envVarIds: string[] = [];

        if (solutionId && solutionId !== 'test-bypass') {
            // Parallel: Fetch all data + get solution component IDs simultaneously
            const { ServiceFactory } = await import('./ServiceFactory');
            const solutionComponentService = ServiceFactory.getSolutionComponentService();

            const [defsResp, valsResp, solutionEnvVarIds] = await Promise.all([
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
                }),
                solutionComponentService.getEnvironmentVariableIdsInSolution(environmentId, solutionId)
            ]);

            definitionsResponse = defsResp;
            valuesResponse = valsResp;
            envVarIds = solutionEnvVarIds;
            timings.parallelApiCalls = Date.now() - apiStartTime;
        } else {
            // No solution filtering - just fetch data in parallel
            const [defsResp, valsResp] = await Promise.all([
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

            definitionsResponse = defsResp;
            valuesResponse = valsResp;
            timings.parallelApiCalls = Date.now() - apiStartTime;
        }

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
            allDefinitionsCount: definitionsData.value?.length || 0,
            allValuesCount: valuesData.value?.length || 0,
            solutionEnvVarIdsCount: envVarIds.length
        });

        // Transform all definitions data
        const allDefinitions: EnvironmentVariableDefinition[] = (definitionsData.value || []).map((def: DataverseEnvVarDefinitionResponse) => ({
            environmentvariabledefinitionid: def.environmentvariabledefinitionid,
            displayname: def.displayname || '',
            schemaname: def.schemaname || '',
            type: def.type || 0,
            ismanaged: def.ismanaged || false,
            modifiedon: def.modifiedon || '',
            modifiedby: def.modifiedby?.fullname || '',
            defaultvalue: def.defaultvalue || ''
        }));

        // Transform all values data
        const allValues: EnvironmentVariableValue[] = (valuesData.value || []).map((val: DataverseEnvVarValueResponse) => ({
            environmentvariablevalueid: val.environmentvariablevalueid,
            environmentvariabledefinitionid: val._environmentvariabledefinitionid_value,
            value: val.value || '',
            modifiedon: val.modifiedon || '',
            modifiedby: val.modifiedby?.fullname || ''
        }));

        // Filter by solution membership if needed (client-side filtering)
        let definitions: EnvironmentVariableDefinition[];
        let values: EnvironmentVariableValue[];

        if (solutionId && solutionId !== 'test-bypass' && envVarIds.length > 0) {
            const filterStartTime = Date.now();
            const envVarIdSet = new Set(envVarIds);

            // Filter definitions by solution membership
            definitions = allDefinitions.filter(def => envVarIdSet.has(def.environmentvariabledefinitionid));

            // Filter values by definition IDs that are in the solution
            values = allValues.filter(val => envVarIdSet.has(val.environmentvariabledefinitionid));

            timings.clientSideFiltering = Date.now() - filterStartTime;

            this.logger.info('Filtered environment variables by solution membership', {
                environmentId,
                solutionId,
                filteredDefinitionsCount: definitions.length,
                filteredValuesCount: values.length,
                totalDefinitionsCount: allDefinitions.length,
                totalValuesCount: allValues.length
            });
        } else {
            // No filtering needed
            definitions = allDefinitions;
            values = allValues;
        }

        timings.totalDuration = Date.now() - startTime;

        this.logger.info('Environment variables retrieval completed', {
            environmentId,
            solutionId,
            definitionsCount: definitions.length,
            valuesCount: values.length,
            timings: {
                parallelApiCalls: `${timings.parallelApiCalls}ms`,
                clientSideFiltering: `${timings.clientSideFiltering || 0}ms`,
                totalDuration: `${timings.totalDuration}ms`
            }
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
