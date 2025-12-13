import type { PluginAssembly } from '../entities/PluginAssembly';
import type { PluginType } from '../entities/PluginType';

/**
 * Result of fetching an assembly with its plugin types.
 */
export interface AssemblyWithTypes {
	readonly assembly: PluginAssembly;
	readonly pluginTypes: readonly PluginType[];
}

/**
 * Repository interface for plugin assemblies.
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginAssemblyRepository {
	/**
	 * Find all assemblies in the environment.
	 * Optionally filter by solution.
	 */
	findAll(environmentId: string, solutionId?: string): Promise<readonly PluginAssembly[]>;

	/**
	 * Find assemblies belonging to a specific package.
	 */
	findByPackageId(environmentId: string, packageId: string): Promise<readonly PluginAssembly[]>;

	/**
	 * Find standalone assemblies (not in any package).
	 * Optionally filter by solution.
	 */
	findStandalone(environmentId: string, solutionId?: string): Promise<readonly PluginAssembly[]>;

	/**
	 * Find assembly by ID.
	 */
	findById(environmentId: string, assemblyId: string): Promise<PluginAssembly | null>;

	/**
	 * Count active steps for an assembly.
	 * Used for canDelete() business rule.
	 */
	countActiveSteps(environmentId: string, assemblyId: string): Promise<number>;

	/**
	 * Update assembly content with new DLL.
	 * @param base64Content - Base64-encoded DLL bytes
	 */
	updateContent(environmentId: string, assemblyId: string, base64Content: string): Promise<void>;

	/**
	 * Register a new plugin assembly.
	 *
	 * Cloud-only: Uses fixed values sourcetype=0 (Database), isolationmode=2 (Sandbox).
	 * Dataverse auto-discovers IPlugin/CodeActivity classes after upload.
	 *
	 * @param environmentId - Target environment
	 * @param name - Assembly name (NO prefix, e.g., "PPDSDemo.Plugins")
	 * @param base64Content - Base64-encoded DLL bytes
	 * @param solutionUniqueName - Optional solution to add assembly to
	 * @returns ID of the created assembly
	 */
	register(
		environmentId: string,
		name: string,
		base64Content: string,
		solutionUniqueName?: string
	): Promise<string>;

	/**
	 * Delete/unregister a plugin assembly.
	 * Note: This will fail if the assembly has registered steps.
	 *
	 * @param environmentId - Target environment
	 * @param assemblyId - ID of the assembly to delete
	 */
	delete(environmentId: string, assemblyId: string): Promise<void>;

	/**
	 * Find assembly by ID with its plugin types in a single query.
	 * Uses $expand to fetch both assembly and types efficiently.
	 *
	 * Used for delta UI updates after registration.
	 *
	 * @param environmentId - Target environment
	 * @param assemblyId - ID of the assembly
	 * @returns Assembly with its plugin types, or null if not found
	 */
	findByIdWithTypes(environmentId: string, assemblyId: string): Promise<AssemblyWithTypes | null>;
}
