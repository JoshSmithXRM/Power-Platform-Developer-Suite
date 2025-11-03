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
 * OData response wrapper from Dataverse API connectionreferences query.
 * Follows standard Dataverse Web API collection response format.
 */
interface DataverseConnectionReferencesResponse {
	value: DataverseConnectionReferenceDto[];
}

/**
 * DTO representing a connection reference entity from Dataverse Web API.
 * Maps to the connectionreferences entity schema in Dataverse.
 *
 * @remarks
 * External API contract - property names must match Dataverse API exactly.
 */
interface DataverseConnectionReferenceDto {
	/** connectionreferenceid field - Primary key */
	connectionreferenceid: string;
	/** connectionreferencelogicalname field - Logical name used in flows/apps */
	connectionreferencelogicalname: string;
	/** connectionreferencedisplayname field - Display name */
	connectionreferencedisplayname: string;
	/** connectorid field - Connector type ID (null if not configured) */
	connectorid: string | null;
	/** connectionid field - Bound connection instance ID (null if unbound) */
	connectionid: string | null;
	/** ismanaged field - Whether in managed solution */
	ismanaged: boolean;
	/** modifiedon field - Last modification timestamp */
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

	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ConnectionReference[]> {
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
