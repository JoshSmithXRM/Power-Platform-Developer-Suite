import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	ICustomApiParameterRepository,
	RegisterCustomApiParameterInput,
	UpdateCustomApiParameterInput,
} from '../../domain/interfaces/ICustomApiParameterRepository';
import {
	CustomApiParameter,
	type CustomApiParameterDirection,
} from '../../domain/entities/CustomApiParameter';
import { CustomApiParameterType } from '../../domain/valueObjects/CustomApiParameterType';

/**
 * DTO for Dataverse customapirequestparameter entity.
 */
interface RequestParameterDto {
	customapirequestparameterid: string;
	_customapiid_value: string;
	name: string;
	uniquename: string;
	displayname: string;
	description: string | null;
	type: number;
	logicalentityname: string | null;
	isoptional: boolean;
}

/**
 * DTO for Dataverse customapiresponseproperty entity.
 */
interface ResponsePropertyDto {
	customapiresponsepropertyid: string;
	_customapiid_value: string;
	name: string;
	uniquename: string;
	displayname: string;
	description: string | null;
	type: number;
	logicalentityname: string | null;
}

/**
 * Dataverse API response for request parameter collection.
 */
interface RequestParameterCollectionResponse {
	value: RequestParameterDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse API response for response property collection.
 */
interface ResponsePropertyCollectionResponse {
	value: ResponsePropertyDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for Custom API parameters (request parameters and response properties).
 * Implements ICustomApiParameterRepository interface.
 *
 * Note: This handles two separate Dataverse entities:
 * - customapirequestparameters for input parameters
 * - customapiresponseproperties for output parameters
 */
export class DataverseCustomApiParameterRepository implements ICustomApiParameterRepository {
	private static readonly REQUEST_ENTITY_SET = 'customapirequestparameters';
	private static readonly RESPONSE_ENTITY_SET = 'customapiresponseproperties';
	private static readonly REQUEST_SELECT_FIELDS =
		'customapirequestparameterid,_customapiid_value,name,uniquename,displayname,description,type,logicalentityname,isoptional';
	private static readonly RESPONSE_SELECT_FIELDS =
		'customapiresponsepropertyid,_customapiid_value,name,uniquename,displayname,description,type,logicalentityname';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly CustomApiParameter[]> {
		this.logger.debug('DataverseCustomApiParameterRepository: Fetching all parameters', {
			environmentId,
		});

		// Fetch both request parameters and response properties in parallel
		const [requestParams, responseProps] = await Promise.all([
			this.fetchAllRequestParameters(environmentId),
			this.fetchAllResponseProperties(environmentId),
		]);

		const allParams = [...requestParams, ...responseProps];

		this.logger.debug('DataverseCustomApiParameterRepository: Fetched parameters', {
			requestCount: requestParams.length,
			responseCount: responseProps.length,
			totalCount: allParams.length,
		});

		return allParams;
	}

	public async findByCustomApiId(
		environmentId: string,
		customApiId: string
	): Promise<readonly CustomApiParameter[]> {
		this.logger.debug('DataverseCustomApiParameterRepository: Fetching parameters by API ID', {
			environmentId,
			customApiId,
		});

		// Fetch both request parameters and response properties in parallel
		const [requestParams, responseProps] = await Promise.all([
			this.fetchRequestParametersByApiId(environmentId, customApiId),
			this.fetchResponsePropertiesByApiId(environmentId, customApiId),
		]);

		const allParams = [...requestParams, ...responseProps];

		this.logger.debug('DataverseCustomApiParameterRepository: Fetched parameters by API ID', {
			customApiId,
			requestCount: requestParams.length,
			responseCount: responseProps.length,
		});

		return allParams;
	}

	public async findById(
		environmentId: string,
		parameterId: string,
		direction: CustomApiParameterDirection
	): Promise<CustomApiParameter | null> {
		this.logger.debug('DataverseCustomApiParameterRepository: Fetching parameter by ID', {
			environmentId,
			parameterId,
			direction,
		});

		if (direction === 'request') {
			return this.fetchRequestParameterById(environmentId, parameterId);
		} else {
			return this.fetchResponsePropertyById(environmentId, parameterId);
		}
	}

