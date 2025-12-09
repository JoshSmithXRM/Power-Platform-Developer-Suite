import type { PluginStep } from '../entities/PluginStep';

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
}
