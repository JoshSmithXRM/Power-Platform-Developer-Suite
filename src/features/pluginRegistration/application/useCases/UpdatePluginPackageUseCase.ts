import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';

/**
 * Use case for updating a plugin package with new .nupkg content.
 *
 * Orchestration only - no business logic:
 * 1. Fetch package (validate exists)
 * 2. Call repository to update content
 *
 * Note: Both managed and unmanaged packages can be updated in Dataverse.
 * This enables hotfix deployment to managed solutions.
 */
export class UpdatePluginPackageUseCase {
	constructor(
		private readonly packageRepository: IPluginPackageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update package with new .nupkg content.
	 * @param base64Content - Base64-encoded .nupkg bytes
	 * @throws Error if package not found or cannot be updated
	 */
	public async execute(
		environmentId: string,
		packageId: string,
		base64Content: string
	): Promise<void> {
		this.logger.info('UpdatePluginPackageUseCase started', {
			environmentId,
			packageId,
			contentLength: base64Content.length
		});

		const pkg = await this.packageRepository.findById(environmentId, packageId);
		if (!pkg) {
			throw new Error(`Plugin package not found: ${packageId}`);
		}

		// No managed check - both managed and unmanaged packages can be updated
		// Domain entity canUpdate() returns true for all packages

		await this.packageRepository.updateContent(environmentId, packageId, base64Content);

		this.logger.info('UpdatePluginPackageUseCase completed', { packageId });
	}
}
