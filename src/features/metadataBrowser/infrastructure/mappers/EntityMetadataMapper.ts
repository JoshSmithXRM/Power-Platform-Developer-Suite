import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { MetadataLabelExtractor } from '../utils/MetadataLabelExtractor';
import { MetadataEnumMappers } from '../utils/MetadataEnumMappers';
import type { EntityMetadataDto } from '../dtos/EntityMetadataDto';

import { AttributeMetadataMapper } from './AttributeMetadataMapper';
import { RelationshipMetadataMapper } from './RelationshipMetadataMapper';
import { EntityKeyMapper } from './EntityKeyMapper';
import { SecurityPrivilegeMapper } from './SecurityPrivilegeMapper';

/**
 * Top-level mapper for entity metadata.
 * Composes all sub-mappers to transform complete entity DTOs to domain entities.
 */
export class EntityMetadataMapper {
	/**
	 * Creates an EntityMetadataMapper instance.
	 *
	 * @param attributeMapper - Mapper for attribute metadata
	 * @param relationshipMapper - Mapper for relationship metadata
	 * @param keyMapper - Mapper for entity key metadata
	 * @param privilegeMapper - Mapper for security privilege metadata
	 */
	constructor(
		private readonly attributeMapper: AttributeMetadataMapper,
		private readonly relationshipMapper: RelationshipMetadataMapper,
		private readonly keyMapper: EntityKeyMapper,
		private readonly privilegeMapper: SecurityPrivilegeMapper
	) {}

	/**
	 * Maps a DTO to domain entity without attributes/relationships (for tree list).
	 *
	 * Lightweight mapping for metadata tree view where full attribute/relationship
	 * details are not needed. Provides entity-level metadata only.
	 *
	 * @param dto - Entity metadata DTO from Dataverse API
	 * @returns EntityMetadata domain entity with empty collections
	 */
	public mapDtoToEntityWithoutAttributes(dto: EntityMetadataDto): EntityMetadata {
		return EntityMetadata.create({
			metadataId: dto.MetadataId,
			logicalName: LogicalName.create(dto.LogicalName),
			schemaName: SchemaName.create(dto.SchemaName),
			displayName: MetadataLabelExtractor.extractLabel(dto.DisplayName) || dto.SchemaName,
			pluralName: MetadataLabelExtractor.extractLabel(dto.DisplayCollectionName) || dto.SchemaName,
			description: MetadataLabelExtractor.extractLabel(dto.Description),
			isCustomEntity: dto.IsCustomEntity ?? false,
			isManaged: dto.IsManaged ?? false,
			ownershipType: MetadataEnumMappers.mapOwnershipType(dto.OwnershipType),
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
	 *
	 * Complete mapping for detail view including all attributes, relationships,
	 * keys, and privileges. Composes sub-mappers to build full entity metadata.
	 *
	 * @param dto - Entity metadata DTO from Dataverse API
	 * @returns EntityMetadata domain entity with complete metadata
	 */
	public mapDtoToEntityWithAttributes(dto: EntityMetadataDto): EntityMetadata {
		const attributes = dto.Attributes?.map(attrDto => this.attributeMapper.mapDtoToEntity(attrDto)) || [];
		const oneToManyRels = dto.OneToManyRelationships?.map(relDto => this.relationshipMapper.mapOneToManyDtoToEntity(relDto)) || [];
		const manyToOneRels = dto.ManyToOneRelationships?.map(relDto => this.relationshipMapper.mapOneToManyDtoToEntity(relDto)) || [];
		const manyToManyRels = dto.ManyToManyRelationships?.map(relDto => this.relationshipMapper.mapManyToManyDtoToEntity(relDto)) || [];
		const keys = dto.Keys?.map(keyDto => this.keyMapper.mapDtoToEntity(keyDto)) || [];
		const privileges = dto.Privileges?.map(privDto => this.privilegeMapper.mapDtoToEntity(privDto)) || [];

		return EntityMetadata.create({
			metadataId: dto.MetadataId,
			logicalName: LogicalName.create(dto.LogicalName),
			schemaName: SchemaName.create(dto.SchemaName),
			displayName: MetadataLabelExtractor.extractLabel(dto.DisplayName) || dto.SchemaName,
			pluralName: MetadataLabelExtractor.extractLabel(dto.DisplayCollectionName) || dto.SchemaName,
			description: MetadataLabelExtractor.extractLabel(dto.Description),
			isCustomEntity: dto.IsCustomEntity ?? false,
			isManaged: dto.IsManaged ?? false,
			ownershipType: MetadataEnumMappers.mapOwnershipType(dto.OwnershipType),
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
}
