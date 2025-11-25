import { EntityKey } from '../../domain/entities/EntityKey';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { MetadataLabelExtractor } from '../utils/MetadataLabelExtractor';
import type { EntityKeyDto } from '../dtos/EntityMetadataDto';

/**
 * Maps entity key DTOs to domain entities.
 * Handles alternate key definitions for entity records.
 */
export class EntityKeyMapper {
	/**
	 * Maps an entity key DTO to domain entity.
	 */
	public mapDtoToEntity(dto: EntityKeyDto): EntityKey {
		return EntityKey.create({
			metadataId: dto.MetadataId,
			logicalName: LogicalName.create(dto.LogicalName),
			schemaName: SchemaName.create(dto.SchemaName),
			displayName: MetadataLabelExtractor.extractLabel(dto.DisplayName) || dto.SchemaName,
			entityLogicalName: dto.EntityLogicalName,
			keyAttributes: dto.KeyAttributes,
			isManaged: dto.IsManaged,
			entityKeyIndexStatus: dto.EntityKeyIndexStatus ?? null
		});
	}
}
