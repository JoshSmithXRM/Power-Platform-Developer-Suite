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
}
