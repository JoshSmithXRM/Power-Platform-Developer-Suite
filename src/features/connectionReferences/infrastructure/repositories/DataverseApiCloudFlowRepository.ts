import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { CancellationHelper } from '../../../../shared/infrastructure/utils/CancellationHelper';
import { ICloudFlowRepository } from '../../domain/interfaces/ICloudFlowRepository';
import { CloudFlow } from '../../domain/entities/CloudFlow';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * OData response wrapper from Dataverse API workflows query.
 */
interface DataverseWorkflowsResponse {
	value: DataverseWorkflowDto[];
}

/**
 * DTO representing a workflow entity (cloud flow) from Dataverse Web API.
 * Maps to the workflows entity schema in Dataverse.
 * Filtered by category eq 5 to retrieve only cloud flows.
 */
interface DataverseWorkflowDto {
	/** workflowid field - Primary key */
	workflowid: string;
	/** name field - Flow display name */
	name: string;
	/** modifiedon field - Last modification timestamp */
	modifiedon: string;
	/** ismanaged field - Whether flow is in managed solution */
	ismanaged: boolean;
	/** clientdata field - Flow definition JSON (only included when explicitly selected) */
	clientdata?: string;
	/** _createdby_value field - Creator user GUID */
	_createdby_value: string;
	/** createdby expanded navigation - Creator user entity */
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
	 * Fetches all cloud flows from Dataverse.
	 *
	 * By default, excludes the large 'clientdata' field for performance.
	 * Callers must explicitly request clientdata via options.select if needed.
	 */
	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<CloudFlow[]> {
		const defaultOptions: QueryOptions = {
			select: ['workflowid', 'name', 'modifiedon', 'ismanaged', '_createdby_value'],
			expand: 'createdby($select=fullname)',
			filter: 'category eq 5',
			orderBy: 'name'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/workflows${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching cloud flows from Dataverse API', { environmentId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const response = await this.apiService.get<DataverseWorkflowsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			const flows = response.value.map((dto) => this.mapToEntity(dto));

			this.logger.debug('Fetched cloud flows from Dataverse', { environmentId, count: flows.length });

			return flows;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch cloud flows from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	private mapToEntity(dto: DataverseWorkflowDto): CloudFlow {
		return new CloudFlow(
			dto.workflowid,
			dto.name || 'Unnamed Flow',
			new Date(dto.modifiedon),
			dto.ismanaged,
			dto.createdby?.fullname ?? 'Unknown User',
			dto.clientdata ?? null
		);
	}
}
