import { StorageInspectionService } from './../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from './../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from './../../domain/entities/StorageCollection';
import { StorageEntry } from './../../domain/entities/StorageEntry';
import { InspectStorageUseCase } from './InspectStorageUseCase';

describe('InspectStorageUseCase', () => {
	let useCase: InspectStorageUseCase;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

	beforeEach(() => {
		mockStorageInspectionService = {
			inspectStorage: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new InspectStorageUseCase(
			mockStorageInspectionService,
			mockEventPublisher,
			new NullLogger()
		);
	});

	function createMockStorageEntry(key: string, value: unknown, type: 'global' | 'secret'): StorageEntry {
		return StorageEntry.create(
			key,
			value,
			type
		);
	}

	function createMockStorageCollection(entries: StorageEntry[]): StorageCollection {
		return StorageCollection.create(entries, []);
	}

	describe('successful inspection', () => {
		it('should inspect storage and return view model with entries', async () => {
			const mockEntries = [
				createMockStorageEntry('key1', 'value1', 'global'),
				createMockStorageEntry('key2', 'secret-value', 'secret')
			];
			const mockCollection = createMockStorageCollection(mockEntries);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			const result = await useCase.execute();

			expect(result).toBeDefined();
			expect(result.globalStateEntries).toBeDefined();
			expect(result.secretEntries).toBeDefined();
			expect(mockStorageInspectionService.inspectStorage).toHaveBeenCalledTimes(1);
		});

		it('should publish domain event with entry counts', async () => {
			const mockEntries = [
				createMockStorageEntry('global1', 'value1', 'global'),
				createMockStorageEntry('global2', 'value2', 'global'),
				createMockStorageEntry('secret1', 'secret', 'secret')
			];
			const mockCollection = createMockStorageCollection(mockEntries);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			await useCase.execute();

			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
			const publishedEvent = mockEventPublisher.publish.mock.calls[0]?.[0];
			expect(publishedEvent).toBeDefined();
		});

		it('should handle empty storage', async () => {
			const mockCollection = createMockStorageCollection([]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			const result = await useCase.execute();

			expect(result.globalStateEntries).toEqual([]);
			expect(result.secretEntries).toEqual([]);
		});
	});

	describe('error handling', () => {
		it('should throw error when storage inspection fails', async () => {
			const error = new Error('Storage access denied');
			mockStorageInspectionService.inspectStorage.mockRejectedValue(error);

			await expect(useCase.execute()).rejects.toThrow('Storage access denied');
		});

		it('should not publish event when inspection fails', async () => {
			const error = new Error('Storage access denied');
			mockStorageInspectionService.inspectStorage.mockRejectedValue(error);

			try {
				await useCase.execute();
			} catch {
				// Expected error
			}

			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});
});
