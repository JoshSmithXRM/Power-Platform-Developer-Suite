import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IEditorService } from '../../../../shared/infrastructure/interfaces/IEditorService';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ImportJob, ImportJobStatus } from '../../domain/entities/ImportJob';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';

import { OpenImportLogUseCase } from './OpenImportLogUseCase';

describe('OpenImportLogUseCase', () => {
	let useCase: OpenImportLogUseCase;
	let mockRepository: jest.Mocked<IImportJobRepository>;
	let mockEditorService: jest.Mocked<IEditorService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn(),
			findByIdWithLog: jest.fn(),
			findPaginated: jest.fn(),
			getCount: jest.fn()
		};

		mockEditorService = {
			openXmlInNewTab: jest.fn()
		};

		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		useCase = new OpenImportLogUseCase(mockRepository, mockEditorService, mockLogger);
	});

	function createImportJobWithLog(overrides?: Partial<{
		id: string;
		name: string;
		solutionName: string;
		createdBy: string;
		createdOn: Date;
		completedOn: Date | null;
		progress: number;
		statusCode: ImportJobStatus;
		importContext: string | null;
		operationContext: string | null;
		importLogXml: string | null;
	}>): ImportJob {
		return new ImportJob(
			overrides?.id ?? 'job-1',
			overrides?.name ?? 'Test Import',
			overrides?.solutionName ?? 'TestSolution',
			overrides?.createdBy ?? 'Test User',
			overrides?.createdOn ?? new Date('2024-01-15T10:00:00Z'),
			overrides?.completedOn ?? new Date('2024-01-15T10:30:00Z'),
			overrides?.progress ?? 100,
			overrides?.statusCode ?? ImportJobStatus.Completed,
			overrides?.importContext ?? 'Import',
			overrides?.operationContext ?? 'New',
			overrides && 'importLogXml' in overrides ? overrides.importLogXml : '<ImportLog><Success>true</Success></ImportLog>'
		);
	}

	describe('execute', () => {
		it('should successfully open import log when job has log data', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const xmlContent = '<ImportLog><Success>true</Success></ImportLog>';
			const job = createImportJobWithLog({ id: importJobId, importLogXml: xmlContent });

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId);

			// Assert
			expect(mockRepository.findByIdWithLog).toHaveBeenCalledWith(
				environmentId,
				importJobId,
				undefined,
				undefined
			);
			expect(mockEditorService.openXmlInNewTab).toHaveBeenCalledWith(xmlContent);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'OpenImportLogUseCase: Starting import log processing',
				{ environmentId, importJobId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith('Import log opened successfully', { importJobId });
		});

		it('should pass cancellation token to repository', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};
			const job = createImportJobWithLog({ id: importJobId });

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId, mockCancellationToken);

			// Assert
			expect(mockRepository.findByIdWithLog).toHaveBeenCalledWith(
				environmentId,
				importJobId,
				undefined,
				mockCancellationToken
			);
		});

		it('should throw OperationCancelledException if cancelled before execution', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockRepository.findByIdWithLog).not.toHaveBeenCalled();
			expect(mockEditorService.openXmlInNewTab).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('OpenImportLogUseCase: Cancelled before execution');
		});

		it('should throw error when import job has no log data (null)', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const job = createImportJobWithLog({ id: importJobId, importLogXml: null });

			mockRepository.findByIdWithLog.mockResolvedValue(job);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow('Cannot open import log: no log data available for this import job');

			expect(mockEditorService.openXmlInNewTab).not.toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith('Import job has no log data', { importJobId });
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should throw error when import job has empty log data', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const job = createImportJobWithLog({ id: importJobId, importLogXml: '' });

			mockRepository.findByIdWithLog.mockResolvedValue(job);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow('Cannot open import log: no log data available for this import job');

			expect(mockEditorService.openXmlInNewTab).not.toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith('Import job has no log data', { importJobId });
		});

		it('should handle XML log with whitespace', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const xmlContent = '  <ImportLog><Success>true</Success></ImportLog>  ';
			const job = createImportJobWithLog({ id: importJobId, importLogXml: xmlContent });

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId);

			// Assert
			expect(mockEditorService.openXmlInNewTab).toHaveBeenCalledWith(xmlContent);
			expect(mockLogger.info).toHaveBeenCalledWith('Import log opened successfully', { importJobId });
		});

		it('should handle large XML log content', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const largeXml = '<ImportLog>' + '<Entry>data</Entry>'.repeat(1000) + '</ImportLog>';
			const job = createImportJobWithLog({ id: importJobId, importLogXml: largeXml });

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId);

			// Assert
			expect(mockEditorService.openXmlInNewTab).toHaveBeenCalledWith(largeXml);
		});

		it('should log and rethrow repository errors', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const error = new Error('Repository connection failed');

			mockRepository.findByIdWithLog.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow('Repository connection failed');

			expect(mockEditorService.openXmlInNewTab).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'OpenImportLogUseCase: Failed to process import log',
				error
			);
		});

		it('should log and rethrow editor service errors', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const job = createImportJobWithLog({ id: importJobId });
			const error = new Error('Failed to open editor');

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow('Failed to open editor');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'OpenImportLogUseCase: Failed to process import log',
				error
			);
		});

		it('should handle in-progress job with log data', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const xmlContent = '<ImportLog><InProgress>true</InProgress></ImportLog>';
			const job = createImportJobWithLog({
				id: importJobId,
				statusCode: ImportJobStatus.InProgress,
				progress: 50,
				completedOn: null,
				importLogXml: xmlContent
			});

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId);

			// Assert
			expect(mockEditorService.openXmlInNewTab).toHaveBeenCalledWith(xmlContent);
			expect(mockLogger.info).toHaveBeenCalledWith('Import log opened successfully', { importJobId });
		});

		it('should handle failed job with error log', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const xmlContent = '<ImportLog><Error>Import failed</Error></ImportLog>';
			const job = createImportJobWithLog({
				id: importJobId,
				statusCode: ImportJobStatus.Failed,
				importLogXml: xmlContent
			});

			mockRepository.findByIdWithLog.mockResolvedValue(job);
			mockEditorService.openXmlInNewTab.mockResolvedValue();

			// Act
			await useCase.execute(environmentId, importJobId);

			// Assert
			expect(mockEditorService.openXmlInNewTab).toHaveBeenCalledWith(xmlContent);
			expect(mockLogger.info).toHaveBeenCalledWith('Import log opened successfully', { importJobId });
		});

		it('should normalize non-Error objects thrown by dependencies', async () => {
			// Arrange
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const stringError = 'Something went wrong';

			mockRepository.findByIdWithLog.mockRejectedValue(stringError);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledTimes(1);
			const [, loggedError] = mockLogger.error.mock.calls[0]!;
			expect(loggedError).toBeInstanceOf(Error);
		});

		it('should throw internal error if importLogXml is null after hasLog check', async () => {
			// Arrange - Test defensive programming check
			const environmentId = 'env-123';
			const importJobId = 'job-456';
			const job = createImportJobWithLog({
				id: importJobId,
				importLogXml: null
			});

			// Mock hasLog() to return true even though importLogXml is null
			// This simulates an implementation bug that the defensive check protects against
			jest.spyOn(job, 'hasLog').mockReturnValue(true);

			mockRepository.findByIdWithLog.mockResolvedValue(job);

			// Act & Assert
			await expect(useCase.execute(environmentId, importJobId))
				.rejects.toThrow('Internal error: importLogXml is null after hasLog() check');
		});
	});
});
