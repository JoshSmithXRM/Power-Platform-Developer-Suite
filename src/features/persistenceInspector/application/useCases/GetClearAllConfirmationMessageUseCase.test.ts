import { GetClearAllConfirmationMessageUseCase } from './GetClearAllConfirmationMessageUseCase';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { StorageCollection } from '../../domain/entities/StorageCollection';
import { StorageEntry } from '../../domain/entities/StorageEntry';
import { StorageType } from '../../domain/valueObjects/StorageType';

describe('GetClearAllConfirmationMessageUseCase', () => {
	let useCase: GetClearAllConfirmationMessageUseCase;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;

	beforeEach(() => {
		mockStorageInspectionService = {
			inspectStorage: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		useCase = new GetClearAllConfirmationMessageUseCase(
			mockStorageInspectionService,
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

	describe('message generation with no protected entries', () => {
		it('should generate confirmation message for single clearable entry', async () => {
			// Arrange
			const entries = [createGlobalEntry('cache-key', { data: 'value' })];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 1 entries. 0 protected entries will be preserved. This action cannot be undone.');
		});

		it('should generate confirmation message for multiple clearable entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', { data: 'value1' }),
				createGlobalEntry('key2', { data: 'value2' }),
				createGlobalEntry('key3', { data: 'value3' })
			];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 3 entries. 0 protected entries will be preserved. This action cannot be undone.');
		});

		it('should count all storage types as clearable entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createWorkspaceEntry('workspace1', {}),
				createSecretEntry('secret1')
			];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 3 entries. 0 protected entries will be preserved. This action cannot be undone.');
		});
	});

	describe('message generation with protected entries', () => {
		it('should generate confirmation message with single protected entry', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', { environments: [] }),
				createGlobalEntry('clearable', {})
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 1 entries. 1 protected entries will be preserved. This action cannot be undone.');
		});

		it('should generate confirmation message with multiple protected entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('power-platform-dev-suite-settings', {}),
				createGlobalEntry('clearable1', {}),
				createGlobalEntry('clearable2', {})
			];
			const collection = createCollection(entries, [
				'power-platform-dev-suite-environments',
				'power-platform-dev-suite-settings'
			]);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 3 entries. 1 protected entries will be preserved. This action cannot be undone.');
		});

		it('should accurately count mixed clearable and protected entries', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('clearable1', {}),
				createGlobalEntry('clearable2', {}),
				createGlobalEntry('clearable3', {}),
				createSecretEntry('clearable-secret')
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 4 entries. 1 protected entries will be preserved. This action cannot be undone.');
		});
	});

	describe('edge cases', () => {
		it('should generate message for all protected entries scenario', async () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {})
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 0 entries. 1 protected entries will be preserved. This action cannot be undone.');
		});

		it('should generate message for empty storage', async () => {
			// Arrange
			const collection = createCollection([], []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 0 entries. 0 protected entries will be preserved. This action cannot be undone.');
		});

		it('should handle large numbers of entries', async () => {
			// Arrange
			const entries = Array.from({ length: 100 }, (_, i) =>
				createGlobalEntry(`key${i}`, { data: `value${i}` })
			);
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toBe('This will clear 100 entries. 0 protected entries will be preserved. This action cannot be undone.');
		});
	});

	describe('use case orchestration', () => {
		it('should call storage inspection service', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			await useCase.execute();

			// Assert
			expect(mockStorageInspectionService.inspectStorage).toHaveBeenCalledTimes(1);
		});

		it('should orchestrate domain entities without business logic', async () => {
			// Arrange - Use case only coordinates, domain computes
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', {}),
				createGlobalEntry('clearable', {})
			];
			const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert - Message generated by domain, use case just returns it
			expect(mockStorageInspectionService.inspectStorage).toHaveBeenCalledTimes(1);
			expect(message).toContain('1 entries');
			expect(message).toContain('1 protected entries');
		});
	});

	describe('error handling', () => {
		it('should propagate error when storage inspection fails', async () => {
			// Arrange
			mockStorageInspectionService.inspectStorage.mockRejectedValue(
				new Error('Inspection failed')
			);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Inspection failed');
		});

		it('should propagate error when validation fails', async () => {
			// Arrange
			const mockCollection = {
				validateClearAllOperation: jest.fn().mockImplementation(() => {
					throw new Error('Validation error');
				})
			} as unknown as StorageCollection;

			mockStorageInspectionService.inspectStorage.mockResolvedValue(mockCollection);

			// Act & Assert
			await expect(useCase.execute()).rejects.toThrow('Validation error');
		});
	});

	describe('message format consistency', () => {
		it('should include count of entries to clear', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toMatch(/This will clear \d+ entries/);
		});

		it('should include count of protected entries', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toMatch(/\d+ protected entries will be preserved/);
		});

		it('should include warning about irreversible action', async () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			mockStorageInspectionService.inspectStorage.mockResolvedValue(collection);

			// Act
			const message = await useCase.execute();

			// Assert
			expect(message).toContain('This action cannot be undone');
		});
	});
});
