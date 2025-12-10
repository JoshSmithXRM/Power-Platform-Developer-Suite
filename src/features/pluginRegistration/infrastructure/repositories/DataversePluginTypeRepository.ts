import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTypeRepository } from '../../domain/interfaces/IPluginTypeRepository';
import { PluginType } from '../../domain/entities/PluginType';

/**
 * DTO for Dataverse plugintype entity.
 */
interface PluginTypeDto {
	plugintypeid: string;
	typename: string;
	friendlyname: string | null;
	_pluginassemblyid_value: string;
	workflowactivitygroupname: string | null;
}

/**
 * Dataverse API response for plugintype collection.
 * Includes optional @odata.nextLink for pagination (Dataverse defaults to 5000 records per page).
 */
interface PluginTypeCollectionResponse {
	value: PluginTypeDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for PluginType entities.
 * Implements IPluginTypeRepository interface.
 */
export class DataversePluginTypeRepository implements IPluginTypeRepository {
	private static readonly ENTITY_SET = 'plugintypes';
	private static readonly SELECT_FIELDS =
		'plugintypeid,typename,friendlyname,_pluginassemblyid_value,workflowactivitygroupname';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly PluginType[]> {
		this.logger.debug('DataversePluginTypeRepository: Fetching ALL plugin types', {
			environmentId,
		});

		// Use primary key ordering for optimal pagination performance
		const initialEndpoint =
			`/api/data/v9.2/${DataversePluginTypeRepository.ENTITY_SET}` +
			`?$select=${DataversePluginTypeRepository.SELECT_FIELDS}` +
			'&$orderby=plugintypeid asc';

		const allPluginTypes: PluginType[] = [];
		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: PluginTypeCollectionResponse =
				await this.apiService.get<PluginTypeCollectionResponse>(environmentId, currentEndpoint);

			const pagePluginTypes = response.value.map((dto: PluginTypeDto) => this.mapToDomain(dto));
			allPluginTypes.push(...pagePluginTypes);
			pageCount++;

			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const url: URL = new URL(nextLink);
				currentEndpoint = url.pathname + url.search;
			} else {
				currentEndpoint = null;
			}
		}

		this.logger.debug('DataversePluginTypeRepository: Fetched ALL plugin types', {
			count: allPluginTypes.length,
			pages: pageCount,
		});

		return allPluginTypes;
	}

	public async findByAssemblyId(
		environmentId: string,
		assemblyId: string
	): Promise<readonly PluginType[]> {
		this.logger.debug('DataversePluginTypeRepository: Fetching plugin types', {
			environmentId,
			assemblyId,
		});

		const endpoint =
			`/api/data/v9.2/${DataversePluginTypeRepository.ENTITY_SET}?$select=${DataversePluginTypeRepository.SELECT_FIELDS}` +
			`&$filter=_pluginassemblyid_value eq ${assemblyId}&$orderby=typename asc`;

		const response = await this.apiService.get<PluginTypeCollectionResponse>(
			environmentId,
			endpoint
		);

		const pluginTypes = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginTypeRepository: Fetched plugin types', {
			count: pluginTypes.length,
		});

		return pluginTypes;
	}

	public async findById(
		environmentId: string,
		pluginTypeId: string
	): Promise<PluginType | null> {
		this.logger.debug('DataversePluginTypeRepository: Fetching plugin type by ID', {
			environmentId,
			pluginTypeId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginTypeRepository.ENTITY_SET}(${pluginTypeId})?$select=${DataversePluginTypeRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<PluginTypeDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	private mapToDomain(dto: PluginTypeDto): PluginType {
		return new PluginType(
			dto.plugintypeid,
			dto.typename,
			dto.friendlyname ?? dto.typename,
			dto._pluginassemblyid_value,
			dto.workflowactivitygroupname
		);
	}
}
