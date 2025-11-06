import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import {
	IEnvironmentVariableRepository,
	EnvironmentVariableDefinitionData,
	EnvironmentVariableValueData
} from '../../domain/interfaces/IEnvironmentVariableRepository';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Dataverse API response for environmentvariabledefinitions endpoint
 */
interface DataverseDefinitionsResponse {
	value: EnvironmentVariableDefinitionData[];
}

/**
 * Dataverse API response for environmentvariablevalues endpoint
 */
interface DataverseValuesResponse {
	value: EnvironmentVariableValueData[];
}

/**
 * Infrastructure implementation of IEnvironmentVariableRepository using Dataverse Web API.
 */
export class DataverseApiEnvironmentVariableRepository implements IEnvironmentVariableRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Fetches all environment variable definitions from Dataverse.
	 */
	async findAllDefinitions(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariableDefinitionData[]> {
		// Order by schema name to ensure consistent display order across panel refreshes
		const defaultOptions: QueryOptions = {
			orderBy: 'schemaname'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/environmentvariabledefinitions${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching environment variable definitions from Dataverse API', { environmentId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<DataverseDefinitionsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			this.logger.debug('Fetched environment variable definitions from Dataverse', {
				environmentId,
				count: response.value.length
			});

			return response.value;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch environment variable definitions from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Fetches all environment variable values from Dataverse.
	 */
	async findAllValues(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariableValueData[]> {
		// Values are joined with definitions by ID in memory, so API order doesn't matter
		const defaultOptions: QueryOptions = {};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/environmentvariablevalues${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching environment variable values from Dataverse API', { environmentId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<DataverseValuesResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			this.logger.debug('Fetched environment variable values from Dataverse', {
				environmentId,
				count: response.value.length
			});

			return response.value;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch environment variable values from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}
}
