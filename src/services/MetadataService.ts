import { AuthenticationService } from './AuthenticationService';

// Entity Definition Interfaces
export interface EntityDefinition {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName: { UserLocalizedLabel: { Label: string } };
    Description: { UserLocalizedLabel: { Label: string } };
    EntitySetName: string;
    ObjectTypeCode: number;
    IsCustomEntity: boolean;
    IsManaged: boolean;
    IsActivity: boolean;
    IsCustomizable: { Value: boolean; CanBeChanged: boolean };
    CanCreateAttributes: { Value: boolean; CanBeChanged: boolean };
    CanCreateCharts: { Value: boolean; CanBeChanged: boolean };
    CanCreateForms: { Value: boolean; CanBeChanged: boolean };
    CanCreateViews: { Value: boolean; CanBeChanged: boolean };
    IntroducedVersion: string;
    PrimaryIdAttribute: string;
    PrimaryNameAttribute: string;
    OwnershipType: number;
    IsValidForQueue: { Value: boolean; CanBeChanged: boolean };
    IsConnectionsEnabled: { Value: boolean; CanBeChanged: boolean };
    IsDocumentManagementEnabled: boolean;
    IsMailMergeEnabled: { Value: boolean; CanBeChanged: boolean };
    IsAuditEnabled: { Value: boolean; CanBeChanged: boolean };
}

// Attribute Metadata Interfaces
export interface AttributeMetadata {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    AttributeType: string;
    AttributeTypeName: { Value: string };
    DisplayName: { UserLocalizedLabel: { Label: string } };
    Description: { UserLocalizedLabel: { Label: string } };
    RequiredLevel: { Value: string; CanBeChanged: boolean };
    IsCustomAttribute: boolean;
    IsManaged: boolean;
    IsPrimaryId: boolean;
    IsPrimaryName: boolean;
    IsValidForCreate: boolean;
    IsValidForRead: boolean;
    IsValidForUpdate: boolean;
    IsValidForAdvancedFind: { Value: boolean; CanBeChanged: boolean };
    IsAuditEnabled: { Value: boolean; CanBeChanged: boolean };
    IsSecured: boolean;
    IntroducedVersion: string;
    SourceType: number;
    // String-specific properties
    MaxLength?: number;
    Format?: string;
    FormatName?: { Value: string };
    // Lookup-specific properties
    Targets?: string[];
    // OptionSet-specific properties
    OptionSet?: OptionSetMetadata;
    GlobalOptionSet?: OptionSetMetadata;
    // Numeric-specific properties
    MinValue?: number;
    MaxValue?: number;
    Precision?: number;
    // DateTime-specific properties
    DateTimeBehavior?: { Value: string };
    // Boolean-specific properties
    DefaultValue?: boolean;
}

// Relationship Interfaces
export interface OneToManyRelationshipMetadata {
    MetadataId: string;
    SchemaName: string;
    ReferencingEntity: string;
    ReferencingAttribute: string;
    ReferencedEntity: string;
    ReferencedAttribute: string;
    RelationshipType: string;
    IsCustomRelationship: boolean;
    IsManaged: boolean;
    IsValidForAdvancedFind: boolean;
    IntroducedVersion: string;
    CascadeConfiguration: {
        Assign: string;
        Delete: string;
        Merge: string;
        Reparent: string;
        Share: string;
        Unshare: string;
    };
    AssociatedMenuConfiguration: {
        Behavior: string;
        Group: string;
        Label: { UserLocalizedLabel: { Label: string } };
        Order: number;
    };
    ReferencedEntityNavigationPropertyName: string;
    ReferencingEntityNavigationPropertyName: string;
}

export interface ManyToManyRelationshipMetadata {
    MetadataId: string;
    SchemaName: string;
    IntersectEntityName: string;
    Entity1LogicalName: string;
    Entity1IntersectAttribute: string;
    Entity2LogicalName: string;
    Entity2IntersectAttribute: string;
    IsCustomRelationship: boolean;
    IsManaged: boolean;
    IsValidForAdvancedFind: boolean;
    IntroducedVersion: string;
    Entity1NavigationPropertyName: string;
    Entity2NavigationPropertyName: string;
    Entity1AssociatedMenuConfiguration: {
        Behavior: string;
        Group: string;
        Label: { UserLocalizedLabel: { Label: string } };
        Order: number;
    };
    Entity2AssociatedMenuConfiguration: {
        Behavior: string;
        Group: string;
        Label: { UserLocalizedLabel: { Label: string } };
        Order: number;
    };
}

// Key Interfaces
export interface EntityKeyMetadata {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName: { UserLocalizedLabel: { Label: string } };
    KeyAttributes: string[];
    IsManaged: boolean;
    IntroducedVersion: string;
    EntityKeyIndexStatus: string;
}

