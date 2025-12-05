import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import { AttributeSuggestion, type AttributeTypeHint } from '../../domain/valueObjects/AttributeSuggestion';

/**
 * DTO for entity metadata from OData API.
 */
interface EntityMetadataDto {
	LogicalName: string;
	DisplayName: {
		UserLocalizedLabel?: { Label: string } | null;
	};
	IsCustomEntity: boolean;
}

/**
 * DTO for attribute metadata from OData API.
 */
interface AttributeMetadataDto {
	LogicalName: string;
	DisplayName: {
		UserLocalizedLabel?: { Label: string } | null;
	};
	AttributeType: string;
	IsCustomAttribute: boolean;
}

interface EntityDefinitionsResponse {
	value: EntityMetadataDto[];
}

interface AttributesResponse {
	value: AttributeMetadataDto[];
}

/**
 * Repository implementation for fetching IntelliSense metadata from Dataverse.
 * Uses minimal OData $select queries for optimal performance.
 */
export class DataverseIntelliSenseMetadataRepository implements IIntelliSenseMetadataRepository {
	constructor(private readonly apiService: IDataverseApiService) {}

	/**
	 * Fetches all entity names with minimal payload.
	 * Payload: ~5-10 KB for 1,000 entities.
	 */
	public async getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]> {
		const endpoint =
			'/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity';

		const response = await this.apiService.get<EntityDefinitionsResponse>(
			environmentId,
			endpoint
		);

		return response.value.map(dto =>
			EntitySuggestion.create(
				dto.LogicalName,
				dto.DisplayName.UserLocalizedLabel?.Label ?? dto.LogicalName,
				dto.IsCustomEntity
			)
		);
	}

	/**
	 * Fetches attribute names for a specific entity with minimal payload.
	 * Payload: ~10-15 KB for typical entity (100 attributes).
	 */
	public async getAttributeSuggestions(
		environmentId: string,
		entityLogicalName: string
	): Promise<AttributeSuggestion[]> {
		const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsCustomAttribute`;

		const response = await this.apiService.get<AttributesResponse>(
			environmentId,
			endpoint
		);

		return response.value.map(dto =>
			AttributeSuggestion.create(
				dto.LogicalName,
				dto.DisplayName.UserLocalizedLabel?.Label ?? dto.LogicalName,
				this.mapAttributeType(dto.AttributeType),
				dto.IsCustomAttribute
			)
		);
	}

	/**
	 * Maps Dataverse attribute type to simplified type hint.
	 */
	private mapAttributeType(dataverseType: string): AttributeTypeHint {
		switch (dataverseType) {
			case 'String':
			case 'Memo':
				return dataverseType as AttributeTypeHint;
			case 'Integer':
			case 'BigInt':
				return 'Integer';
			case 'Decimal':
			case 'Double':
				return 'Decimal';
			case 'Money':
				return 'Money';
			case 'DateTime':
				return 'DateTime';
			case 'Boolean':
			case 'ManagedProperty':
				return 'Boolean';
			case 'Lookup':
			case 'Customer':
			case 'Owner':
				return 'Lookup';
			case 'Picklist':
			case 'State':
			case 'Status':
				return 'Picklist';
			case 'Uniqueidentifier':
				return 'UniqueIdentifier';
			default:
				return 'Other';
		}
	}
}
