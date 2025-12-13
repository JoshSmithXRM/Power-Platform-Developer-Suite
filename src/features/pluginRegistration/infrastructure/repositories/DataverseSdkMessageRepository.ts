import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISdkMessageRepository } from '../../domain/interfaces/ISdkMessageRepository';
import { SdkMessage } from '../../domain/entities/SdkMessage';

/**
 * DTO for Dataverse sdkmessage entity.
 */
interface SdkMessageDto {
	sdkmessageid: string;
	name: string;
	isprivate: boolean;
	iscustomizable: {
		Value: boolean;
	};
}

/**
 * Dataverse API response for sdkmessage collection.
 */
interface SdkMessageCollectionResponse {
	value: SdkMessageDto[];
}

/**
 * Dataverse repository for SdkMessage entities.
 * Implements ISdkMessageRepository interface.
 */
export class DataverseSdkMessageRepository implements ISdkMessageRepository {
	private static readonly ENTITY_SET = 'sdkmessages';
	private static readonly SELECT_FIELDS = 'sdkmessageid,name,isprivate,iscustomizable';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAllPublic(environmentId: string): Promise<readonly SdkMessage[]> {
		this.logger.debug('DataverseSdkMessageRepository: Fetching public messages', {
			environmentId,
		});

		// Only fetch public (non-private) messages, ordered by name
		const endpoint =
			`/api/data/v9.2/${DataverseSdkMessageRepository.ENTITY_SET}` +
			`?$select=${DataverseSdkMessageRepository.SELECT_FIELDS}` +
			`&$filter=isprivate eq false` +
			`&$orderby=name asc`;

		const response = await this.apiService.get<SdkMessageCollectionResponse>(
			environmentId,
			endpoint
		);

		const messages = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataverseSdkMessageRepository: Fetched public messages', {
			count: messages.length,
		});

		return messages;
	}

	public async findById(environmentId: string, messageId: string): Promise<SdkMessage | null> {
		this.logger.debug('DataverseSdkMessageRepository: Fetching message by ID', {
			environmentId,
			messageId,
		});

		const endpoint = `/api/data/v9.2/${DataverseSdkMessageRepository.ENTITY_SET}(${messageId})?$select=${DataverseSdkMessageRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<SdkMessageDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async findByName(environmentId: string, messageName: string): Promise<SdkMessage | null> {
		this.logger.debug('DataverseSdkMessageRepository: Fetching message by name', {
			environmentId,
			messageName,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseSdkMessageRepository.ENTITY_SET}` +
			`?$select=${DataverseSdkMessageRepository.SELECT_FIELDS}` +
			`&$filter=name eq '${messageName}'`;

		const response = await this.apiService.get<SdkMessageCollectionResponse>(
			environmentId,
			endpoint
		);

		const firstMessage = response.value[0];
		if (firstMessage === undefined) {
			return null;
		}

		return this.mapToDomain(firstMessage);
	}

	private mapToDomain(dto: SdkMessageDto): SdkMessage {
		return new SdkMessage(
			dto.sdkmessageid,
			dto.name,
			dto.isprivate,
			dto.iscustomizable?.Value ?? true
		);
	}
}
