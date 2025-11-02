import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IEditorService } from '../../../../shared/infrastructure/interfaces/IEditorService';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';

/**
 * Use case for opening an import job's XML log in VS Code editor.
 * Orchestrates: fetch import job with log data → open in editor
 */
export class OpenImportLogUseCase {
	constructor(
		private readonly importJobRepository: IImportJobRepository,
		private readonly editorService: IEditorService,
		private readonly logger: ILogger
	) {}

	/**
	 * Opens the import log XML for the specified import job in a new editor tab.
	 * @param environmentId - Power Platform environment GUID
	 * @param importJobId - Import job GUID
	 * @param cancellationToken - Optional cancellation token
	 * @throws {OperationCancelledException} If operation is cancelled
	 * @throws {Error} If import job has no log data or fetch fails
	 */
	async execute(
		environmentId: string,
		importJobId: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		this.logger.info('OpenImportLogUseCase started', { environmentId, importJobId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.info('OpenImportLogUseCase cancelled before execution');
			throw new OperationCancelledException();
		}

		try {
			// Fetch import job with log data
			const importJob = await this.importJobRepository.findByIdWithLog(
				environmentId,
				importJobId,
				undefined,
				cancellationToken
			);

			if (!importJob.hasLog()) {
				const error = new Error('Import job has no log data available');
				this.logger.warn('Import job has no log data', { importJobId });
				throw error;
			}

			// Open log in editor
			await this.editorService.openXmlInNewTab(
				importJob.importLogXml!,
				`Import Log - ${importJob.name}`
			);

			this.logger.info('OpenImportLogUseCase completed successfully', { importJobId });
		} catch (error) {
			this.logger.error('OpenImportLogUseCase failed', error as Error);
			throw error;
		}
	}
}
