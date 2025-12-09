import type { PluginType } from '../entities/PluginType';

/**
 * Repository interface for plugin types.
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginTypeRepository {
	/**
	 * Find all plugin types in an assembly.
	 */
	findByAssemblyId(environmentId: string, assemblyId: string): Promise<readonly PluginType[]>;

	/**
	 * Find plugin type by ID.
	 */
	findById(environmentId: string, pluginTypeId: string): Promise<PluginType | null>;
}
