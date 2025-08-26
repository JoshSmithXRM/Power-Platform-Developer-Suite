import { AuthenticationService } from './AuthenticationService';

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
    constructor(private authService: AuthenticationService) {}

    async getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariableData> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // Fetch environment variable definitions - only essential fields
        const definitionsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariabledefinitions` +
            `?$select=environmentvariabledefinitionid,displayname,schemaname,type,ismanaged,modifiedon,defaultvalue` +
            `&$expand=modifiedby($select=fullname)`;

        // Fetch environment variable values - only essential fields
        const valuesUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/environmentvariablevalues` +
            `?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value,modifiedon` +
            `&$expand=modifiedby($select=fullname)`;

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
            throw new Error(`Failed to fetch environment variable definitions: ${definitionsResponse.statusText}`);
        }

        if (!valuesResponse.ok) {
            throw new Error(`Failed to fetch environment variable values: ${valuesResponse.statusText}`);
        }

        const definitionsData = await definitionsResponse.json();
        const valuesData = await valuesResponse.json();

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
