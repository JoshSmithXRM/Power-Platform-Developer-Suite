import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IEditorService } from '../../../../shared/infrastructure/interfaces/IEditorService';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for opening an import job's XML log in VS Code editor.
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
		this.logger.debug('OpenImportLogUseCase: Starting import log processing', { environmentId, importJobId });

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('OpenImportLogUseCase: Cancelled before execution');
			throw new OperationCancelledException();
		}

		try {
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

			if (importJob.importLogXml === null) {
				throw new Error('Unexpected: importLogXml is null after hasLog() check');
			}

			await this.editorService.openXmlInNewTab(importJob.importLogXml);

			this.logger.info('Import log opened successfully', { importJobId });
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('OpenImportLogUseCase: Failed to process import log', normalizedError);
			throw normalizedError;
		}
	}
}
