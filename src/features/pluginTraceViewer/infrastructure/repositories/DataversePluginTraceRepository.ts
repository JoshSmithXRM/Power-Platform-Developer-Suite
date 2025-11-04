import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { TraceFilter } from '../../domain/entities/TraceFilter';
import type { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { PluginTrace as PluginTraceEntity } from '../../domain/entities/PluginTrace';
import { TraceLevel as TraceLevelVO } from '../../domain/valueObjects/TraceLevel';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { Duration } from '../../domain/valueObjects/Duration';
import { CorrelationId } from '../../domain/valueObjects/CorrelationId';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Dataverse API response for plugintracelog collection
 */
interface DataversePluginTraceLogsResponse {
	value: DataversePluginTraceLogDto[];
}

/**
 * DTO representing a plugin trace log from Dataverse Web API
 * Maps to the plugintracelog entity schema
 */
interface DataversePluginTraceLogDto {
	plugintracelogid: string;
	createdon: string;
	typename: string;
	primaryentity: string | null;
	messagename: string;
	operationtype: number;
	mode: number;
	depth: number;
	performanceexecutionduration: number;
	performanceconstructorduration: number;
	exceptiondetails: string | null;
	messageblock: string | null;
	configuration: string | null;
	secureconfiguration: string | null;
	correlationid: string | null;
	requestid: string | null;
	pluginstepid: string | null;
	persistencekey: string | null;
}

/**
 * Dataverse API response for organization entity
 */
interface DataverseOrganizationResponse {
	plugintraceloglevelsetting: number;
}

/**
 * Infrastructure implementation of IPluginTraceRepository using Dataverse Web API
 */
export class DataversePluginTraceRepository implements IPluginTraceRepository {
	private static readonly ENTITY_SET = 'plugintracelogs';
	private static readonly ORGANIZATION_ENTITY = 'organizations';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	async getTraces(
		environmentId: string,
		filter: TraceFilter
	): Promise<readonly PluginTrace[]> {
		const queryParams: string[] = [`$top=${filter.top}`];

		if (filter.orderBy) {
			queryParams.push(`$orderby=${filter.orderBy}`);
		}

		if (filter.odataFilter) {
			queryParams.push(`$filter=${filter.odataFilter}`);
		}

		const queryString = queryParams.join('&');
		const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ENTITY_SET}?${queryString}`;

		this.logger.debug('Fetching plugin traces from Dataverse', {
			environmentId,
			endpoint,
		});

		try {
			const response =
				await this.apiService.get<DataversePluginTraceLogsResponse>(
					environmentId,
					endpoint
				);

			const traces = response.value.map((dto) =>
				this.mapToEntity(dto)
			);

			this.logger.debug(
				`Fetched ${traces.length} plugin traces from Dataverse`,
				{ environmentId }
			);

			return traces;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to fetch plugin traces from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async getTraceById(
		environmentId: string,
		traceId: string
	): Promise<PluginTrace | null> {
		const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ENTITY_SET}(${traceId})`;

		this.logger.debug('Fetching single plugin trace from Dataverse', {
			environmentId,
			traceId,
		});

		try {
			const dto =
				await this.apiService.get<DataversePluginTraceLogDto>(
					environmentId,
					endpoint
				);

			const trace = this.mapToEntity(dto);

			this.logger.debug('Fetched plugin trace from Dataverse', {
				environmentId,
				traceId,
			});

			return trace;
		} catch (error) {
			const normalizedError = normalizeError(error);

			if (this.isNotFoundError(normalizedError)) {
				this.logger.debug('Plugin trace not found', {
					environmentId,
					traceId,
				});
				return null;
			}

			this.logger.error(
				'Failed to fetch plugin trace from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async deleteTrace(
		environmentId: string,
		traceId: string
	): Promise<void> {
		const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ENTITY_SET}(${traceId})`;

		this.logger.debug('Deleting plugin trace from Dataverse', {
			environmentId,
			traceId,
		});

		try {
			await this.apiService.delete(environmentId, endpoint);

			this.logger.debug('Deleted plugin trace from Dataverse', {
				environmentId,
				traceId,
			});
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to delete plugin trace from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async deleteTraces(
		environmentId: string,
		traceIds: readonly string[]
	): Promise<number> {
		this.logger.debug(
			`Deleting ${traceIds.length} plugin traces from Dataverse`,
			{ environmentId }
		);

		let deletedCount = 0;

		for (const traceId of traceIds) {
			try {
				await this.deleteTrace(environmentId, traceId);
				deletedCount++;
			} catch (error) {
				this.logger.error(
					`Failed to delete trace ${traceId}, continuing with remaining traces`,
					error
				);
			}
		}

		this.logger.debug(
			`Deleted ${deletedCount} of ${traceIds.length} plugin traces`,
			{ environmentId }
		);

		return deletedCount;
	}

	async deleteAllTraces(environmentId: string): Promise<number> {
		this.logger.debug('Deleting all plugin traces from Dataverse', {
			environmentId,
		});

		try {
			const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ENTITY_SET}?$select=plugintracelogid`;
			const response =
				await this.apiService.get<DataversePluginTraceLogsResponse>(
					environmentId,
					endpoint
				);

			const traceIds = response.value.map(
				(dto) => dto.plugintracelogid
			);

			const deletedCount = await this.deleteTraces(
				environmentId,
				traceIds
			);

			this.logger.debug(
				`Deleted all plugin traces (${deletedCount}) from Dataverse`,
				{ environmentId }
			);

			return deletedCount;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to delete all plugin traces from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async deleteOldTraces(
		environmentId: string,
		olderThanDays: number
	): Promise<number> {
		this.logger.debug(
			`Deleting plugin traces older than ${olderThanDays} days`,
			{ environmentId }
		);

		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
			const isoDate = cutoffDate.toISOString();

			const filterQuery = `createdon lt ${isoDate}`;
			const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ENTITY_SET}?$select=plugintracelogid&$filter=${filterQuery}`;

			const response =
				await this.apiService.get<DataversePluginTraceLogsResponse>(
					environmentId,
					endpoint
				);

			const traceIds = response.value.map(
				(dto) => dto.plugintracelogid
			);

			const deletedCount = await this.deleteTraces(
				environmentId,
				traceIds
			);

			this.logger.debug(
				`Deleted ${deletedCount} old plugin traces from Dataverse`,
				{ environmentId, olderThanDays }
			);

			return deletedCount;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to delete old plugin traces from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async getTraceLevel(environmentId: string): Promise<TraceLevel> {
		this.logger.debug('Fetching trace level setting from Dataverse', {
			environmentId,
		});

		try {
			const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ORGANIZATION_ENTITY}?$select=plugintraceloglevelsetting&$top=1`;

			const response =
				await this.apiService.get<{
					value: DataverseOrganizationResponse[];
				}>(environmentId, endpoint);

			const orgSettings = response.value[0];
			if (!orgSettings) {
				throw new Error('Organization settings not found');
			}

			const level = TraceLevelVO.fromNumber(
				orgSettings.plugintraceloglevelsetting
			);

			this.logger.debug('Fetched trace level setting from Dataverse', {
				environmentId,
				level: level.value,
			});

			return level;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to fetch trace level from Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	async setTraceLevel(
		environmentId: string,
		level: TraceLevel
	): Promise<void> {
		this.logger.debug('Setting trace level in Dataverse', {
			environmentId,
			level: level.value,
		});

		try {
			const endpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ORGANIZATION_ENTITY}?$select=organizationid&$top=1`;

			const response =
				await this.apiService.get<{
					value: { organizationid: string }[];
				}>(environmentId, endpoint);

			const organization = response.value[0];
			if (!organization) {
				throw new Error('Organization not found');
			}

			const organizationId = organization.organizationid;
			const patchEndpoint = `/api/data/v9.2/${DataversePluginTraceRepository.ORGANIZATION_ENTITY}(${organizationId})`;

			await this.apiService.patch(
				environmentId,
				patchEndpoint,
				{
					plugintraceloglevelsetting: level.value,
				}
			);

			this.logger.debug('Set trace level in Dataverse', {
				environmentId,
				level: level.value,
			});
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error(
				'Failed to set trace level in Dataverse',
				normalizedError
			);
			throw normalizedError;
		}
	}

	private mapToEntity(dto: DataversePluginTraceLogDto): PluginTrace {
		return PluginTraceEntity.create({
			id: dto.plugintracelogid,
			createdOn: new Date(dto.createdon),
			pluginName: dto.typename,
			entityName: dto.primaryentity,
			messageName: dto.messagename,
			operationType: OperationType.fromNumber(dto.operationtype),
			mode: ExecutionMode.fromNumber(dto.mode),
			depth: dto.depth,
			duration: Duration.fromMilliseconds(
				dto.performanceexecutionduration
			),
			constructorDuration: Duration.fromMilliseconds(
				dto.performanceconstructorduration
			),
			exceptionDetails: dto.exceptiondetails,
			messageBlock: dto.messageblock,
			configuration: dto.configuration,
			secureConfiguration: dto.secureconfiguration,
			correlationId: dto.correlationid
				? CorrelationId.create(dto.correlationid)
				: null,
			requestId: dto.requestid,
			pluginStepId: dto.pluginstepid,
			persistenceKey: dto.persistencekey,
		});
	}

	private isNotFoundError(error: Error): boolean {
		return (
			error.message.includes('404') ||
			error.message.includes('not found')
		);
	}
}
