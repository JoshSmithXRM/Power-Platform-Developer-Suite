import type { PluginStep } from '../entities/PluginStep';

/**
 * Repository interface for plugin steps (SDK message processing steps).
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginStepRepository {
	/**
	 * Find all steps for a plugin type.
	 */
	findByPluginTypeId(environmentId: string, pluginTypeId: string): Promise<readonly PluginStep[]>;

	/**
	 * Find step by ID.
	 */
	findById(environmentId: string, stepId: string): Promise<PluginStep | null>;
}
