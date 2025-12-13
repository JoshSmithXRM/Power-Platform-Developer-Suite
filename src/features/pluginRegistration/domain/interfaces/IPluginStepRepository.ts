import type { PluginStep } from '../entities/PluginStep';

/**
 * Input for registering a new plugin step.
 */
export interface RegisterStepInput {
	readonly pluginTypeId: string;
	readonly sdkMessageId: string;
	readonly name: string;
	readonly stage: number; // 10=PreValidation, 20=PreOperation, 40=PostOperation
	readonly mode: number; // 0=Synchronous, 1=Asynchronous
	readonly rank: number;
	readonly primaryEntityLogicalName?: string | undefined; // Optional - some messages don't need entity
	readonly filteringAttributes?: string | undefined; // Comma-separated, only for Update message
	readonly description?: string | undefined;
}

/**
 * Input for updating an existing plugin step.
 */
export interface UpdateStepInput {
	readonly name?: string | undefined;
	readonly stage?: number | undefined;
	readonly mode?: number | undefined;
	readonly rank?: number | undefined;
	readonly filteringAttributes?: string | undefined;
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
