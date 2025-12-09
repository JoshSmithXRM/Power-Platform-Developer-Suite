import type { PluginType } from '../entities/PluginType';

/**
 * Repository interface for plugin types.
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginTypeRepository {
	/**
	 * Find ALL plugin types in the environment.
	 * Used for bulk loading to avoid N+1 queries.
	 */
	findAll(environmentId: string): Promise<readonly PluginType[]>;

	/**
	 * Find all plugin types in an assembly.
	 */
	findByAssemblyId(environmentId: string, assemblyId: string): Promise<readonly PluginType[]>;

	/**
	 * Find plugin type by ID.
	 */
	findById(environmentId: string, pluginTypeId: string): Promise<PluginType | null>;
}
