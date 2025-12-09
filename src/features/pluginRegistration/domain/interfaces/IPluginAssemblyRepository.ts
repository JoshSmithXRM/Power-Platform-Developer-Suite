import type { PluginAssembly } from '../entities/PluginAssembly';

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
}
