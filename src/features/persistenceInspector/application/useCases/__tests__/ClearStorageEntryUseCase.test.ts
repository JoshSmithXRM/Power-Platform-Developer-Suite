import { StorageClearingService } from '../../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from '../../../domain/entities/StorageCollection';
import { StorageEntry } from '../../../domain/entities/StorageEntry';
import { ClearStorageEntryUseCase } from '../ClearStorageEntryUseCase';

describe('ClearStorageEntryUseCase', () => {
	let useCase: ClearStorageEntryUseCase;
	let mockStorageClearingService: jest.Mocked<StorageClearingService>;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

	beforeEach(() => {
		mockStorageClearingService = {
			clearEntry: jest.fn()
		} as unknown as jest.Mocked<StorageClearingService>;

		mockStorageInspectionService = {
			inspectStorage: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new ClearStorageEntryUseCase(
			mockStorageClearingService,
			mockStorageInspectionService,
			mockEventPublisher,
			new NullLogger()
		);
	});

	function createMockEntry(key: string, type: 'global' | 'secret'): StorageEntry {
		return StorageEntry.create(key, 'test-value', type);
	}

	function createMockCollection(entries: StorageEntry[]): StorageCollection {
		return StorageCollection.create(entries, []);
	}

	describe('successful entry clearing', () => {
		it('should clear global state entry and publish event', async () => {
			const mockEntry = createMockEntry('testKey', 'global');
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearEntry.mockResolvedValue(undefined);

			await useCase.execute('testKey');

			expect(mockStorageClearingService.clearEntry).toHaveBeenCalledTimes(1);
			expect(mockStorageClearingService.clearEntry).toHaveBeenCalledWith(
				mockEntry,
				mockCollection
			);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should clear secret entry and publish event', async () => {
			const mockEntry = createMockEntry('secretKey', 'secret');
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearEntry.mockResolvedValue(undefined);

			await useCase.execute('secretKey');

			expect(mockStorageClearingService.clearEntry).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});
	});

	describe('error handling', () => {
		it('should throw error when entry not found', async () => {
			const mockCollection = createMockCollection([]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			await expect(useCase.execute('nonexistent')).rejects.toThrow('Entry not found: nonexistent');
			expect(mockStorageClearingService.clearEntry).not.toHaveBeenCalled();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when clearing fails', async () => {
			const mockEntry = createMockEntry('testKey', 'global');
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearEntry.mockRejectedValue(new Error('Clear failed'));

			await expect(useCase.execute('testKey')).rejects.toThrow('Clear failed');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when inspection fails', async () => {
			mockStorageInspectionService.inspectStorage.mockRejectedValue(new Error('Inspection failed'));

			await expect(useCase.execute('testKey')).rejects.toThrow('Inspection failed');
			expect(mockStorageClearingService.clearEntry).not.toHaveBeenCalled();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});
});
