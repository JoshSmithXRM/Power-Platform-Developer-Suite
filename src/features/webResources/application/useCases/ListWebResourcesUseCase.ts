import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { WebResource } from '../../domain/entities/WebResource';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Maximum number of IDs to include in a single OData $filter query.
 * Beyond this, URL length limits may be exceeded.
 * For large solutions, we fall back to fetching all and filtering client-side.
 */
const MAX_FILTER_IDS = 100;

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
	 * Executes the use case to list web resources for a solution.
	 *
	 * Strategy:
	 * - Gets solution component IDs first, then fetches only those web resources
	 * - For small solutions (≤100 IDs): uses OData $filter for efficient server-side query
	 * - For large solutions (>100 IDs): fetches all and filters client-side (URL length limits)
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Solution GUID to filter by
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
		this.logger.info('ListWebResourcesUseCase started', {
			environmentId,
			solutionId,
			textBasedOnly
		});

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListWebResourcesUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			// Unified approach: always query by solution components
			// Works for all solutions including Default Solution
			let webResources = await this.fetchWebResourcesForSolution(
				environmentId,
				solutionId,
				cancellationToken
			);

			// Filter to text-based types only (excludes binary images)
			if (textBasedOnly) {
				const beforeCount = webResources.length;
				webResources = webResources.filter((wr) => wr.isTextBased());
				this.logger.debug('Filtered to text-based types', {
					beforeCount,
					afterCount: webResources.length,
					excludedCount: beforeCount - webResources.length
				});
			}

			this.logger.info('ListWebResourcesUseCase completed', {
				resultCount: webResources.length,
				textBasedOnly
			});

			return webResources;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('ListWebResourcesUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Fetches all web resources from the environment.
	 * Used as fallback for large solutions that exceed OData filter URL limits.
	 */
	private async fetchAllWebResources(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]> {
		this.logger.debug('Fetching all web resources');

		const webResources = await this.webResourceRepository.findAll(
			environmentId,
			undefined,
			cancellationToken
		);

		if (cancellationToken?.isCancellationRequested) {
			throw new OperationCancelledException();
		}

		this.logger.debug('Fetched all web resources', { count: webResources.length });
		return webResources;
	}

	/**
	 * Fetches only web resources that belong to a specific solution.
	 * Gets solution component IDs first, then queries only those web resources.
	 *
	 * For small solutions (<= MAX_FILTER_IDS): uses OData $filter for efficiency
	 * For large solutions: fetches all and filters client-side (URL length limits)
	 */
	private async fetchWebResourcesForSolution(
		environmentId: string,
		solutionId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]> {
		// Step 1: Get component IDs for this solution
		const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
			environmentId,
			solutionId,
			'webresource',
			undefined,
			cancellationToken
		);

		if (cancellationToken?.isCancellationRequested) {
			throw new OperationCancelledException();
		}

		this.logger.debug('Found solution web resource components', {
			solutionId,
			componentCount: componentIds.length
		});

		// No components = empty result
		if (componentIds.length === 0) {
			return [];
		}

		// Step 2: Fetch web resources based on component count
		if (componentIds.length <= MAX_FILTER_IDS) {
			// Small solution: use OData filter for efficiency
			return this.fetchWebResourcesByIds(environmentId, componentIds, cancellationToken);
		} else {
			// Large solution: fetch all and filter client-side (URL length limits)
			this.logger.debug('Large solution - fetching all and filtering client-side', {
				componentCount: componentIds.length,
				threshold: MAX_FILTER_IDS
			});
			const allResources = await this.fetchAllWebResources(environmentId, cancellationToken);
			const componentIdSet = new Set(componentIds);
			return allResources.filter(wr => componentIdSet.has(wr.id));
		}
	}

	/**
	 * Fetches specific web resources by their IDs using OData $filter.
	 * Used for small solutions where the filter URL won't exceed length limits.
	 */
	private async fetchWebResourcesByIds(
		environmentId: string,
		webResourceIds: string[],
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]> {
		// Build OData filter: webresourceid eq 'id1' or webresourceid eq 'id2' ...
		const filterClauses = webResourceIds.map(id => `webresourceid eq '${id}'`);
		const filter = filterClauses.join(' or ');

		this.logger.debug('Fetching web resources by IDs', {
			idCount: webResourceIds.length,
			filterLength: filter.length
		});

		const webResources = await this.webResourceRepository.findAll(
			environmentId,
			{ filter },
			cancellationToken
		);

		if (cancellationToken?.isCancellationRequested) {
			throw new OperationCancelledException();
		}

		this.logger.debug('Fetched web resources by IDs', {
			requestedCount: webResourceIds.length,
			returnedCount: webResources.length
		});

		return webResources;
	}

}
