import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISdkMessageFilterRepository } from '../../domain/interfaces/ISdkMessageFilterRepository';
import { SdkMessageFilter } from '../../domain/entities/SdkMessageFilter';

/**
 * DTO for Dataverse sdkmessagefilter entity.
 */
interface SdkMessageFilterDto {
	sdkmessagefilterid: string;
	_sdkmessageid_value: string;
	primaryobjecttypecode: string;
	secondaryobjecttypecode: string;
	iscustomprocessingstepallowed: boolean;
}

/**
 * Dataverse API response for sdkmessagefilter collection.
 */
interface SdkMessageFilterCollectionResponse {
	value: SdkMessageFilterDto[];
}

/**
 * Dataverse repository for SdkMessageFilter entities.
 * Implements ISdkMessageFilterRepository interface.
 */
export class DataverseSdkMessageFilterRepository implements ISdkMessageFilterRepository {
	private static readonly ENTITY_SET = 'sdkmessagefilters';
	private static readonly SELECT_FIELDS =
		'sdkmessagefilterid,_sdkmessageid_value,primaryobjecttypecode,secondaryobjecttypecode,iscustomprocessingstepallowed';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findByMessageId(
		environmentId: string,
		messageId: string
	): Promise<readonly SdkMessageFilter[]> {
		this.logger.debug('DataverseSdkMessageFilterRepository: Fetching filters by message ID', {
			environmentId,
			messageId,
		});

		// Only fetch filters where custom steps are allowed
		const endpoint =
			`/api/data/v9.2/${DataverseSdkMessageFilterRepository.ENTITY_SET}` +
			`?$select=${DataverseSdkMessageFilterRepository.SELECT_FIELDS}` +
			`&$filter=_sdkmessageid_value eq ${messageId} and iscustomprocessingstepallowed eq true` +
			`&$orderby=primaryobjecttypecode asc`;

		const response = await this.apiService.get<SdkMessageFilterCollectionResponse>(
			environmentId,
			endpoint
		);

		const filters = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataverseSdkMessageFilterRepository: Fetched filters', {
			messageId,
			count: filters.length,
		});

		return filters;
	}

	public async findByMessageAndEntity(
		environmentId: string,
		messageId: string,
		entityLogicalName: string
	): Promise<SdkMessageFilter | null> {
		this.logger.debug('DataverseSdkMessageFilterRepository: Fetching filter by message and entity', {
			environmentId,
			messageId,
			entityLogicalName,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseSdkMessageFilterRepository.ENTITY_SET}` +
			`?$select=${DataverseSdkMessageFilterRepository.SELECT_FIELDS}` +
			`&$filter=_sdkmessageid_value eq ${messageId} and primaryobjecttypecode eq '${entityLogicalName}'`;

		const response = await this.apiService.get<SdkMessageFilterCollectionResponse>(
			environmentId,
			endpoint
		);

		const firstFilter = response.value[0];
		if (firstFilter === undefined) {
			return null;
		}

		return this.mapToDomain(firstFilter);
	}

	public async findById(
		environmentId: string,
		filterId: string
	): Promise<SdkMessageFilter | null> {
		this.logger.debug('DataverseSdkMessageFilterRepository: Fetching filter by ID', {
			environmentId,
			filterId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseSdkMessageFilterRepository.ENTITY_SET}(${filterId})` +
			`?$select=${DataverseSdkMessageFilterRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<SdkMessageFilterDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	private mapToDomain(dto: SdkMessageFilterDto): SdkMessageFilter {
		return new SdkMessageFilter(
			dto.sdkmessagefilterid,
			dto._sdkmessageid_value,
			dto.primaryobjecttypecode,
			dto.secondaryobjecttypecode ?? 'none',
			dto.iscustomprocessingstepallowed
		);
	}
}
