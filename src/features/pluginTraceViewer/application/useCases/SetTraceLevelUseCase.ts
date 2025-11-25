import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import type { TraceLevel } from '../../domain/valueObjects/TraceLevel';

/**
 * Use case: Set Trace Level
 *
 * Updates the trace level setting for an environment.
 * Orchestrates repository call and logs at boundaries.
 */
export class SetTraceLevelUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute the use case to set a new trace level.
	 *
	 * @param environmentId - The environment to update
	 * @param level - The new trace level to set
	 * @returns Promise that resolves when the level is set
	 */
	async execute(environmentId: string, level: TraceLevel): Promise<void> {
		this.logger.info(
			`SetTraceLevelUseCase: Setting trace level to ${level}`,
			{ environmentId }
		);

		try {
			await this.repository.setTraceLevel(environmentId, level);

			this.logger.info(
				`SetTraceLevelUseCase: Successfully set trace level to ${level}`,
				{ environmentId }
			);
		} catch (error) {
			this.logger.error(
				'SetTraceLevelUseCase: Failed to set trace level',
				error
			);
			throw error;
		}
	}
}
