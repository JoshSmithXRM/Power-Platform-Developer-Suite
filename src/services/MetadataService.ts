import { parseODataResponse, parseODataSingleResponse } from '../utils/ODataValidator';

import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

// Entity Definition Interfaces - Made comprehensive to handle all fields from API
export interface EntityDefinition {
    // Core identification
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName: { UserLocalizedLabel: { Label: string } };
    Description: { UserLocalizedLabel: { Label: string } };
    DisplayCollectionName?: { UserLocalizedLabel: { Label: string } };
    EntitySetName: string;
    LogicalCollectionName?: string;
    CollectionSchemaName?: string;
    ObjectTypeCode: number;

    // Entity classification and type
    IsCustomEntity: boolean;
    IsManaged: boolean;
    IsActivity: boolean;
    IsActivityParty?: boolean;
    IsChildEntity?: boolean;
    IsIntersect?: boolean;
    IsLogicalEntity?: boolean;
    IsPrivate?: boolean;
    IsSolutionAware?: boolean;
    TableType?: string;

    // Primary attributes
    PrimaryIdAttribute: string;
    PrimaryNameAttribute?: string;
    PrimaryImageAttribute?: string;

    // Ownership
    OwnershipType: number | string;
    OwnerId?: string;
    OwnerIdType?: number;
    OwningBusinessUnit?: string;

    // Capabilities - managed properties
    IsCustomizable: { Value: boolean; CanBeChanged: boolean };
    IsRenameable?: { Value: boolean; CanBeChanged: boolean };
    IsMappable?: { Value: boolean; CanBeChanged: boolean };
    CanCreateAttributes: { Value: boolean; CanBeChanged: boolean };
    CanCreateCharts: { Value: boolean; CanBeChanged: boolean };
    CanCreateForms: { Value: boolean; CanBeChanged: boolean };
    CanCreateViews: { Value: boolean; CanBeChanged: boolean };
    CanBeRelatedEntityInRelationship?: { Value: boolean; CanBeChanged: boolean };
    CanBePrimaryEntityInRelationship?: { Value: boolean; CanBeChanged: boolean };
    CanBeInManyToMany?: { Value: boolean; CanBeChanged: boolean };
    CanBeInCustomEntityAssociation?: { Value: boolean; CanBeChanged: boolean };

    // Feature flags
    IsAuditEnabled: { Value: boolean; CanBeChanged: boolean };
    IsValidForQueue?: { Value: boolean; CanBeChanged: boolean };
    IsConnectionsEnabled?: { Value: boolean; CanBeChanged: boolean };
    IsDocumentManagementEnabled?: boolean;
    IsOneNoteIntegrationEnabled?: boolean;
    IsInteractionCentricEnabled?: boolean;
    IsKnowledgeManagementEnabled?: boolean;
    IsSLAEnabled?: boolean;
    IsBPFEntity?: boolean;
    IsDocumentRecommendationsEnabled?: boolean;
    IsMSTeamsIntegrationEnabled?: boolean;
    IsMailMergeEnabled?: { Value: boolean; CanBeChanged: boolean };
    IsEnabledForCharts?: boolean;
    IsEnabledForTrace?: boolean;
    IsValidForAdvancedFind?: boolean;
    IsBusinessProcessEnabled?: boolean;
    IsOptimisticConcurrencyEnabled?: boolean;
    ChangeTrackingEnabled?: boolean;
    IsImportable?: boolean;
    IsQuickCreateEnabled?: boolean;
    IsReadingPaneEnabled?: boolean;
    IsDuplicateDetectionEnabled?: { Value: boolean; CanBeChanged: boolean };

    // Mobile and offline capabilities
    IsVisibleInMobile?: { Value: boolean; CanBeChanged: boolean };
    IsVisibleInMobileClient?: { Value: boolean; CanBeChanged: boolean };
    IsReadOnlyInMobileClient?: { Value: boolean; CanBeChanged: boolean };
    IsOfflineInMobileClient?: { Value: boolean; CanBeChanged: boolean };
    IsAvailableOffline?: boolean;
    MobileOfflineFilters?: string;

    // External integration
    IsEnabledForExternalChannels?: boolean;
    SyncToExternalSearchIndex?: boolean;
    CanEnableSyncToExternalSearchIndex?: { Value: boolean; CanBeChanged: boolean };
    UsesBusinessDataLabelTable?: boolean;

