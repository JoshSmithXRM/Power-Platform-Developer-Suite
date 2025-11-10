import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import { EntityKey } from '../../domain/entities/EntityKey';
import { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';
import { CascadeConfiguration, CascadeType } from '../../domain/valueObjects/CascadeConfiguration';
import { OptionSetMetadata, OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import type {
    EntityMetadataDto,
    AttributeMetadataDto,
    OneToManyRelationshipDto,
    ManyToManyRelationshipDto,
    EntityKeyDto,
    SecurityPrivilegeDto,
    CascadeConfigurationDto,
    OptionSetMetadataDto,
    OptionMetadataDto,
    GlobalOptionSetDefinitionDto,
    LabelMetadata
} from '../dtos/EntityMetadataDto';

/**
 * OData response wrapper from Dataverse Metadata API.
 */
interface EntityDefinitionsResponse {
    value: EntityMetadataDto[];
}

/**
 * OData response wrapper for GlobalOptionSetDefinitions.
 */
interface GlobalOptionSetDefinitionsResponse {
    value: GlobalOptionSetDefinitionDto[];
}

/**
 * Cache entry for entity metadata with timestamp for expiration tracking.
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Infrastructure implementation of IEntityMetadataRepository using Dataverse Metadata Web API.
 * Fetches entity metadata from Dataverse and maps DTOs to domain entities.
 * Implements 5-minute in-memory caching for entity metadata to improve performance.
 */
export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
    private readonly entityCache = new Map<string, CacheEntry<EntityMetadata>>();
    private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly logger: ILogger
    ) {}

    /**
     * Retrieves all entity metadata from Dataverse (without attributes/relationships).
     */
    public async getAllEntities(environmentId: string): Promise<readonly EntityMetadata[]> {
        this.logger.debug('Fetching all entity metadata from Dataverse', { environmentId });

        try {
            // Optimized: Only fetch fields needed for tree display and basic entity info
            // Reduced from 20+ fields to 5 essential fields for ~75% payload reduction
            // Tree only displays: DisplayName, LogicalName, Icon (from IsCustomEntity)
            const endpoint = '/api/data/v9.2/EntityDefinitions?$select=MetadataId,LogicalName,SchemaName,DisplayName,IsCustomEntity';
            const response = await this.apiService.get<EntityDefinitionsResponse>(environmentId, endpoint);

            if (!response?.value) {
                throw new Error('Invalid response from Dataverse Metadata API');
            }

            this.logger.debug('Received entity metadata', { count: response.value.length });

            const entities = response.value.map(dto => this.mapDtoToEntityWithoutAttributes(dto));
            return entities;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity metadata', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Generates cache key for entity metadata.
     */
    private getCacheKey(environmentId: string, logicalName: string): string {
        return `${environmentId}:${logicalName}`;
    }

    /**
     * Checks if a cache entry is still valid based on timestamp.
     */
    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.CACHE_DURATION_MS;
    }

    /**
     * Retrieves entity metadata from cache if available and not expired.
     */
    private getFromCache(environmentId: string, logicalName: string): EntityMetadata | null {
        const key = this.getCacheKey(environmentId, logicalName);
        const entry = this.entityCache.get(key);

        if (!entry) {
            return null;
        }

        if (!this.isCacheValid(entry.timestamp)) {
            this.entityCache.delete(key);
            this.logger.debug('Cache entry expired, removing', { environmentId, logicalName });
            return null;
        }

        return entry.data;
    }

    /**
     * Stores entity metadata in cache with current timestamp.
     */
    private setCache(environmentId: string, logicalName: string, data: EntityMetadata): void {
        const key = this.getCacheKey(environmentId, logicalName);
        this.entityCache.set(key, {
            data,
            timestamp: Date.now()
        });
        this.logger.debug('Entity metadata cached', {
            environmentId,
            logicalName,
            cacheSize: this.entityCache.size
        });
    }

    /**
     * Clears all cached entity metadata.
     * Called when user clicks refresh or switches environments.
     */
    public clearCache(): void {
        const cacheSize = this.entityCache.size;
        this.entityCache.clear();
        this.logger.info('Entity metadata cache cleared', { clearedEntries: cacheSize });
    }

    /**
     * Retrieves full entity metadata including attributes, relationships, and keys.
     * Uses 5-minute in-memory cache to avoid repeated API calls for the same entity.
     */
    public async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        // Check cache first
        const cached = this.getFromCache(environmentId, logicalName.getValue());
        if (cached) {
            this.logger.debug('Using cached entity metadata', {
                environmentId,
                logicalName: logicalName.getValue()
            });
            return cached;
        }

        this.logger.debug('Fetching entity with full metadata', { environmentId, logicalName: logicalName.getValue() });

        try {
            // Fetch full metadata with all expansions (no $select to get all properties)
            // Note: Privileges is a complex collection property, not a navigation property, so it's returned by default
            const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName.getValue()}')?$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys`;
            const dto = await this.apiService.get<EntityMetadataDto>(environmentId, endpoint);

            if (!dto) {
                throw new Error(`Entity not found: ${logicalName.getValue()}`);
            }

            this.logger.debug('Received full entity metadata', {
                logicalName: logicalName.getValue(),
                attributeCount: dto.Attributes?.length || 0,
                oneToManyCount: dto.OneToManyRelationships?.length || 0,
                manyToOneCount: dto.ManyToOneRelationships?.length || 0,
                manyToManyCount: dto.ManyToManyRelationships?.length || 0,
                keyCount: dto.Keys?.length || 0
            });

            // Enrich attributes with OptionSet data using typed metadata endpoints
            await this.enrichAttributesWithOptionSets(environmentId, logicalName.getValue(), dto);

            const entity = this.mapDtoToEntityWithAttributes(dto);

            // Cache the result
            this.setCache(environmentId, logicalName.getValue(), entity);

            return entity;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity with attributes', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Retrieves all global choice (option set) metadata from Dataverse.
     */
    public async getAllGlobalChoices(environmentId: string): Promise<readonly OptionSetMetadata[]> {
        this.logger.debug('Fetching all global choice metadata from Dataverse', { environmentId });

        try {
            // Optimized: Only fetch fields needed for tree display (Name, DisplayName, IsCustomOptionSet)
            // Reduced from 7 fields to 3 for ~60% payload reduction
            // Tree only displays: DisplayName, Name, Icon (from IsCustomOptionSet)
            const endpoint = '/api/data/v9.2/GlobalOptionSetDefinitions?$select=Name,DisplayName,IsCustomOptionSet';
            const response = await this.apiService.get<GlobalOptionSetDefinitionsResponse>(environmentId, endpoint);

            if (!response?.value) {
                throw new Error('Invalid response from Dataverse Metadata API');
            }

            this.logger.debug('Received global choice metadata', { count: response.value.length });

            const globalChoices = response.value.map(dto => this.mapGlobalOptionSetDtoToValueObject(dto));
            return globalChoices;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch global choice metadata', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Retrieves a specific global choice (option set) by name.
     */
    public async getGlobalChoiceWithOptions(environmentId: string, name: string): Promise<OptionSetMetadata> {
        this.logger.debug('Fetching global choice by name', { environmentId, name });

        try {
            // Options is a collection property, included by default (no $expand needed)
            const endpoint = `/api/data/v9.2/GlobalOptionSetDefinitions(Name='${name}')`;
            const dto = await this.apiService.get<GlobalOptionSetDefinitionDto>(environmentId, endpoint);

            if (!dto) {
                throw new Error(`Global choice not found: ${name}`);
            }

            this.logger.debug('Received global choice metadata', {
                name,
                optionCount: dto.Options?.length || 0
            });

            const globalChoice = this.mapGlobalOptionSetDtoToValueObject(dto);
            return globalChoice;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch global choice by name', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Maps a DTO to domain entity without attributes/relationships (for tree list).
     */
    private mapDtoToEntityWithoutAttributes(dto: EntityMetadataDto): EntityMetadata {
        return EntityMetadata.create({
            metadataId: dto.MetadataId,
            logicalName: LogicalName.create(dto.LogicalName),
            schemaName: SchemaName.create(dto.SchemaName),
            displayName: this.extractLabel(dto.DisplayName) || dto.SchemaName,
            pluralName: this.extractLabel(dto.DisplayCollectionName) || dto.SchemaName,
            description: this.extractLabel(dto.Description),
            isCustomEntity: dto.IsCustomEntity ?? false,
            isManaged: dto.IsManaged ?? false,
            ownershipType: this.mapOwnershipType(dto.OwnershipType),
            attributes: [],
            primaryIdAttribute: dto.PrimaryIdAttribute ?? null,
            primaryNameAttribute: dto.PrimaryNameAttribute ?? null,
            primaryImageAttribute: dto.PrimaryImageAttribute ?? null,
            entitySetName: dto.EntitySetName ?? null,
            objectTypeCode: dto.ObjectTypeCode ?? null,
            isActivity: dto.IsActivity ?? false,
            hasNotes: dto.HasNotes ?? false,
            hasActivities: dto.HasActivities ?? false,
            isValidForAdvancedFind: dto.IsValidForAdvancedFind ?? true,
            isAuditEnabled: dto.IsAuditEnabled?.Value ?? false,
            isValidForQueue: dto.IsValidForQueue?.Value ?? false,
            oneToManyRelationships: [],
            manyToOneRelationships: [],
            manyToManyRelationships: [],
            keys: [],
            privileges: []
        });
    }

    /**
     * Maps a DTO to domain entity with full metadata (attributes, relationships, keys).
     */
    private mapDtoToEntityWithAttributes(dto: EntityMetadataDto): EntityMetadata {
        const attributes = dto.Attributes?.map(attrDto => this.mapAttributeDtoToEntity(attrDto)) || [];
        const oneToManyRels = dto.OneToManyRelationships?.map(relDto => this.mapOneToManyRelationshipDtoToEntity(relDto)) || [];
        const manyToOneRels = dto.ManyToOneRelationships?.map(relDto => this.mapOneToManyRelationshipDtoToEntity(relDto)) || [];
        const manyToManyRels = dto.ManyToManyRelationships?.map(relDto => this.mapManyToManyRelationshipDtoToEntity(relDto)) || [];
        const keys = dto.Keys?.map(keyDto => this.mapEntityKeyDtoToEntity(keyDto)) || [];
        const privileges = dto.Privileges?.map(privDto => this.mapSecurityPrivilegeDtoToEntity(privDto)) || [];

        return EntityMetadata.create({
            metadataId: dto.MetadataId,
            logicalName: LogicalName.create(dto.LogicalName),
            schemaName: SchemaName.create(dto.SchemaName),
            displayName: this.extractLabel(dto.DisplayName) || dto.SchemaName,
            pluralName: this.extractLabel(dto.DisplayCollectionName) || dto.SchemaName,
            description: this.extractLabel(dto.Description),
            isCustomEntity: dto.IsCustomEntity ?? false,
            isManaged: dto.IsManaged ?? false,
            ownershipType: this.mapOwnershipType(dto.OwnershipType),
            attributes: attributes,
            primaryIdAttribute: dto.PrimaryIdAttribute ?? null,
            primaryNameAttribute: dto.PrimaryNameAttribute ?? null,
            primaryImageAttribute: dto.PrimaryImageAttribute ?? null,
            entitySetName: dto.EntitySetName ?? null,
            objectTypeCode: dto.ObjectTypeCode ?? null,
            isActivity: dto.IsActivity ?? false,
            hasNotes: dto.HasNotes ?? false,
            hasActivities: dto.HasActivities ?? false,
            isValidForAdvancedFind: dto.IsValidForAdvancedFind ?? true,
            isAuditEnabled: dto.IsAuditEnabled?.Value ?? false,
            isValidForQueue: dto.IsValidForQueue?.Value ?? false,
            oneToManyRelationships: oneToManyRels,
            manyToOneRelationships: manyToOneRels,
            manyToManyRelationships: manyToManyRels,
            keys: keys,
            privileges: privileges
        });
    }

    /**
     * Maps an attribute DTO to domain entity.
     */
    private mapAttributeDtoToEntity(dto: AttributeMetadataDto): AttributeMetadata {
        const attributeType = dto.AttributeTypeName?.Value || dto.AttributeType || 'String';

        // Debug logging for picklist attributes
        if (attributeType === 'PicklistType' || attributeType === 'Picklist') {
            this.logger.debug('Mapping picklist attribute', {
                logicalName: dto.LogicalName,
                hasOptionSet: !!dto.OptionSet,
                hasGlobalOptionSet: !!dto.GlobalOptionSet,
                optionSetName: dto.OptionSet?.Name,
                globalOptionSetName: dto.GlobalOptionSet?.Name,
                optionCount: dto.OptionSet?.Options?.length || 0
            });
        }

        const optionSet = this.mapOptionSetDtoToValueObject(dto.OptionSet, dto.GlobalOptionSet);

        return AttributeMetadata.create({
            metadataId: dto.MetadataId,
            logicalName: LogicalName.create(dto.LogicalName),
            schemaName: SchemaName.create(dto.SchemaName),
            displayName: this.extractLabel(dto.DisplayName) || dto.SchemaName,
            description: this.extractLabel(dto.Description),
            attributeType: AttributeType.create(attributeType),
            isCustomAttribute: dto.IsCustomAttribute ?? false,
            isManaged: dto.IsManaged ?? false,
            isPrimaryId: dto.IsPrimaryId ?? false,
            isPrimaryName: dto.IsPrimaryName ?? false,
            requiredLevel: this.mapRequiredLevel(dto.RequiredLevel?.Value),
            maxLength: dto.MaxLength ?? null,
            targets: dto.Targets ?? null,
            precision: dto.Precision ?? null,
            minValue: dto.MinValue ?? null,
            maxValue: dto.MaxValue ?? null,
            format: dto.Format ?? null,
            optionSet: optionSet,
            isValidForCreate: dto.IsValidForCreate ?? true,
            isValidForUpdate: dto.IsValidForUpdate ?? true,
            isValidForRead: dto.IsValidForRead ?? true,
            isValidForForm: dto.IsValidForForm ?? true,
            isValidForGrid: dto.IsValidForGrid ?? true,
            isSecured: dto.IsSecured ?? false,
            canBeSecuredForRead: dto.CanBeSecuredForRead ?? false,
            canBeSecuredForCreate: dto.CanBeSecuredForCreate ?? false,
            canBeSecuredForUpdate: dto.CanBeSecuredForUpdate ?? false,
            isFilterable: dto.IsFilterable ?? false,
            isSearchable: dto.IsSearchable ?? false,
            isRetrievable: dto.IsRetrievable ?? true
        });
    }

    /**
     * Maps a one-to-many relationship DTO to domain entity.
     */
    private mapOneToManyRelationshipDtoToEntity(dto: OneToManyRelationshipDto): OneToManyRelationship {
        const cascadeConfig = this.mapCascadeConfigurationDtoToValueObject(dto.CascadeConfiguration);

        return OneToManyRelationship.create({
            metadataId: dto.MetadataId,
            schemaName: dto.SchemaName,
            referencedEntity: dto.ReferencedEntity,
            referencedAttribute: dto.ReferencedAttribute,
            referencingEntity: dto.ReferencingEntity,
            referencingAttribute: dto.ReferencingAttribute,
            isCustomRelationship: dto.IsCustomRelationship,
            isManaged: dto.IsManaged,
            relationshipType: dto.RelationshipType,
            cascadeConfiguration: cascadeConfig,
            referencedEntityNavigationPropertyName: dto.ReferencedEntityNavigationPropertyName ?? null,
            referencingEntityNavigationPropertyName: dto.ReferencingEntityNavigationPropertyName ?? null,
            isHierarchical: dto.IsHierarchical ?? false,
            securityTypes: dto.SecurityTypes ?? null
        });
    }

    /**
     * Maps a many-to-many relationship DTO to domain entity.
     */
    private mapManyToManyRelationshipDtoToEntity(dto: ManyToManyRelationshipDto): ManyToManyRelationship {
        return ManyToManyRelationship.create({
            metadataId: dto.MetadataId,
            schemaName: dto.SchemaName,
            entity1LogicalName: dto.Entity1LogicalName,
            entity1IntersectAttribute: dto.Entity1IntersectAttribute,
            entity2LogicalName: dto.Entity2LogicalName,
            entity2IntersectAttribute: dto.Entity2IntersectAttribute,
            intersectEntityName: dto.IntersectEntityName,
            isCustomRelationship: dto.IsCustomRelationship,
            isManaged: dto.IsManaged,
            entity1NavigationPropertyName: dto.Entity1NavigationPropertyName ?? null,
            entity2NavigationPropertyName: dto.Entity2NavigationPropertyName ?? null
        });
    }

    /**
     * Maps an entity key DTO to domain entity.
     */
    private mapEntityKeyDtoToEntity(dto: EntityKeyDto): EntityKey {
        return EntityKey.create({
            metadataId: dto.MetadataId,
            logicalName: LogicalName.create(dto.LogicalName),
            schemaName: SchemaName.create(dto.SchemaName),
            displayName: this.extractLabel(dto.DisplayName) || dto.SchemaName,
            entityLogicalName: dto.EntityLogicalName,
            keyAttributes: dto.KeyAttributes,
            isManaged: dto.IsManaged,
            entityKeyIndexStatus: dto.EntityKeyIndexStatus ?? null
        });
    }

    /**
     * Maps a security privilege DTO to domain entity.
     */
    private mapSecurityPrivilegeDtoToEntity(dto: SecurityPrivilegeDto): SecurityPrivilege {
        return SecurityPrivilege.create({
            privilegeId: dto.PrivilegeId,
            name: dto.Name,
            privilegeType: dto.PrivilegeType,
            canBeBasic: dto.CanBeBasic,
            canBeLocal: dto.CanBeLocal,
            canBeDeep: dto.CanBeDeep,
            canBeGlobal: dto.CanBeGlobal,
            canBeEntityReference: dto.CanBeEntityReference ?? false,
            canBeParentEntityReference: dto.CanBeParentEntityReference ?? false
        });
    }

    /**
     * Maps cascade configuration DTO to value object.
     */
    private mapCascadeConfigurationDtoToValueObject(dto: CascadeConfigurationDto): CascadeConfiguration {
        return CascadeConfiguration.create({
            assign: this.mapCascadeType(dto.Assign),
            delete: this.mapCascadeType(dto.Delete),
            merge: this.mapCascadeType(dto.Merge),
            reparent: this.mapCascadeType(dto.Reparent),
            share: this.mapCascadeType(dto.Share),
            unshare: this.mapCascadeType(dto.Unshare),
            archive: dto.Archive ? this.mapCascadeType(dto.Archive) : null,
            rollupView: dto.RollupView ? this.mapCascadeType(dto.RollupView) : null
        });
    }

    /**
     * Maps cascade type string to typed value.
     */
    private mapCascadeType(cascadeType: string): CascadeType {
        switch (cascadeType) {
            case 'Cascade':
            case 'NoCascade':
            case 'Active':
            case 'UserOwned':
            case 'RemoveLink':
            case 'Restrict':
                return cascadeType;
            default:
                return 'NoCascade';
        }
    }

    /**
     * Maps option set DTO to value object.
     * After enrichment, both optionSetDto (with options) and globalOptionSetDto (reference) may be present.
     * Prioritize optionSetDto with actual option values.
     */
    private mapOptionSetDtoToValueObject(
        optionSetDto: OptionSetMetadataDto | undefined,
        globalOptionSetDto: { Name: string } | undefined
    ): OptionSetMetadata | null {
        if (!optionSetDto && !globalOptionSetDto) {
            return null;
        }

        // If optionSetDto exists with options, use it (even if globalOptionSetDto also exists)
        if (optionSetDto && optionSetDto.Options && optionSetDto.Options.length > 0) {
            const options = optionSetDto.Options.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto));
            return OptionSetMetadata.create({
                name: optionSetDto.Name ?? null,
                displayName: null,
                isGlobal: optionSetDto.IsGlobal ?? false,
                isCustom: false,
                options: options
            });
        }

        // If optionSetDto exists but has no options, still use it for metadata
        if (optionSetDto) {
            const options = optionSetDto.Options?.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto)) || [];
            return OptionSetMetadata.create({
                name: optionSetDto.Name ?? null,
                displayName: null,
                isGlobal: optionSetDto.IsGlobal ?? false,
                isCustom: false,
                options: options
            });
        }

        // Only use globalOptionSetDto as a fallback when optionSetDto doesn't exist
        if (globalOptionSetDto) {
            // Global option set reference (no inline options, no display name at attribute level)
            return OptionSetMetadata.create({
                name: globalOptionSetDto.Name,
                displayName: null,
                isGlobal: true,
                isCustom: false,
                options: []
            });
        }

        return null;
    }

    /**
     * Maps option metadata DTO to value object.
     */
    private mapOptionMetadataDtoToValueObject(dto: OptionMetadataDto): OptionMetadata {
        return OptionMetadata.create({
            value: dto.Value,
            label: this.extractLabel(dto.Label) || String(dto.Value),
            description: this.extractLabel(dto.Description),
            color: dto.Color ?? null
        });
    }

    /**
     * Maps global option set definition DTO to value object.
     */
    private mapGlobalOptionSetDtoToValueObject(dto: GlobalOptionSetDefinitionDto): OptionSetMetadata {
        const options = dto.Options?.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto)) || [];
        return OptionSetMetadata.create({
            name: dto.Name,
            displayName: this.extractLabel(dto.DisplayName),
            isGlobal: dto.IsGlobal ?? true,
            isCustom: dto.IsCustomOptionSet ?? false,
            options: options
        });
    }

    /**
     * Enriches attribute DTOs with OptionSet data using typed metadata endpoints.
     * The generic Attributes endpoint doesn't support nested $expand for OptionSet,
     * but typed endpoints like PicklistAttributeMetadata do support $expand=OptionSet,GlobalOptionSet.
     *
     * Fetches all option set types: Picklist, State, Status, Boolean, MultiSelectPicklist
     */
    private async enrichAttributesWithOptionSets(
        environmentId: string,
        entityLogicalName: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        if (!entityDto.Attributes || entityDto.Attributes.length === 0) {
            return;
        }

        try {
            const baseUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

            // Fetch all option set attribute types in parallel
            const [picklistResponse, stateResponse, statusResponse, booleanResponse, multiSelectResponse] =
                await Promise.all([
                    // Picklist attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet`
                    ),
                    // State attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet`
                    ),
                    // Status attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet`
                    ),
                    // Boolean attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet`
                    ),
                    // Multi-select picklist attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet`
                    )
                ]);

            // Combine all attributes into a single map
            const optionSetAttrMap = new Map<string, AttributeMetadataDto>();

            const allAttrs = [
                ...(picklistResponse?.value || []),
                ...(stateResponse?.value || []),
                ...(statusResponse?.value || []),
                ...(booleanResponse?.value || []),
                ...(multiSelectResponse?.value || [])
            ];

            for (const attr of allAttrs) {
                optionSetAttrMap.set(attr.LogicalName, attr);
            }

            this.logger.debug('Fetched option set attributes', {
                total: optionSetAttrMap.size,
                picklist: picklistResponse?.value?.length || 0,
                state: stateResponse?.value?.length || 0,
                status: statusResponse?.value?.length || 0,
                boolean: booleanResponse?.value?.length || 0,
                multiSelect: multiSelectResponse?.value?.length || 0
            });

            // Merge OptionSet data into main attributes
            for (const attr of entityDto.Attributes) {
                const enrichedAttr = optionSetAttrMap.get(attr.LogicalName);
                if (enrichedAttr) {
                    if (enrichedAttr.OptionSet !== undefined) {
                        attr.OptionSet = enrichedAttr.OptionSet;
                    }
                    if (enrichedAttr.GlobalOptionSet !== undefined) {
                        attr.GlobalOptionSet = enrichedAttr.GlobalOptionSet;
                    }
                }
            }

            this.logger.debug('Enriched attributes with OptionSet data (typed endpoints)', {
                enrichedCount: optionSetAttrMap.size
            });

            // Step 2: Enrich global option sets with full option values
            await this.enrichGlobalOptionSets(environmentId, entityDto);
        } catch (error) {
            this.logger.warn('Failed to enrich attributes with OptionSet data', { error });
            // Don't throw - continue with what we have
        }
    }

    /**
     * Enriches attributes that reference global option sets with full option values.
     * Global option set references only contain a name - we need to fetch the full definition.
     */
    private async enrichGlobalOptionSets(
        environmentId: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        if (!entityDto.Attributes || entityDto.Attributes.length === 0) {
            return;
        }

        // Collect unique global option set names that need enrichment
        const globalOptionSetNames = new Set<string>();
        for (const attr of entityDto.Attributes) {
            // Check if this attribute has a global option set with empty or missing options
            // Global option sets can be indicated in two ways:
            // 1. Separate GlobalOptionSet property with a Name
            // 2. OptionSet property with IsGlobal=true and a Name
            let globalOptionSetName: string | null = null;

            if (attr.GlobalOptionSet?.Name) {
                globalOptionSetName = attr.GlobalOptionSet.Name;
            } else if (attr.OptionSet?.IsGlobal && attr.OptionSet?.Name) {
                globalOptionSetName = attr.OptionSet.Name;
            }

            if (globalOptionSetName && (!attr.OptionSet?.Options || attr.OptionSet.Options.length === 0)) {
                globalOptionSetNames.add(globalOptionSetName);
            }
        }

        if (globalOptionSetNames.size === 0) {
            return;
        }

        this.logger.debug('Fetching global option set definitions', {
            count: globalOptionSetNames.size,
            names: Array.from(globalOptionSetNames)
        });

        try {
            // Fetch all global option sets in parallel
            const globalOptionSetPromises = Array.from(globalOptionSetNames).map(async (name) => {
                try {
                    const endpoint = `/api/data/v9.2/GlobalOptionSetDefinitions(Name='${name}')`;
                    const dto = await this.apiService.get<GlobalOptionSetDefinitionDto>(environmentId, endpoint);
                    return dto;
                } catch (error) {
                    this.logger.warn('Failed to fetch global option set', { name, error });
                    return null;
                }
            });

            const globalOptionSets = await Promise.all(globalOptionSetPromises);

            // Create a map for quick lookup
            const optionSetMap = new Map<string, GlobalOptionSetDefinitionDto>();
            for (const optionSet of globalOptionSets) {
                if (optionSet) {
                    optionSetMap.set(optionSet.Name, optionSet);
                }
            }

            // Merge full global option set data into attributes
            for (const attr of entityDto.Attributes) {
                // Determine the global option set name (could be in GlobalOptionSet or OptionSet)
                let globalOptionSetName: string | null = null;

                if (attr.GlobalOptionSet?.Name) {
                    globalOptionSetName = attr.GlobalOptionSet.Name;
                } else if (attr.OptionSet?.IsGlobal && attr.OptionSet?.Name) {
                    globalOptionSetName = attr.OptionSet.Name;
                }

                if (globalOptionSetName) {
                    const fullOptionSet = optionSetMap.get(globalOptionSetName);
                    if (fullOptionSet && fullOptionSet.Options) {
                        // Replace the empty OptionSet with full data from global definition
                        attr.OptionSet = {
                            Name: fullOptionSet.Name,
                            IsGlobal: fullOptionSet.IsGlobal ?? true,
                            OptionSetType: fullOptionSet.OptionSetType ?? 'Picklist',
                            Options: fullOptionSet.Options
                        };
                    }
                }
            }

            this.logger.debug('Enriched attributes with global option set values', {
                enrichedCount: optionSetMap.size
            });
        } catch (error) {
            this.logger.warn('Failed to enrich global option sets', { error });
            // Don't throw - continue with what we have
        }
    }

    /**
     * Extracts the user localized label from label metadata.
     */
    private extractLabel(labelMetadata: LabelMetadata | undefined): string | null {
        return labelMetadata?.UserLocalizedLabel?.Label || null;
    }

    /**
     * Maps ownership type string to typed value.
     */
    private mapOwnershipType(ownershipType: string | undefined): 'UserOwned' | 'OrganizationOwned' | 'TeamOwned' | 'None' {
        switch (ownershipType) {
            case 'UserOwned':
                return 'UserOwned';
            case 'OrganizationOwned':
                return 'OrganizationOwned';
            case 'TeamOwned':
                return 'TeamOwned';
            default:
                return 'None';
        }
    }

    /**
     * Maps required level string to typed value.
     */
    private mapRequiredLevel(requiredLevel: string | undefined): 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended' {
        switch (requiredLevel) {
            case 'SystemRequired':
                return 'SystemRequired';
            case 'ApplicationRequired':
                return 'ApplicationRequired';
            case 'Recommended':
                return 'Recommended';
            default:
                return 'None';
        }
    }
}
