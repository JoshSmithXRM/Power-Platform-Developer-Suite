import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import { createTestSolution } from '../../../../shared/testing/factories/SolutionFactory';

import { ListSolutionsUseCase } from './ListSolutionsUseCase';

describe('ListSolutionsUseCase', () => {
	let useCase: ListSolutionsUseCase;
	let mockRepository: jest.Mocked<ISolutionRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn(),
			findAllForDropdown: jest.fn(),
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

		useCase = new ListSolutionsUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should fetch and return solutions from repository', async () => {
			const solutions = [
				createTestSolution({ uniqueName: 'Solution1', friendlyName: 'Solution A' }),
				createTestSolution({ uniqueName: 'Solution2', friendlyName: 'Solution B' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123', undefined);

			expect(mockRepository.findAll).toHaveBeenCalledWith('env-123', undefined, undefined);
			expect(result).toHaveLength(2);
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase started', { environmentId: 'env-123' });
			expect(mockLogger.info).toHaveBeenCalledWith('ListSolutionsUseCase completed', { count: 2 });
		});

		it('should return solutions in the order provided by repository', async () => {
			const solutions = [
				createTestSolution({ uniqueName: 'Zebra', friendlyName: 'Zebra Solution' }),
				createTestSolution({ uniqueName: 'Default', friendlyName: 'Default' }),
				createTestSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha Solution' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const result = await useCase.execute('env-123', undefined);

			expect(result[0]!.uniqueName).toBe('Zebra');
			expect(result[1]!.uniqueName).toBe('Default');
			expect(result[2]!.uniqueName).toBe('Alpha');
			expect(result.length).toBe(3);
		});

		it('should not mutate the original array from repository', async () => {
			const solutions = [
				createTestSolution({ uniqueName: 'Zebra', friendlyName: 'Zebra' }),
				createTestSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha' })
			];

			mockRepository.findAll.mockResolvedValue(solutions);

			const originalOrder = solutions.map(s => s.uniqueName);
			await useCase.execute('env-123', undefined);

			expect(solutions.map(s => s.uniqueName)).toEqual(originalOrder);
		});

		it('should handle empty solution list', async () => {
			mockRepository.findAll.mockResolvedValue([]);

			const result = await useCase.execute('env-123', undefined);

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

			await expect(useCase.execute('env-123', undefined)).rejects.toThrow('Repository failed');

			expect(mockLogger.error).toHaveBeenCalledWith('ListSolutionsUseCase failed', error);
		});

		it('should rethrow OperationCancelledException without logging as error', async () => {
			const cancelledException = new OperationCancelledException();
			mockRepository.findAll.mockRejectedValue(cancelledException);

			await expect(useCase.execute('env-123', undefined)).rejects.toThrow(OperationCancelledException);

			expect(mockLogger.error).toHaveBeenCalledWith('ListSolutionsUseCase failed', cancelledException);
		});
	});
});
