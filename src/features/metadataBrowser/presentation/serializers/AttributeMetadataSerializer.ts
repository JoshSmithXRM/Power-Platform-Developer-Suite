import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { IEntitySerializer } from '../../../../shared/presentation/serializers/EntitySerializer';

/**
 * Serializes AttributeMetadata domain entity to raw API format for Raw Data tab.
 * Converts domain value objects to primitives matching actual Dataverse API response.
 */
export class AttributeMetadataSerializer implements IEntitySerializer<AttributeMetadata> {
	serializeToRaw(attribute: AttributeMetadata): Record<string, unknown> {
		// Serialize OptionSet if present
		let optionSetRaw: Record<string, unknown> | null = null;
		if (attribute.optionSet) {
			optionSetRaw = {
				Name: attribute.optionSet.name,
				DisplayName: attribute.optionSet.displayName,
				IsGlobal: attribute.optionSet.isGlobal,
				IsCustom: attribute.optionSet.isCustom,
				Options: attribute.optionSet.options.map(option => ({
					Value: option.value,
					Label: option.label,
					Description: option.description,
					Color: option.color
				}))
			};
		}

		// Return API format matching Dataverse AttributeMetadata response
		return {
			MetadataId: attribute.metadataId,
			LogicalName: attribute.logicalName.getValue(),
			SchemaName: attribute.schemaName.getValue(),
			DisplayName: attribute.displayName,
			Description: attribute.description,
			AttributeTypeName: {
				Value: attribute.attributeType.getValue()
			},
			IsCustomAttribute: attribute.isCustomAttribute,
			IsManaged: attribute.isManaged,
			IsPrimaryId: attribute.isPrimaryId,
			IsPrimaryName: attribute.isPrimaryName,
			RequiredLevel: attribute.requiredLevel,
			MaxLength: attribute.maxLength,
			Targets: attribute.targets,
			Precision: attribute.precision,
			MinValue: attribute.minValue,
			MaxValue: attribute.maxValue,
			Format: attribute.format,
			OptionSet: optionSetRaw,
			IsValidForCreate: attribute.isValidForCreate,
			IsValidForUpdate: attribute.isValidForUpdate,
			IsValidForRead: attribute.isValidForRead,
			IsValidForForm: attribute.isValidForForm,
			IsValidForGrid: attribute.isValidForGrid,
			IsSecured: attribute.isSecured,
			CanBeSecuredForRead: attribute.canBeSecuredForRead,
			CanBeSecuredForCreate: attribute.canBeSecuredForCreate,
			CanBeSecuredForUpdate: attribute.canBeSecuredForUpdate,
			IsFilterable: attribute.isFilterable,
			IsSearchable: attribute.isSearchable,
			IsRetrievable: attribute.isRetrievable
		};
	}
}
