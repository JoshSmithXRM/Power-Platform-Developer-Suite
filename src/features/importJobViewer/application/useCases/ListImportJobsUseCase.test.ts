import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ImportJob, ImportJobStatus } from '../../domain/entities/ImportJob';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';

import { ListImportJobsUseCase } from './ListImportJobsUseCase';

describe('ListImportJobsUseCase', () => {
	let useCase: ListImportJobsUseCase;
	let mockRepository: jest.Mocked<IImportJobRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn(),
			findByIdWithLog: jest.fn(),
			findPaginated: jest.fn(),
			getCount: jest.fn()
		};

		mockLogger = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		useCase = new ListImportJobsUseCase(mockRepository, mockLogger);
	});

	function createImportJob(overrides?: Partial<{
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
	}>): ImportJob {
		return new ImportJob(
			overrides?.id ?? 'job-1',
			overrides?.name ?? 'Test Import',
			overrides?.solutionName ?? 'TestSolution',
			overrides?.createdBy ?? 'Test User',
			overrides?.createdOn ?? new Date('2024-01-15T10:00:00Z'),
			overrides?.completedOn ?? null,
			overrides?.progress ?? 0,
			overrides?.statusCode ?? ImportJobStatus.InProgress,
			overrides?.importContext ?? 'Import',
			overrides?.operationContext ?? 'New'
		);
	}

	describe('execute', () => {
		it('should fetch and return import jobs from repository', async () => {
			const jobs = [
				createImportJob({ name: 'Import 1', solutionName: 'Solution A' }),
				createImportJob({ name: 'Import 2', solutionName: 'Solution B' })
			];

			mockRepository.findAll.mockResolvedValue(jobs);

			const result = await useCase.execute('env-123', undefined);

			expect(mockRepository.findAll).toHaveBeenCalledWith('env-123', undefined, undefined);
			expect(result).toHaveLength(2);
			expect(mockLogger.info).toHaveBeenCalledWith('ListImportJobsUseCase started', { environmentId: 'env-123' });
			expect(mockLogger.info).toHaveBeenCalledWith('ListImportJobsUseCase completed', { count: 2 });
		});

		it('should return import jobs in the order provided by repository', async () => {
			const jobs = [
				createImportJob({
					name: 'Oldest Completed',
					createdOn: new Date('2024-01-10T10:00:00Z'),
					statusCode: ImportJobStatus.Completed
				}),
				createImportJob({
					name: 'Newest Completed',
					createdOn: new Date('2024-01-20T10:00:00Z'),
					statusCode: ImportJobStatus.Completed
				}),
				createImportJob({
					name: 'Oldest In-Progress',
					createdOn: new Date('2024-01-05T10:00:00Z'),
					statusCode: ImportJobStatus.InProgress
				})
			];

			mockRepository.findAll.mockResolvedValue(jobs);

			const result = await useCase.execute('env-123', undefined);

			// Use case should NOT sort - that's a presentation concern handled by the mapper
			expect(result[0]).toBeDefined();
			expect(result[0]!.name).toBe('Oldest Completed');
			expect(result[1]).toBeDefined();
			expect(result[1]!.name).toBe('Newest Completed');
			expect(result[2]).toBeDefined();
			expect(result[2]!.name).toBe('Oldest In-Progress');
			expect(result.length).toBe(3);
		});

		it('should not mutate the original array from repository', async () => {
			const jobs = [
				createImportJob({
					name: 'Completed',
					createdOn: new Date('2024-01-20T10:00:00Z'),
					statusCode: ImportJobStatus.Completed
				}),
				createImportJob({
					name: 'In-Progress',
					createdOn: new Date('2024-01-10T10:00:00Z'),
					statusCode: ImportJobStatus.InProgress
				})
			];

			mockRepository.findAll.mockResolvedValue(jobs);

			const originalOrder = jobs.map(j => j.name);
			await useCase.execute('env-123', undefined);

			// Repository array should remain unchanged
			expect(jobs.map(j => j.name)).toEqual(originalOrder);
		});

		it('should handle empty job list', async () => {
			mockRepository.findAll.mockResolvedValue([]);

			const result = await useCase.execute('env-123', undefined);

			expect(result).toHaveLength(0);
			expect(mockLogger.info).toHaveBeenCalledWith('ListImportJobsUseCase completed', { count: 0 });
		});

		it('should pass cancellation token to repository', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			mockRepository.findAll.mockResolvedValue([]);

			await useCase.execute('env-123', mockCancellationToken);

			expect(mockRepository.findAll).toHaveBeenCalledWith('env-123', undefined, mockCancellationToken);
		});

		it('should throw OperationCancelledException if cancelled before execution', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(useCase.execute('env-123', mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockRepository.findAll).not.toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('ListImportJobsUseCase cancelled before execution');
		});

		it('should log and rethrow repository errors', async () => {
			const error = new Error('Repository failed');
			mockRepository.findAll.mockRejectedValue(error);

			await expect(useCase.execute('env-123', undefined)).rejects.toThrow('Repository failed');

			expect(mockLogger.error).toHaveBeenCalledWith('ListImportJobsUseCase failed', error);
		});

		it('should rethrow OperationCancelledException without special handling', async () => {
			const cancelledException = new OperationCancelledException();
			mockRepository.findAll.mockRejectedValue(cancelledException);

			await expect(useCase.execute('env-123', undefined)).rejects.toThrow(OperationCancelledException);

			expect(mockLogger.error).toHaveBeenCalledWith('ListImportJobsUseCase failed', cancelledException);
		});
	});
});
