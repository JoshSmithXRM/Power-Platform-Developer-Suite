import type { CustomApi } from '../entities/CustomApi';

/**
 * Input parameter for a Custom API.
 * Used when registering or updating Custom APIs with their parameters.
 */
export interface CustomApiParameterInput {
	readonly name: string;
	readonly uniqueName: string;
	readonly displayName: string;
	readonly description?: string | undefined;
	readonly type: number; // 0-12, see CustomApiParameterType
	readonly logicalEntityName?: string | undefined;
	readonly isOptional?: boolean | undefined; // Only for request parameters
}

/**
 * Input for registering a new Custom API.
 */
export interface RegisterCustomApiInput {
	readonly name: string;
	readonly uniqueName: string;
	readonly displayName: string;
	readonly description?: string | undefined;
	readonly isFunction: boolean;
	readonly isPrivate: boolean;
	readonly executePrivilegeName?: string | undefined;
	readonly bindingType: number; // 0=Global, 1=Entity, 2=EntityCollection
	readonly boundEntityLogicalName?: string | undefined;
	readonly allowedCustomProcessingStepType: number; // 0=None, 1=AsyncOnly, 2=SyncAndAsync
	readonly pluginTypeId?: string | undefined;
	readonly solutionUniqueName?: string | undefined;
	readonly requestParameters?: readonly CustomApiParameterInput[] | undefined;
	readonly responseProperties?: readonly CustomApiParameterInput[] | undefined;
}

/**
 * Input for updating an existing Custom API.
 */
export interface UpdateCustomApiInput {
	readonly displayName?: string | undefined;
	readonly description?: string | undefined;
	readonly isPrivate?: boolean | undefined;
	readonly executePrivilegeName?: string | undefined;
	readonly pluginTypeId?: string | undefined;
}

/**
 * Repository interface for Custom APIs.
 * Domain defines contract, infrastructure implements.
 */
export interface ICustomApiRepository {
	/**
	 * Find all Custom APIs in the environment.
	 * Used for bulk loading to avoid N+1 queries.
	 */
	findAll(environmentId: string): Promise<readonly CustomApi[]>;

	/**
	 * Find all Custom APIs that belong to a specific solution.
	 */
	findBySolutionId(environmentId: string, solutionId: string): Promise<readonly CustomApi[]>;

	/**
	 * Find Custom API by ID.
	 */
	findById(environmentId: string, customApiId: string): Promise<CustomApi | null>;

	/**
	 * Register a new Custom API with optional parameters.
	 * @returns The ID of the created Custom API.
	 */
	register(environmentId: string, input: RegisterCustomApiInput): Promise<string>;

	/**
	 * Update an existing Custom API.
	 * Note: Some properties (name, uniqueName, bindingType, boundEntityLogicalName, isFunction)
	 * cannot be changed after creation.
	 */
	update(environmentId: string, customApiId: string, input: UpdateCustomApiInput): Promise<void>;

	/**
	 * Delete a Custom API.
	 * This will cascade delete all associated parameters.
	 */
	delete(environmentId: string, customApiId: string): Promise<void>;
}
