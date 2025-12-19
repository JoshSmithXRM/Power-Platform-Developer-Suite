import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IServiceEndpointRepository,
	RegisterServiceEndpointInput,
	UpdateServiceEndpointInput,
} from '../../domain/interfaces/IServiceEndpointRepository';
import { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import { ServiceEndpointContract } from '../../domain/valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../../domain/valueObjects/ServiceEndpointConnectionMode';
import { WebHookAuthType } from '../../domain/valueObjects/WebHookAuthType';
import { MessageFormat } from '../../domain/valueObjects/MessageFormat';
import { UserClaimType } from '../../domain/valueObjects/UserClaimType';

/**
 * DTO for Dataverse serviceendpoint entity (Service Bus contract types).
 */
interface ServiceEndpointDto {
	serviceendpointid: string;
	name: string;
	description: string | null;
	solutionnamespace: string;
	namespaceaddress: string;
	path: string | null;
	contract: number;
	connectionmode: number;
	authtype: number;
	saskeyname: string | null;
	messageformat: number;
	userclaim: number;
	createdon: string;
	modifiedon: string;
	ismanaged: boolean;
}

/**
 * Dataverse API response for serviceendpoint collection.
 */
interface ServiceEndpointCollectionResponse {
	value: ServiceEndpointDto[];
	'@odata.nextLink'?: string;
}

/**
 * WebHook contract type constant.
 * Service Endpoints exclude contract = 8 (WebHook).
 */
const WEBHOOK_CONTRACT_TYPE = 8;

/**
 * Dataverse repository for Service Endpoint entities.
 * Implements IServiceEndpointRepository interface.
 *
 * Service Endpoints are stored in the `serviceendpoint` entity with `contract != 8`.
 * This excludes WebHooks which are handled by DataverseWebHookRepository.
 */
export class DataverseServiceEndpointRepository implements IServiceEndpointRepository {
	private static readonly ENTITY_SET = 'serviceendpoints';
	private static readonly SELECT_FIELDS =
		'serviceendpointid,name,description,solutionnamespace,namespaceaddress,path,' +
		'contract,connectionmode,authtype,saskeyname,messageformat,userclaim,' +
		'createdon,modifiedon,ismanaged';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly ServiceEndpoint[]> {
		this.logger.info('DataverseServiceEndpointRepository: Fetching service endpoints', {
			environmentId,
		});

		const startTime = Date.now();
		const allEndpoints: ServiceEndpoint[] = [];

		// Filter for non-WebHook contract types (contract ne 8)
		const initialEndpoint =
			`/api/data/v9.2/${DataverseServiceEndpointRepository.ENTITY_SET}` +
			`?$select=${DataverseServiceEndpointRepository.SELECT_FIELDS}` +
			`&$filter=contract ne ${WEBHOOK_CONTRACT_TYPE}` +
			'&$orderby=name asc';

		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: ServiceEndpointCollectionResponse =
				await this.apiService.get<ServiceEndpointCollectionResponse>(
					environmentId,
					currentEndpoint
				);

			const pageEndpoints = response.value.map((dto: ServiceEndpointDto) =>
				this.mapToDomain(dto)
			);
			allEndpoints.push(...pageEndpoints);
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

		this.logger.info('DataverseServiceEndpointRepository: Fetched service endpoints', {
			count: allEndpoints.length,
			pages: pageCount,
			totalMs: Date.now() - startTime,
		});

		return allEndpoints;
	}

	public async findById(
		environmentId: string,
		serviceEndpointId: string
	): Promise<ServiceEndpoint | null> {
		this.logger.debug('DataverseServiceEndpointRepository: Fetching service endpoint by ID', {
			environmentId,
			serviceEndpointId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseServiceEndpointRepository.ENTITY_SET}(${serviceEndpointId})` +
			`?$select=${DataverseServiceEndpointRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<ServiceEndpointDto>(environmentId, endpoint);

			// Exclude WebHooks (contract = 8)
			if (dto.contract === WEBHOOK_CONTRACT_TYPE) {
				return null;
			}

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
		input: RegisterServiceEndpointInput
	): Promise<string> {
		this.logger.info('DataverseServiceEndpointRepository: Registering new service endpoint', {
			environmentId,
			name: input.name,
			contract: input.contract,
			authType: input.authType,
		});

		const endpoint = `/api/data/v9.2/${DataverseServiceEndpointRepository.ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			name: input.name,
			solutionnamespace: input.solutionNamespace,
			namespaceaddress: input.namespaceAddress,
			contract: input.contract,
			connectionmode: input.connectionMode,
			authtype: input.authType,
			messageformat: input.messageFormat,
			userclaim: input.userClaim,
		};

		// Add optional fields if provided
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}
		if (input.path !== undefined) {
			payload['path'] = input.path;
		}
		if (input.sasKeyName !== undefined) {
			payload['saskeyname'] = input.sasKeyName;
		}
		if (input.sasKey !== undefined) {
			payload['saskey'] = input.sasKey;
		}
		if (input.sasToken !== undefined) {
			payload['sastoken'] = input.sasToken;
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

		const serviceEndpointId = response.serviceendpointid;

		this.logger.info('DataverseServiceEndpointRepository: Service endpoint registered', {
			serviceEndpointId,
			name: input.name,
		});

		return serviceEndpointId;
	}

	public async update(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void> {
		this.logger.info('DataverseServiceEndpointRepository: Updating service endpoint', {
			environmentId,
			serviceEndpointId,
		});

		const endpoint = `/api/data/v9.2/${DataverseServiceEndpointRepository.ENTITY_SET}(${serviceEndpointId})`;

		// Build payload with only provided fields (partial update)
		const payload: Record<string, unknown> = {};

		if (input.name !== undefined) {
			payload['name'] = input.name;
		}
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}
		if (input.solutionNamespace !== undefined) {
			payload['solutionnamespace'] = input.solutionNamespace;
		}
		if (input.namespaceAddress !== undefined) {
			payload['namespaceaddress'] = input.namespaceAddress;
		}
		if (input.path !== undefined) {
			payload['path'] = input.path;
		}
		if (input.authType !== undefined) {
			payload['authtype'] = input.authType;
		}
		if (input.sasKeyName !== undefined) {
			payload['saskeyname'] = input.sasKeyName;
		}
		if (input.sasKey !== undefined) {
			payload['saskey'] = input.sasKey;
		}
		if (input.sasToken !== undefined) {
			payload['sastoken'] = input.sasToken;
		}
		if (input.messageFormat !== undefined) {
			payload['messageformat'] = input.messageFormat;
		}
		if (input.userClaim !== undefined) {
			payload['userclaim'] = input.userClaim;
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.info('DataverseServiceEndpointRepository: Service endpoint updated', {
			serviceEndpointId,
		});
	}

	public async delete(environmentId: string, serviceEndpointId: string): Promise<void> {
		this.logger.info('DataverseServiceEndpointRepository: Deleting service endpoint', {
			environmentId,
			serviceEndpointId,
		});

		const endpoint = `/api/data/v9.2/${DataverseServiceEndpointRepository.ENTITY_SET}(${serviceEndpointId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataverseServiceEndpointRepository: Service endpoint deleted', {
			serviceEndpointId,
		});
	}

	private mapToDomain(dto: ServiceEndpointDto): ServiceEndpoint {
		return new ServiceEndpoint(
			dto.serviceendpointid,
			dto.name,
			dto.description,
			dto.solutionnamespace ?? '',
			dto.namespaceaddress ?? '',
			dto.path,
			ServiceEndpointContract.fromValue(dto.contract),
			ServiceEndpointConnectionMode.fromValue(dto.connectionmode),
			WebHookAuthType.fromValue(dto.authtype),
			dto.saskeyname,
			MessageFormat.fromValue(dto.messageformat),
			UserClaimType.fromValue(dto.userclaim),
			new Date(dto.createdon),
			new Date(dto.modifiedon),
			dto.ismanaged
		);
	}
}