// Option Set Interfaces
export interface OptionSetMetadata {
    MetadataId: string;
    Name: string;
    DisplayName: { UserLocalizedLabel: { Label: string } };
    Description: { UserLocalizedLabel: { Label: string } };
    IsCustomOptionSet: boolean;
    IsManaged: boolean;
    IsGlobal: boolean;
    IntroducedVersion: string;
    Options: OptionMetadata[];
    OptionSetType: string;
}

export interface OptionMetadata {
    Value: number;
    Label: { UserLocalizedLabel: { Label: string } };
    Description: { UserLocalizedLabel: { Label: string } };
    Color: string;
    IsManaged: boolean;
}

// Privilege Interfaces
export interface EntityPrivilegeMetadata {
    PrivilegeId: string;
    Name: string;
    PrivilegeType: string;
    CanBeBasic: boolean;
    CanBeDeep: boolean;
    CanBeGlobal: boolean;
    CanBeLocal: boolean;
}

// Solution Component Interfaces
export interface SolutionComponent {
    SolutionId: string;
    ComponentType: number;
    ObjectId: string;
    IsMetadata: boolean;
    RootComponentBehavior: number;
}

// Interface for complete entity metadata
export interface CompleteEntityMetadata {
    entity: EntityDefinition;
    attributes: AttributeMetadata[];
    keys: EntityKeyMetadata[];
    oneToManyRelationships: OneToManyRelationshipMetadata[];
    manyToOneRelationships: OneToManyRelationshipMetadata[];
    manyToManyRelationships: ManyToManyRelationshipMetadata[];
    privileges: EntityPrivilegeMetadata[];
}

export class MetadataService {
    private cache = new Map<string, any>();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(private authService: AuthenticationService) {}

    private getCacheKey(environmentId: string, operation: string, params?: string): string {
        return `${environmentId}:${operation}:${params || ''}`;
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.cacheTimeout;
    }

    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async getEntityDefinitions(environmentId: string): Promise<EntityDefinition[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityDefinitions');
        const cached = this.getFromCache<EntityDefinition[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        // Start with basic fields that are definitely available
        const selectFields = [
            'MetadataId', 'LogicalName', 'SchemaName', 'DisplayName', 'Description',
            'EntitySetName', 'ObjectTypeCode', 'IsCustomEntity', 'IsManaged',
            'IsActivity', 'IsCustomizable', 'IntroducedVersion',
            'PrimaryIdAttribute', 'PrimaryNameAttribute'
        ].join(',');

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions?$select=${selectFields}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('MetadataService API Error:', {
                status: response.status,
                statusText: response.statusText,
                url: url,
                errorText: errorText
            });
            throw new Error(`Failed to fetch entity definitions: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();
        const entities = data.value || [];
        
        // Sort client-side by LogicalName since server-side sorting isn't supported
        entities.sort((a: any, b: any) => {
            return (a.LogicalName || '').localeCompare(b.LogicalName || '');
        });
        
        this.setCache(cacheKey, entities);
        return entities;
    }

    async getEntityMetadata(environmentId: string, entityLogicalName: string): Promise<EntityDefinition> {
        const cacheKey = this.getCacheKey(environmentId, 'entityMetadata', entityLogicalName);
        const cached = this.getFromCache<EntityDefinition>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entity metadata: ${response.statusText}`);
        }

        const entity = await response.json();
        this.setCache(cacheKey, entity);
        return entity;
    }

