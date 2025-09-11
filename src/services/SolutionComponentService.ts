import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

export interface EntityDefinition {
    MetadataId: string;
    LogicalName: string;
    ObjectTypeCode: number;
}

export interface SolutionComponent {
    solutioncomponentid: string;
    objectid: string;
    componenttype: number;
    _solutionid_value: string;
    createdon: string;
    modifiedon: string;
}

export class SolutionComponentService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('SolutionComponentService');
        }
        return this._logger;
    }

    constructor(private authService: AuthenticationService) { }

    /**
     * Get the ObjectTypeCode for an entity by its logical name
     */
    async getEntityObjectTypeCode(environmentId: string, entityLogicalName: string): Promise<number | null> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);
        const apiUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions`;

        const params = new URLSearchParams({
            '$filter': `LogicalName eq '${entityLogicalName}'`,
            '$select': 'ObjectTypeCode,LogicalName,MetadataId'
        });

        const response = await fetch(`${apiUrl}?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entity definition: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const entities = data.value as EntityDefinition[];

        if (entities.length === 0) {
            this.logger.warn('Entity not found', { entityLogicalName });
            return null;
        }

        return entities[0].ObjectTypeCode;
    }

    /**
     * Get solution components for a specific solution and component type
     */
    async getSolutionComponents(environmentId: string, solutionId: string, componentType: number): Promise<SolutionComponent[]> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);
        const apiUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/solutioncomponents`;

        const params = new URLSearchParams({
            '$filter': `_solutionid_value eq '${solutionId}' and componenttype eq ${componentType}`,
            '$select': 'solutioncomponentid,objectid,componenttype,_solutionid_value,createdon,modifiedon'
        });

        const response = await fetch(`${apiUrl}?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch solution components: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.value as SolutionComponent[];
    }

    /**
     * Get object IDs for a specific entity type in a solution
     * @param environmentId The environment ID
     * @param solutionId The solution ID
     * @param entityLogicalName The logical name of the entity (e.g., 'connectionreference', 'environmentvariabledefinition', 'workflow')
     * @returns Array of object IDs that are part of the solution
     */
    async getEntityIdsInSolution(environmentId: string, solutionId: string, entityLogicalName: string): Promise<string[]> {
        // Get the object type code for the entity
        const objectTypeCode = await this.getEntityObjectTypeCode(environmentId, entityLogicalName);

        if (objectTypeCode === null) {
            this.logger.warn('Could not find ObjectTypeCode for entity', { entityLogicalName });
            return [];
        }

        // Get solution components for this entity type
        const solutionComponents = await this.getSolutionComponents(environmentId, solutionId, objectTypeCode);

        // Return the object IDs
        return solutionComponents.map(component => component.objectid);
    }

    /**
     * Get connection reference IDs in a specific solution
     */
    async getConnectionReferenceIdsInSolution(environmentId: string, solutionId: string): Promise<string[]> {
        return this.getEntityIdsInSolution(environmentId, solutionId, 'connectionreference');
    }

    /**
     * Get environment variable definition IDs in a specific solution
     */
    async getEnvironmentVariableIdsInSolution(environmentId: string, solutionId: string): Promise<string[]> {
        return this.getEntityIdsInSolution(environmentId, solutionId, 'environmentvariabledefinition');
    }

    /**
     * Get Cloud Flow IDs in a specific solution
     * Note: Cloud Flows are stored as "subscription" entities in solution components
     */
    async getCloudFlowIdsInSolution(environmentId: string, solutionId: string): Promise<string[]> {
        return this.getEntityIdsInSolution(environmentId, solutionId, 'subscription');
    }
}
