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

	/**
	 * Update package content with new .nupkg file.
	 * @param base64Content - Base64-encoded .nupkg bytes
	 */
	updateContent(environmentId: string, packageId: string, base64Content: string): Promise<void>;

	/**
	 * Register a new plugin package.
	 * @param name - Package display name
	 * @param uniqueName - Unique name with publisher prefix (e.g., ppds_MyPackage)
	 * @param version - Package version
	 * @param base64Content - Base64-encoded .nupkg bytes
	 * @returns ID of the created package
	 */
	register(
		environmentId: string,
		name: string,
		uniqueName: string,
		version: string,
		base64Content: string
	): Promise<string>;
}
