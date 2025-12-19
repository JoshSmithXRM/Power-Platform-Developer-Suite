import type { ServiceEndpoint } from '../entities/ServiceEndpoint';

/**
 * Input for registering a new Service Endpoint.
 */
export interface RegisterServiceEndpointInput {
	readonly name: string;
	readonly description?: string | undefined;
	readonly solutionNamespace: string;
	readonly namespaceAddress: string;
	readonly path?: string | undefined;
	readonly contract: number;
	readonly connectionMode: number;
	readonly authType: number;
	readonly sasKeyName?: string | undefined;
	readonly sasKey?: string | undefined;
	readonly sasToken?: string | undefined;
	readonly messageFormat: number;
	readonly userClaim: number;
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Input for updating an existing Service Endpoint.
 * All fields are optional - only provided fields will be updated.
 */
export interface UpdateServiceEndpointInput {
	readonly name?: string | undefined;
	readonly description?: string | undefined;
	readonly solutionNamespace?: string | undefined;
	readonly namespaceAddress?: string | undefined;
	readonly path?: string | undefined;
	readonly authType?: number | undefined;
	readonly sasKeyName?: string | undefined;
	readonly sasKey?: string | undefined;
	readonly sasToken?: string | undefined;
	readonly messageFormat?: number | undefined;
	readonly userClaim?: number | undefined;
}

/**
 * Repository interface for Service Endpoint operations.
 * Defined in domain layer, implemented in infrastructure layer.
 *
 * Service Endpoints are stored in the `serviceendpoint` table.
 * This repository handles contract != 8 (everything except WebHooks).
 */
export interface IServiceEndpointRepository {
	/**
	 * Finds all Service Endpoints in the environment (excludes WebHooks).
	 * Filter: contract ne 8
	 */
	findAll(environmentId: string): Promise<readonly ServiceEndpoint[]>;

	/**
	 * Finds a Service Endpoint by ID.
	 * Returns null if not found or if it's a WebHook.
	 */
	findById(environmentId: string, serviceEndpointId: string): Promise<ServiceEndpoint | null>;

	/**
	 * Registers a new Service Endpoint.
	 * Returns the ID of the created Service Endpoint.
	 */
	register(environmentId: string, input: RegisterServiceEndpointInput): Promise<string>;

	/**
	 * Updates an existing Service Endpoint.
	 */
	update(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void>;

	/**
	 * Deletes a Service Endpoint.
	 */
	delete(environmentId: string, serviceEndpointId: string): Promise<void>;
}
