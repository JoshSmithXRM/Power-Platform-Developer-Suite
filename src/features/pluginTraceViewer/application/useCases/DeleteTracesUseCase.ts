import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';

/**
 * Use case: Delete Traces
 *
 * Handles deletion of plugin traces (single, multiple, all, or old traces).
 * Orchestrates repository calls and logs at boundaries.
 */
export class DeleteTracesUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Delete a single trace by ID.
	 *
	 * @param environmentId - The environment containing the trace
	 * @param traceId - The ID of the trace to delete
	 * @returns Promise that resolves when deletion is complete
	 */
	async deleteSingle(
		environmentId: string,
		traceId: string
	): Promise<void> {
		this.logger.info('DeleteTracesUseCase: Deleting single trace', {
			environmentId,
			traceId,
		});

		try {
			await this.repository.deleteTrace(environmentId, traceId);

			this.logger.info(
				'DeleteTracesUseCase: Successfully deleted trace',
				{ environmentId, traceId }
			);
		} catch (error) {
			this.logger.error(
				'DeleteTracesUseCase: Failed to delete trace',
				error
			);
			throw error;
		}
	}

	/**
	 * Delete multiple traces by IDs.
	 *
	 * @param environmentId - The environment containing the traces
	 * @param traceIds - Array of trace IDs to delete
	 * @returns Promise that resolves to the number of traces deleted
	 */
	async deleteMultiple(
		environmentId: string,
		traceIds: readonly string[]
	): Promise<number> {
		this.logger.info(
			`DeleteTracesUseCase: Deleting ${traceIds.length} traces`,
			{ environmentId }
		);

		try {
			const deletedCount = await this.repository.deleteTraces(
				environmentId,
				traceIds
			);

			this.logger.info(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} traces`,
				{ environmentId }
			);

			return deletedCount;
		} catch (error) {
			this.logger.error(
				'DeleteTracesUseCase: Failed to delete traces',
				error
			);
			throw error;
		}
	}

	/**
	 * Delete all traces in an environment.
	 *
	 * @param environmentId - The environment to clear
	 * @returns Promise that resolves to the number of traces deleted
	 */
	async deleteAll(environmentId: string): Promise<number> {
		this.logger.info('DeleteTracesUseCase: Deleting all traces', {
			environmentId,
		});

		try {
			const deletedCount =
				await this.repository.deleteAllTraces(environmentId);

			this.logger.info(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} traces`,
				{ environmentId }
			);

			return deletedCount;
		} catch (error) {
			this.logger.error(
				'DeleteTracesUseCase: Failed to delete all traces',
				error
			);
			throw error;
		}
	}

	/**
	 * Delete traces older than a specified number of days.
	 *
	 * @param environmentId - The environment to clean up
	 * @param olderThanDays - Delete traces older than this many days
	 * @returns Promise that resolves to the number of traces deleted
	 */
	async deleteOldTraces(
		environmentId: string,
		olderThanDays: number
	): Promise<number> {
		this.logger.info(
			`DeleteTracesUseCase: Deleting traces older than ${olderThanDays} days`,
			{ environmentId }
		);

		try {
			const deletedCount = await this.repository.deleteOldTraces(
				environmentId,
				olderThanDays
			);

			this.logger.info(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} old traces`,
				{ environmentId }
			);

			return deletedCount;
		} catch (error) {
			this.logger.error(
				'DeleteTracesUseCase: Failed to delete old traces',
				error
			);
			throw error;
		}
	}
}
