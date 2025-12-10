import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { IEntitySerializer } from '../../../../shared/presentation/serializers/EntitySerializer';

/**
 * Serializes AttributeMetadata domain entity to raw API format for Raw Data tab.
 *
 * IMPORTANT: If the entity has a preserved raw DTO (from the mapper), we use that
 * directly to ensure 100% complete API response is shown. This is the "Track 2" fix
 * for the Metadata Browser Raw Data tab showing incomplete data.
 *
 * Falls back to reconstructing from domain properties if raw DTO is not available.
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
		// If raw DTO is available, use it directly for 100% complete API response
		// Check both:
		// 1. getRawDto() method - for domain entities with preserved raw DTO
		// 2. _rawDto property - for JSON-serialized objects from webview (methods are lost in JSON)
		if (typeof attribute.getRawDto === 'function') {
			const rawDto = attribute.getRawDto();
			if (rawDto) {
				return rawDto;
			}
		}

		// Check for _rawDto property directly (webview sends JSON, methods are lost)
		const attributeAsRecord = attribute as unknown as Record<string, unknown>;
		if (attributeAsRecord['_rawDto'] && typeof attributeAsRecord['_rawDto'] === 'object') {
			return attributeAsRecord['_rawDto'] as Record<string, unknown>;
		}

		// Fallback: reconstruct from domain properties (incomplete, but better than nothing)
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
			// Virtual field detection (CRITICAL)
			AttributeOf: attribute.attributeOf,
			IsLogical: attribute.isLogical,
			// Ownership
			IsCustomAttribute: attribute.isCustomAttribute,
			IsManaged: attribute.isManaged,
			IsPrimaryId: attribute.isPrimaryId,
			IsPrimaryName: attribute.isPrimaryName,
			RequiredLevel: attribute.requiredLevel,
			// Type-specific
			MaxLength: attribute.maxLength,
			Targets: attribute.targets,
			Precision: attribute.precision,
			MinValue: attribute.minValue,
			MaxValue: attribute.maxValue,
			Format: attribute.format,
			OptionSet: optionSetRaw,
			// Validation
			IsValidForCreate: attribute.isValidForCreate,
			IsValidForUpdate: attribute.isValidForUpdate,
			IsValidForRead: attribute.isValidForRead,
			IsValidForForm: attribute.isValidForForm,
			IsValidForGrid: attribute.isValidForGrid,
			// Security
			IsSecured: attribute.isSecured,
			CanBeSecuredForRead: attribute.canBeSecuredForRead,
			CanBeSecuredForCreate: attribute.canBeSecuredForCreate,
			CanBeSecuredForUpdate: attribute.canBeSecuredForUpdate,
			// Behavior
			IsFilterable: attribute.isFilterable,
			IsSearchable: attribute.isSearchable,
			IsRetrievable: attribute.isRetrievable,
			// Source and calculation
			SourceType: attribute.sourceType,
			FormulaDefinition: attribute.formulaDefinition,
			// Versioning
			IntroducedVersion: attribute.introducedVersion,
			DeprecatedVersion: attribute.deprecatedVersion
		};
	}
}