    async getEntityAttributes(environmentId: string, entityLogicalName: string): Promise<AttributeMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityAttributes', entityLogicalName);
        const cached = this.getFromCache<AttributeMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$orderby=LogicalName`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entity attributes: ${response.statusText}`);
        }

        const data = await response.json();
        const attributes = data.value || [];
        
        this.setCache(cacheKey, attributes);
        return attributes;
    }

    async getEntityKeys(environmentId: string, entityLogicalName: string): Promise<EntityKeyMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityKeys', entityLogicalName);
        const cached = this.getFromCache<EntityKeyMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Keys`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entity keys: ${response.statusText}`);
        }

        const data = await response.json();
        const keys = data.value || [];
        
        this.setCache(cacheKey, keys);
        return keys;
    }

    async getOneToManyRelationships(environmentId: string, entityLogicalName: string): Promise<OneToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'oneToManyRelationships', entityLogicalName);
        const cached = this.getFromCache<OneToManyRelationshipMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/OneToManyRelationships?$orderby=SchemaName`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch one-to-many relationships: ${response.statusText}`);
        }

        const data = await response.json();
        const relationships = data.value || [];
        
        this.setCache(cacheKey, relationships);
        return relationships;
    }

    async getManyToOneRelationships(environmentId: string, entityLogicalName: string): Promise<OneToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'manyToOneRelationships', entityLogicalName);
        const cached = this.getFromCache<OneToManyRelationshipMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/ManyToOneRelationships?$orderby=SchemaName`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch many-to-one relationships: ${response.statusText}`);
        }

        const data = await response.json();
        const relationships = data.value || [];
        
        this.setCache(cacheKey, relationships);
        return relationships;
    }

    async getManyToManyRelationships(environmentId: string, entityLogicalName: string): Promise<ManyToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'manyToManyRelationships', entityLogicalName);
        const cached = this.getFromCache<ManyToManyRelationshipMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/ManyToManyRelationships?$orderby=SchemaName`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch many-to-many relationships: ${response.statusText}`);
        }

        const data = await response.json();
        const relationships = data.value || [];
        
        this.setCache(cacheKey, relationships);
        return relationships;
    }

    async getEntityPrivileges(environmentId: string, entityLogicalName: string): Promise<EntityPrivilegeMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityPrivileges', entityLogicalName);
        const cached = this.getFromCache<EntityPrivilegeMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Privileges`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entity privileges: ${response.statusText}`);
        }

        const data = await response.json();
        const privileges = data.value || [];
        
        this.setCache(cacheKey, privileges);
        return privileges;
    }

    async getGlobalOptionSets(environmentId: string): Promise<OptionSetMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'globalOptionSets');
        const cached = this.getFromCache<OptionSetMetadata[]>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/GlobalOptionSetDefinitions`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch global option sets: ${response.statusText}`);
        }

        const data = await response.json();
        const optionSets = data.value || [];
        
        // Sort client-side by Name since server-side sorting isn't supported
        optionSets.sort((a: any, b: any) => {
            return (a.Name || '').localeCompare(b.Name || '');
        });
        
        this.setCache(cacheKey, optionSets);
        return optionSets;
    }

    async getOptionSetMetadata(environmentId: string, optionSetName: string): Promise<OptionSetMetadata> {
        const cacheKey = this.getCacheKey(environmentId, 'optionSetMetadata', optionSetName);
        const cached = this.getFromCache<OptionSetMetadata>(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/GlobalOptionSetDefinitions(Name='${optionSetName}')`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch option set metadata: ${response.statusText}`);
        }

        const optionSet = await response.json();
        this.setCache(cacheKey, optionSet);
        return optionSet;
    }

    async getCompleteEntityMetadata(environmentId: string, entityLogicalName: string): Promise<CompleteEntityMetadata> {
        const cacheKey = this.getCacheKey(environmentId, 'completeEntityMetadata', entityLogicalName);
        const cached = this.getFromCache<CompleteEntityMetadata>(cacheKey);
        if (cached) return cached;

        // Load all metadata in parallel for better performance
        const [
            entity,
            attributes,
            keys,
            oneToManyRelationships,
            manyToOneRelationships,
            manyToManyRelationships,
            privileges
        ] = await Promise.all([
            this.getEntityMetadata(environmentId, entityLogicalName),
            this.getEntityAttributes(environmentId, entityLogicalName),
            this.getEntityKeys(environmentId, entityLogicalName),
            this.getOneToManyRelationships(environmentId, entityLogicalName),
            this.getManyToOneRelationships(environmentId, entityLogicalName),
            this.getManyToManyRelationships(environmentId, entityLogicalName),
            this.getEntityPrivileges(environmentId, entityLogicalName)
        ]);

        const completeMetadata: CompleteEntityMetadata = {
            entity,
            attributes,
            keys,
            oneToManyRelationships,
            manyToOneRelationships,
            manyToManyRelationships,
            privileges
        };

        this.setCache(cacheKey, completeMetadata);
        return completeMetadata;
    }

    // Utility methods for display
    getDisplayName(displayName: { UserLocalizedLabel: { Label: string } } | null): string {
        return displayName?.UserLocalizedLabel?.Label || '';
    }

    getDescription(description: { UserLocalizedLabel: { Label: string } } | null): string {
        return description?.UserLocalizedLabel?.Label || '';
    }

    getAttributeTypeName(attributeTypeName: { Value: string } | null): string {
        return attributeTypeName?.Value || '';
    }

    getRequiredLevelName(requiredLevel: { Value: string; CanBeChanged: boolean } | null): string {
        switch (requiredLevel?.Value) {
            case 'None': return 'Optional';
            case 'SystemRequired': return 'System Required';
            case 'ApplicationRequired': return 'Business Required';
            case 'Recommended': return 'Business Recommended';
            default: return requiredLevel?.Value || 'Unknown';
        }
    }

    getBooleanValue(booleanProperty: { Value: boolean; CanBeChanged: boolean } | boolean | null): boolean {
        if (typeof booleanProperty === 'boolean') return booleanProperty;
        return booleanProperty?.Value || false;
    }

    canBeChanged(property: { Value: any; CanBeChanged: boolean } | null): boolean {
        return property?.CanBeChanged || false;
    }

    clearCache(): void {
        this.cache.clear();
    }
}