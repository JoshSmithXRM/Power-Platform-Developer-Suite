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
 */
interface PluginStepCollectionResponse {
	value: PluginStepDto[];
}

/**
 * Dataverse repository for PluginStep entities.
 * Implements IPluginStepRepository interface.
 */
export class DataversePluginStepRepository implements IPluginStepRepository {
	private static readonly ENTITY_SET = 'sdkmessageprocessingsteps';
	private static readonly SELECT_FIELDS =
		'sdkmessageprocessingstepid,name,_plugintypeid_value,_sdkmessageid_value,_sdkmessagefilterid_value,stage,mode,rank,statecode,filteringattributes,ismanaged,createdon';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

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
			new Date(dto.createdon)
		);
	}
}
