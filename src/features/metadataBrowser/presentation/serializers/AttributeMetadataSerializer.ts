import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { IEntitySerializer } from '../../../../shared/presentation/serializers/EntitySerializer';

/**
 * Serializes AttributeMetadata domain entity to raw API format for Raw Data tab.
 * Converts domain value objects to primitives matching actual Dataverse API response.
 */
export class AttributeMetadataSerializer implements IEntitySerializer<AttributeMetadata> {
	/**
	 * Extracts string value from various forms:
	 * - Plain string: return as-is
	 * - Value object with getValue(): call getValue()
	 * - JSON-serialized form: extract .value property
	 */
	private extractValue(field: unknown): string {
		if (typeof field === 'string') {
			return field;
		}
		if (field && typeof field === 'object') {
			// Try getValue() method (domain value object)
			if ('getValue' in field && typeof field.getValue === 'function') {
				return (field.getValue as () => string)();
			}
			// Try .value property (JSON-serialized form)
			if ('value' in field && typeof field.value === 'string') {
				return field.value;
			}
		}
		// Fallback to string conversion
		return String(field);
	}

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

		// Handle three forms:
		// 1. Domain entities (with value objects that have getValue())
		// 2. JSON-serialized form from webview ({ value: 'string' })
		// 3. Plain strings
		const logicalName = this.extractValue(attribute.logicalName);
		const schemaName = this.extractValue(attribute.schemaName);
		const attributeTypeName = this.extractValue(attribute.attributeType);

		// Return API format matching Dataverse AttributeMetadata response
		return {
			MetadataId: attribute.metadataId,
			LogicalName: logicalName,
			SchemaName: schemaName,
			DisplayName: attribute.displayName,
			Description: attribute.description,
			AttributeTypeName: {
				Value: attributeTypeName
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
