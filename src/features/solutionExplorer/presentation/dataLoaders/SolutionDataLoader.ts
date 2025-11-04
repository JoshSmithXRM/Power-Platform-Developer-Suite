import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ListSolutionsUseCase } from '../../application/useCases/ListSolutionsUseCase';
import { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { enhanceViewModelsWithSolutionLinks } from '../views/SolutionLinkView';

/**
 * Data loader for Solution Explorer panel.
 * Loads solutions, maps to view models, and enhances with clickable links.
 */
export class SolutionDataLoader implements IDataLoader {
	constructor(
		private readonly getCurrentEnvironmentId: () => string | null,
		private readonly listSolutionsUseCase: ListSolutionsUseCase,
		private readonly viewModelMapper: SolutionViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads solutions for the current environment.
	 *
	 * Fetches solutions from the use case, maps them to view models, and
	 * enhances them with clickable links for opening in Maker Portal. Returns
	 * an empty array if no environment is selected or if the operation is cancelled.
	 */
	public async load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
		const environmentId = this.getCurrentEnvironmentId();
		if (!environmentId) {
			this.logger.warn('Cannot load solutions: No environment selected');
			return [];
		}

		this.logger.info('Loading solutions', { environmentId });

		const solutions = await this.listSolutionsUseCase.execute(
			environmentId,
			cancellationToken
		);

		if (cancellationToken.isCancellationRequested) {
			return [];
		}

		const viewModels = this.viewModelMapper.toViewModels(solutions, true);
		const enhancedViewModels = enhanceViewModelsWithSolutionLinks(viewModels);

		this.logger.info('Solutions loaded successfully', { count: solutions.length });

		return enhancedViewModels;
	}
}