	public async register(
		environmentId: string,
		input: RegisterCustomApiParameterInput
	): Promise<string> {
		this.logger.info('DataverseCustomApiParameterRepository: Registering parameter', {
			environmentId,
			name: input.name,
			direction: input.direction,
		});

		if (input.direction === 'request') {
			return this.registerRequestParameter(environmentId, input);
		} else {
			return this.registerResponseProperty(environmentId, input);
		}
	}

	public async update(
		environmentId: string,
		parameterId: string,
		direction: CustomApiParameterDirection,
		input: UpdateCustomApiParameterInput
	): Promise<void> {
		this.logger.info('DataverseCustomApiParameterRepository: Updating parameter', {
			environmentId,
			parameterId,
			direction,
		});

		const entitySet =
			direction === 'request'
				? DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET
				: DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET;

		const endpoint = `/api/data/v9.2/${entitySet}(${parameterId})`;

		const payload: Record<string, unknown> = {};

		if (input.displayName !== undefined) {
			payload['displayname'] = input.displayName;
		}

		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		if (input.logicalEntityName !== undefined) {
			payload['logicalentityname'] = input.logicalEntityName;
		}

		// isOptional only applies to request parameters
		if (direction === 'request' && input.isOptional !== undefined) {
			payload['isoptional'] = input.isOptional;
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.info('DataverseCustomApiParameterRepository: Parameter updated', {
			parameterId,
			direction,
		});
	}

	public async delete(
		environmentId: string,
		parameterId: string,
		direction: CustomApiParameterDirection
	): Promise<void> {
		this.logger.info('DataverseCustomApiParameterRepository: Deleting parameter', {
			environmentId,
			parameterId,
			direction,
		});

		const entitySet =
			direction === 'request'
				? DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET
				: DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET;

		const endpoint = `/api/data/v9.2/${entitySet}(${parameterId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataverseCustomApiParameterRepository: Parameter deleted', {
			parameterId,
			direction,
		});
	}

	// --- Private helper methods ---

	private async fetchAllRequestParameters(
		environmentId: string
	): Promise<CustomApiParameter[]> {
		const params: CustomApiParameter[] = [];
		let endpoint: string | null =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET}` +
			`?$select=${DataverseCustomApiParameterRepository.REQUEST_SELECT_FIELDS}` +
			'&$orderby=name asc';

		while (endpoint !== null) {
			const response = await this.apiService.get<RequestParameterCollectionResponse>(
				environmentId,
				endpoint
			);

			const mapped = response.value.map((dto) => this.mapRequestToDomain(dto));
			params.push(...mapped);

			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const nextUrl: URL = new URL(nextLink);
				endpoint = nextUrl.pathname + nextUrl.search;
			} else {
				endpoint = null;
			}
		}

		return params;
	}

	private async fetchAllResponseProperties(
		environmentId: string
	): Promise<CustomApiParameter[]> {
		const props: CustomApiParameter[] = [];
		let endpoint: string | null =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET}` +
			`?$select=${DataverseCustomApiParameterRepository.RESPONSE_SELECT_FIELDS}` +
			'&$orderby=name asc';

		while (endpoint !== null) {
			const response = await this.apiService.get<ResponsePropertyCollectionResponse>(
				environmentId,
				endpoint
			);

			const mapped = response.value.map((dto) => this.mapResponseToDomain(dto));
			props.push(...mapped);

			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const nextUrl: URL = new URL(nextLink);
				endpoint = nextUrl.pathname + nextUrl.search;
			} else {
				endpoint = null;
			}
		}

		return props;
	}

	private async fetchRequestParametersByApiId(
		environmentId: string,
		customApiId: string
	): Promise<CustomApiParameter[]> {
		const endpoint =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET}` +
			`?$select=${DataverseCustomApiParameterRepository.REQUEST_SELECT_FIELDS}` +
			`&$filter=_customapiid_value eq ${customApiId}` +
			'&$orderby=name asc';

		const response = await this.apiService.get<RequestParameterCollectionResponse>(
			environmentId,
			endpoint
		);

