import { IDataverseApiService } from '../interfaces/IDataverseApiService';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../domain/interfaces/QueryOptions';
import { ISolutionComponentRepository } from '../../domain/interfaces/ISolutionComponentRepository';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../utils/ODataQueryBuilder';
import { normalizeError } from '../../utils/ErrorUtils';

/**
 * Dataverse API response for EntityDefinitions endpoint
 */
interface EntityDefinitionsResponse {
	value: EntityDefinitionDto[];
}

/**
 * DTO for entity definition metadata from Dataverse API
 */
interface EntityDefinitionDto {
	ObjectTypeCode: number;
	LogicalName: string;
}

/**
 * Dataverse API response for solutioncomponents endpoint
 */
interface SolutionComponentsResponse {
	value: SolutionComponentDto[];
}

/**
 * DTO for solution component data from Dataverse API
 */
interface SolutionComponentDto {
	solutioncomponentid: string;
	objectid: string;
	componenttype: number;
	_solutionid_value: string;
}

/**
 * Infrastructure implementation of ISolutionComponentRepository using Dataverse Web API.
 */
export class DataverseApiSolutionComponentRepository implements ISolutionComponentRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Gets the ObjectTypeCode for a given entity logical name.
	 */
	async getObjectTypeCode(
		environmentId: string,
		entityLogicalName: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number | null> {
		const defaultOptions: QueryOptions = {
			select: ['ObjectTypeCode', 'LogicalName'],
			filter: `LogicalName eq '${entityLogicalName}'`
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/EntityDefinitions${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching ObjectTypeCode from Dataverse API', {
			environmentId,
			entityLogicalName
		});

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<EntityDefinitionsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			if (response.value.length === 0) {
				this.logger.warn('No entity definition found for logical name', { entityLogicalName });
				return null;
			}

			const firstEntity = response.value[0];
			if (firstEntity === undefined) {
				this.logger.warn('Entity definition array is empty', { entityLogicalName });
				return null;
			}

			const objectTypeCode = firstEntity.ObjectTypeCode;

			this.logger.debug('Fetched ObjectTypeCode', {
				environmentId,
				entityLogicalName,
				objectTypeCode
			});

			return objectTypeCode;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch ObjectTypeCode from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Finds all component IDs of a specific entity type within a solution.
	 */
	async findComponentIdsBySolution(
		environmentId: string,
		solutionId: string,
		entityLogicalName: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<string[]> {
		this.logger.debug('Fetching solution component IDs from Dataverse API', {
			environmentId,
			solutionId,
			entityLogicalName
		});

		// First, get the ObjectTypeCode for the entity
		const objectTypeCode = await this.getObjectTypeCode(
			environmentId,
			entityLogicalName,
			undefined,
			cancellationToken
		);

		if (objectTypeCode === null) {
			this.logger.warn('Cannot fetch solution components - no ObjectTypeCode', { entityLogicalName });
			return [];
		}

		// Now fetch solution components for this solution and component type
		const defaultOptions: QueryOptions = {
			select: ['solutioncomponentid', 'objectid'],
			filter: `_solutionid_value eq ${solutionId} and componenttype eq ${objectTypeCode}`
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/solutioncomponents${queryString ? '?' + queryString : ''}`;

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<SolutionComponentsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			const componentIds = response.value.map((dto) => dto.objectid);

			this.logger.debug('Fetched solution components from Dataverse', {
				environmentId,
				solutionId,
				entityLogicalName,
				objectTypeCode,
				count: componentIds.length
			});

			return componentIds;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch solution components from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}
}
