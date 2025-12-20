import type { CustomApiParameter, CustomApiParameterDirection } from '../entities/CustomApiParameter';

/**
 * Input for registering a new Custom API parameter.
 */
export interface RegisterCustomApiParameterInput {
	readonly customApiId: string;
	readonly name: string;
	readonly uniqueName: string;
	readonly displayName: string;
	readonly description?: string | undefined;
	readonly type: number; // 0-12, see CustomApiParameterType
	readonly logicalEntityName?: string | undefined;
	readonly isOptional?: boolean | undefined; // Only for request parameters
	readonly direction: CustomApiParameterDirection;
}

/**
 * Input for updating an existing Custom API parameter.
 */
export interface UpdateCustomApiParameterInput {
	readonly displayName?: string | undefined;
	readonly description?: string | undefined;
	readonly logicalEntityName?: string | undefined;
	readonly isOptional?: boolean | undefined; // Only for request parameters
}

/**
 * Repository interface for Custom API parameters (request parameters and response properties).
 * Domain defines contract, infrastructure implements.
 *
 * Note: This handles both customapirequestparameter and customapiresponseproperty entities,
 * using the direction field to determine which Dataverse entity to use.
 */
export interface ICustomApiParameterRepository {
	/**
	 * Find all parameters (both request and response) in the environment.
	 * Used for bulk loading to avoid N+1 queries.
	 */
	findAll(environmentId: string): Promise<readonly CustomApiParameter[]>;

	/**
	 * Find all parameters for a specific Custom API.
	 */
	findByCustomApiId(environmentId: string, customApiId: string): Promise<readonly CustomApiParameter[]>;

	/**
	 * Find parameter by ID and direction.
	 */
	findById(
		environmentId: string,
		parameterId: string,
		direction: CustomApiParameterDirection
	): Promise<CustomApiParameter | null>;

	/**
	 * Register a new Custom API parameter.
	 * @returns The ID of the created parameter.
	 */
	register(environmentId: string, input: RegisterCustomApiParameterInput): Promise<string>;

	/**
	 * Update an existing Custom API parameter.
	 */
	update(
		environmentId: string,
		parameterId: string,
		direction: CustomApiParameterDirection,
		input: UpdateCustomApiParameterInput
	): Promise<void>;

	/**
	 * Delete a Custom API parameter.
	 */
	delete(environmentId: string, parameterId: string, direction: CustomApiParameterDirection): Promise<void>;
}
