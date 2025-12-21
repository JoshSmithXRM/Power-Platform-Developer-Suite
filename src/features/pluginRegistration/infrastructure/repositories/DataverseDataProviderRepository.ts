import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IDataProviderRepository,
	RegisterDataProviderInput,
	UpdateDataProviderInput,
} from '../../domain/interfaces/IDataProviderRepository';
import { DataProvider } from '../../domain/entities/DataProvider';

/**
 * DTO for Dataverse entitydataprovider entity.
 *
 * Note: entitydataprovider has a very limited schema.
 * Does NOT have: iscustomizable, _solutionid_value, createdon, modifiedon
 */
interface DataProviderDto {
	entitydataproviderid: string;
	name: string;
	datasourcelogicalname: string;
	description: string | null;
	retrieveplugin: string | null;
	retrievemultipleplugin: string | null;
	createplugin: string | null;
	updateplugin: string | null;
	deleteplugin: string | null;
	ismanaged: boolean;
}

/**
 * Dataverse API response for entitydataprovider collection.
 */
interface DataProviderCollectionResponse {
	value: DataProviderDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for Entity Data Provider entities.
 * Implements IDataProviderRepository interface.
 *
 * Data Providers enable Virtual Entities by mapping plugin types to CRUD operations.
 */
export class DataverseDataProviderRepository implements IDataProviderRepository {
	private static readonly ENTITY_SET = 'entitydataproviders';
	// Note: entitydataprovider has limited schema - no audit fields, no solutionid, no iscustomizable
	private static readonly SELECT_FIELDS =
		'entitydataproviderid,name,datasourcelogicalname,description,' +
		'retrieveplugin,retrievemultipleplugin,createplugin,updateplugin,deleteplugin,' +
		'ismanaged';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly DataProvider[]> {
		this.logger.info('DataverseDataProviderRepository: Fetching data providers', {
			environmentId,
		});

		const startTime = Date.now();
		const allDataProviders: DataProvider[] = [];

		const initialEndpoint =
			`/api/data/v9.2/${DataverseDataProviderRepository.ENTITY_SET}` +
			`?$select=${DataverseDataProviderRepository.SELECT_FIELDS}` +
			'&$orderby=name asc';

		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: DataProviderCollectionResponse =
				await this.apiService.get<DataProviderCollectionResponse>(
					environmentId,
					currentEndpoint
				);

			const pageDataProviders = response.value.map((dto: DataProviderDto) =>
				this.mapToDomain(dto)
			);
			allDataProviders.push(...pageDataProviders);
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

		this.logger.info('DataverseDataProviderRepository: Fetched data providers', {
			count: allDataProviders.length,
			pages: pageCount,
			totalMs: Date.now() - startTime,
		});

		return allDataProviders;
	}