		return response.value.map((dto) => this.mapRequestToDomain(dto));
	}

	private async fetchResponsePropertiesByApiId(
		environmentId: string,
		customApiId: string
	): Promise<CustomApiParameter[]> {
		const endpoint =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET}` +
			`?$select=${DataverseCustomApiParameterRepository.RESPONSE_SELECT_FIELDS}` +
			`&$filter=_customapiid_value eq ${customApiId}` +
			'&$orderby=name asc';

		const response = await this.apiService.get<ResponsePropertyCollectionResponse>(
			environmentId,
			endpoint
		);

		return response.value.map((dto) => this.mapResponseToDomain(dto));
	}

	private async fetchRequestParameterById(
		environmentId: string,
		parameterId: string
	): Promise<CustomApiParameter | null> {
		const endpoint =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET}(${parameterId})` +
			`?$select=${DataverseCustomApiParameterRepository.REQUEST_SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<RequestParameterDto>(environmentId, endpoint);
			return this.mapRequestToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	private async fetchResponsePropertyById(
		environmentId: string,
		parameterId: string
	): Promise<CustomApiParameter | null> {
		const endpoint =
			`/api/data/v9.2/${DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET}(${parameterId})` +
			`?$select=${DataverseCustomApiParameterRepository.RESPONSE_SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<ResponsePropertyDto>(environmentId, endpoint);
			return this.mapResponseToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	private async registerRequestParameter(
		environmentId: string,
		input: RegisterCustomApiParameterInput
	): Promise<string> {
		const endpoint = `/api/data/v9.2/${DataverseCustomApiParameterRepository.REQUEST_ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			'CustomAPIId@odata.bind': `/customapis(${input.customApiId})`,
			name: input.name,
			uniquename: input.uniqueName,
			displayname: input.displayName,
			type: input.type,
			isoptional: input.isOptional ?? false,
		};

		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		if (input.logicalEntityName !== undefined) {
			payload['logicalentityname'] = input.logicalEntityName;
		}

		const response = await this.apiService.post<{ customapirequestparameterid: string }>(
			environmentId,
			endpoint,
			payload
		);

		this.logger.info('DataverseCustomApiParameterRepository: Request parameter registered', {
			parameterId: response.customapirequestparameterid,
			name: input.name,
		});

		return response.customapirequestparameterid;
	}

	private async registerResponseProperty(
		environmentId: string,
		input: RegisterCustomApiParameterInput
	): Promise<string> {
		const endpoint = `/api/data/v9.2/${DataverseCustomApiParameterRepository.RESPONSE_ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			'CustomAPIId@odata.bind': `/customapis(${input.customApiId})`,
			name: input.name,
			uniquename: input.uniqueName,
			displayname: input.displayName,
			type: input.type,
		};

		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		if (input.logicalEntityName !== undefined) {
			payload['logicalentityname'] = input.logicalEntityName;
		}

		const response = await this.apiService.post<{ customapiresponsepropertyid: string }>(
			environmentId,
			endpoint,
			payload
		);

		this.logger.info('DataverseCustomApiParameterRepository: Response property registered', {
			parameterId: response.customapiresponsepropertyid,
			name: input.name,
		});

		return response.customapiresponsepropertyid;
	}

	private mapRequestToDomain(dto: RequestParameterDto): CustomApiParameter {
		return new CustomApiParameter(
			dto.customapirequestparameterid,
			dto._customapiid_value,
			dto.name,
			dto.uniquename,
			dto.displayname,
			dto.description,
			CustomApiParameterType.fromValue(dto.type),
			dto.logicalentityname,
			dto.isoptional,
			'request'
		);
	}

	private mapResponseToDomain(dto: ResponsePropertyDto): CustomApiParameter {
		return new CustomApiParameter(
			dto.customapiresponsepropertyid,
			dto._customapiid_value,
			dto.name,
			dto.uniquename,
			dto.displayname,
			dto.description,
			CustomApiParameterType.fromValue(dto.type),
			dto.logicalentityname,
			false, // Response properties are never optional
			'response'
		);
	}
}
