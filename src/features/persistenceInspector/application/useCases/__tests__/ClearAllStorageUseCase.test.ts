import { ClearAllStorageUseCase } from '../ClearAllStorageUseCase';
import { StorageClearingService } from '../../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from '../../../domain/entities/StorageCollection';
import { StorageEntry } from '../../../domain/entities/StorageEntry';
import { StorageType } from '../../../domain/valueObjects/StorageType';
import { ClearAllResult } from '../../../domain/results/ClearAllResult';
import { InvalidOperationError } from '../../../domain/errors/InvalidOperationError';

describe('ClearAllStorageUseCase', () => {
	let useCase: ClearAllStorageUseCase;
	let mockStorageClearingService: jest.Mocked<StorageClearingService>;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

	beforeEach(() => {
		mockStorageClearingService = {
			clearEntry: jest.fn(),
			clearProperty: jest.fn(),
			clearAll: jest.fn()
		} as unknown as jest.Mocked<StorageClearingService>;

		mockStorageInspectionService = {
			inspectStorage: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new ClearAllStorageUseCase(
			mockStorageClearingService,
			mockStorageInspectionService,
			mockEventPublisher,
			new NullLogger()
		);
	});

	function createGlobalEntry(key: string, value: unknown): StorageEntry {
		return StorageEntry.create(key, value, StorageType.GLOBAL);
	}

	function createWorkspaceEntry(key: string, value: unknown): StorageEntry {
		return StorageEntry.create(key, value, StorageType.WORKSPACE);
	}

	function createSecretEntry(key: string): StorageEntry {
		return StorageEntry.create(key, '***', StorageType.SECRET);
	}

	function createCollection(entries: StorageEntry[], protectedPatterns: string[] = []): StorageCollection {
		return StorageCollection.create(entries, protectedPatterns);
	}

	function createClearAllResult(clearedGlobal: number, clearedSecret: number, errors: Array<{ key: string; error: string }> = []): ClearAllResult {
		return new ClearAllResult(clearedGlobal, clearedSecret, errors);
	}

	describe('successful clear all flow', () => {
		it('should call storage clearing service with correct parameters', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', { data: 'value1' }),
				createGlobalEntry('key2', { data: 'value2' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			await useCase.execute();

			// Assert
			expect(mockStorageClearingService.clearAll).toHaveBeenCalledTimes(1);
			expect(mockStorageClearingService.clearAll).toHaveBeenCalledWith(collection);
		});

		it('should publish StorageClearedAll event', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {})
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			await useCase.execute();

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'StorageClearedAll',
					clearedCount: 2,
					protectedCount: 0
				})
			);
		});

		it('should return result with correct counts', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createGlobalEntry('global2', {}),
				createSecretEntry('secret1')
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 1);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(2);
			expect(viewModel.clearedSecretKeys).toBe(1);
			expect(viewModel.totalCleared).toBe(3);
		});
	});

	describe('validation', () => {
		it('should validate clear all operation via StorageCollection', async () => {
			// Arrange
			const entries = [createGlobalEntry('clearable', {})];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(1, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			await useCase.execute();

			// Assert
			expect(mockStorageInspectionService.inspectStorage).toHaveBeenCalledTimes(1);
		});

		it('should prevent clearing if all entries protected', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', { environments: [] })
			];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(
				new InvalidOperationError('No clearable entries found')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow(InvalidOperationError);
			await expect(useCase.execute()).rejects.toThrow('No clearable entries found');
		});

		it('should not publish event when clearing fails validation', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {})
			];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(
				new InvalidOperationError('No clearable entries found')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});

	describe('partial clearing', () => {
		it('should clear only clearable entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('clearable1', {}),
				createGlobalEntry('clearable2', {})
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should skip protected entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('clearable', {})
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);
			const result = createClearAllResult(1, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			await useCase.execute();

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					clearedCount: 1,
					protectedCount: 1
				})
			);
		});

		it('should return accurate counts for mixed entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('global1', {}),
				createGlobalEntry('global2', {}),
				createSecretEntry('secret1')
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);
			const result = createClearAllResult(2, 1);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(2);
			expect(viewModel.clearedSecretKeys).toBe(1);
			expect(viewModel.totalCleared).toBe(3);
		});
	});

	describe('error handling', () => {
		it('should throw error when clearing fails', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(new Error('Clear failed'));

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Clear failed');
		});

		it('should not publish event when clearing fails', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(new Error('Clear failed'));

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when inspection fails', async () => {
			// Arrange
			mockStorageInspectionService.inspectStorage.mockRejectedValue(
				new Error('Inspection failed')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Inspection failed');
			expect(mockStorageClearingService.clearAll).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle empty storage', async () => {
			// Arrange
			const collection = createCollection([], []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(
				new InvalidOperationError('No clearable entries found')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow(InvalidOperationError);
		});

		it('should handle all entries protected', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', { data: 'protected' })
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(
				new InvalidOperationError('No clearable entries found')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should handle no entries protected', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {}),
				createGlobalEntry('key3', {})
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(3, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(3);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					clearedCount: 3,
					protectedCount: 0
				})
			);
		});

		it('should handle result with errors', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {})
			];
			const collection = createCollection(entries, []);
			const errors = [{ key: 'key2', error: 'Failed to clear' }];
			const result = createClearAllResult(1, 0, errors);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(1);
		});

		it('should handle mixed storage types', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createWorkspaceEntry('workspace1', {}),
				createSecretEntry('secret1')
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 1); // 1 global + 1 workspace = 2 global keys

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(3);
		});
	});

	describe('business logic validation', () => {
		it('should enforce protection preventing accidental deletion of critical data', async () => {
			// Arrange - Critical: Environments configuration must never be cleared
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {
					environments: [{ name: 'Production', url: 'https://prod.crm.dynamics.com' }]
				}),
				createGlobalEntry('cache-data', { cached: 'value' })
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);
			const result = createClearAllResult(1, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert - Only cache data cleared, environments protected
			expect(viewModel.totalCleared).toBe(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					clearedCount: 1,
					protectedCount: 1
				})
			);
		});

		it('should provide nuclear option for troubleshooting while maintaining safety', async () => {
			// Arrange - Clear all for troubleshooting, but protect critical data
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('cache-data', {}),
				createWorkspaceEntry('temp-state', {}),
				createSecretEntry('password-key')
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);
			const result = createClearAllResult(2, 1); // cache + workspace = 2, secret = 1

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert - Everything except protected environments cleared
			expect(viewModel.totalCleared).toBe(3);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					clearedCount: 3,
					protectedCount: 1
				})
			);
		});
	});
});
