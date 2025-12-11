import { AttributeMetadata, type SourceType } from '../../domain/entities/AttributeMetadata';
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
	/**
	 * Creates an AttributeMetadataMapper instance.
	 *
	 * @param optionSetMapper - Mapper for option set metadata
	 */
	constructor(private readonly optionSetMapper: OptionSetMetadataMapper) {}

	/**
	 * Maps an attribute DTO to domain entity.
	 *
	 * Transforms Dataverse API attribute metadata into domain entity with proper
	 * value objects and typed metadata. Handles all attribute types including
	 * primitives, option sets, lookups, and special types.
	 *
	 * Also preserves the original raw DTO for the Metadata Browser's Raw Data tab,
	 * ensuring complete API response is available for display.
	 *
	 * @param dto - Attribute metadata DTO from Dataverse API
	 * @param preserveRawDto - Whether to preserve the original DTO (default: true)
	 * @returns AttributeMetadata domain entity with optional raw DTO attached
	 */
	public mapDtoToEntity(dto: AttributeMetadataDto, preserveRawDto: boolean = true): AttributeMetadata {
		const attributeType = dto.AttributeTypeName?.Value || dto.AttributeType || 'String';

		const optionSet = this.optionSetMapper.mapOptionSetDtoToValueObject(dto.OptionSet, dto.GlobalOptionSet);

		const entity = AttributeMetadata.create({
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
			isRetrievable: dto.IsRetrievable ?? true,
			// Virtual field detection (CRITICAL for IntelliSense filtering)
			attributeOf: dto.AttributeOf ?? null,
			isLogical: dto.IsLogical ?? false,
			// Source and calculation
			sourceType: this.mapSourceType(dto.SourceType),
			formulaDefinition: dto.FormulaDefinition ?? null,
			// Versioning
			introducedVersion: dto.IntroducedVersion ?? null,
			deprecatedVersion: dto.DeprecatedVersion ?? null
		});

		// Preserve the original raw DTO for Raw Data tab display
		if (preserveRawDto) {
			entity.setRawDto(dto as unknown as Record<string, unknown>);
		}

		return entity;
	}

	/**
	 * Maps source type from DTO to domain type.
	 * 0 = Simple, 1 = Calculated, 2 = Rollup, null = unknown
	 */
	private mapSourceType(sourceType: number | null | undefined): SourceType {
		if (sourceType === 0 || sourceType === 1 || sourceType === 2) {
			return sourceType;
		}
		return null;
	}
}
