import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';

/**
 * Input for registering a new plugin package.
 */
export interface RegisterPluginPackageInput {
	readonly name: string;
	readonly version: string;
	readonly uniqueName: string;
	readonly base64Content: string;
	readonly solutionUniqueName: string;
}

/**
 * Use case for registering a new plugin package.
 *
 * Orchestration only - no business logic:
 * 1. Validate input
 * 2. Call repository to register
 * 3. Return created package ID
 */
export class RegisterPluginPackageUseCase {
	constructor(
		private readonly packageRepository: IPluginPackageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new plugin package.
	 *
	 * @param environmentId - Target environment
	 * @param input - Package registration data
	 * @returns ID of the created package
	 * @throws Error if registration fails
	 */
	public async execute(environmentId: string, input: RegisterPluginPackageInput): Promise<string> {
		this.logger.info('RegisterPluginPackageUseCase started', {
			environmentId,
			name: input.name,
			uniqueName: input.uniqueName,
			version: input.version,
			solutionUniqueName: input.solutionUniqueName,
		});

		// Basic validation
		if (!input.name || input.name.trim().length === 0) {
			throw new Error('Package name is required');
		}

		if (!input.uniqueName || input.uniqueName.trim().length === 0) {
			throw new Error('Package unique name is required');
		}

		if (!input.version || input.version.trim().length === 0) {
			throw new Error('Package version is required');
		}

		if (!input.base64Content || input.base64Content.length === 0) {
			throw new Error('Package content is required');
		}

		if (!input.solutionUniqueName || input.solutionUniqueName.trim().length === 0) {
			throw new Error('Solution is required for package registration');
		}

		const packageId = await this.packageRepository.register(
			environmentId,
			input.name.trim(),
			input.uniqueName.trim(),
			input.version.trim(),
			input.base64Content,
			input.solutionUniqueName.trim()
		);

		this.logger.info('RegisterPluginPackageUseCase completed', {
			packageId,
			name: input.name,
			uniqueName: input.uniqueName,
			solutionUniqueName: input.solutionUniqueName,
		});

		return packageId;
	}
}