    // Audit and compliance
    IsRetrieveAuditEnabled?: boolean;
    IsRetrieveMultipleAuditEnabled?: boolean;
    IsArchivalEnabled?: boolean;
    IsRetentionEnabled?: boolean;

    // Workflow and automation
    CanTriggerWorkflow?: boolean;
    IsStateModelAware?: boolean;
    EnforceStateTransitions?: boolean;
    AutoRouteToOwnerQueue?: boolean;

    // Clustering and replication
    ClusterMode?: string;
    CanChangeClusterMode?: boolean;
    AutoReplicateClusterRecords?: boolean;

    // Metadata and versioning
    IntroducedVersion: string;
    HasChanged?: boolean;
    CreatedOn?: string;
    ModifiedOn?: string;
    IsAIRUpdated?: boolean;

    // Additional metadata
    DaysSinceRecordLastModified?: number;
    ReportViewName?: string;
    EntityColor?: string;
    HasNotes?: boolean;
    HasActivities?: boolean;
    HasFeedback?: boolean;
    HasEmailAddresses?: boolean;
    AutoCreateAccessTeams?: boolean;

    // Icon properties
    IconLargeName?: string;
    IconMediumName?: string;
    IconSmallName?: string;
    IconVectorName?: string;

    // Additional capabilities
    CanModifyAdditionalSettings?: { Value: boolean; CanBeChanged: boolean };
    CanChangeHierarchicalRelationship?: { Value: boolean; CanBeChanged: boolean };
    CanChangeTrackingBeEnabled?: { Value: boolean; CanBeChanged: boolean };
    RecurrenceBaseEntityLogicalName?: string;

    // External system integration
    DataProviderId?: string;
    DataSourceId?: string;
    ExternalName?: string;
    ExternalCollectionName?: string;

    // Activity specific
    ActivityTypeMask?: number;

    // Solution context
    SettingOf?: string;

    // Help and documentation
    EntityHelpUrlEnabled?: boolean;
    EntityHelpUrl?: string;

