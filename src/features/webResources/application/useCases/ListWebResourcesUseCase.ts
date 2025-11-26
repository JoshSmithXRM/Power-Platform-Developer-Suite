import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { WebResource } from '../../domain/entities/WebResource';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';

/**
 * Options for listing web resources.
 */
export interface ListWebResourcesOptions {
	/** Filter to only text-based resources (excludes PNG, JPG, GIF, ICO). Default: true */
	textBasedOnly?: boolean;
}

/**
 * Use case for listing all web resources in an environment.
 * Returns unsorted domain entities - sorting is handled by presentation layer.
 */
export class ListWebResourcesUseCase {
	constructor(
		private readonly webResourceRepository: IWebResourceRepository,
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to list web resources.
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Solution GUID to filter by (use DEFAULT_SOLUTION_ID to show all)
	 * @param cancellationToken - Optional token to cancel the operation
	 * @param options - Optional filtering options
	 * @returns Promise resolving to array of WebResource entities
	 */
	async execute(
		environmentId: string,
		solutionId: string,
		cancellationToken?: ICancellationToken,
		options?: ListWebResourcesOptions
	): Promise<WebResource[]> {
		const textBasedOnly = options?.textBasedOnly ?? true;
		this.logger.info('ListWebResourcesUseCase started', { environmentId, solutionId, textBasedOnly });

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListWebResourcesUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			const webResources = await this.webResourceRepository.findAll(
				environmentId,
				undefined,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListWebResourcesUseCase cancelled after fetch');
				throw new OperationCancelledException();
			}

			let filteredWebResources = await this.filterBySolution(
				environmentId,
				solutionId,
				webResources,
				cancellationToken
			);

			// Filter to text-based types only (excludes binary images)
			if (textBasedOnly) {
				const beforeCount = filteredWebResources.length;
				filteredWebResources = filteredWebResources.filter((wr) => wr.isTextBased());
				this.logger.debug('Filtered to text-based types', {
					beforeCount,
					afterCount: filteredWebResources.length,
					excludedCount: beforeCount - filteredWebResources.length
				});
			}

			this.logger.info('ListWebResourcesUseCase completed', {
				totalCount: webResources.length,
				filteredCount: filteredWebResources.length,
				textBasedOnly
			});

			return filteredWebResources;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('ListWebResourcesUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	private async filterBySolution(
		environmentId: string,
		solutionId: string,
		webResources: WebResource[],
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]> {
		// Default solution means show all web resources
		if (solutionId === DEFAULT_SOLUTION_ID) {
			return webResources;
		}

		const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
			environmentId,
			solutionId,
			'webresource',
			undefined,
			cancellationToken
		);

		if (cancellationToken?.isCancellationRequested) {
			this.logger.info('ListWebResourcesUseCase cancelled after filtering');
			throw new OperationCancelledException();
		}

		const componentIdSet = new Set(componentIds);
		const filtered = webResources.filter((wr) => wr.isInSolution(componentIdSet));

		this.logger.debug('Filtered by solution', {
			totalWebResources: webResources.length,
			filteredWebResources: filtered.length,
			solutionId
		});

		return filtered;
	}
}
