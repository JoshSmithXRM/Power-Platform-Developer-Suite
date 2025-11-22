import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';
import { MetadataLabelExtractor } from '../utils/MetadataLabelExtractor';
import { MetadataEnumMappers } from '../utils/MetadataEnumMappers';
import type { AttributeMetadataDto } from '../dtos/EntityMetadataDto';

import { OptionSetMetadataMapper } from './OptionSetMetadataMapper';

/**
 * Maps attribute metadata DTOs to domain entities.
 * Handles all attribute types including option sets, lookups, and primitives.
 */
export class AttributeMetadataMapper {
	constructor(private readonly optionSetMapper: OptionSetMetadataMapper) {}

	/**
	 * Maps an attribute DTO to domain entity.
	 */
	public mapDtoToEntity(dto: AttributeMetadataDto): AttributeMetadata {
		const attributeType = dto.AttributeTypeName?.Value || dto.AttributeType || 'String';

		const optionSet = this.optionSetMapper.mapOptionSetDtoToValueObject(dto.OptionSet, dto.GlobalOptionSet);

		return AttributeMetadata.create({
			metadataId: dto.MetadataId,
			logicalName: LogicalName.create(dto.LogicalName),
			schemaName: SchemaName.create(dto.SchemaName),
			displayName: MetadataLabelExtractor.extractLabel(dto.DisplayName) || dto.SchemaName,
			description: MetadataLabelExtractor.extractLabel(dto.Description),
			attributeType: AttributeType.create(attributeType),
			isCustomAttribute: dto.IsCustomAttribute ?? false,
			isManaged: dto.IsManaged ?? false,
			isPrimaryId: dto.IsPrimaryId ?? false,
			isPrimaryName: dto.IsPrimaryName ?? false,
			requiredLevel: MetadataEnumMappers.mapRequiredLevel(dto.RequiredLevel?.Value),
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
}
