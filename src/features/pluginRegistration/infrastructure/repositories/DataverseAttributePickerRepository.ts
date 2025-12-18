import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IAttributePickerRepository,
	AttributePickerItem,
} from '../../domain/interfaces/IAttributePickerRepository';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * DTO for attribute metadata from Dataverse EntityDefinitions API.
 */
interface AttributeMetadataDto {
	LogicalName: string;
	DisplayName?: {
		UserLocalizedLabel?: {
			Label?: string;
		};
	};
	AttributeType: string;
	AttributeTypeName?: {
		Value?: string;
	};
	'@odata.type'?: string;
	AttributeOf?: string | null;
	IsPrimaryId?: boolean;
}

/**
 * Attribute types that are ALWAYS included in plugin image attribute picker.
 * Based on Plugin Registration Tool (PRT) decompiled logic.
 */
const ALWAYS_INCLUDE_ATTRIBUTE_TYPES = new Set([
	'Boolean',
	'Customer',
	'DateTime',
	'Decimal',
	'Double',
	'Integer',
	'Lookup',
	'Memo',
	'Money',
	'Owner',
	'PartyList',
	'Picklist',
	'State',
	'Status',
	'String',
]);

/**
 * Attribute types that are CONDITIONALLY included based on specific rules.
 * - Uniqueidentifier: only if it's the entity's primary ID attribute
 * - CalendarRules: only if it's the entity's primary ID attribute
 * - Virtual: only if it's primary ID OR if it's a MultiSelectPicklist
 */
const CONDITIONAL_ATTRIBUTE_TYPES = new Set(['Uniqueidentifier', 'CalendarRules', 'Virtual']);

/**
 * Response from Dataverse EntityDefinitions/Attributes endpoint.
 */
interface AttributesResponse {
	value: AttributeMetadataDto[];
}

/**
 * Dataverse API implementation of IAttributePickerRepository.
 * Fetches attributes for the attribute picker modal.
 */
export class DataverseAttributePickerRepository implements IAttributePickerRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Fetches attributes for an entity that are valid for plugin filtering.
	 */
	public async getAttributesForPicker(
		environmentId: string,
		entityLogicalName: string
	): Promise<readonly AttributePickerItem[]> {
		this.logger.debug('Fetching attributes for picker', { environmentId, entityLogicalName });

		// Fetch attributes with properties needed for PRT-compatible filtering
		const endpoint =
			`/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes` +
			`?$select=LogicalName,DisplayName,AttributeType,AttributeTypeName,AttributeOf,IsPrimaryId` +
			`&$filter=IsValidForRead eq true`;

		try {
			const response = await this.apiService.get<AttributesResponse>(environmentId, endpoint);

			const attributes = response.value
				// PRT-compatible filter logic (from decompiled Plugin Registration Tool):
				// Pre-filter: IsValidForRead (API filter) AND AttributeOf === null
				// Type filter: whitelist of allowed types + conditional rules
				.filter((attr) => this.shouldIncludeAttribute(attr, entityLogicalName))
				// Map to picker items
				.map((attr): AttributePickerItem => ({
					logicalName: attr.LogicalName,
					displayName: this.getDisplayName(attr),
					attributeType: attr.AttributeType,
				}))
				// Sort by display name
				.sort((a, b) => a.displayName.localeCompare(b.displayName));

			this.logger.debug('Fetched attributes for picker', {
				entityLogicalName,
				count: attributes.length,
			});

			return attributes;
		} catch (error: unknown) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch attributes for picker', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Extracts display name from attribute DTO, falling back to logical name.
	 */
	private getDisplayName(attr: AttributeMetadataDto): string {
		const label = attr.DisplayName?.UserLocalizedLabel?.Label;
		return label && label.trim().length > 0 ? label : attr.LogicalName;
	}

	/**
	 * Determines if an attribute should be included in the picker.
	 * Based on Plugin Registration Tool (PRT) decompiled logic.
	 *
	 * @param attr - Attribute metadata from Dataverse
	 * @param entityLogicalName - The entity's logical name (e.g., 'account')
	 * @returns true if the attribute should be included
	 */
	private shouldIncludeAttribute(attr: AttributeMetadataDto, entityLogicalName: string): boolean {
		// Pre-filter: AttributeOf must be null (excludes "shadow" columns for calculated fields)
		if (attr.AttributeOf !== null && attr.AttributeOf !== undefined) {
			return false;
		}

		const attrType = attr.AttributeType;
		const logicalName = attr.LogicalName.toLowerCase();

		// Always include these types
		if (ALWAYS_INCLUDE_ATTRIBUTE_TYPES.has(attrType)) {
			return true;
		}

		// Conditional types: Uniqueidentifier, CalendarRules, Virtual
		if (CONDITIONAL_ATTRIBUTE_TYPES.has(attrType)) {
			// Include if it's the entity's actual primary ID attribute
			// The primary ID follows the pattern: {entitylogicalname}id (e.g., accountid for account)
			// This excludes foreign key Uniqueidentifiers like address1_addressid, address2_addressid
			const expectedPrimaryId = `${entityLogicalName.toLowerCase()}id`;
			if (attr.IsPrimaryId === true && logicalName === expectedPrimaryId) {
				return true;
			}

			// For Virtual type: also include if it's a MultiSelectPicklist
			if (attrType === 'Virtual' && this.isMultiSelectPicklist(attr)) {
				return true;
			}

			// Otherwise exclude these conditional types
			return false;
		}

		// Exclude everything else (BigInt, Binary, File, Image, EntityName, ManagedProperty, etc.)
		return false;
	}

	/**
	 * Checks if a Virtual attribute is a MultiSelectPicklist.
	 * PRT checks @odata.type or AttributeTypeName.Value for this.
	 */
	private isMultiSelectPicklist(attr: AttributeMetadataDto): boolean {
		// Check @odata.type contains MultiSelectPicklistAttributeMetadata
		const odataType = attr['@odata.type'];
		if (odataType && odataType.includes('MultiSelectPicklistAttributeMetadata')) {
			return true;
		}

		// Check AttributeTypeName.Value === 'MultiSelectPicklistType'
		const typeName = attr.AttributeTypeName?.Value;
		if (typeName === 'MultiSelectPicklistType') {
			return true;
		}

		return false;
	}
}
