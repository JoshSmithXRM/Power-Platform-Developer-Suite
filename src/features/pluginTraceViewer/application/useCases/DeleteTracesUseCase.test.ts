import { DeleteTracesUseCase } from './DeleteTracesUseCase';
import type { IPluginTraceRepository } from './../../domain/repositories/IPluginTraceRepository';
import type { ILogger } from './../../../../infrastructure/logging/ILogger';

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
			trace: jest.fn(),
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

	describe('edge cases - repository failures', () => {
		it('should propagate network timeout error from repository', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const networkError = new Error('Network request timeout');

			mockRepository.deleteTrace.mockRejectedValue(networkError);

			await expect(
				useCase.deleteSingle(environmentId, traceId)
			).rejects.toThrow('Network request timeout');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Failed to delete trace',
				networkError
			);
		});

		it('should handle repository connection loss during multiple delete', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2'];
			const connectionError = new Error('Connection to Dataverse lost');

			mockRepository.deleteTraces.mockRejectedValue(connectionError);

			await expect(
				useCase.deleteMultiple(environmentId, traceIds)
			).rejects.toThrow('Connection to Dataverse lost');
		});

		it('should handle authentication failure during delete all', async () => {
			const environmentId = 'env-123';
			const authError = new Error('Authentication token expired');

			mockRepository.deleteAllTraces.mockRejectedValue(authError);

			await expect(useCase.deleteAll(environmentId)).rejects.toThrow(
				'Authentication token expired'
			);
		});

		it('should handle permission denied error', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const permissionError = new Error('Insufficient privileges to delete trace');

			mockRepository.deleteTrace.mockRejectedValue(permissionError);

			await expect(
				useCase.deleteSingle(environmentId, traceId)
			).rejects.toThrow('Insufficient privileges to delete trace');
		});

		it('should handle database lock errors during concurrent deletes', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const lockError = new Error('Database locked by another operation');

			mockRepository.deleteTraces.mockRejectedValue(lockError);

			await expect(
				useCase.deleteMultiple(environmentId, traceIds)
			).rejects.toThrow('Database locked by another operation');
		});

		it('should handle trace already deleted by another process', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const notFoundError = new Error('Trace not found');

			mockRepository.deleteTrace.mockRejectedValue(notFoundError);

			await expect(
				useCase.deleteSingle(environmentId, traceId)
			).rejects.toThrow('Trace not found');
		});
	});

	describe('edge cases - concurrent operations', () => {
		it('should handle simultaneous delete operations on same traces', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';

			mockRepository.deleteTrace.mockResolvedValue();

			// Execute same delete operation concurrently
			await Promise.all([
				useCase.deleteSingle(environmentId, traceId),
				useCase.deleteSingle(environmentId, traceId),
				useCase.deleteSingle(environmentId, traceId)
			]);

			expect(mockRepository.deleteTrace).toHaveBeenCalledTimes(3);
		});

		it('should handle race condition between deleteMultiple and deleteSingle', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const singleTraceId = 'trace-1';

			mockRepository.deleteTraces.mockResolvedValue(3);
			mockRepository.deleteTrace.mockResolvedValue();

			// Concurrent operations
			const [multiResult] = await Promise.all([
				useCase.deleteMultiple(environmentId, traceIds),
				useCase.deleteSingle(environmentId, singleTraceId)
			]);

			expect(multiResult).toBe(3);
			expect(mockRepository.deleteTraces).toHaveBeenCalledTimes(1);
			expect(mockRepository.deleteTrace).toHaveBeenCalledTimes(1);
		});

		it('should handle deleteAll while other deletions are in progress', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';

			mockRepository.deleteAllTraces.mockResolvedValue(100);
			mockRepository.deleteTrace.mockResolvedValue();

			// Concurrent delete all and single delete
			const [allResult] = await Promise.all([
				useCase.deleteAll(environmentId),
				useCase.deleteSingle(environmentId, traceId)
			]);

			expect(allResult).toBe(100);
			expect(mockRepository.deleteAllTraces).toHaveBeenCalledTimes(1);
			expect(mockRepository.deleteTrace).toHaveBeenCalledTimes(1);
		});
	});

	describe('edge cases - validation and data integrity', () => {
		it('should handle empty trace IDs array', async () => {
			const environmentId = 'env-123';
			const traceIds: string[] = [];

			mockRepository.deleteTraces.mockResolvedValue(0);

			const result = await useCase.deleteMultiple(environmentId, traceIds);

			expect(result).toBe(0);
			expect(mockRepository.deleteTraces).toHaveBeenCalledWith(
				environmentId,
				traceIds
			);
		});

		it('should handle extremely large trace ID arrays', async () => {
			const environmentId = 'env-123';
			const traceIds = Array.from({ length: 10000 }, (_, i) => `trace-${i}`);

			mockRepository.deleteTraces.mockResolvedValue(10000);

			const result = await useCase.deleteMultiple(environmentId, traceIds);

			expect(result).toBe(10000);
		});

		it('should handle invalid environment ID gracefully', async () => {
			const invalidEnvironmentId = '';
			const traceId = 'trace-1';
			const validationError = new Error('Invalid environment ID');

			mockRepository.deleteTrace.mockRejectedValue(validationError);

			await expect(
				useCase.deleteSingle(invalidEnvironmentId, traceId)
			).rejects.toThrow('Invalid environment ID');
		});

		it('should handle special characters in trace IDs', async () => {
			const environmentId = 'env-123';
			const specialTraceId = 'trace-with-special-chars-!@#$%';

			mockRepository.deleteTrace.mockResolvedValue();

			await useCase.deleteSingle(environmentId, specialTraceId);

			expect(mockRepository.deleteTrace).toHaveBeenCalledWith(
				environmentId,
				specialTraceId
			);
		});

		it('should handle negative days value for deleteOldTraces', async () => {
			const environmentId = 'env-123';
			const negativeDays = -5;
			const validationError = new Error('Days must be positive');

			mockRepository.deleteOldTraces.mockRejectedValue(validationError);

			await expect(
				useCase.deleteOldTraces(environmentId, negativeDays)
			).rejects.toThrow('Days must be positive');
		});

		it('should handle zero days value for deleteOldTraces', async () => {
			const environmentId = 'env-123';
			const zeroDays = 0;

			mockRepository.deleteOldTraces.mockResolvedValue(50);

			const result = await useCase.deleteOldTraces(environmentId, zeroDays);

			expect(result).toBe(50);
			expect(mockRepository.deleteOldTraces).toHaveBeenCalledWith(
				environmentId,
				zeroDays
			);
		});

		it('should handle extremely large days value for deleteOldTraces', async () => {
			const environmentId = 'env-123';
			const veryOldDays = 365000; // 1000 years

			mockRepository.deleteOldTraces.mockResolvedValue(0);

			const result = await useCase.deleteOldTraces(environmentId, veryOldDays);

			expect(result).toBe(0);
		});
	});

	describe('edge cases - partial failures', () => {
		it('should handle partial deletion where some traces cannot be deleted', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3', 'trace-4', 'trace-5'];
			// Only 3 out of 5 deleted
			const partiallyDeleted = 3;

			mockRepository.deleteTraces.mockResolvedValue(partiallyDeleted);

			const result = await useCase.deleteMultiple(environmentId, traceIds);

			expect(result).toBe(partiallyDeleted);
			expect(result).toBeLessThan(traceIds.length);
		});

		it('should handle deleteAll with no traces to delete', async () => {
			const environmentId = 'env-123';

			mockRepository.deleteAllTraces.mockResolvedValue(0);

			const result = await useCase.deleteAll(environmentId);

			expect(result).toBe(0);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'DeleteTracesUseCase: Successfully deleted 0 traces',
				{ environmentId }
			);
		});

		it('should handle deleteMultiple when all traces already deleted', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2'];

			mockRepository.deleteTraces.mockResolvedValue(0);

			const result = await useCase.deleteMultiple(environmentId, traceIds);

			expect(result).toBe(0);
		});
	});
});
