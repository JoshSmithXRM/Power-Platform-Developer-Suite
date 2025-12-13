import type { PluginType } from '../entities/PluginType';

/**
 * Input for registering a new plugin type.
 */
export interface RegisterPluginTypeInput {
	/** Fully qualified type name (e.g., "PPDSDemo.Plugins.PreAccountCreate") */
	readonly typeName: string;
	/** Short display name (e.g., "PreAccountCreate") */
	readonly friendlyName: string;
	/** Assembly ID this type belongs to */
	readonly assemblyId: string;
	/** Whether this is a workflow activity (CodeActivity) */
	readonly isWorkflowActivity: boolean;
	/** Workflow activity group name (optional, for workflow activities) */
	readonly workflowActivityGroupName?: string;
}

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

	/**
	 * Register a new plugin type.
	 *
	 * @param environmentId - Target environment
	 * @param input - Plugin type registration data
	 * @returns ID of the created plugin type
	 */
	register(environmentId: string, input: RegisterPluginTypeInput): Promise<string>;

	/**
	 * Delete (unregister) a plugin type.
	 *
	 * @param environmentId - Target environment
	 * @param pluginTypeId - ID of the plugin type to delete
	 * @throws Error if the plugin type has registered steps (must unregister steps first)
	 */
	delete(environmentId: string, pluginTypeId: string): Promise<void>;
}
