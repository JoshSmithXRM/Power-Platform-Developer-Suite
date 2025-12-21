import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	ICustomApiRepository,
	RegisterCustomApiInput,
	UpdateCustomApiInput,
} from '../../domain/interfaces/ICustomApiRepository';
import { CustomApi } from '../../domain/entities/CustomApi';
import { AllowedCustomProcessingStepType } from '../../domain/valueObjects/AllowedCustomProcessingStepType';
import { BindingType } from '../../domain/valueObjects/BindingType';

/**
 * DTO for Dataverse customapi entity.
 * Note: customapi does not support $expand on plugintypeid, so we only get the ID
 */
interface CustomApiDto {
	customapiid: string;
	name: string;
	uniquename: string;
	displayname: string;
	description: string | null;
	isfunction: boolean;
	isprivate: boolean;
	executeprivilegename: string | null;
	bindingtype: number;
	boundentitylogicalname: string | null;
	allowedcustomprocessingsteptype: number;
	_plugintypeid_value: string | null;
	_sdkmessageid_value: string | null;
	ismanaged: boolean;
	createdon: string;
	modifiedon: string;
}

/**
 * Dataverse API response for customapi collection.
 */
interface CustomApiCollectionResponse {
	value: CustomApiDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for CustomApi entities.
 * Implements ICustomApiRepository interface.
 */
export class DataverseCustomApiRepository implements ICustomApiRepository {
	private static readonly ENTITY_SET = 'customapis';
	private static readonly SELECT_FIELDS =
		'customapiid,name,uniquename,displayname,description,isfunction,isprivate,' +
		'executeprivilegename,bindingtype,boundentitylogicalname,allowedcustomprocessingsteptype,' +
		'_plugintypeid_value,_sdkmessageid_value,ismanaged,createdon,modifiedon';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly CustomApi[]> {
		this.logger.debug('DataverseCustomApiRepository: Fetching all custom APIs', {
			environmentId,
		});

		const allApis: CustomApi[] = [];
		// Note: customapi does not support $expand on plugintypeid navigation property
		let endpoint: string | null =
			`/api/data/v9.2/${DataverseCustomApiRepository.ENTITY_SET}` +
			`?$select=${DataverseCustomApiRepository.SELECT_FIELDS}` +
			'&$orderby=displayname asc';

		// Handle pagination
		while (endpoint !== null) {
			const response = await this.apiService.get<CustomApiCollectionResponse>(
				environmentId,
				endpoint
			);

			const apis = response.value.map((dto) => this.mapToDomain(dto));
			allApis.push(...apis);

			// Check for next page
			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const nextUrl: URL = new URL(nextLink);
				endpoint = nextUrl.pathname + nextUrl.search;
			} else {
				endpoint = null;
			}
		}

		this.logger.debug('DataverseCustomApiRepository: Fetched custom APIs', {
			count: allApis.length,
		});

		return allApis;
	}

	public async findBySolutionId(
		environmentId: string,
		_solutionId: string
	): Promise<readonly CustomApi[]> {
		// Note: Solution filtering would require ISolutionComponentRepository
		// For now, returns all custom APIs (same as findAll)
		this.logger.debug(
			'DataverseCustomApiRepository: findBySolutionId not yet implemented, returning all',
			{ environmentId }
		);
		return this.findAll(environmentId);
	}

	public async findById(
		environmentId: string,
		customApiId: string
	): Promise<CustomApi | null> {
		this.logger.debug('DataverseCustomApiRepository: Fetching custom API by ID', {
			environmentId,
			customApiId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseCustomApiRepository.ENTITY_SET}(${customApiId})` +
			`?$select=${DataverseCustomApiRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<CustomApiDto>(environmentId, endpoint);
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
		input: RegisterCustomApiInput
	): Promise<string> {
		this.logger.info('DataverseCustomApiRepository: Registering new custom API', {
			environmentId,
			name: input.name,
			uniqueName: input.uniqueName,
		});

		const endpoint = `/api/data/v9.2/${DataverseCustomApiRepository.ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			name: input.name,
			uniquename: input.uniqueName,
			displayname: input.displayName,
			isfunction: input.isFunction,
			isprivate: input.isPrivate,
			bindingtype: input.bindingType,
			allowedcustomprocessingsteptype: input.allowedCustomProcessingStepType,
		};

		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		if (input.executePrivilegeName !== undefined) {
			payload['executeprivilegename'] = input.executePrivilegeName;
		}

		if (input.boundEntityLogicalName !== undefined) {
			payload['boundentitylogicalname'] = input.boundEntityLogicalName;
		}

		if (input.pluginTypeId !== undefined) {
			payload['plugintypeid@odata.bind'] = `/plugintypes(${input.pluginTypeId})`;
		}

		// Use MSCRM.SolutionUniqueName header for solution association
		const additionalHeaders: Record<string, string> | undefined = input.solutionUniqueName
			? { 'MSCRM.SolutionUniqueName': input.solutionUniqueName }
			: undefined;

		const response = await this.apiService.post<{ customapiid: string }>(
			environmentId,
			endpoint,
			payload,
			undefined,
			additionalHeaders
		);

		const customApiId = response.customapiid;

		this.logger.info('DataverseCustomApiRepository: Custom API registered', {
			customApiId,
			name: input.name,
		});

		return customApiId;
	}

	public async update(
		environmentId: string,
		customApiId: string,
		input: UpdateCustomApiInput
	): Promise<void> {
		this.logger.info('DataverseCustomApiRepository: Updating custom API', {
			environmentId,
			customApiId,
		});

		const endpoint = `/api/data/v9.2/${DataverseCustomApiRepository.ENTITY_SET}(${customApiId})`;

		const payload: Record<string, unknown> = {};

		if (input.displayName !== undefined) {
			payload['displayname'] = input.displayName;
		}

		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		if (input.isPrivate !== undefined) {
			payload['isprivate'] = input.isPrivate;
		}

		if (input.executePrivilegeName !== undefined) {
			payload['executeprivilegename'] = input.executePrivilegeName;
		}

		if (input.pluginTypeId !== undefined) {
			if (input.pluginTypeId === null) {
				// Clear the plugin type relationship
				payload['plugintypeid@odata.bind'] = null;
			} else {
				payload['plugintypeid@odata.bind'] = `/plugintypes(${input.pluginTypeId})`;
			}
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.info('DataverseCustomApiRepository: Custom API updated', {
			customApiId,
		});
	}

	public async delete(environmentId: string, customApiId: string): Promise<void> {
		this.logger.info('DataverseCustomApiRepository: Deleting custom API', {
			environmentId,
			customApiId,
		});

		const endpoint = `/api/data/v9.2/${DataverseCustomApiRepository.ENTITY_SET}(${customApiId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataverseCustomApiRepository: Custom API deleted', {
			customApiId,
		});
	}

	private mapToDomain(dto: CustomApiDto): CustomApi {
		return new CustomApi(
			dto.customapiid,
			dto.name,
			dto.uniquename,
			dto.displayname,
			dto.description,
			dto.isfunction,
			dto.isprivate,
			dto.executeprivilegename,
			BindingType.fromValue(dto.bindingtype),
			dto.boundentitylogicalname,
			AllowedCustomProcessingStepType.fromValue(dto.allowedcustomprocessingsteptype),
			dto._plugintypeid_value,
			null, // customapi does not support $expand on plugintypeid
			dto._sdkmessageid_value,
			dto.ismanaged,
			new Date(dto.createdon),
			new Date(dto.modifiedon)
		);
	}
}
