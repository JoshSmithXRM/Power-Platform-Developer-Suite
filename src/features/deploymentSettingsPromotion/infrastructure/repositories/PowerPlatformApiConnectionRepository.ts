import { IPowerAppsAdminApiService } from '../../../../shared/infrastructure/interfaces/IPowerAppsAdminApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IPowerPlatformConnectionRepository } from '../../domain/interfaces/IPowerPlatformConnectionRepository';
import { Connection, ConnectionStatus } from '../../domain/entities/Connection';

/**
 * OData response wrapper from Power Apps Admin API connections query.
 */
interface PowerAppsConnectionsResponse {
	value: PowerAppsConnectionDto[];
}

/**
 * DTO representing a connection from Power Apps Admin API.
 *
 * @remarks
 * External API contract - property names must match Power Apps API exactly.
 * Discovered via Fiddler trace of PowerShell module.
 */
interface PowerAppsConnectionDto {
	/** Connection ID (used as ConnectionId in deployment settings) */
	name: string;
	properties: {
		/** Connector ID path (e.g., /providers/Microsoft.PowerApps/apis/shared_dataverse) */
		apiId: string;
		/** Human-readable connection name */
		displayName: string;
		/** Connection status array */
		statuses?: Array<{ status: string }>;
		/** User who created the connection */
		createdBy?: {
			displayName: string;
			userPrincipalName: string;
		};
	};
}

/**
 * Infrastructure implementation of IPowerPlatformConnectionRepository.
 * Fetches connections from Power Apps Admin API.
 *
 * API: GET https://api.powerapps.com/providers/Microsoft.PowerApps/scopes/admin/environments/{environmentId}/connections
 */
export class PowerPlatformApiConnectionRepository implements IPowerPlatformConnectionRepository {
	constructor(
		private readonly apiService: IPowerAppsAdminApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Retrieves all connections from the specified environment.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Array of Connection entities
	 */
	async findAll(environmentId: string, cancellationToken?: ICancellationToken): Promise<readonly Connection[]> {
		this.logger.debug('Fetching connections from Power Apps Admin API', { environmentId });

		const response = await this.apiService.get<PowerAppsConnectionsResponse>(
			environmentId,
			'/connections',
			cancellationToken
		);

		const connections = response.value.map((dto) => this.mapToEntity(dto));

		this.logger.debug('Fetched connections from Power Apps Admin API', {
			environmentId,
			count: connections.length
		});

		return connections;
	}

	/**
	 * Maps Power Apps API response DTO to domain entity.
	 */
	private mapToEntity(dto: PowerAppsConnectionDto): Connection {
		const status = this.mapStatus(dto.properties.statuses);
		const createdByName = dto.properties.createdBy?.displayName ?? 'Unknown';

		return Connection.create(
			dto.name,
			dto.properties.displayName,
			dto.properties.apiId,
			status,
			createdByName
		);
	}

	/**
	 * Maps API status array to domain ConnectionStatus.
	 */
	private mapStatus(statuses: Array<{ status: string }> | undefined): ConnectionStatus {
		if (statuses === undefined || statuses.length === 0) {
			return 'Unknown';
		}

		const firstStatus = statuses[0];
		if (firstStatus === undefined) {
			return 'Unknown';
		}

		const status = firstStatus.status;
		if (status === 'Connected') {
			return 'Connected';
		}
		if (status === 'Error') {
			return 'Error';
		}
		return 'Unknown';
	}
}
