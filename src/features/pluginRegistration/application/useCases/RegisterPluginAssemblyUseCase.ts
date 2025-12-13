import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';

/**
 * Input for registering a new plugin assembly.
 *
 * Note: Unlike packages, assemblies:
 * - Do NOT have a prefix on their name
 * - Have fixed sourcetype (0 = Database) and isolationmode (2 = Sandbox) for cloud
 * - Can optionally be added to a solution
 */
export interface RegisterPluginAssemblyInput {
	/** Assembly name (from DLL filename, NO prefix) */
	readonly name: string;
	/** Base64-encoded DLL content */
	readonly base64Content: string;
	/** Optional solution unique name to add assembly to */
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Use case for registering a new plugin assembly.
 *
 * Orchestration only - no business logic:
 * 1. Validate input
 * 2. Call repository to register
 * 3. Return created assembly ID
 *
 * Key differences from Package registration:
 * - No prefix on name (assemblies use raw name like "PPDSDemo.Plugins")
 * - Fixed values: sourcetype=0 (Database), isolationmode=2 (Sandbox)
 * - Solution association is optional
 * - Dataverse auto-discovers IPlugin/CodeActivity classes after upload
 */
export class RegisterPluginAssemblyUseCase {
	constructor(
		private readonly assemblyRepository: IPluginAssemblyRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new plugin assembly.
	 *
	 * @param environmentId - Target environment
	 * @param input - Assembly registration data
	 * @returns ID of the created assembly
	 * @throws Error if registration fails
	 */
	public async execute(
		environmentId: string,
		input: RegisterPluginAssemblyInput
	): Promise<string> {
		this.logger.info('RegisterPluginAssemblyUseCase started', {
			environmentId,
			name: input.name,
			hasSolution: Boolean(input.solutionUniqueName),
		});

		// Basic validation
		if (!input.name || input.name.trim().length === 0) {
			throw new Error('Assembly name is required');
		}

		if (!input.base64Content || input.base64Content.length === 0) {
			throw new Error('Assembly content is required');
		}

		const assemblyId = await this.assemblyRepository.register(
			environmentId,
			input.name.trim(),
			input.base64Content,
			input.solutionUniqueName
		);

		this.logger.info('RegisterPluginAssemblyUseCase completed', {
			assemblyId,
			name: input.name,
		});

		return assemblyId;
	}
}
