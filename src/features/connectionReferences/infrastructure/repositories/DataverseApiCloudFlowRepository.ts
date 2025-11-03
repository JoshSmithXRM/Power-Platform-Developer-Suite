import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { ICloudFlowRepository } from '../../domain/interfaces/ICloudFlowRepository';
import { CloudFlow } from '../../domain/entities/CloudFlow';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Dataverse API response for workflows endpoint
 */
interface DataverseWorkflowsResponse {
	value: DataverseWorkflowDto[];
}

/**
 * DTO for workflow (cloud flow) data from Dataverse API
 */
interface DataverseWorkflowDto {
	workflowid: string;
	name: string;
	modifiedon: string;
	ismanaged: boolean;
	clientdata?: string; // Large JSON field - only included when explicitly selected
	_createdby_value: string;
	createdby?: {
		fullname: string;
	};
}

/**
 * Infrastructure implementation of ICloudFlowRepository using Dataverse Web API.
 */
export class DataverseApiCloudFlowRepository implements ICloudFlowRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Fetches all cloud flows from Dataverse for the specified environment.
	 *
	 * CRITICAL: By default, excludes the large 'clientdata' field for performance.
	 * Uses explicit $select to exclude it. Callers must explicitly request clientdata
	 * via options.select if they need it.
	 */
	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<CloudFlow[]> {
		// Default options: exclude 'clientdata' field (large JSON), expand createdby, filter for cloud flows, order by name
		const defaultOptions: QueryOptions = {
			select: ['workflowid', 'name', 'modifiedon', 'ismanaged', '_createdby_value'],
			expand: 'createdby($select=fullname)',
			filter: 'category eq 5', // Cloud flows have category = 5
			orderBy: 'name'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/workflows${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching cloud flows from Dataverse API', { environmentId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<DataverseWorkflowsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			const flows = response.value.map((dto) => this.mapToEntity(dto));

			this.logger.debug(`Fetched ${flows.length} cloud flow(s) from Dataverse`, { environmentId });

			return flows;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch cloud flows from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Maps Dataverse DTO to CloudFlow domain entity.
	 */
	private mapToEntity(dto: DataverseWorkflowDto): CloudFlow {
		return new CloudFlow(
			dto.workflowid,
			dto.name || 'Unnamed Flow',
			new Date(dto.modifiedon),
			dto.ismanaged,
			dto.createdby?.fullname ?? 'Unknown User',
			dto.clientdata ?? null // Will be null if not selected in query
		);
	}
}
