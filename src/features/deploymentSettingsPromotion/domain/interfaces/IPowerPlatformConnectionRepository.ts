import { Connection } from '../entities/Connection';

/**
 * Repository interface for fetching connections from Power Platform Admin API.
 *
 * Domain defines the contract, infrastructure implements.
 * Uses Power Platform Admin API (api.powerapps.com), NOT Dataverse.
 */
export interface IPowerPlatformConnectionRepository {
	/**
	 * Retrieves all connections from the specified environment.
	 *
	 * Uses the Power Platform Admin API endpoint:
	 * GET https://api.powerapps.com/providers/Microsoft.PowerApps/scopes/admin/environments/{environmentId}/connections
	 *
	 * @param environmentId - The Power Platform environment ID
	 * @returns Array of Connection entities
	 */
	findAll(environmentId: string): Promise<readonly Connection[]>;
}
