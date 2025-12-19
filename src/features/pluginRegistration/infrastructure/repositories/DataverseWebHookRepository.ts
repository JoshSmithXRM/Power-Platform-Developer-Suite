import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IWebHookRepository,
	RegisterWebHookInput,
	UpdateWebHookInput,
} from '../../domain/interfaces/IWebHookRepository';
import { WebHook } from '../../domain/entities/WebHook';
import { WebHookAuthType } from '../../domain/valueObjects/WebHookAuthType';

/**
 * DTO for Dataverse serviceendpoint entity (WebHook contract type).
 */
interface WebHookDto {
	serviceendpointid: string;
	name: string;
	url: string;
	authtype: number;
	description: string | null;
	createdon: string;
	modifiedon: string;
	ismanaged: boolean;
}

/**
 * Dataverse API response for serviceendpoint collection.
 */
interface WebHookCollectionResponse {
	value: WebHookDto[];
	'@odata.nextLink'?: string;
}

/**
 * WebHook contract type constant.
 * In Dataverse, serviceendpoint.contract = 8 indicates a WebHook.
 */
const WEBHOOK_CONTRACT_TYPE = 8;

/**
 * Dataverse repository for WebHook (Service Endpoint) entities.
 * Implements IWebHookRepository interface.
 *
 * WebHooks are stored in the `serviceendpoint` entity with `contract = 8`.
 */
export class DataverseWebHookRepository implements IWebHookRepository {
	private static readonly ENTITY_SET = 'serviceendpoints';
	private static readonly SELECT_FIELDS =
		'serviceendpointid,name,url,authtype,description,createdon,modifiedon,ismanaged';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly WebHook[]> {
		this.logger.info('DataverseWebHookRepository: Fetching webhooks', {
			environmentId,
		});

		const startTime = Date.now();
		const allWebHooks: WebHook[] = [];

		// Filter for WebHook contract type only
		const initialEndpoint =
			`/api/data/v9.2/${DataverseWebHookRepository.ENTITY_SET}` +
			`?$select=${DataverseWebHookRepository.SELECT_FIELDS}` +
			`&$filter=contract eq ${WEBHOOK_CONTRACT_TYPE}` +
			'&$orderby=name asc';

		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: WebHookCollectionResponse =
				await this.apiService.get<WebHookCollectionResponse>(
					environmentId,
					currentEndpoint
				);

			const pageWebHooks = response.value.map((dto: WebHookDto) => this.mapToDomain(dto));
			allWebHooks.push(...pageWebHooks);
			pageCount++;

			// Handle pagination via @odata.nextLink
			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const url: URL = new URL(nextLink);
				currentEndpoint = url.pathname + url.search;
			} else {
				currentEndpoint = null;
			}
		}

		this.logger.info('DataverseWebHookRepository: Fetched webhooks', {
			count: allWebHooks.length,
			pages: pageCount,
			totalMs: Date.now() - startTime,
		});

		return allWebHooks;
	}

	public async findById(
		environmentId: string,
		webHookId: string
	): Promise<WebHook | null> {
		this.logger.debug('DataverseWebHookRepository: Fetching webhook by ID', {
			environmentId,
			webHookId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseWebHookRepository.ENTITY_SET}(${webHookId})` +
			`?$select=${DataverseWebHookRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<WebHookDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async register(
		environmentId: string,
		input: RegisterWebHookInput
	): Promise<string> {
		this.logger.info('DataverseWebHookRepository: Registering new webhook', {
			environmentId,
			name: input.name,
			url: input.url,
			authType: input.authType,
		});

		const endpoint = `/api/data/v9.2/${DataverseWebHookRepository.ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			name: input.name,
			url: input.url,
			contract: WEBHOOK_CONTRACT_TYPE,
			authtype: input.authType,
		};

		// Add optional fields if provided
		if (input.authValue !== undefined) {
			payload['authvalue'] = input.authValue;
		}
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		// Use solution header if provided
		const additionalHeaders = input.solutionUniqueName
			? { 'MSCRM.SolutionUniqueName': input.solutionUniqueName }
			: undefined;

		const response = await this.apiService.post<{ serviceendpointid: string }>(
			environmentId,
			endpoint,
			payload,
			undefined, // cancellationToken
			additionalHeaders
		);

		const webHookId = response.serviceendpointid;

		this.logger.info('DataverseWebHookRepository: WebHook registered', {
			webHookId,
			name: input.name,
		});

		return webHookId;
	}

	public async update(
		environmentId: string,
		webHookId: string,
		input: UpdateWebHookInput
	): Promise<void> {
		this.logger.info('DataverseWebHookRepository: Updating webhook', {
			environmentId,
			webHookId,
		});

		const endpoint = `/api/data/v9.2/${DataverseWebHookRepository.ENTITY_SET}(${webHookId})`;

		// Build payload with only provided fields (partial update)
		const payload: Record<string, unknown> = {};

		if (input.name !== undefined) {
			payload['name'] = input.name;
		}
		if (input.url !== undefined) {
			payload['url'] = input.url;
		}
		if (input.authType !== undefined) {
			payload['authtype'] = input.authType;
		}
		if (input.authValue !== undefined) {
			payload['authvalue'] = input.authValue;
		}
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.info('DataverseWebHookRepository: WebHook updated', {
			webHookId,
		});
	}

	public async delete(environmentId: string, webHookId: string): Promise<void> {
		this.logger.info('DataverseWebHookRepository: Deleting webhook', {
			environmentId,
			webHookId,
		});

		const endpoint = `/api/data/v9.2/${DataverseWebHookRepository.ENTITY_SET}(${webHookId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataverseWebHookRepository: WebHook deleted', {
			webHookId,
		});
	}

	private mapToDomain(dto: WebHookDto): WebHook {
		return new WebHook(
			dto.serviceendpointid,
			dto.name,
			dto.url,
			WebHookAuthType.fromValue(dto.authtype),
			dto.description,
			new Date(dto.createdon),
			new Date(dto.modifiedon),
			dto.ismanaged
		);
	}
}
