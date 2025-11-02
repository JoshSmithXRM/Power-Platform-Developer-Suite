import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import { ImportJob } from '../../domain/entities/ImportJob';

/**
 * Use case for listing all import jobs in an environment.
 * Orchestrates repository call and sorting logic.
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
	 * @returns Promise resolving to sorted array of ImportJob entities
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

			// Create defensive copy before sorting to avoid mutating the original array
			// Sort by priority (in-progress first) then by most recent creation date
			const sorted = [...jobs].sort((a, b) => {
				const priorityDiff = a.getSortPriority() - b.getSortPriority();
				if (priorityDiff !== 0) {
					return priorityDiff;
				}
				// Most recent first
				return b.createdOn.getTime() - a.createdOn.getTime();
			});

			this.logger.info('ListImportJobsUseCase completed', { count: sorted.length });

			return sorted;
		} catch (error) {
			this.logger.error('ListImportJobsUseCase failed', error as Error);
			throw error;
		}
	}
}
