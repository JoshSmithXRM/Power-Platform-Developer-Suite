import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import { EntityKey } from '../../domain/entities/EntityKey';
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
    CascadeConfigurationDto,
    OptionSetMetadataDto,
    OptionMetadataDto,
    LabelMetadata
} from '../dtos/EntityMetadataDto';

/**
 * OData response wrapper from Dataverse Metadata API.
 */
interface EntityDefinitionsResponse {
    value: EntityMetadataDto[];
}

/**
 * Infrastructure implementation of IEntityMetadataRepository using Dataverse Metadata Web API.
 * Fetches entity metadata from Dataverse and maps DTOs to domain entities.
 */
export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
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
            const endpoint = '/api/data/v9.2/EntityDefinitions?$select=MetadataId,LogicalName,SchemaName,DisplayName,DisplayCollectionName,Description,IsCustomEntity,IsManaged,OwnershipType,PrimaryIdAttribute,PrimaryNameAttribute,PrimaryImageAttribute,EntitySetName,ObjectTypeCode,IsActivity,HasNotes,HasActivities,IsValidForAdvancedFind,IsAuditEnabled,IsValidForQueue';
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
     * Retrieves full entity metadata including attributes, relationships, and keys.
     */
    public async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        this.logger.debug('Fetching entity with full metadata', { environmentId, logicalName: logicalName.getValue() });

        try {
            // Fetch full metadata with all expansions (no $select to get all properties)
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

            const entity = this.mapDtoToEntityWithAttributes(dto);
            return entity;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity with attributes', normalizedError);
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
            keys: []
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
            keys: keys
        });
    }

    /**
     * Maps an attribute DTO to domain entity.
     */
    private mapAttributeDtoToEntity(dto: AttributeMetadataDto): AttributeMetadata {
        const attributeType = dto.AttributeTypeName?.Value || dto.AttributeType || 'String';
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
     */
    private mapOptionSetDtoToValueObject(
        optionSetDto: OptionSetMetadataDto | undefined,
        globalOptionSetDto: { Name: string } | undefined
    ): OptionSetMetadata | null {
        if (!optionSetDto && !globalOptionSetDto) {
            return null;
        }

        if (globalOptionSetDto) {
            // Global option set reference (no inline options)
            return OptionSetMetadata.create({
                name: globalOptionSetDto.Name,
                isGlobal: true,
                options: []
            });
        }

        if (optionSetDto) {
            const options = optionSetDto.Options?.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto)) || [];
            return OptionSetMetadata.create({
                name: optionSetDto.Name ?? null,
                isGlobal: optionSetDto.IsGlobal ?? false,
                options: options
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
