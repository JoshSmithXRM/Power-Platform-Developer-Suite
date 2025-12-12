import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';
import { PluginStep } from '../../domain/entities/PluginStep';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { ExecutionStage } from '../../domain/valueObjects/ExecutionStage';
import { StepStatus } from '../../domain/valueObjects/StepStatus';

/**
 * DTO for Dataverse sdkmessageprocessingstep entity.
 */
/**
 * Dataverse managed property structure for iscustomizable field.
 */
interface ManagedPropertyDto {
	Value: boolean;
	CanBeChanged: boolean;
	ManagedPropertyLogicalName: string;
}

interface PluginStepDto {
	sdkmessageprocessingstepid: string;
	name: string;
	_plugintypeid_value: string;
	_sdkmessageid_value: string;
	'_sdkmessageid_value@OData.Community.Display.V1.FormattedValue'?: string;
	_sdkmessagefilterid_value: string | null;
	'_sdkmessagefilterid_value@OData.Community.Display.V1.FormattedValue'?: string;
	stage: number;
	mode: number;
	rank: number;
	statecode: number;
	filteringattributes: string | null;
	ismanaged: boolean;
	iscustomizable: ManagedPropertyDto;
	createdon: string;
	// Expanded message entity
	sdkmessageid?: {
		name: string;
	};
	// Expanded filter entity
	sdkmessagefilterid?: {
		primaryobjecttypecode: string;
	} | null;
}

/**
 * Dataverse API response for sdkmessageprocessingstep collection.
 * Includes optional @odata.nextLink for pagination (Dataverse defaults to 5000 records per page).
 */
interface PluginStepCollectionResponse {
	value: PluginStepDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for PluginStep entities.
 * Implements IPluginStepRepository interface.
 *
 * Uses optimized sequential pagination with @odata.nextLink.
 * This is the fastest approach for bulk fetches because:
 * - Dataverse pre-computes the cursor on the first query
 * - Primary key ordering is index-optimized
 * - Server-side caching benefits subsequent pages
 */
export class DataversePluginStepRepository implements IPluginStepRepository {
	private static readonly ENTITY_SET = 'sdkmessageprocessingsteps';
	private static readonly SELECT_FIELDS =
		'sdkmessageprocessingstepid,name,_plugintypeid_value,_sdkmessageid_value,_sdkmessagefilterid_value,stage,mode,rank,statecode,filteringattributes,ismanaged,iscustomizable,createdon';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly PluginStep[]> {
		this.logger.debug('DataversePluginStepRepository: Fetching ALL steps (optimized sequential)', {
			environmentId,
		});

		const startTime = Date.now();

		// Optimized query:
		// - Order by primary key for optimal pagination (Dataverse is optimized for this)
		// - Use $expand to get message/filter names in single query (fewer round trips)
		// - Sequential pagination with @odata.nextLink is the fastest approach for bulk fetches
		const initialEndpoint =
			`/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}` +
			`?$select=${DataversePluginStepRepository.SELECT_FIELDS}` +
			`&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)` +
			`&$orderby=sdkmessageprocessingstepid asc`;

		const allSteps: PluginStep[] = [];
		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: PluginStepCollectionResponse =
				await this.apiService.get<PluginStepCollectionResponse>(environmentId, currentEndpoint);

			const pageSteps = response.value.map((dto: PluginStepDto) => this.mapToDomain(dto));
			allSteps.push(...pageSteps);
			pageCount++;

			this.logger.debug('DataversePluginStepRepository: Page fetched', {
				page: pageCount,
				pageSize: pageSteps.length,
				totalSoFar: allSteps.length,
			});

			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const url: URL = new URL(nextLink);
				currentEndpoint = url.pathname + url.search;
			} else {
				currentEndpoint = null;
			}
		}

		const totalTime = Date.now() - startTime;

		this.logger.info('DataversePluginStepRepository: Sequential fetch complete', {
			totalSteps: allSteps.length,
			pages: pageCount,
			totalMs: totalTime,
			avgMsPerPage: Math.round(totalTime / pageCount),
		});

		return allSteps;
	}

	public async findByPluginTypeId(
		environmentId: string,
		pluginTypeId: string
	): Promise<readonly PluginStep[]> {
		this.logger.debug('DataversePluginStepRepository: Fetching steps', {
			environmentId,
			pluginTypeId,
		});

		// Expand sdkmessageid to get message name, and sdkmessagefilterid to get entity name
		const endpoint =
			`/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}?$select=${DataversePluginStepRepository.SELECT_FIELDS}` +
			`&$filter=_plugintypeid_value eq ${pluginTypeId}` +
			`&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)` +
			`&$orderby=name asc`;

		const response = await this.apiService.get<PluginStepCollectionResponse>(
			environmentId,
			endpoint
		);

		const steps = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginStepRepository: Fetched steps', {
			count: steps.length,
		});

		return steps;
	}

	public async findById(environmentId: string, stepId: string): Promise<PluginStep | null> {
		this.logger.debug('DataversePluginStepRepository: Fetching step by ID', {
			environmentId,
			stepId,
		});

		const endpoint =
			`/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})?$select=${DataversePluginStepRepository.SELECT_FIELDS}` +
			`&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)`;

		try {
			const dto = await this.apiService.get<PluginStepDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async enable(environmentId: string, stepId: string): Promise<void> {
		this.logger.debug('DataversePluginStepRepository: Enabling step', {
			environmentId,
			stepId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`;

		await this.apiService.patch(environmentId, endpoint, { statecode: 0 });

		this.logger.debug('DataversePluginStepRepository: Step enabled', { stepId });
	}

	public async disable(environmentId: string, stepId: string): Promise<void> {
		this.logger.debug('DataversePluginStepRepository: Disabling step', {
			environmentId,
			stepId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`;

		await this.apiService.patch(environmentId, endpoint, { statecode: 1 });

		this.logger.debug('DataversePluginStepRepository: Step disabled', { stepId });
	}

	private mapToDomain(dto: PluginStepDto): PluginStep {
		// Get message name from expanded entity or formatted value annotation
		const messageName =
			dto.sdkmessageid?.name ??
			dto['_sdkmessageid_value@OData.Community.Display.V1.FormattedValue'] ??
			'Unknown';

		// Get entity name from expanded filter or formatted value annotation
		const entityName =
			dto.sdkmessagefilterid?.primaryobjecttypecode ??
			dto['_sdkmessagefilterid_value@OData.Community.Display.V1.FormattedValue'] ??
			null;

		// Extract isCustomizable from managed property (defaults to true if missing)
		const isCustomizable = dto.iscustomizable?.Value ?? true;

		return new PluginStep(
			dto.sdkmessageprocessingstepid,
			dto.name,
			dto._plugintypeid_value,
			dto._sdkmessageid_value,
			messageName,
			dto._sdkmessagefilterid_value,
			entityName,
			ExecutionStage.fromValue(dto.stage),
			ExecutionMode.fromValue(dto.mode),
			dto.rank,
			StepStatus.fromValue(dto.statecode),
			dto.filteringattributes,
			dto.ismanaged,
			isCustomizable,
			new Date(dto.createdon)
		);
	}
}
