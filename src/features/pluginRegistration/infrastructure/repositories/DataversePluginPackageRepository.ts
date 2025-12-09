import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';
import { PluginPackage } from '../../domain/entities/PluginPackage';

/**
 * DTO for Dataverse pluginpackage entity.
 */
interface PluginPackageDto {
	pluginpackageid: string;
	name: string;
	uniquename: string;
	version: string;
	ismanaged: boolean;
	createdon: string;
	modifiedon: string;
}

/**
 * Dataverse API response for pluginpackage collection.
 */
interface PluginPackageCollectionResponse {
	value: PluginPackageDto[];
	'@odata.count'?: number;
}

/**
 * Dataverse repository for PluginPackage entities.
 * Implements IPluginPackageRepository interface.
 */
export class DataversePluginPackageRepository implements IPluginPackageRepository {
	private static readonly ENTITY_SET = 'pluginpackages';
	private static readonly SELECT_FIELDS =
		'pluginpackageid,name,uniquename,version,ismanaged,createdon,modifiedon';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(
		environmentId: string,
		solutionId?: string
	): Promise<readonly PluginPackage[]> {
		this.logger.debug('DataversePluginPackageRepository: Fetching packages', {
			environmentId,
			solutionId: solutionId ?? 'all',
		});

		let endpoint = `/api/data/v9.2/${DataversePluginPackageRepository.ENTITY_SET}?$select=${DataversePluginPackageRepository.SELECT_FIELDS}`;

		// Add solution filtering if specified (component type 10090 for plugin packages)
		if (solutionId && solutionId !== 'default') {
			const solutionFilter = `Microsoft.Dynamics.CRM.SolutionComponentContains(SolutionId=${solutionId},ComponentType=10090,ObjectId=pluginpackageid)`;
			endpoint += `&$filter=${solutionFilter}`;
		}

		endpoint += '&$orderby=name asc';

		const response = await this.apiService.get<PluginPackageCollectionResponse>(
			environmentId,
			endpoint
		);

		const packages = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginPackageRepository: Fetched packages', {
			count: packages.length,
		});

		return packages;
	}

	public async findById(
		environmentId: string,
		packageId: string
	): Promise<PluginPackage | null> {
		this.logger.debug('DataversePluginPackageRepository: Fetching package by ID', {
			environmentId,
			packageId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginPackageRepository.ENTITY_SET}(${packageId})?$select=${DataversePluginPackageRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<PluginPackageDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async countAssemblies(environmentId: string, packageId: string): Promise<number> {
		this.logger.debug('DataversePluginPackageRepository: Counting assemblies', {
			environmentId,
			packageId,
		});

		const endpoint = `/api/data/v9.2/pluginassemblies?$select=pluginassemblyid&$filter=_pluginpackageid_value eq ${packageId}&$count=true`;

		const response = await this.apiService.get<PluginPackageCollectionResponse>(
			environmentId,
			endpoint
		);

		return response['@odata.count'] ?? response.value.length;
	}

	private mapToDomain(dto: PluginPackageDto): PluginPackage {
		return new PluginPackage(
			dto.pluginpackageid,
			dto.name,
			dto.uniquename,
			dto.version,
			dto.ismanaged,
			new Date(dto.createdon),
			new Date(dto.modifiedon)
		);
	}
}
