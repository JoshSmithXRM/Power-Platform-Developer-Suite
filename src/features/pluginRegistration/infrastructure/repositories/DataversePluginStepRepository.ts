import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IPluginStepRepository,
	RegisterStepInput,
	UpdateStepInput,
} from '../../domain/interfaces/IPluginStepRepository';
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
	// Event handler: polymorphic lookup (plugintype or serviceendpoint)
	_eventhandler_value: string | null;
	'_eventhandler_value@Microsoft.Dynamics.CRM.lookuplogicalname'?: string;
	stage: number;
	mode: number;
	rank: number;
	statecode: number;
	filteringattributes: string | null;
	description: string | null;
	configuration: string | null; // Dataverse name for unsecure configuration
	supporteddeployment: number; // 0=Server, 1=Offline, 2=Both
	asyncautodelete: boolean;
	ismanaged: boolean;
	iscustomizable: ManagedPropertyDto;
	ishidden: ManagedPropertyDto;
	createdon: string;
	modifiedon: string;
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
		'sdkmessageprocessingstepid,name,_plugintypeid_value,_sdkmessageid_value,_sdkmessagefilterid_value,_eventhandler_value,stage,mode,rank,statecode,filteringattributes,description,configuration,supporteddeployment,asyncautodelete,ismanaged,iscustomizable,ishidden,createdon,modifiedon';

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

	public async findByServiceEndpointId(
		environmentId: string,
		serviceEndpointId: string
	): Promise<readonly PluginStep[]> {
		this.logger.debug('DataversePluginStepRepository: Fetching steps for service endpoint', {
			environmentId,
			serviceEndpointId,
		});

		// Query by eventhandler field which is a polymorphic lookup to serviceendpoint
		const endpoint =
			`/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}?$select=${DataversePluginStepRepository.SELECT_FIELDS}` +
			`&$filter=_eventhandler_value eq ${serviceEndpointId}` +
			`&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)` +
			`&$orderby=name asc`;

		const response = await this.apiService.get<PluginStepCollectionResponse>(
			environmentId,
			endpoint
		);

		const steps = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataversePluginStepRepository: Fetched steps for service endpoint', {
			serviceEndpointId,
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

	public async delete(environmentId: string, stepId: string): Promise<void> {
		this.logger.debug('DataversePluginStepRepository: Deleting step', {
			environmentId,
			stepId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.debug('DataversePluginStepRepository: Step deleted', { stepId });
	}

	public async register(environmentId: string, input: RegisterStepInput): Promise<string> {
		this.logger.debug('DataversePluginStepRepository: Registering step', {
			environmentId,
			name: input.name,
			sdkMessageId: input.sdkMessageId,
			sdkMessageFilterId: input.sdkMessageFilterId,
			solutionUniqueName: input.solutionUniqueName,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}`;

		// Build payload with required fields
		const payload: Record<string, unknown> = {
			name: input.name,
			'sdkmessageid@odata.bind': `/sdkmessages(${input.sdkMessageId})`,
			'plugintypeid@odata.bind': `/plugintypes(${input.pluginTypeId})`,
			stage: input.stage,
			mode: input.mode,
			rank: input.rank,
			supporteddeployment: input.supportedDeployment,
			asyncautodelete: input.asyncAutoDelete,
			// Steps are enabled by default
			statecode: 0,
			statuscode: 1,
		};

		// Add message filter (links message to entity)
		if (input.sdkMessageFilterId) {
			payload['sdkmessagefilterid@odata.bind'] = `/sdkmessagefilters(${input.sdkMessageFilterId})`;
		}

		// Add optional fields
		if (input.filteringAttributes) {
			payload['filteringattributes'] = input.filteringAttributes;
		}

		if (input.description) {
			payload['description'] = input.description;
		}

		if (input.unsecureConfiguration) {
			payload['configuration'] = input.unsecureConfiguration;
		}

		if (input.impersonatingUserId) {
			payload['impersonatinguserid@odata.bind'] = `/systemusers(${input.impersonatingUserId})`;
		}

		// Use MSCRM.SolutionUniqueName header for solution association
		const additionalHeaders: Record<string, string> | undefined = input.solutionUniqueName
			? { 'MSCRM.SolutionUniqueName': input.solutionUniqueName }
			: undefined;

		interface CreateResponse {
			sdkmessageprocessingstepid: string;
		}

		const response = await this.apiService.post<CreateResponse>(
			environmentId,
			endpoint,
			payload,
			undefined, // cancellationToken
			additionalHeaders
		);

		const stepId = response.sdkmessageprocessingstepid;

		// Handle secure configuration - stored in separate entity
		if (input.secureConfiguration) {
			await this.createSecureConfig(environmentId, stepId, input.secureConfiguration);
		}

		this.logger.debug('DataversePluginStepRepository: Step registered', {
			stepId,
		});

		return stepId;
	}

	/**
	 * Creates a secure configuration record and links it to the step.
	 */
	private async createSecureConfig(
		environmentId: string,
		stepId: string,
		secureConfig: string
	): Promise<void> {
		this.logger.debug('DataversePluginStepRepository: Creating secure config', { stepId });

		// Create the secure config entity
		const secureConfigEndpoint = '/api/data/v9.2/sdkmessageprocessingstepsecureconfigs';
		const secureConfigPayload = {
			secureconfig: secureConfig,
		};

		interface SecureConfigResponse {
			sdkmessageprocessingstepsecureconfigid: string;
		}

		const secureConfigResponse = await this.apiService.post<SecureConfigResponse>(
			environmentId,
			secureConfigEndpoint,
			secureConfigPayload
		);

		// Link it to the step
		const stepEndpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`;
		await this.apiService.patch(environmentId, stepEndpoint, {
			'sdkmessageprocessingstepsecureconfigid@odata.bind':
				`/sdkmessageprocessingstepsecureconfigs(${secureConfigResponse.sdkmessageprocessingstepsecureconfigid})`,
		});

		this.logger.debug('DataversePluginStepRepository: Secure config linked', {
			stepId,
			secureConfigId: secureConfigResponse.sdkmessageprocessingstepsecureconfigid,
		});
	}

	public async update(
		environmentId: string,
		stepId: string,
		input: UpdateStepInput
	): Promise<void> {
		this.logger.debug('DataversePluginStepRepository: Updating step', {
			environmentId,
			stepId,
		});

		const endpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`;

		// Build payload with only provided fields
		const payload: Record<string, unknown> = {};

		if (input.name !== undefined) {
			payload['name'] = input.name;
		}

		if (input.stage !== undefined) {
			payload['stage'] = input.stage;
		}

		if (input.mode !== undefined) {
			payload['mode'] = input.mode;
		}

		if (input.rank !== undefined) {
			payload['rank'] = input.rank;
		}

		if (input.supportedDeployment !== undefined) {
			payload['supporteddeployment'] = input.supportedDeployment;
		}

		if (input.filteringAttributes !== undefined) {
			payload['filteringattributes'] = input.filteringAttributes || null;
		}

		if (input.asyncAutoDelete !== undefined) {
			payload['asyncautodelete'] = input.asyncAutoDelete;
		}

		if (input.unsecureConfiguration !== undefined) {
			payload['configuration'] = input.unsecureConfiguration || null;
		}

		if (input.impersonatingUserId !== undefined) {
			if (input.impersonatingUserId) {
				payload['impersonatinguserid@odata.bind'] = `/systemusers(${input.impersonatingUserId})`;
			} else {
				// Clear impersonation (use calling user)
				payload['impersonatinguserid'] = null;
			}
		}

		if (input.description !== undefined) {
			payload['description'] = input.description || null;
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		// Handle secure configuration update
		// Note: This is more complex - need to either update existing or create new
		// For now, we'll update if provided
		if (input.secureConfiguration !== undefined) {
			await this.updateSecureConfig(environmentId, stepId, input.secureConfiguration);
		}

		this.logger.debug('DataversePluginStepRepository: Step updated', { stepId });
	}

	/**
	 * Updates or creates secure configuration for a step.
	 */
	private async updateSecureConfig(
		environmentId: string,
		stepId: string,
		secureConfig: string | null
	): Promise<void> {
		// First, get the step to see if it has existing secure config
		const stepEndpoint = `/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})?$select=_sdkmessageprocessingstepsecureconfigid_value`;

		interface StepSecureConfigResponse {
			_sdkmessageprocessingstepsecureconfigid_value: string | null;
		}

		const step = await this.apiService.get<StepSecureConfigResponse>(environmentId, stepEndpoint);
		const existingConfigId = step._sdkmessageprocessingstepsecureconfigid_value;

		if (!secureConfig) {
			// Clear secure config
			if (existingConfigId) {
				// Unlink and delete
				await this.apiService.patch(
					environmentId,
					`/api/data/v9.2/${DataversePluginStepRepository.ENTITY_SET}(${stepId})`,
					{ sdkmessageprocessingstepsecureconfigid: null }
				);
				await this.apiService.delete(
					environmentId,
					`/api/data/v9.2/sdkmessageprocessingstepsecureconfigs(${existingConfigId})`
				);
			}
			return;
		}

		if (existingConfigId) {
			// Update existing
			await this.apiService.patch(
				environmentId,
				`/api/data/v9.2/sdkmessageprocessingstepsecureconfigs(${existingConfigId})`,
				{ secureconfig: secureConfig }
			);
		} else {
			// Create new
			await this.createSecureConfig(environmentId, stepId, secureConfig);
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

		// Extract managed properties (defaults if missing)
		const isCustomizable = dto.iscustomizable?.Value ?? true;
		const isHidden = dto.ishidden?.Value ?? false;

		// Get event handler info (polymorphic lookup - can be plugintype or serviceendpoint)
		const eventHandlerId = dto._eventhandler_value ?? null;
		const eventHandlerTypeName = dto['_eventhandler_value@Microsoft.Dynamics.CRM.lookuplogicalname'];
		const eventHandlerType: 'plugintype' | 'serviceendpoint' | null =
			eventHandlerTypeName === 'plugintype'
				? 'plugintype'
				: eventHandlerTypeName === 'serviceendpoint'
					? 'serviceendpoint'
					: null;

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
			dto.description,
			dto.configuration,
			dto.supporteddeployment,
			dto.asyncautodelete,
			dto.ismanaged,
			isCustomizable,
			isHidden,
			new Date(dto.createdon),
			new Date(dto.modifiedon),
			eventHandlerId,
			eventHandlerType
		);
	}
}