    // Additional fields for any other properties that might come back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PrimaryKey?: any[];
    Privileges?: EntityPrivilegeMetadata[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Settings?: any[];

    // Allow for additional dynamic properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HasChanged?: any;
    SchemaName: string;
    SecurityTypes: string;
    IsCustomRelationship: boolean;
    IsValidForAdvancedFind: boolean;
    IsManaged: boolean;
    RelationshipType: string;
    IntroducedVersion: string;
    ReferencedAttribute: string;
    ReferencedEntity: string;
    ReferencingAttribute: string;
    ReferencingEntity: string;
    IsHierarchical: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EntityKey?: any;
    IsRelationshipAttributeDenormalized: boolean;
    ReferencedEntityNavigationPropertyName: string;
    ReferencingEntityNavigationPropertyName: string;
    RelationshipBehavior: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IsDenormalizedLookup?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DenormalizedAttributeName?: any;
    IsCustomizable: {
        Value: boolean;
        CanBeChanged: boolean;
        ManagedPropertyLogicalName: string;
    };
    AssociatedMenuConfiguration: {
        Behavior: string;
        Group: string;
        Order?: number;
        IsCustomizable: boolean;
        Icon?: string;
        ViewId: string;
        AvailableOffline: boolean;
        MenuId?: string;
        QueryApi?: string;
        Label: {
            LocalizedLabels: Array<{
                Label: string;
                LanguageCode: number;
                IsManaged: boolean;
                MetadataId: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                HasChanged?: any;
            }>;
            UserLocalizedLabel?: {
                Label: string;
                LanguageCode: number;
                IsManaged: boolean;
                MetadataId: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                HasChanged?: any;
            } | null;
        };
    };
    CascadeConfiguration: {
        Assign: string;
        Delete: string;
        Archive: string;
        Merge: string;
        Reparent: string;
        Share: string;
        Unshare: string;
        RollupView: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RelationshipAttributes: any[];
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
    // Boolean-specific properties
    TrueOption?: OptionMetadata;
    FalseOption?: OptionMetadata;
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

// Discriminated union cache entry types for type-safe caching
type CachedEntityDefinitions = {
    type: 'EntityDefinitions';
    data: EntityDefinition[];
    timestamp: number;
};

type CachedEntityMetadata = {
    type: 'EntityMetadata';
    data: EntityDefinition;
    timestamp: number;
};

type CachedAttributeMetadata = {
    type: 'AttributeMetadata';
    data: AttributeMetadata[];
    timestamp: number;
};

type CachedEntityKeys = {
    type: 'EntityKeys';
    data: EntityKeyMetadata[];
    timestamp: number;
};

type CachedOneToManyRelationships = {
    type: 'OneToManyRelationships';
    data: OneToManyRelationshipMetadata[];
    timestamp: number;
};

type CachedManyToOneRelationships = {
    type: 'ManyToOneRelationships';
    data: OneToManyRelationshipMetadata[];
    timestamp: number;
};

type CachedManyToManyRelationships = {
    type: 'ManyToManyRelationships';
    data: ManyToManyRelationshipMetadata[];
    timestamp: number;
};

type CachedEntityPrivileges = {
    type: 'EntityPrivileges';
    data: EntityPrivilegeMetadata[];
    timestamp: number;
};

type CachedGlobalOptionSets = {
    type: 'GlobalOptionSets';
    data: OptionSetMetadata[];
    timestamp: number;
};

type CachedOptionSetMetadata = {
    type: 'OptionSetMetadata';
    data: OptionSetMetadata;
    timestamp: number;
};

type CachedCompleteEntityMetadata = {
    type: 'CompleteEntityMetadata';
    data: CompleteEntityMetadata;
    timestamp: number;
};

type MetadataCacheEntry =
    | CachedEntityDefinitions
    | CachedEntityMetadata
    | CachedAttributeMetadata
    | CachedEntityKeys
    | CachedOneToManyRelationships
    | CachedManyToOneRelationships
    | CachedManyToManyRelationships
    | CachedEntityPrivileges
    | CachedGlobalOptionSets
    | CachedOptionSetMetadata
    | CachedCompleteEntityMetadata;

export class MetadataService {
    private static readonly DEFAULT_CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    private cache = new Map<string, MetadataCacheEntry>();
    private cacheTimeout = MetadataService.DEFAULT_CACHE_TIMEOUT_MS;
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('MetadataService');
        }
        return this._logger;
    }

    constructor(private authService: AuthenticationService) { }

    private getCacheKey(environmentId: string, operation: string, params?: string): string {
        return `${environmentId}:${operation}:${params || ''}`;
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.cacheTimeout;
    }

    private getCachedEntityDefinitions(key: string): EntityDefinition[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'EntityDefinitions' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheEntityDefinitions(key: string, data: EntityDefinition[]): void {
        this.cache.set(key, {
            type: 'EntityDefinitions',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedEntityMetadata(key: string): EntityDefinition | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'EntityMetadata' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheEntityMetadata(key: string, data: EntityDefinition): void {
        this.cache.set(key, {
            type: 'EntityMetadata',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedAttributeMetadata(key: string): AttributeMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'AttributeMetadata' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheAttributeMetadata(key: string, data: AttributeMetadata[]): void {
        this.cache.set(key, {
            type: 'AttributeMetadata',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedEntityKeys(key: string): EntityKeyMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'EntityKeys' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheEntityKeys(key: string, data: EntityKeyMetadata[]): void {
        this.cache.set(key, {
            type: 'EntityKeys',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedOneToManyRelationships(key: string): OneToManyRelationshipMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'OneToManyRelationships' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheOneToManyRelationships(key: string, data: OneToManyRelationshipMetadata[]): void {
        this.cache.set(key, {
            type: 'OneToManyRelationships',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedManyToOneRelationships(key: string): OneToManyRelationshipMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'ManyToOneRelationships' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheManyToOneRelationships(key: string, data: OneToManyRelationshipMetadata[]): void {
        this.cache.set(key, {
            type: 'ManyToOneRelationships',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedManyToManyRelationships(key: string): ManyToManyRelationshipMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'ManyToManyRelationships' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheManyToManyRelationships(key: string, data: ManyToManyRelationshipMetadata[]): void {
        this.cache.set(key, {
            type: 'ManyToManyRelationships',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedEntityPrivileges(key: string): EntityPrivilegeMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'EntityPrivileges' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheEntityPrivileges(key: string, data: EntityPrivilegeMetadata[]): void {
        this.cache.set(key, {
            type: 'EntityPrivileges',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedGlobalOptionSets(key: string): OptionSetMetadata[] | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'GlobalOptionSets' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheGlobalOptionSets(key: string, data: OptionSetMetadata[]): void {
        this.cache.set(key, {
            type: 'GlobalOptionSets',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedOptionSetMetadata(key: string): OptionSetMetadata | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'OptionSetMetadata' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheOptionSetMetadata(key: string, data: OptionSetMetadata): void {
        this.cache.set(key, {
            type: 'OptionSetMetadata',
            data,
            timestamp: Date.now()
        });
    }

    private getCachedCompleteEntityMetadata(key: string): CompleteEntityMetadata | null {
        const cached = this.cache.get(key);
        if (cached && cached.type === 'CompleteEntityMetadata' && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    private setCacheCompleteEntityMetadata(key: string, data: CompleteEntityMetadata): void {
        this.cache.set(key, {
            type: 'CompleteEntityMetadata',
            data,
            timestamp: Date.now()
        });
    }

    async getEntityDefinitions(environmentId: string): Promise<EntityDefinition[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityDefinitions');
        const cached = this.getCachedEntityDefinitions(cacheKey);
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
            this.logger.error('MetadataService API Error', new Error(`${response.status} ${response.statusText}: ${errorText}`), {
                status: response.status,
                statusText: response.statusText,
                url: url
            });
            throw new Error(`Failed to fetch entity definitions: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const data = parseODataResponse<EntityDefinition>(await response.json());
        const entities = data.value || [];

        // Sort client-side by LogicalName since server-side sorting isn't supported
        entities.sort((a: EntityDefinition, b: EntityDefinition) => {
            return (a.LogicalName || '').localeCompare(b.LogicalName || '');
        });

        this.setCacheEntityDefinitions(cacheKey, entities);
        return entities;
    }

    async getEntityMetadata(environmentId: string, entityLogicalName: string): Promise<EntityDefinition> {
        const cacheKey = this.getCacheKey(environmentId, 'entityMetadata', entityLogicalName);
        const cached = this.getCachedEntityMetadata(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);

        // Remove field filtering - get ALL metadata fields for complete entity metadata
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

        const entity = parseODataSingleResponse<EntityDefinition>(await response.json());
        this.setCacheEntityMetadata(cacheKey, entity);
        return entity;
    }

    async getEntityAttributes(environmentId: string, entityLogicalName: string): Promise<AttributeMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityAttributes', entityLogicalName);
        const cached = this.getCachedAttributeMetadata(cacheKey);
        if (cached) return cached;

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        };

        // Parallel fetch: normal attributes + all OptionSet-based attribute types with expanded data
        const [
            normalResponse,
            picklistResponse,
            stateResponse,
            statusResponse,
            booleanResponse,
            multiSelectResponse
        ] = await Promise.all([
            // Query 1: Get all attributes (includes Lookup.Targets by default)
            fetch(`${baseUrl}/Attributes?$orderby=LogicalName`, { headers }),

            // Query 2: PicklistAttributeMetadata with OptionSet expanded
            fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`, { headers }),

            // Query 3: StateAttributeMetadata with OptionSet expanded
            fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),

            // Query 4: StatusAttributeMetadata with OptionSet expanded
            fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),

            // Query 5: BooleanAttributeMetadata with OptionSet expanded
            fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),

            // Query 6: MultiSelectPicklistAttributeMetadata with OptionSet expanded
            fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`, { headers })
        ]);

        if (!normalResponse.ok) {
            throw new Error(`Failed to fetch entity attributes: ${normalResponse.statusText}`);
        }

        const normalData = parseODataResponse<AttributeMetadata>(await normalResponse.json());
        const attributes = normalData.value || [];

        // Helper function to merge OptionSet data from typed queries
        const mergeOptionSetData = async (
            response: Response,
            typeName: string
        ): Promise<{ merged: number; total: number }> => {
            if (!response.ok) {
                this.logger.warn(`Failed to fetch ${typeName}, continuing without OptionSet data`, {
                    entityLogicalName,
                    status: response.status,
                    statusText: response.statusText
                });
                return { merged: 0, total: 0 };
            }

            const data = parseODataResponse<AttributeMetadata>(await response.json());
            const typedAttributes = data.value || [];

            // Create a map of typed attributes by MetadataId for fast lookup
            const typedMap = new Map<string, AttributeMetadata>(
                typedAttributes.map((attr: AttributeMetadata) => [attr.MetadataId, attr])
            );

            // Merge OptionSet and GlobalOptionSet data into the main attributes array
            let mergedCount = 0;
            attributes.forEach((attr: AttributeMetadata) => {
                const typedAttr = typedMap.get(attr.MetadataId);
                if (typedAttr) {
                    attr.OptionSet = typedAttr.OptionSet;
                    attr.GlobalOptionSet = typedAttr.GlobalOptionSet;
                    mergedCount++;
                }
            });

            return { merged: mergedCount, total: typedAttributes.length };
        };

        // Merge OptionSet data from all typed queries (run sequentially for logging)
        const mergeResults = {
            picklist: await mergeOptionSetData(picklistResponse, 'PicklistAttributeMetadata'),
            state: await mergeOptionSetData(stateResponse, 'StateAttributeMetadata'),
            status: await mergeOptionSetData(statusResponse, 'StatusAttributeMetadata'),
            boolean: await mergeOptionSetData(booleanResponse, 'BooleanAttributeMetadata'),
            multiSelect: await mergeOptionSetData(multiSelectResponse, 'MultiSelectPicklistAttributeMetadata')
        };

        const totalMerged = mergeResults.picklist.merged +
                           mergeResults.state.merged +
                           mergeResults.status.merged +
                           mergeResults.boolean.merged +
                           mergeResults.multiSelect.merged;

        this.logger.info('Entity attributes loaded with OptionSet data', {
            entityLogicalName,
            totalAttributes: attributes.length,
            mergedBreakdown: {
                picklist: `${mergeResults.picklist.merged}/${mergeResults.picklist.total}`,
                state: `${mergeResults.state.merged}/${mergeResults.state.total}`,
                status: `${mergeResults.status.merged}/${mergeResults.status.total}`,
                boolean: `${mergeResults.boolean.merged}/${mergeResults.boolean.total}`,
                multiSelect: `${mergeResults.multiSelect.merged}/${mergeResults.multiSelect.total}`
            },
            totalMerged
        });

        this.setCacheAttributeMetadata(cacheKey, attributes);
        return attributes;
    }

    async getEntityKeys(environmentId: string, entityLogicalName: string): Promise<EntityKeyMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityKeys', entityLogicalName);
        const cached = this.getCachedEntityKeys(cacheKey);
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

        const data = parseODataResponse<EntityKeyMetadata>(await response.json());
        const keys = data.value || [];

        this.setCacheEntityKeys(cacheKey, keys);
        return keys;
    }

    async getOneToManyRelationships(environmentId: string, entityLogicalName: string): Promise<OneToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'oneToManyRelationships', entityLogicalName);
        const cached = this.getCachedOneToManyRelationships(cacheKey);
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

        const data = parseODataResponse<OneToManyRelationshipMetadata>(await response.json());
        const relationships = data.value || [];

        this.setCacheOneToManyRelationships(cacheKey, relationships);
        return relationships;
    }

    async getManyToOneRelationships(environmentId: string, entityLogicalName: string): Promise<OneToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'manyToOneRelationships', entityLogicalName);
        const cached = this.getCachedManyToOneRelationships(cacheKey);
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

        const data = parseODataResponse<OneToManyRelationshipMetadata>(await response.json());
        const relationships = data.value || [];

        this.setCacheManyToOneRelationships(cacheKey, relationships);
        return relationships;
    }

    async getManyToManyRelationships(environmentId: string, entityLogicalName: string): Promise<ManyToManyRelationshipMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'manyToManyRelationships', entityLogicalName);
        const cached = this.getCachedManyToManyRelationships(cacheKey);
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

        const data = parseODataResponse<ManyToManyRelationshipMetadata>(await response.json());
        const relationships = data.value || [];

        this.setCacheManyToManyRelationships(cacheKey, relationships);
        return relationships;
    }

    async getEntityPrivileges(environmentId: string, entityLogicalName: string): Promise<EntityPrivilegeMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'entityPrivileges', entityLogicalName);
        const cached = this.getCachedEntityPrivileges(cacheKey);
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

        const data = parseODataResponse<EntityPrivilegeMetadata>(await response.json());
        const privileges = data.value || [];

        this.setCacheEntityPrivileges(cacheKey, privileges);
        return privileges;
    }

    async getGlobalOptionSets(environmentId: string): Promise<OptionSetMetadata[]> {
        const cacheKey = this.getCacheKey(environmentId, 'globalOptionSets');
        const cached = this.getCachedGlobalOptionSets(cacheKey);
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

        const data = parseODataResponse<OptionSetMetadata>(await response.json());
        const optionSets = data.value || [];

        // Sort client-side by Name since server-side sorting isn't supported
        optionSets.sort((a: OptionSetMetadata, b: OptionSetMetadata) => {
            return (a.Name || '').localeCompare(b.Name || '');
        });

        this.setCacheGlobalOptionSets(cacheKey, optionSets);
        return optionSets;
    }

    async getOptionSetMetadata(environmentId: string, optionSetName: string): Promise<OptionSetMetadata> {
        const cacheKey = this.getCacheKey(environmentId, 'optionSetMetadata', optionSetName);
        const cached = this.getCachedOptionSetMetadata(cacheKey);
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

        const optionSet = parseODataSingleResponse<OptionSetMetadata>(await response.json());
        this.setCacheOptionSetMetadata(cacheKey, optionSet);
        return optionSet;
    }

    async getCompleteEntityMetadata(environmentId: string, entityLogicalName: string): Promise<CompleteEntityMetadata> {
        const cacheKey = this.getCacheKey(environmentId, 'completeEntityMetadata', entityLogicalName);
        const cached = this.getCachedCompleteEntityMetadata(cacheKey);
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

        this.setCacheCompleteEntityMetadata(cacheKey, completeMetadata);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canBeChanged(property: { Value: any; CanBeChanged: boolean } | null): boolean {
        return property?.CanBeChanged || false;
    }

    // OneToMany Relationship helper methods
    getRelationshipBehaviorName(behavior: number): string {
        switch (behavior) {
            case 0: return 'Parental';
            case 1: return 'Referential';
            case 2: return 'Configurable Cascading';
            default: return `Unknown (${behavior})`;
        }
    }

    getCascadeValue(cascade: string): string {
        switch (cascade) {
            case 'NoCascade': return 'None';
            case 'Cascade': return 'Cascade All';
            case 'Active': return 'Cascade Active';
            case 'UserOwned': return 'Cascade User-Owned';
            case 'RemoveLink': return 'Remove Link';
            case 'Restrict': return 'Restrict';
            default: return cascade || 'None';
        }
    }

    getMenuBehaviorName(behavior: string): string {
        switch (behavior) {
            case 'UseCollectionName': return 'Use Collection Name';
            case 'UseLabel': return 'Use Label';
            case 'DoNotDisplay': return 'Do Not Display';
            default: return behavior || 'Unknown';
        }
    }

    getSecurityTypesName(securityTypes: string): string {
        switch (securityTypes) {
            case 'None': return 'None';
            case 'Append': return 'Append';
            case 'ParentChild': return 'Parent Child';
            case 'Pointer': return 'Pointer';
            case 'Inheritance': return 'Inheritance';
            default: return securityTypes || 'Unknown';
        }
    }

    clearCache(): void {
        this.cache.clear();
    }

    /**
     * TEST METHOD: Compare attribute retrieval with and without type casting
     * This logs JSON output to help determine if we need type-specific queries for all attribute types
     */
    async testAttributeTypeCasting(environmentId: string, entityLogicalName: string): Promise<void> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

        this.logger.info('='.repeat(80));
        this.logger.info('ATTRIBUTE TYPE CASTING TEST');
        this.logger.info('='.repeat(80));

        try {
            // Query 1: Normal attributes (no type casting)
            this.logger.info('Query 1: Normal Attributes (no type casting)');
            const normalUrl = `${baseUrl}/Attributes?$orderby=LogicalName`;
            this.logger.info(`URL: ${normalUrl}`);

            const normalResponse = await fetch(normalUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (normalResponse.ok) {
                const normalData = parseODataResponse<AttributeMetadata>(await normalResponse.json());
                const normalAttributes = normalData.value || [];
                this.logger.info(`Found ${normalAttributes.length} attributes`);

                // Log first picklist attribute found
                const firstPicklist = normalAttributes.find((attr: AttributeMetadata) =>
                    attr.AttributeType === 'Picklist' || attr.AttributeTypeName?.Value === 'PicklistType'
                );
                if (firstPicklist) {
                    this.logger.info('Sample Picklist Attribute (normal query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstPicklist.LogicalName,
                        AttributeType: firstPicklist.AttributeType,
                        AttributeTypeName: firstPicklist.AttributeTypeName,
                        HasOptionSet: !!firstPicklist.OptionSet,
                        HasGlobalOptionSet: !!firstPicklist.GlobalOptionSet,
                        OptionSetValue: firstPicklist.OptionSet || firstPicklist.GlobalOptionSet || 'NOT PRESENT'
                    }, null, 2));
                }

                // Log first lookup attribute found
                const firstLookup = normalAttributes.find((attr: AttributeMetadata) =>
                    attr.AttributeType === 'Lookup' || attr.AttributeTypeName?.Value === 'LookupType'
                );
                if (firstLookup) {
                    this.logger.info('Sample Lookup Attribute (normal query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstLookup.LogicalName,
                        AttributeType: firstLookup.AttributeType,
                        AttributeTypeName: firstLookup.AttributeTypeName,
                        HasTargets: !!firstLookup.Targets,
                        TargetsValue: firstLookup.Targets || 'NOT PRESENT'
                    }, null, 2));
                }
            }

            // Query 2: PicklistAttributeMetadata with OptionSet expansion
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 2: PicklistAttributeMetadata (with type casting + $expand)');
            const picklistUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`;
            this.logger.info(`URL: ${picklistUrl}`);

            const picklistResponse = await fetch(picklistUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (picklistResponse.ok) {
                const picklistData = parseODataResponse<AttributeMetadata>(await picklistResponse.json());
                const picklistAttributes = picklistData.value || [];
                this.logger.info(`Found ${picklistAttributes.length} picklist attributes`);

                if (picklistAttributes.length > 0) {
                    const firstAttr = picklistAttributes[0];
                    this.logger.info('Sample Picklist Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        AttributeTypeName: firstAttr.AttributeTypeName,
                        HasOptionSet: !!firstAttr.OptionSet,
                        HasGlobalOptionSet: !!firstAttr.GlobalOptionSet,
                        OptionSet: firstAttr.OptionSet ? {
                            Name: firstAttr.OptionSet.Name,
                            IsGlobal: firstAttr.OptionSet.IsGlobal,
                            OptionsCount: firstAttr.OptionSet.Options?.length || 0,
                            SampleOptions: firstAttr.OptionSet.Options?.slice(0, 3)
                        } : 'NULL',
                        GlobalOptionSet: firstAttr.GlobalOptionSet ? {
                            Name: firstAttr.GlobalOptionSet.Name,
                            IsGlobal: firstAttr.GlobalOptionSet.IsGlobal,
                            OptionsCount: firstAttr.GlobalOptionSet.Options?.length || 0
                        } : 'NULL'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch PicklistAttributeMetadata', new Error(`${picklistResponse.status} ${picklistResponse.statusText}`));
            }

            // Query 3: LookupAttributeMetadata (no $expand needed, Targets is included by default)
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 3: LookupAttributeMetadata (with type casting)');
            const lookupUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$orderby=LogicalName`;
            this.logger.info(`URL: ${lookupUrl}`);

            const lookupResponse = await fetch(lookupUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (lookupResponse.ok) {
                const lookupData = parseODataResponse<AttributeMetadata>(await lookupResponse.json());
                const lookupAttributes = lookupData.value || [];
                this.logger.info(`Found ${lookupAttributes.length} lookup attributes`);

                if (lookupAttributes.length > 0) {
                    const firstAttr = lookupAttributes[0];
                    this.logger.info('Sample Lookup Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        AttributeTypeName: firstAttr.AttributeTypeName,
                        HasTargets: !!firstAttr.Targets,
                        Targets: firstAttr.Targets || 'NOT PRESENT'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch LookupAttributeMetadata', new Error(`${lookupResponse.status} ${lookupResponse.statusText}`));
            }

            // Query 4: StateAttributeMetadata (State picklists - might need OptionSet)
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 4: StateAttributeMetadata (with type casting + $expand)');
            const stateUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`;
            this.logger.info(`URL: ${stateUrl}`);

            const stateResponse = await fetch(stateUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (stateResponse.ok) {
                const stateData = parseODataResponse<AttributeMetadata>(await stateResponse.json());
                const stateAttributes = stateData.value || [];
                this.logger.info(`Found ${stateAttributes.length} state attributes`);

                if (stateAttributes.length > 0) {
                    const firstAttr = stateAttributes[0];
                    this.logger.info('Sample State Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        HasOptionSet: !!firstAttr.OptionSet,
                        OptionSet: firstAttr.OptionSet ? {
                            Name: firstAttr.OptionSet.Name,
                            OptionsCount: firstAttr.OptionSet.Options?.length || 0
                        } : 'NULL'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch StateAttributeMetadata', new Error(`${stateResponse.status} ${stateResponse.statusText}`));
            }

            // Query 5: StatusAttributeMetadata (Status Reason picklists)
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 5: StatusAttributeMetadata (with type casting + $expand)');
            const statusUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`;
            this.logger.info(`URL: ${statusUrl}`);

            const statusResponse = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (statusResponse.ok) {
                const statusData = parseODataResponse<AttributeMetadata>(await statusResponse.json());
                const statusAttributes = statusData.value || [];
                this.logger.info(`Found ${statusAttributes.length} status attributes`);

                if (statusAttributes.length > 0) {
                    const firstAttr = statusAttributes[0];
                    this.logger.info('Sample Status Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        HasOptionSet: !!firstAttr.OptionSet,
                        OptionSet: firstAttr.OptionSet ? {
                            Name: firstAttr.OptionSet.Name,
                            OptionsCount: firstAttr.OptionSet.Options?.length || 0
                        } : 'NULL'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch StatusAttributeMetadata', new Error(`${statusResponse.status} ${statusResponse.statusText}`));
            }

            // Query 6: BooleanAttributeMetadata (TwoOption/Yes-No)
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 6: BooleanAttributeMetadata (with type casting + $expand)');
            const booleanUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`;
            this.logger.info(`URL: ${booleanUrl}`);

            const booleanResponse = await fetch(booleanUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (booleanResponse.ok) {
                const booleanData = parseODataResponse<AttributeMetadata>(await booleanResponse.json());
                const booleanAttributes = booleanData.value || [];
                this.logger.info(`Found ${booleanAttributes.length} boolean attributes`);

                if (booleanAttributes.length > 0) {
                    const firstAttr = booleanAttributes[0];
                    this.logger.info('Sample Boolean Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        HasOptionSet: !!firstAttr.OptionSet,
                        OptionSet: firstAttr.OptionSet ? {
                            Name: firstAttr.OptionSet.Name,
                            TrueOption: firstAttr.OptionSet.TrueOption,
                            FalseOption: firstAttr.OptionSet.FalseOption
                        } : 'NULL'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch BooleanAttributeMetadata', new Error(`${booleanResponse.status} ${booleanResponse.statusText}`));
            }

            // Query 7: MultiSelectPicklistAttributeMetadata
            this.logger.info('-'.repeat(80));
            this.logger.info('Query 7: MultiSelectPicklistAttributeMetadata (with type casting + $expand)');
            const multiSelectUrl = `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`;
            this.logger.info(`URL: ${multiSelectUrl}`);

            const multiSelectResponse = await fetch(multiSelectUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (multiSelectResponse.ok) {
                const multiSelectData = parseODataResponse<AttributeMetadata>(await multiSelectResponse.json());
                const multiSelectAttributes = multiSelectData.value || [];
                this.logger.info(`Found ${multiSelectAttributes.length} multi-select picklist attributes`);

                if (multiSelectAttributes.length > 0) {
                    const firstAttr = multiSelectAttributes[0];
                    this.logger.info('Sample MultiSelectPicklist Attribute (typed query):');
                    this.logger.info(JSON.stringify({
                        LogicalName: firstAttr.LogicalName,
                        AttributeType: firstAttr.AttributeType,
                        HasOptionSet: !!firstAttr.OptionSet,
                        HasGlobalOptionSet: !!firstAttr.GlobalOptionSet,
                        OptionSet: firstAttr.OptionSet ? {
                            Name: firstAttr.OptionSet.Name,
                            IsGlobal: firstAttr.OptionSet.IsGlobal,
                            OptionsCount: firstAttr.OptionSet.Options?.length || 0
                        } : 'NULL'
                    }, null, 2));
                }
            } else {
                this.logger.error('Failed to fetch MultiSelectPicklistAttributeMetadata', new Error(`${multiSelectResponse.status} ${multiSelectResponse.statusText}`));
            }

        } catch (error) {
            this.logger.error('Test failed', error as Error);
        }

        this.logger.info('='.repeat(80));
        this.logger.info('TEST COMPLETE');
        this.logger.info('='.repeat(80));
    }
}