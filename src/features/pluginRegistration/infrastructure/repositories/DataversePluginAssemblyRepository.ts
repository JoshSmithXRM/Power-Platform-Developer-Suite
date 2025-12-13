import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	AssemblyWithTypes,
	IPluginAssemblyRepository,
} from '../../domain/interfaces/IPluginAssemblyRepository';
import { PluginAssembly } from '../../domain/entities/PluginAssembly';
import { PluginType } from '../../domain/entities/PluginType';
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
 * DTO for plugin type in expanded response.
 */
interface ExpandedPluginTypeDto {
	plugintypeid: string;
	typename: string;
	friendlyname: string | null;
	workflowactivitygroupname: string | null;
}

/**
 * DTO for assembly with expanded plugin types.
 */
interface PluginAssemblyWithTypesDto extends PluginAssemblyDto {
	pluginassembly_plugintype?: ExpandedPluginTypeDto[];
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

	public async register(
		environmentId: string,
		name: string,
		base64Content: string,
		solutionUniqueName?: string
	): Promise<string> {
		this.logger.info('DataversePluginAssemblyRepository: Registering new assembly', {
			environmentId,
			name,
			contentLength: base64Content.length,
			solutionUniqueName,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}`;

		// Cloud-only fixed values per Microsoft documentation:
		// - sourcetype: 0 = Database (on-prem can use 1=Disk or 2=GAC)
		// - isolationmode: 2 = Sandbox (on-prem can use 1=None)
		const payload = {
			name,
			content: base64Content,
			sourcetype: 0,
			isolationmode: 2,
		};

		// Use MSCRM.SolutionUniqueName header for solution association
		// (pluginassemblies doesn't support solutionUniqueName query parameter)
		const additionalHeaders: Record<string, string> | undefined = solutionUniqueName
			? { 'MSCRM.SolutionUniqueName': solutionUniqueName }
			: undefined;

		const response = await this.apiService.post<{ pluginassemblyid: string }>(
			environmentId,
			endpoint,
			payload,
			undefined, // no cancellation token
			additionalHeaders
		);

		const assemblyId = response.pluginassemblyid;

		this.logger.info('DataversePluginAssemblyRepository: Assembly registered', {
			assemblyId,
			name,
		});

		return assemblyId;
	}

	public async delete(environmentId: string, assemblyId: string): Promise<void> {
		this.logger.info('DataversePluginAssemblyRepository: Deleting assembly', {
			environmentId,
			assemblyId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}(${assemblyId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.info('DataversePluginAssemblyRepository: Assembly deleted', {
			assemblyId,
		});
	}

	public async findByIdWithTypes(
		environmentId: string,
		assemblyId: string
	): Promise<AssemblyWithTypes | null> {
		this.logger.debug('DataversePluginAssemblyRepository: Fetching assembly with types', {
			environmentId,
			assemblyId,
		});

		// Use $expand to fetch assembly and plugin types in a single query
		const pluginTypeSelect = 'plugintypeid,typename,friendlyname,workflowactivitygroupname';
		const endpoint =
			`/api/data/v9.2/${DataversePluginAssemblyRepository.ENTITY_SET}(${assemblyId})` +
			`?$select=${DataversePluginAssemblyRepository.SELECT_FIELDS}` +
			`&$expand=pluginassembly_plugintype($select=${pluginTypeSelect})`;

		try {
			const dto = await this.apiService.get<PluginAssemblyWithTypesDto>(environmentId, endpoint);

			const assembly = this.mapToDomain(dto);
			const pluginTypes = (dto.pluginassembly_plugintype ?? []).map(
				(pt) =>
					new PluginType(
						pt.plugintypeid,
						pt.typename,
						pt.friendlyname ?? pt.typename,
						assemblyId,
						pt.workflowactivitygroupname
					)
			);

			this.logger.debug('DataversePluginAssemblyRepository: Fetched assembly with types', {
				assemblyId,
				pluginTypeCount: pluginTypes.length,
			});

			return { assembly, pluginTypes };
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
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
