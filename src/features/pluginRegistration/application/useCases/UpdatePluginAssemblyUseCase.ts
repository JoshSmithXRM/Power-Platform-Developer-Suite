import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';

/**
 * Use case for updating a standalone plugin assembly with new DLL content.
 *
 * Orchestration only - no business logic:
 * 1. Fetch assembly
 * 2. Validate via domain method (canUpdate)
 * 3. Call repository to update content
 */
export class UpdatePluginAssemblyUseCase {
	constructor(
		private readonly assemblyRepository: IPluginAssemblyRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update assembly with new DLL content.
	 * @param base64Content - Base64-encoded DLL bytes
	 * @throws Error if assembly not found or cannot be updated
	 */
	public async execute(
		environmentId: string,
		assemblyId: string,
		base64Content: string
	): Promise<void> {
		this.logger.info('UpdatePluginAssemblyUseCase started', {
			environmentId,
			assemblyId,
			contentLength: base64Content.length
		});

		const assembly = await this.assemblyRepository.findById(environmentId, assemblyId);
		if (!assembly) {
			throw new Error(`Plugin assembly not found: ${assemblyId}`);
		}

		if (!assembly.canUpdate()) {
			const reason = assembly.isInManagedState()
				? 'Cannot update managed assembly'
				: 'Cannot update assembly in package - update the package instead';
			throw new Error(reason);
		}

		await this.assemblyRepository.updateContent(environmentId, assemblyId, base64Content);

		this.logger.info('UpdatePluginAssemblyUseCase completed', { assemblyId });
	}
}
