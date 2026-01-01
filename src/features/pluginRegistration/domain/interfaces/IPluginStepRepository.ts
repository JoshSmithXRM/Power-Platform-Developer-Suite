import type { PluginStep } from '../entities/PluginStep';

/**
 * Input for registering a new plugin step.
 */
export interface RegisterStepInput {
	readonly pluginTypeId: string;
	readonly sdkMessageId: string;
	readonly sdkMessageFilterId?: string | undefined; // Links message to entity (null for entity-agnostic)
	readonly name: string;
	readonly stage: number; // 10=PreValidation, 20=PreOperation, 40=PostOperation
	readonly mode: number; // 0=Synchronous, 1=Asynchronous
	readonly rank: number;
	readonly supportedDeployment: number; // 0=Server, 1=Offline, 2=Both
	readonly filteringAttributes?: string | undefined; // Comma-separated, only for Create/Update messages
	readonly asyncAutoDelete: boolean; // Delete AsyncOperation if StatusCode = Successful
	readonly unsecureConfiguration?: string | undefined;
	readonly secureConfiguration?: string | undefined; // Stored in separate entity
	readonly impersonatingUserId?: string | undefined; // Run in User's Context (null = Calling User)
	readonly description?: string | undefined;
	readonly solutionUniqueName?: string | undefined; // Solution to add the step to
}

/**
 * Input for updating an existing plugin step.
 */
export interface UpdateStepInput {
	readonly name?: string | undefined;
	readonly stage?: number | undefined;
	readonly mode?: number | undefined;
	readonly rank?: number | undefined;
	readonly supportedDeployment?: number | undefined;
	readonly filteringAttributes?: string | undefined;
	readonly asyncAutoDelete?: boolean | undefined;
	readonly unsecureConfiguration?: string | undefined;
	readonly secureConfiguration?: string | undefined;
	readonly impersonatingUserId?: string | undefined;
	readonly description?: string | undefined;
}

/**
 * Repository interface for plugin steps (SDK message processing steps).
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginStepRepository {
	/**
	 * Find ALL steps in the environment.
	 * Used for bulk loading to avoid N+1 queries.
	 */
	findAll(environmentId: string): Promise<readonly PluginStep[]>;

	/**
	 * Find all steps for a plugin type.
	 */
	findByPluginTypeId(environmentId: string, pluginTypeId: string): Promise<readonly PluginStep[]>;

	/**
	 * Find all steps for a service endpoint (WebHook or Service Bus).
	 * Queries by eventhandler field pointing to the service endpoint.
	 */
	findByServiceEndpointId(
		environmentId: string,
		serviceEndpointId: string
	): Promise<readonly PluginStep[]>;

	/**
	 * Find step by ID.
	 */
	findById(environmentId: string, stepId: string): Promise<PluginStep | null>;

	/**
	 * Enable a plugin step.
	 * Sets statecode to 0 (Enabled).
	 */
	enable(environmentId: string, stepId: string): Promise<void>;

	/**
	 * Disable a plugin step.
	 * Sets statecode to 1 (Disabled).
	 */
	disable(environmentId: string, stepId: string): Promise<void>;

	/**
	 * Delete a plugin step.
	 */
	delete(environmentId: string, stepId: string): Promise<void>;

	/**
	 * Register a new plugin step.
	 * @returns The ID of the created step.
	 */
	register(environmentId: string, input: RegisterStepInput): Promise<string>;

	/**
	 * Update an existing plugin step.
	 */
	update(environmentId: string, stepId: string, input: UpdateStepInput): Promise<void>;
}
