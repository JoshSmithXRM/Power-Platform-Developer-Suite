import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import type { TraceLevel } from '../../domain/valueObjects/TraceLevel';

/**
 * Use case: Get Trace Level
 *
 * Retrieves the current trace level setting for an environment.
 * Orchestrates repository call and logs at boundaries.
 */
export class GetTraceLevelUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute the use case to get the current trace level.
	 *
	 * @param environmentId - The environment to query
	 * @returns Promise of the current trace level
	 */
	async execute(environmentId: string): Promise<TraceLevel> {
		this.logger.debug('GetTraceLevelUseCase: Getting trace level', {
			environmentId,
		});

		try {
			const level = await this.repository.getTraceLevel(environmentId);

			this.logger.info(
				`GetTraceLevelUseCase: Retrieved trace level: ${level}`,
				{ environmentId }
			);

			return level;
		} catch (error) {
			this.logger.error(
				'GetTraceLevelUseCase: Failed to get trace level',
				error
			);
			throw error;
		}
	}
}
