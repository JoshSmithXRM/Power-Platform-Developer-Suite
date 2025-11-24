import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import type { CorrelationId } from '../../domain/valueObjects/CorrelationId';

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
				'Retrieved plugin traces',
				{ environmentId, count: traces.length }
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

	/**
	 * Get a single plugin trace by ID.
	 *
	 * @param environmentId - The environment to query
	 * @param traceId - The trace ID to retrieve
	 * @returns Promise of the plugin trace, or null if not found
	 */
	async getTraceById(
		environmentId: string,
		traceId: string
	): Promise<PluginTrace | null> {
		this.logger.debug('Fetching single plugin trace', { environmentId, traceId });
		return await this.repository.getTraceById(environmentId, traceId);
	}

	/**
	 * Get all plugin traces with the same correlation ID.
	 * Returns ALL traces matching the correlation ID, ignoring any other filters.
	 * This is critical for investigation - you want to see the full execution chain,
	 * not just traces that match your current filter criteria.
	 *
	 * @param environmentId - The environment to query
	 * @param correlationId - The correlation ID to filter by
	 * @param top - Maximum number of traces to return (default: 1000)
	 * @returns Promise of readonly array of related plugin traces
	 */
	async getTracesByCorrelationId(
		environmentId: string,
		correlationId: CorrelationId,
		top = 1000
	): Promise<readonly PluginTrace[]> {
		this.logger.debug('Fetching traces by correlationId (unfiltered)', {
			environmentId,
			correlationId: correlationId.value
		});

		// Create filter with ONLY correlation ID - no other filters applied
		// This ensures we get the complete execution chain for investigation
		const filter = TraceFilter.create({
			correlationIdFilter: correlationId,
			top,
			orderBy: 'createdon asc'
		});

		return await this.repository.getTraces(environmentId, filter);
	}
}
