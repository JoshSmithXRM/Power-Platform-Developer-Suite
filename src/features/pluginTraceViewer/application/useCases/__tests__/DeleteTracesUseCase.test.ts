import { DeleteTracesUseCase } from '../DeleteTracesUseCase';
import type { IPluginTraceRepository } from '../../../domain/repositories/IPluginTraceRepository';
import type { ILogger } from '../../../../../infrastructure/logging/ILogger';

describe('DeleteTracesUseCase', () => {
	let useCase: DeleteTracesUseCase;
	let mockRepository: jest.Mocked<IPluginTraceRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			getTraces: jest.fn(),
			getTraceById: jest.fn(),
			deleteTrace: jest.fn(),
			deleteTraces: jest.fn(),
			deleteAllTraces: jest.fn(),
			deleteOldTraces: jest.fn(),
			getTraceLevel: jest.fn(),
			setTraceLevel: jest.fn(),
		};

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		useCase = new DeleteTracesUseCase(mockRepository, mockLogger);
	});

	describe('deleteSingle', () => {
		it('should delete single trace successfully', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';

			mockRepository.deleteTrace.mockResolvedValue();

			await useCase.deleteSingle(environmentId, traceId);

			expect(mockRepository.deleteTrace).toHaveBeenCalledWith(
				environmentId,
				traceId
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Deleting single trace',
				{ environmentId, traceId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Successfully deleted trace',
				{ environmentId, traceId }
			);
		});

		it('should log error and rethrow when deletion fails', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const error = new Error('Delete failed');

			mockRepository.deleteTrace.mockRejectedValue(error);

			await expect(
				useCase.deleteSingle(environmentId, traceId)
			).rejects.toThrow('Delete failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Failed to delete trace',
				error
			);
		});
	});

	describe('deleteMultiple', () => {
		it('should delete multiple traces successfully', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const deletedCount = 3;

			mockRepository.deleteTraces.mockResolvedValue(deletedCount);

			const result = await useCase.deleteMultiple(
				environmentId,
				traceIds
			);

			expect(result).toBe(deletedCount);
			expect(mockRepository.deleteTraces).toHaveBeenCalledWith(
				environmentId,
				traceIds
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`DeleteTracesUseCase: Deleting ${traceIds.length} traces`,
				{ environmentId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} traces`,
				{ environmentId }
			);
		});

		it('should handle partial deletion', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const deletedCount = 2;

			mockRepository.deleteTraces.mockResolvedValue(deletedCount);

			const result = await useCase.deleteMultiple(
				environmentId,
				traceIds
			);

			expect(result).toBe(deletedCount);
		});

		it('should log error and rethrow when deletion fails', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1'];
			const error = new Error('Delete failed');

			mockRepository.deleteTraces.mockRejectedValue(error);

			await expect(
				useCase.deleteMultiple(environmentId, traceIds)
			).rejects.toThrow('Delete failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Failed to delete traces',
				error
			);
		});
	});

	describe('deleteAll', () => {
		it('should delete all traces successfully', async () => {
			const environmentId = 'env-123';
			const deletedCount = 42;

			mockRepository.deleteAllTraces.mockResolvedValue(deletedCount);

			const result = await useCase.deleteAll(environmentId);

			expect(result).toBe(deletedCount);
			expect(mockRepository.deleteAllTraces).toHaveBeenCalledWith(
				environmentId
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Deleting all traces',
				{ environmentId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} traces`,
				{ environmentId }
			);
		});

		it('should handle zero deletions', async () => {
			const environmentId = 'env-123';
			mockRepository.deleteAllTraces.mockResolvedValue(0);

			const result = await useCase.deleteAll(environmentId);

			expect(result).toBe(0);
		});

		it('should log error and rethrow when deletion fails', async () => {
			const environmentId = 'env-123';
			const error = new Error('Delete failed');

			mockRepository.deleteAllTraces.mockRejectedValue(error);

			await expect(useCase.deleteAll(environmentId)).rejects.toThrow(
				'Delete failed'
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Failed to delete all traces',
				error
			);
		});
	});

	describe('deleteOldTraces', () => {
		it('should delete old traces successfully', async () => {
			const environmentId = 'env-123';
			const olderThanDays = 30;
			const deletedCount = 15;

			mockRepository.deleteOldTraces.mockResolvedValue(deletedCount);

			const result = await useCase.deleteOldTraces(
				environmentId,
				olderThanDays
			);

			expect(result).toBe(deletedCount);
			expect(mockRepository.deleteOldTraces).toHaveBeenCalledWith(
				environmentId,
				olderThanDays
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`DeleteTracesUseCase: Deleting traces older than ${olderThanDays} days`,
				{ environmentId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`DeleteTracesUseCase: Successfully deleted ${deletedCount} old traces`,
				{ environmentId }
			);
		});

		it('should handle different time ranges', async () => {
			const environmentId = 'env-123';

			for (const days of [7, 14, 30, 90]) {
				mockRepository.deleteOldTraces.mockResolvedValue(10);

				await useCase.deleteOldTraces(environmentId, days);

				expect(mockRepository.deleteOldTraces).toHaveBeenCalledWith(
					environmentId,
					days
				);
			}
		});

		it('should log error and rethrow when deletion fails', async () => {
			const environmentId = 'env-123';
			const olderThanDays = 30;
			const error = new Error('Delete failed');

			mockRepository.deleteOldTraces.mockRejectedValue(error);

			await expect(
				useCase.deleteOldTraces(environmentId, olderThanDays)
			).rejects.toThrow('Delete failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Failed to delete old traces',
				error
			);
		});
	});
});