	public async findById(
		environmentId: string,
		dataProviderId: string
	): Promise<DataProvider | null> {
		this.logger.debug('DataverseDataProviderRepository: Fetching data provider by ID', {
			environmentId,
			dataProviderId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseDataProviderRepository.ENTITY_SET}(${dataProviderId})` +
			`?$select=${DataverseDataProviderRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<DataProviderDto>(environmentId, endpoint);
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
		input: RegisterDataProviderInput
	): Promise<string> {
		this.logger.info('DataverseDataProviderRepository: Registering new data provider', {
			environmentId,
			name: input.name,
			dataSourceLogicalName: input.dataSourceLogicalName,
		});

		const endpoint = `/api/data/v9.2/${DataverseDataProviderRepository.ENTITY_SET}`;

		const payload: Record<string, unknown> = {
			name: input.name,
			datasourcelogicalname: input.dataSourceLogicalName,
		};

		// Add optional description
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		// Add plugin type bindings (use "not implemented" GUID if not provided)
		this.setPluginBinding(payload, 'retrieveplugin', input.retrievePluginId);
		this.setPluginBinding(payload, 'retrievemultipleplugin', input.retrieveMultiplePluginId);
		this.setPluginBinding(payload, 'createplugin', input.createPluginId);
		this.setPluginBinding(payload, 'updateplugin', input.updatePluginId);
		this.setPluginBinding(payload, 'deleteplugin', input.deletePluginId);

		// Use solution header if provided
		const additionalHeaders = input.solutionUniqueName
			? { 'MSCRM.SolutionUniqueName': input.solutionUniqueName }
			: undefined;

		const response = await this.apiService.post<{ entitydataproviderid: string }>(
			environmentId,
			endpoint,
			payload,
			undefined, // cancellationToken
			additionalHeaders
		);

		const dataProviderId = response.entitydataproviderid;

		this.logger.info('DataverseDataProviderRepository: Data provider registered', {
			dataProviderId,
			name: input.name,
		});

		return dataProviderId;
	}

	public async update(
		environmentId: string,
		dataProviderId: string,
		input: UpdateDataProviderInput
	): Promise<void> {
		this.logger.info('DataverseDataProviderRepository: Updating data provider', {
			environmentId,
			dataProviderId,
		});

		const endpoint = `/api/data/v9.2/${DataverseDataProviderRepository.ENTITY_SET}(${dataProviderId})`;

		// Build payload with only provided fields (partial update)
		const payload: Record<string, unknown> = {};

		if (input.name !== undefined) {
			payload['name'] = input.name;
		}
		if (input.description !== undefined) {
			payload['description'] = input.description;
		}

		// Handle plugin type updates (null clears to "not implemented")
		if (input.retrievePluginId !== undefined) {
			this.setPluginBindingForUpdate(payload, 'retrieveplugin', input.retrievePluginId);
		}
		if (input.retrieveMultiplePluginId !== undefined) {
			this.setPluginBindingForUpdate(
				payload,
				'retrievemultipleplugin',
				input.retrieveMultiplePluginId
			);
		}
		if (input.createPluginId !== undefined) {
			this.setPluginBindingForUpdate(payload, 'createplugin', input.createPluginId);
		}
		if (input.updatePluginId !== undefined) {
			this.setPluginBindingForUpdate(payload, 'updateplugin', input.updatePluginId);
		}
		if (input.deletePluginId !== undefined) {
			this.setPluginBindingForUpdate(payload, 'deleteplugin', input.deletePluginId);
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.info('DataverseDataProviderRepository: Data provider updated', {
			dataProviderId,
		});
	}

	public async delete(environmentId: string, dataProviderId: string): Promise<void> {
		this.logger.info('DataverseDataProviderRepository: Deleting data provider', {
			environmentId,
			dataProviderId,
		});

		const endpoint = `/api/data/v9.2/${DataverseDataProviderRepository.ENTITY_SET}(${dataProviderId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataverseDataProviderRepository: Data provider deleted', {
			dataProviderId,
		});
	}

	/**
	 * Sets a plugin type binding in the payload for registration.
	 * Uses "not implemented" GUID if no plugin ID is provided.
	 */
	private setPluginBinding(
		payload: Record<string, unknown>,
		fieldName: string,
		pluginId: string | undefined
	): void {
		const guidToUse = pluginId ?? DataProvider.getNotImplementedGuid();
		payload[`${fieldName}@odata.bind`] = `/plugintypes(${guidToUse})`;
	}

	/**
	 * Sets a plugin type binding in the payload for update operations.
	 * null clears to "not implemented" GUID.
	 */
	private setPluginBindingForUpdate(
		payload: Record<string, unknown>,
		fieldName: string,
		pluginId: string | null
	): void {
		const guidToUse = pluginId ?? DataProvider.getNotImplementedGuid();
		payload[`${fieldName}@odata.bind`] = `/plugintypes(${guidToUse})`;
	}

	/**
	 * Normalizes a plugin GUID to null if it's the "not implemented" placeholder.
	 */
	private normalizePluginId(pluginId: string | null): string | null {
		if (DataProvider.isNotImplementedGuid(pluginId)) {
			return null;
		}
		return pluginId;
	}

	private mapToDomain(dto: DataProviderDto): DataProvider {
		// entitydataprovider has limited schema - use defaults for missing fields
		return new DataProvider(
			dto.entitydataproviderid,
			dto.name,
			dto.datasourcelogicalname,
			dto.description,
			this.normalizePluginId(dto.retrieveplugin),
			this.normalizePluginId(dto.retrievemultipleplugin),
			this.normalizePluginId(dto.createplugin),
			this.normalizePluginId(dto.updateplugin),
			this.normalizePluginId(dto.deleteplugin),
			dto.ismanaged,
			!dto.ismanaged, // isCustomizable: assume true if unmanaged (field not exposed)
			null, // solutionId not exposed
			new Date(), // createdOn not exposed
			new Date() // modifiedOn not exposed
		);
	}
}
