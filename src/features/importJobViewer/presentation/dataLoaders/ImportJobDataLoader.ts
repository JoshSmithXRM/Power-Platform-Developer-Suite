import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ListImportJobsUseCase } from '../../application/useCases/ListImportJobsUseCase';
import { ImportJobViewModelMapper } from '../../application/mappers/ImportJobViewModelMapper';
import { ImportJobCollectionService } from '../../domain/services/ImportJobCollectionService';
import { enhanceViewModelsWithImportJobLinks } from '../views/ImportJobLinkView';

/**
 * Data loader for Import Job Viewer panel.
 * Loads import jobs, maps to view models, and enhances with clickable links.
 */
export class ImportJobDataLoader implements IDataLoader {
	private readonly mapper: ImportJobViewModelMapper;

	constructor(
		private readonly getCurrentEnvironmentId: () => string | null,
		private readonly listImportJobsUseCase: ListImportJobsUseCase,
		private readonly logger: ILogger
	) {
		this.mapper = new ImportJobViewModelMapper(new ImportJobCollectionService());
	}

	/**
	 * Loads import jobs for the current environment.
	 *
	 * Fetches import jobs from the use case, maps them to view models, and
	 * enhances them with clickable links for opening import logs. Returns an
	 * empty array if no environment is selected or if the operation is cancelled.
	 */
	public async load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
		const environmentId = this.getCurrentEnvironmentId();
		if (!environmentId) {
			this.logger.warn('Cannot load import jobs: No environment selected');
			return [];
		}

		this.logger.info('Loading import jobs', { environmentId });

		const importJobs = await this.listImportJobsUseCase.execute(
			environmentId,
			cancellationToken
		);

		if (cancellationToken.isCancellationRequested) {
			return [];
		}

		const viewModels = this.mapper.toViewModels(importJobs, true);
		const enhancedViewModels = enhanceViewModelsWithImportJobLinks(viewModels);

		this.logger.info('Import jobs loaded successfully', { count: importJobs.length });

		return enhancedViewModels;
	}
}
