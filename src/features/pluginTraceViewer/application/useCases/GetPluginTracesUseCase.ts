import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceFilter } from '../../domain/entities/TraceFilter';

/**
 * Use case: Get Plugin Traces
 *
 * Retrieves plugin traces from an environment with optional filtering.
 * Orchestrates repository call and logs at boundaries.
 */
export class GetPluginTracesUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute the use case to get plugin traces.
	 *
	 * @param environmentId - The environment to query
	 * @param filter - Optional filter criteria (defaults to TraceFilter.default())
	 * @returns Promise of readonly array of plugin traces
	 */
	async execute(
		environmentId: string,
		filter?: TraceFilter
	): Promise<readonly PluginTrace[]> {
		const actualFilter = filter ?? TraceFilter.default();

		this.logger.debug(
			'GetPluginTracesUseCase: Starting trace retrieval',
			{ environmentId, filter: actualFilter }
		);

		try {
			const traces = await this.repository.getTraces(
				environmentId,
				actualFilter
			);

			this.logger.info(
				`GetPluginTracesUseCase: Retrieved ${traces.length} traces`,
				{ environmentId }
			);

			return traces;
		} catch (error) {
			this.logger.error(
				'GetPluginTracesUseCase: Failed to retrieve traces',
				error
			);
			throw error;
		}
	}
}
