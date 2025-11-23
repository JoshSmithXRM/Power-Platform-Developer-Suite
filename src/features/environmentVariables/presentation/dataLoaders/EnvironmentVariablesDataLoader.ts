import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ListEnvironmentVariablesUseCase } from '../../application/useCases/ListEnvironmentVariablesUseCase';
import { EnvironmentVariableViewModelMapper } from '../../application/mappers/EnvironmentVariableViewModelMapper';
import { EnvironmentVariableCollectionService } from '../../domain/services/EnvironmentVariableCollectionService';

/**
 * Data loader for Environment Variables panel.
 * Loads environment variables filtered by solution and maps to view models.
 */
export class EnvironmentVariablesDataLoader implements IDataLoader {
	private readonly mapper: EnvironmentVariableViewModelMapper;

	constructor(
		private readonly getCurrentEnvironmentId: () => string | null,
		private readonly getCurrentSolutionId: () => string,
		private readonly listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		private readonly logger: ILogger
	) {
		const collectionService = new EnvironmentVariableCollectionService();
		this.mapper = new EnvironmentVariableViewModelMapper(collectionService);
	}

	/**
	 * Loads environment variables for the current environment and solution filter.
	 *
	 * Fetches environment variables from the use case, maps them to view models
	 * suitable for display in the data table. Returns an empty array if no
	 * environment is selected or if the operation is cancelled.
	 */
	public async load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
		const environmentId = this.getCurrentEnvironmentId();
		if (!environmentId) {
			this.logger.warn('Cannot load environment variables: No environment selected');
			return [];
		}

		const solutionId = this.getCurrentSolutionId();
		this.logger.info('Loading environment variables', { environmentId, solutionId });

		const environmentVariables = await this.listEnvVarsUseCase.execute(
			environmentId,
			solutionId,
			cancellationToken
		);

		if (cancellationToken.isCancellationRequested) {
			return [];
		}

		const viewModels = this.mapper.toViewModels(environmentVariables, true);

		this.logger.info('Environment variables loaded successfully', { count: environmentVariables.length });

		return viewModels;
	}
}
