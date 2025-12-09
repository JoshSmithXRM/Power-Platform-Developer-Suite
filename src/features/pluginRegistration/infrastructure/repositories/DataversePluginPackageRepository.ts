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
		_solutionId?: string
	): Promise<readonly PluginPackage[]> {
		this.logger.debug('DataversePluginPackageRepository: Fetching packages', {
			environmentId,
		});

		// Note: Solution filtering is deferred - would require ISolutionComponentRepository.
		// Also, pluginpackages entity doesn't exist in all Dataverse environments
		// (it's a newer feature). Handle 404 gracefully.
		const endpoint =
			`/api/data/v9.2/${DataversePluginPackageRepository.ENTITY_SET}` +
			`?$select=${DataversePluginPackageRepository.SELECT_FIELDS}` +
			'&$orderby=name asc';

		try {
			const response = await this.apiService.get<PluginPackageCollectionResponse>(
				environmentId,
				endpoint
			);

			const packages = response.value.map((dto) => this.mapToDomain(dto));

			this.logger.debug('DataversePluginPackageRepository: Fetched packages', {
				count: packages.length,
			});

			return packages;
		} catch (error) {
			// Gracefully handle environments where pluginpackages entity doesn't exist
			if (error instanceof Error && (error.message.includes('404') || error.message.includes('does not exist'))) {
				this.logger.debug('DataversePluginPackageRepository: Plugin packages not supported in this environment');
				return [];
			}
			throw error;
		}
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

		// Note: The pluginassembly entity doesn't have _pluginpackageid_value in most
		// Dataverse environments. For now, return 0 as we cannot count by package.
		// TODO: When plugin packages are properly supported, implement the count query.
		this.logger.debug(
			'DataversePluginPackageRepository: Assembly count by package not supported',
			{ packageId }
		);

		return 0;
	}

	public async updateContent(
		environmentId: string,
		packageId: string,
		base64Content: string
	): Promise<void> {
		this.logger.debug('DataversePluginPackageRepository: Updating package content', {
			environmentId,
			packageId,
			contentLength: base64Content.length,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginPackageRepository.ENTITY_SET}(${packageId})`;

		await this.apiService.patch(environmentId, endpoint, { content: base64Content });

		this.logger.debug('DataversePluginPackageRepository: Package content updated', {
			packageId,
		});
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
