import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';

/**
 * Use case for unregistering (deleting) a plugin assembly.
 *
 * Orchestration only - no business logic:
 * 1. Validate assembly exists and can be deleted
 * 2. Call repository to delete
 *
 * Note: Dataverse will reject deletion if the assembly has registered steps.
 * The error message will indicate this to the user.
 */
export class UnregisterPluginAssemblyUseCase {
	constructor(
		private readonly assemblyRepository: IPluginAssemblyRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a plugin assembly.
	 *
	 * @param environmentId - Target environment
	 * @param assemblyId - ID of the assembly to delete
	 * @param assemblyName - Name of the assembly (for logging/messages)
	 * @throws Error if deletion fails (e.g., assembly has steps)
	 */
	public async execute(
		environmentId: string,
		assemblyId: string,
		assemblyName: string
	): Promise<void> {
		this.logger.info('UnregisterPluginAssemblyUseCase started', {
			environmentId,
			assemblyId,
			assemblyName,
		});

		// Verify assembly exists
		const assembly = await this.assemblyRepository.findById(environmentId, assemblyId);
		if (assembly === null) {
			throw new Error(`Assembly not found: ${assemblyName}`);
		}

		// Check if managed - cannot delete managed assemblies
		if (assembly.isInManagedState()) {
			throw new Error(`Cannot unregister managed assembly: ${assemblyName}`);
		}

		// Delete the assembly
		// Note: Dataverse will reject if there are registered steps
		await this.assemblyRepository.delete(environmentId, assemblyId);

		this.logger.info('UnregisterPluginAssemblyUseCase completed', {
			assemblyId,
			assemblyName,
		});
	}
}
