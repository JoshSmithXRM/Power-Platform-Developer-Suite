import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import { CascadeConfiguration } from '../../domain/valueObjects/CascadeConfiguration';
import { MetadataEnumMappers } from '../utils/MetadataEnumMappers';
import type {
	OneToManyRelationshipDto,
	ManyToManyRelationshipDto,
	CascadeConfigurationDto
} from '../dtos/EntityMetadataDto';

/**
 * Maps relationship metadata DTOs to domain entities.
 * Handles both one-to-many and many-to-many relationships with cascade behavior.
 */
export class RelationshipMetadataMapper {
	/**
	 * Maps a one-to-many relationship DTO to domain entity.
	 *
	 * @param dto - Relationship DTO from Dataverse API
	 * @param preserveRawDto - Whether to preserve the raw DTO for Raw Data tab (default: true)
	 */
	public mapOneToManyDtoToEntity(dto: OneToManyRelationshipDto, preserveRawDto: boolean = true): OneToManyRelationship {
		const cascadeConfig = this.mapCascadeConfigurationDtoToValueObject(dto.CascadeConfiguration);

		const entity = OneToManyRelationship.create({
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

		if (preserveRawDto) {
			entity.setRawDto(dto as unknown as Record<string, unknown>);
		}

		return entity;
	}

	/**
	 * Maps a many-to-many relationship DTO to domain entity.
	 *
	 * @param dto - Relationship DTO from Dataverse API
	 * @param preserveRawDto - Whether to preserve the raw DTO for Raw Data tab (default: true)
	 */
	public mapManyToManyDtoToEntity(dto: ManyToManyRelationshipDto, preserveRawDto: boolean = true): ManyToManyRelationship {
		const entity = ManyToManyRelationship.create({
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

		if (preserveRawDto) {
			entity.setRawDto(dto as unknown as Record<string, unknown>);
		}

		return entity;
	}

	/**
	 * Maps cascade configuration DTO to value object.
	 */
	private mapCascadeConfigurationDtoToValueObject(dto: CascadeConfigurationDto): CascadeConfiguration {
		return CascadeConfiguration.create({
			assign: MetadataEnumMappers.mapCascadeType(dto.Assign),
			delete: MetadataEnumMappers.mapCascadeType(dto.Delete),
			merge: MetadataEnumMappers.mapCascadeType(dto.Merge),
			reparent: MetadataEnumMappers.mapCascadeType(dto.Reparent),
			share: MetadataEnumMappers.mapCascadeType(dto.Share),
			unshare: MetadataEnumMappers.mapCascadeType(dto.Unshare),
			archive: dto.Archive ? MetadataEnumMappers.mapCascadeType(dto.Archive) : null,
			rollupView: dto.RollupView ? MetadataEnumMappers.mapCascadeType(dto.RollupView) : null
		});
	}
}
