import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';

/**
 * Use case for updating a plugin package with new .nupkg content.
 *
 * Orchestration only - no business logic:
 * 1. Fetch package
 * 2. Validate via domain method (canUpdate)
 * 3. Call repository to update content
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

		if (!pkg.canUpdate()) {
			throw new Error('Cannot update managed package');
		}

		await this.packageRepository.updateContent(environmentId, packageId, base64Content);

		this.logger.info('UpdatePluginPackageUseCase completed', { packageId });
	}
}
