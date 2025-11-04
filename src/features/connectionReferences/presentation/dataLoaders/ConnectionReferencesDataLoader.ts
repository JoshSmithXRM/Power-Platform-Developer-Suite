import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ListConnectionReferencesUseCase } from '../../application/useCases/ListConnectionReferencesUseCase';
import { FlowConnectionRelationshipViewModelMapper } from '../../application/mappers/FlowConnectionRelationshipViewModelMapper';
import { FlowConnectionRelationshipCollectionService } from '../../domain/services/FlowConnectionRelationshipCollectionService';
import { enhanceViewModelsWithFlowLinks } from '../views/FlowLinkView';

/**
 * Data loader for Connection References panel.
 * Loads connection references filtered by solution, maps to view models, and enhances with links.
 */
export class ConnectionReferencesDataLoader implements IDataLoader {
	private readonly viewModelMapper: FlowConnectionRelationshipViewModelMapper;

	constructor(
		private readonly getCurrentEnvironmentId: () => string | null,
		private readonly getCurrentSolutionId: () => string,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly relationshipCollectionService: FlowConnectionRelationshipCollectionService,
		private readonly logger: ILogger
	) {
		this.viewModelMapper = new FlowConnectionRelationshipViewModelMapper();
	}

	/**
	 * Loads connection references for the current environment and solution filter.
	 *
	 * Fetches flow-connection reference relationships from the use case, sorts
	 * them using the collection service, maps to view models, and enhances with
	 * clickable flow links. Returns an empty array if no environment is selected
	 * or if the operation is cancelled.
	 */
	public async load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
		const environmentId = this.getCurrentEnvironmentId();
		if (!environmentId) {
			this.logger.warn('Cannot load connection references: No environment selected');
			return [];
		}

		const solutionId = this.getCurrentSolutionId();
		this.logger.info('Loading connection references', { environmentId, solutionId });

		const result = await this.listConnectionReferencesUseCase.execute(
			environmentId,
			solutionId || undefined,
			cancellationToken
		);

		if (cancellationToken.isCancellationRequested) {
			return [];
		}

		const sortedRelationships = this.relationshipCollectionService.sort(result.relationships);
		const viewModels = this.viewModelMapper.toViewModels(sortedRelationships);
		const enhancedViewModels = enhanceViewModelsWithFlowLinks(viewModels);

		this.logger.info('Connection references loaded successfully', { count: result.relationships.length });

		return enhancedViewModels;
	}
}
