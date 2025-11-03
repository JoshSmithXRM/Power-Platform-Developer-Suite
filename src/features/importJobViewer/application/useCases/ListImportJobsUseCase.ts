import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import { ImportJob } from '../../domain/entities/ImportJob';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for listing all import jobs in an environment.
 * Orchestrates repository call only - sorting is handled in mapper layer.
 */
export class ListImportJobsUseCase {
	constructor(
		private readonly importJobRepository: IImportJobRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to list import jobs.
	 * @param environmentId - Power Platform environment GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of ImportJob entities
	 */
	async execute(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<ImportJob[]> {
		this.logger.info('ListImportJobsUseCase started', { environmentId });

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListImportJobsUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			const jobs = await this.importJobRepository.findAll(
				environmentId,
				undefined,
				cancellationToken
			);

			this.logger.info('ListImportJobsUseCase completed', { count: jobs.length });

			return jobs;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('ListImportJobsUseCase failed', normalizedError);
			throw normalizedError;
		}
	}
}
