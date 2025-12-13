import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';

/**
 * Use case for unregistering (deleting) a plugin package.
 *
 * Orchestration only - no business logic:
 * 1. Validate package exists and can be deleted
 * 2. Call repository to delete
 *
 * Note: Dataverse will reject deletion if the package has assemblies.
 * The error message will indicate this to the user.
 */
export class UnregisterPluginPackageUseCase {
	constructor(
		private readonly packageRepository: IPluginPackageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a plugin package.
	 *
	 * @param environmentId - Target environment
	 * @param packageId - ID of the package to delete
	 * @param packageName - Name of the package (for logging/messages)
	 * @throws Error if deletion fails (e.g., package has assemblies)
	 */
	public async execute(
		environmentId: string,
		packageId: string,
		packageName: string
	): Promise<void> {
		this.logger.info('UnregisterPluginPackageUseCase started', {
			environmentId,
			packageId,
			packageName,
		});

		// Verify package exists
		const pkg = await this.packageRepository.findById(environmentId, packageId);
		if (pkg === null) {
			throw new Error(`Package not found: ${packageName}`);
		}

		// Check if managed - cannot delete managed packages
		if (pkg.isInManagedState()) {
			throw new Error(`Cannot unregister managed package: ${packageName}`);
		}

		// Delete the package
		// Note: Dataverse will reject if there are assemblies in the package
		await this.packageRepository.delete(environmentId, packageId);

		this.logger.info('UnregisterPluginPackageUseCase completed', {
			packageId,
			packageName,
		});
	}
}
