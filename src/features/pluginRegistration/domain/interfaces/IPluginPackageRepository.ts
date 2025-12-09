import type { PluginPackage } from '../entities/PluginPackage';

/**
 * Repository interface for plugin packages.
 * Domain defines contract, infrastructure implements.
 */
export interface IPluginPackageRepository {
	/**
	 * Find all packages in the environment.
	 * Optionally filter by solution.
	 */
	findAll(environmentId: string, solutionId?: string): Promise<readonly PluginPackage[]>;

	/**
	 * Find package by ID.
	 */
	findById(environmentId: string, packageId: string): Promise<PluginPackage | null>;

	/**
	 * Count assemblies in a package.
	 * Used for canDelete() business rule.
	 */
	countAssemblies(environmentId: string, packageId: string): Promise<number>;
}
