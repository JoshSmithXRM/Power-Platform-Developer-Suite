import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import { PluginAssembly } from '../../domain/entities/PluginAssembly';
import { IsolationMode } from '../../domain/valueObjects/IsolationMode';
import { SourceType } from '../../domain/valueObjects/SourceType';

/**
 * DTO for Dataverse pluginassembly entity.
 */
interface PluginAssemblyDto {
	pluginassemblyid: string;
	name: string;
	version: string;
	isolationmode: number;
	ismanaged: boolean;
	sourcetype: number;
	createdon: string;
	modifiedon: string;
	_packageid_value: string | null;
}

/**
 * Dataverse API response for pluginassembly collection.
 */
interface PluginAssemblyCollectionResponse {
	value: PluginAssemblyDto[];
	'@odata.count'?: number;
}

/**
 * Dataverse repository for PluginAssembly entities.
 * Implements IPluginAssemblyRepository interface.
 */
export class DataversePluginAssemblyRepository implements IPluginAssemblyRepository {
	private static readonly ENTITY_SET = 'pluginassemblies';
	private static readonly SELECT_FIELDS =
		'pluginassemblyid,name,version,isolationmode,ismanaged,sourcetype,createdon,modifiedon,_packageid_value';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(
		environmentId: string,
		_solutionId?: string
	): Promise<readonly PluginAssembly[]> {
		this.logger.debug('DataversePluginAssemblyRepository: Fetching assemblies', {
			environmentId,
		});

		// Note: Solution filtering is deferred - would require ISolutionComponentRepository
		// like ListWebResourcesUseCase. For now, returns all assemblies.
		const endpoint =
			`/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}` +
			`?$select=${DataversePluginAssemblyRepository.SELECT_FIELDS}` +
			'&$orderby=name asc';

		const response = await this.apiService.get<PluginAssemblyCollectionResponse>(
			environmentId,
			endpoint
		);

		const assemblies = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginAssemblyRepository: Fetched assemblies', {
			count: assemblies.length,
			withPackage: assemblies.filter((a) => a.getPackageId() !== null).length,
		});

		return assemblies;
	}

	public async findByPackageId(
		environmentId: string,
		packageId: string
	): Promise<readonly PluginAssembly[]> {
		this.logger.debug('DataversePluginAssemblyRepository: Fetching assemblies by package', {
			environmentId,
			packageId,
		});

		const endpoint =
			`/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}` +
			`?$select=${DataversePluginAssemblyRepository.SELECT_FIELDS}` +
			`&$filter=_packageid_value eq ${packageId}` +
			'&$orderby=name asc';

		const response = await this.apiService.get<PluginAssemblyCollectionResponse>(
			environmentId,
			endpoint
		);

		const assemblies = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginAssemblyRepository: Fetched assemblies by package', {
			packageId,
			count: assemblies.length,
		});

		return assemblies;
	}

	public async findStandalone(
		environmentId: string,
		_solutionId?: string
	): Promise<readonly PluginAssembly[]> {
		this.logger.debug('DataversePluginAssemblyRepository: Fetching standalone assemblies', {
			environmentId,
		});

		// Standalone assemblies have no package (packageid is null)
		// Solution filtering is deferred (requires ISolutionComponentRepository).
		const endpoint =
			`/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}` +
			`?$select=${DataversePluginAssemblyRepository.SELECT_FIELDS}` +
			`&$filter=_packageid_value eq null` +
			'&$orderby=name asc';

		const response = await this.apiService.get<PluginAssemblyCollectionResponse>(
			environmentId,
			endpoint
		);

		const assemblies = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginAssemblyRepository: Fetched standalone assemblies', {
			count: assemblies.length,
		});

		return assemblies;
	}

	public async findById(
		environmentId: string,
		assemblyId: string
	): Promise<PluginAssembly | null> {
		this.logger.debug('DataversePluginAssemblyRepository: Fetching assembly by ID', {
			environmentId,
			assemblyId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}(${assemblyId})?$select=${DataversePluginAssemblyRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<PluginAssemblyDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async countActiveSteps(environmentId: string, assemblyId: string): Promise<number> {
		this.logger.debug('DataversePluginAssemblyRepository: Counting active steps', {
			environmentId,
			assemblyId,
		});

		// Query steps where plugintype belongs to this assembly and step is enabled (statecode = 0)
		const endpoint =
			`/api/data/v9.2/sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid` +
			`&$filter=statecode eq 0 and _plugintypeid_value ne null` +
			`&$expand=plugintypeid($select=_pluginassemblyid_value;$filter=_pluginassemblyid_value eq ${assemblyId})` +
			`&$count=true`;

		try {
			const response = await this.apiService.get<PluginAssemblyCollectionResponse>(
				environmentId,
				endpoint
			);
			return response['@odata.count'] ?? response.value.length;
		} catch {
			// Fallback: if the expand query fails, return 0
			this.logger.debug('Count active steps query failed, returning 0');
			return 0;
		}
	}

	public async updateContent(
		environmentId: string,
		assemblyId: string,
		base64Content: string
	): Promise<void> {
		this.logger.debug('DataversePluginAssemblyRepository: Updating assembly content', {
			environmentId,
			assemblyId,
			contentLength: base64Content.length,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}(${assemblyId})`;

		await this.apiService.patch(environmentId, endpoint, { content: base64Content });

		this.logger.debug('DataversePluginAssemblyRepository: Assembly content updated', {
			assemblyId,
		});
	}

	private mapToDomain(dto: PluginAssemblyDto): PluginAssembly {
		return new PluginAssembly(
			dto.pluginassemblyid,
			dto.name,
			dto.version,
			IsolationMode.fromValue(dto.isolationmode),
			dto.ismanaged,
			SourceType.fromValue(dto.sourcetype),
			dto._packageid_value,
			new Date(dto.createdon),
			new Date(dto.modifiedon)
		);
	}
}
