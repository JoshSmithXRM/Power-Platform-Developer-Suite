import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { Solution } from '../../domain/entities/Solution';
import { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';

import { ListSolutionsUseCase } from './ListSolutionsUseCase';

describe('ListSolutionsUseCase', () => {
	let useCase: ListSolutionsUseCase;
	let mockRepository: jest.Mocked<ISolutionRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn()
		};

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		useCase = new ListSolutionsUseCase(mockRepository, mockLogger);
	});

	function createSolution(overrides?: Partial<{
		id: string;
		uniqueName: string;
		friendlyName: string;
		version: string;
		isManaged: boolean;
		publisherId: string;
		publisherName: string;
		installedOn: Date | null;
		description: string;
		modifiedOn: Date;
		isVisible: boolean;
		isApiManaged: boolean;
		solutionType: string | null;
	}>): Solution {
		return new Solution(
			overrides?.id ?? 'solution-1',
			overrides?.uniqueName ?? 'TestSolution',
			overrides?.friendlyName ?? 'Test Solution',
			overrides?.version ?? '1.0.0.0',
			overrides?.isManaged ?? false,
			overrides?.publisherId ?? 'pub-1',
			overrides?.publisherName ?? 'Test Publisher',
			overrides?.installedOn ?? null,
			overrides?.description ?? 'Test description',
			overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
			overrides?.isVisible ?? true,
			overrides?.isApiManaged ?? false,
			overrides?.solutionType ?? null
		);
	}

	describe('execute', () => {
		it('should fetch and return solutions from repository', async () => {
			const solutions = [
				createSolution({ uniqueName: 'Solution1', friendlyName: 'Solution A' }),
				createSolution({ uniqueName: 'Solution2', friendlyName: 'Solution B' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123');

			expect(mockRepository.findAll).toHaveBeenCalledWith('env-123', undefined, undefined);
			expect(result).toHaveLength(2);
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase started', { environmentId: 'env-123' });
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase completed', { count: 2 });
		});

		it('should sort Default solution first, then alphabetically by friendlyName', async () => {
			const solutions = [
				createSolution({ uniqueName: 'Zebra', friendlyName: 'Zebra Solution' }),
				createSolution({ uniqueName: 'Default', friendlyName: 'Default' }),
				createSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha Solution' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123');

			expect(result[0].uniqueName).toBe('Default');
			expect(result[1].friendlyName).toBe('Alpha Solution');
			expect(result[2].friendlyName).toBe('Zebra Solution');
		});

		it('should sort non-Default solutions alphabetically when no Default exists', async () => {
			const solutions = [
				createSolution({ uniqueName: 'Charlie', friendlyName: 'Charlie' }),
				createSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha' }),
				createSolution({ uniqueName: 'Bravo', friendlyName: 'Bravo' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123');

			expect(result[0].friendlyName).toBe('Alpha');
			expect(result[1].friendlyName).toBe('Bravo');
			expect(result[2].friendlyName).toBe('Charlie');
		});

		it('should not mutate the original array from repository', async () => {
			const solutions = [
				createSolution({ uniqueName: 'Zebra', friendlyName: 'Zebra' }),
				createSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123');

			// Original array should remain unchanged
			expect(solutions[0].friendlyName).toBe('Zebra');
			expect(solutions[1].friendlyName).toBe('Alpha');

			// Result should be sorted
			expect(result[0].friendlyName).toBe('Alpha');
			expect(result[1].friendlyName).toBe('Zebra');
		});

		it('should handle empty solution list', async () => {
			mockRepository.findAll.mockResolvedValue([]);

			const result = await useCase.execute('env-123');

			expect(result).toHaveLength(0);
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase completed', { count: 0 });
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
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase cancelled before execution');
		});

		it('should log and rethrow repository errors', async () => {
			const error = new Error('Repository failed');
			mockRepository.findAll.mockRejectedValue(error);

			await expect(useCase.execute('env-123')).rejects.toThrow('Repository failed');

			expect(mockLogger.error).toHaveBeenCalledWith('ListSolutionsUseCase failed', error);
		});

		it('should rethrow OperationCancelledException without logging as error', async () => {
			const cancelledException = new OperationCancelledException();
			mockRepository.findAll.mockRejectedValue(cancelledException);

			await expect(useCase.execute('env-123')).rejects.toThrow(OperationCancelledException);

			// Error logger should still be called since we log all errors, but the error is then rethrown
			expect(mockLogger.error).toHaveBeenCalledWith('ListSolutionsUseCase failed', cancelledException);
		});
	});
});
