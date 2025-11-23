import { ClearAllStorageUseCase } from './ClearAllStorageUseCase';
import { StorageClearingService } from './../../domain/services/StorageClearingService';
import { StorageInspectionService } from './../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from './../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from './../../domain/entities/StorageCollection';
import { StorageEntry } from './../../domain/entities/StorageEntry';
import { StorageType } from './../../domain/valueObjects/StorageType';
import { ClearAllResult } from './../../domain/results/ClearAllResult';
import { InvalidOperationError } from './../../domain/errors/InvalidOperationError';

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

	describe('edge cases - service failures', () => {
		it('should propagate error when inspection service fails', async () => {
			// Arrange
			const inspectionError = new Error('Failed to access storage API');
			mockStorageInspectionService.inspectStorage.mockRejectedValue(inspectionError);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Failed to access storage API');
			expect(mockStorageClearingService.clearAll).not.toHaveBeenCalled();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should propagate error when clearing service fails', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);
			const clearError = new Error('Storage write failed');

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(clearError);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Storage write failed');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should handle storage API timeout during inspection', async () => {
			// Arrange
			const timeoutError = new Error('Storage API timeout');
			mockStorageInspectionService.inspectStorage.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Storage API timeout');
		});

		it('should handle storage API permission denied', async () => {
			// Arrange
			const permissionError = new Error('Access denied to storage');
			mockStorageInspectionService.inspectStorage.mockRejectedValue(permissionError);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Access denied to storage');
		});

		it('should handle clearing service corruption detection', async () => {
			// Arrange
			const entries = [createGlobalEntry('corrupted-key', { data: 'corrupted' })];
			const collection = createCollection(entries, []);
			const corruptionError = new Error('Storage corruption detected');

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockRejectedValue(corruptionError);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Storage corruption detected');
		});
	});

	describe('edge cases - concurrent operations', () => {
		it('should handle concurrent clear all operations', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {})
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act - Execute concurrently
			const [result1, result2] = await Promise.all([
				useCase.execute(),
				useCase.execute()
			]);

			// Assert
			expect(result1.totalCleared).toBe(2);
			expect(result2.totalCleared).toBe(2);
			expect(mockStorageClearingService.clearAll).toHaveBeenCalledTimes(2);
		});

		it('should handle clear all while storage is being modified', async () => {
			// Arrange - Simulate race condition
			let callCount = 0;
			const entries1 = [createGlobalEntry('key1', {}), createGlobalEntry('key2', {})];
			const entries2 = [createGlobalEntry('key1', {}), createGlobalEntry('key2', {}), createGlobalEntry('key3', {})];

			mockStorageInspectionService.inspectStorage.mockImplementation(async () => {
				callCount++;
				return callCount === 1 ? createCollection(entries1, []) : createCollection(entries2, []);
			});
			mockStorageClearingService.clearAll.mockResolvedValue(createClearAllResult(2, 0));

			// Act
			const viewModel = await useCase.execute();

			// Assert - Should work with snapshot from inspection
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should handle storage being cleared by external process during operation', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			// Clearing service returns 0 because already cleared
			mockStorageClearingService.clearAll.mockResolvedValue(createClearAllResult(0, 0));

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(0);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					clearedCount: 0,
					protectedCount: 0
				})
			);
		});
	});

	describe('edge cases - data integrity and validation', () => {
		it('should handle storage with duplicate keys', async () => {
			// Arrange - Duplicate keys should be handled by collection
			const entries = [
				createGlobalEntry('duplicate-key', { value: 1 }),
				createGlobalEntry('duplicate-key', { value: 2 })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should handle storage entries with null values', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('null-key', null),
				createGlobalEntry('normal-key', { data: 'value' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should handle storage entries with undefined values', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('undefined-key', undefined),
				createGlobalEntry('normal-key', { data: 'value' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should handle storage with extremely large entries', async () => {
			// Arrange
			const largeData = { data: 'x'.repeat(1000000) }; // 1MB string
			const entries = [
				createGlobalEntry('large-key', largeData),
				createGlobalEntry('normal-key', { data: 'small' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});

		it('should handle storage with special characters in keys', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key-with-special-!@#$%^&*()', { data: 'value' }),
				createGlobalEntry('key with spaces', { data: 'value' }),
				createGlobalEntry('key.with.dots', { data: 'value' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(3, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(3);
		});

		it('should handle storage with unicode characters in keys and values', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('emoji-key-😀-🎉', { data: '日本語データ' }),
				createGlobalEntry('unicode-ñ-ü-é', { data: 'データ' })
			];
			const collection = createCollection(entries, []);
			const result = createClearAllResult(2, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
		});
	});

	describe('edge cases - partial failures and error states', () => {
		it('should handle partial clearing with mixed success and failures', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {}),
				createGlobalEntry('key3', {})
			];
			const collection = createCollection(entries, []);
			const errors = [
				{ key: 'key2', error: 'Failed to clear key2' }
			];
			const result = createClearAllResult(2, 0, errors);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(2);
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(1);
			expect(viewModel.errors[0]).toEqual({ key: 'key2', error: 'Failed to clear key2' });
		});

		it('should handle all clearable entries failing to clear', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {})
			];
			const collection = createCollection(entries, []);
			const errors = [
				{ key: 'key1', error: 'Clear failed' },
				{ key: 'key2', error: 'Clear failed' }
			];
			const result = createClearAllResult(0, 0, errors);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(0);
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(2);
		});

		it('should handle very large number of storage entries', async () => {
			// Arrange - 10,000 entries
			const entries = Array.from({ length: 10000 }, (_, i) =>
				createGlobalEntry(`key-${i}`, { index: i })
			);
			const collection = createCollection(entries, []);
			const result = createClearAllResult(10000, 0);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);
			mockStorageClearingService.clearAll.mockResolvedValue(result);

			// Act
			const viewModel = await useCase.execute();

			// Assert
			expect(viewModel.totalCleared).toBe(10000);
		});
	});
});
