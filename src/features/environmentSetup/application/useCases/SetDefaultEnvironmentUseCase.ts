import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for setting an environment as the default for tool clicks.
 *
 * When a user clicks on a tool in the sidebar, the default environment
 * is automatically selected. This use case manages which environment
 * is marked as the default.
 */
export class SetDefaultEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Sets the specified environment as the default.
	 * Clears the default flag from all other environments.
	 * @param environmentId - ID of environment to set as default
	 */
	public async execute(environmentId: string): Promise<void> {
		this.logger.info('Setting default environment', { environmentId });

		const id = new EnvironmentId(environmentId);
		const targetEnvironment = await this.repository.getById(id);

		if (!targetEnvironment) {
			this.logger.warn('Environment not found', { environmentId });
			throw new Error(`Environment not found: ${environmentId}`);
		}

		// Get all environments and clear default from others
		const allEnvironments = await this.repository.getAll();

		for (const env of allEnvironments) {
			if (env.getId().getValue() === environmentId) {
				if (!env.getIsDefault()) {
					env.setAsDefault();
					await this.repository.save(env, undefined, undefined, true);
				}
			} else if (env.getIsDefault()) {
				env.clearDefault();
				await this.repository.save(env, undefined, undefined, true);
			}
		}

		this.logger.info('Default environment set', {
			environmentId,
			name: targetEnvironment.getName().getValue()
		});
	}
}
