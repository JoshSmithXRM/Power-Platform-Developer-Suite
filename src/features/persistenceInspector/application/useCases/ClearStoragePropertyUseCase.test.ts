import { StorageClearingService } from './../../domain/services/StorageClearingService';
import { StorageInspectionService } from './../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from './../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from './../../domain/entities/StorageCollection';
import { StorageEntry } from './../../domain/entities/StorageEntry';
import { PropertyPath } from './../../domain/valueObjects/PropertyPath';
import { ClearStoragePropertyUseCase } from './ClearStoragePropertyUseCase';

describe('ClearStoragePropertyUseCase', () => {
	let useCase: ClearStoragePropertyUseCase;
	let mockStorageClearingService: jest.Mocked<StorageClearingService>;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

	beforeEach(() => {
		mockStorageClearingService = {
			clearProperty: jest.fn()
		} as unknown as jest.Mocked<StorageClearingService>;

		mockStorageInspectionService = {
			inspectStorage: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new ClearStoragePropertyUseCase(
			mockStorageClearingService,
			mockStorageInspectionService,
			mockEventPublisher,
			new NullLogger()
		);
	});

	function createMockEntry(key: string, value: unknown): StorageEntry {
		return StorageEntry.create(key, value, 'global');
	}

	function createMockCollection(entries: StorageEntry[]): StorageCollection {
		return StorageCollection.create(entries, []);
	}

	describe('successful property clearing', () => {
		it('should clear property and publish event', async () => {
			const mockEntry = createMockEntry('testKey', { prop1: 'value1', prop2: 'value2' });
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearProperty.mockResolvedValue(undefined);

			await useCase.execute('testKey', 'prop1');

			expect(mockStorageClearingService.clearProperty).toHaveBeenCalledTimes(1);
			expect(mockStorageClearingService.clearProperty).toHaveBeenCalledWith(
				mockEntry,
				expect.any(PropertyPath),
				mockCollection
			);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should handle nested property paths', async () => {
			const mockEntry = createMockEntry('testKey', {
				settings: {
					dataverseUrl: 'https://test.crm.dynamics.com',
					tenantId: '12345'
				}
			});
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearProperty.mockResolvedValue(undefined);

			await useCase.execute('testKey', 'settings.dataverseUrl');

			expect(mockStorageClearingService.clearProperty).toHaveBeenCalledTimes(1);
			const [, pathArg] = mockStorageClearingService.clearProperty.mock.calls[0]!;
			expect(pathArg.toString()).toBe('settings.dataverseUrl');
		});

		it('should handle array index paths', async () => {
			const mockEntry = createMockEntry('testKey', [
				{ name: 'item1' },
				{ name: 'item2' }
			]);
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearProperty.mockResolvedValue(undefined);

			await useCase.execute('testKey', '[0].name');

			expect(mockStorageClearingService.clearProperty).toHaveBeenCalledTimes(1);
		});
	});

	describe('error handling', () => {
		it('should throw error when entry not found', async () => {
			const mockCollection = createMockCollection([]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			await expect(useCase.execute('nonexistent', 'prop')).rejects.toThrow('Entry not found: nonexistent');
		});

		it('should not publish event when clearing fails', async () => {
			const mockEntry = createMockEntry('testKey', { prop: 'value' });
			const mockCollection = createMockCollection([mockEntry]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);
			mockStorageClearingService.clearProperty.mockRejectedValue(new Error('Clear failed'));

			await expect(useCase.execute('testKey', 'prop')).rejects.toThrow('Clear failed');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when inspection fails', async () => {
			mockStorageInspectionService.inspectStorage.mockRejectedValue(new Error('Inspection failed'));

			await expect(useCase.execute('testKey', 'prop')).rejects.toThrow('Inspection failed');
			expect(mockStorageClearingService.clearProperty).not.toHaveBeenCalled();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});
});
