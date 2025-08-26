import { RelationshipResult } from './ConnectionReferencesService';

export interface DeploymentSettings {
    connectionReferences: Record<string, any>[];
    environmentVariables?: Record<string, any>[];
}

export class DeploymentSettingsService {
    constructor() {}

    createSkeletonFromRelationships(rel: RelationshipResult): DeploymentSettings {
        const connectionReferences = rel.connectionReferences.map(cr => ({
            key: cr.name,
            value: {
                connectionReferenceLogicalName: cr.name,
                connectionId: cr.referencedConnectionId || null
            }
        }));

        return {
            connectionReferences,
            environmentVariables: []
        };
    }
}
