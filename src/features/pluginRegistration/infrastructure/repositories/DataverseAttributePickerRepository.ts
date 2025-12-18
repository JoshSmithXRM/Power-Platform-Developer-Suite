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
	AttributeOf?: string | null;
	IsLogical?: boolean;
	IsValidForRead?: boolean;
}

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

		const endpoint =
			`/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes` +
			`?$select=LogicalName,DisplayName,AttributeType,AttributeOf,IsLogical,IsValidForRead` +
			`&$filter=IsValidForRead eq true`;

		try {
			const response = await this.apiService.get<AttributesResponse>(environmentId, endpoint);

			const attributes = response.value
				// Filter out virtual fields (AttributeOf is set) and logical fields
				.filter((attr) => !attr.AttributeOf && !attr.IsLogical)
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
}
