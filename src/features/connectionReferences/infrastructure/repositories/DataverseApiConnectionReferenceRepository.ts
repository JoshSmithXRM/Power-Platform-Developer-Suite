import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { IConnectionReferenceRepository } from '../../domain/interfaces/IConnectionReferenceRepository';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Dataverse API response for connectionreferences endpoint
 */
interface DataverseConnectionReferencesResponse {
	value: DataverseConnectionReferenceDto[];
}

/**
 * DTO for connection reference data from Dataverse API
 */
interface DataverseConnectionReferenceDto {
	connectionreferenceid: string;
	connectionreferencelogicalname: string;
	connectionreferencedisplayname: string;
	connectorid: string | null;
	connectionid: string | null;
	ismanaged: boolean;
	modifiedon: string;
}

/**
 * Infrastructure implementation of IConnectionReferenceRepository using Dataverse Web API.
 */
export class DataverseApiConnectionReferenceRepository implements IConnectionReferenceRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Fetches all connection references from Dataverse for the specified environment.
	 */
	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ConnectionReference[]> {
		// Default options: order by logical name for consistent results
		const defaultOptions: QueryOptions = {
			orderBy: 'connectionreferencelogicalname'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/connectionreferences${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching connection references from Dataverse API', { environmentId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<DataverseConnectionReferencesResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			const refs = response.value.map((dto) => this.mapToEntity(dto));

			this.logger.debug(`Fetched ${refs.length} connection reference(s) from Dataverse`, { environmentId });

			return refs;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch connection references from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Maps Dataverse DTO to ConnectionReference domain entity.
	 */
	private mapToEntity(dto: DataverseConnectionReferenceDto): ConnectionReference {
		return new ConnectionReference(
			dto.connectionreferenceid,
			dto.connectionreferencelogicalname,
			dto.connectionreferencedisplayname || 'Unnamed Connection Reference',
			dto.connectorid,
			dto.connectionid,
			dto.ismanaged,
			new Date(dto.modifiedon)
		);
	}
}
