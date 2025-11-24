import { StorageInspectionService } from './StorageInspectionService';
import { StorageCollection } from '../entities/StorageCollection';
import type { IStorageReader } from '../interfaces/IStorageReader';
import type { IProtectedKeyProvider } from '../interfaces/IProtectedKeyProvider';

describe('StorageInspectionService', () => {
	let service: StorageInspectionService;
	let mockStorageReader: jest.Mocked<IStorageReader>;
	let mockProtectedKeyProvider: jest.Mocked<IProtectedKeyProvider>;

	beforeEach(() => {
		mockStorageReader = {
			readAllGlobalState: jest.fn(),
			readAllWorkspaceState: jest.fn(),
			readAllSecretKeys: jest.fn(),
			revealSecret: jest.fn()
		} as jest.Mocked<IStorageReader>;

		mockProtectedKeyProvider = {
			getProtectedKeyPatterns: jest.fn()
		} as jest.Mocked<IProtectedKeyProvider>;

		service = new StorageInspectionService(mockStorageReader, mockProtectedKeyProvider);
	});

	describe('inspectStorage', () => {
		describe('multi-storage coordination', () => {
			it('should combine entries from global state, workspace state, and secrets', async () => {
				// Arrange
				const globalState = new Map<string, unknown>([
					['global_key1', 'value1'],
					['global_key2', 'value2']
				]);

				const workspaceState = new Map<string, unknown>([
					['workspace_key1', 'ws_value1']
				]);

				const secretKeys = ['secret_key1', 'secret_key2'];

				mockStorageReader.readAllGlobalState.mockResolvedValue(globalState);
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(workspaceState);
				mockStorageReader.readAllSecretKeys.mockResolvedValue(secretKeys);
				mockStorageReader.revealSecret.mockResolvedValue('actual_secret');
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result).toBeInstanceOf(StorageCollection);
				expect(result.getAllEntries()).toHaveLength(5);
				expect(mockStorageReader.readAllGlobalState).toHaveBeenCalledTimes(1);
				expect(mockStorageReader.readAllWorkspaceState).toHaveBeenCalledTimes(1);
				expect(mockStorageReader.readAllSecretKeys).toHaveBeenCalledTimes(1);
			});

			it('should call revealSecret for each secret key to verify existence', async () => {
				// Arrange
				const globalState = new Map<string, unknown>();
				const workspaceState = new Map<string, unknown>();
				const secretKeys = ['secret1', 'secret2', 'secret3'];

				mockStorageReader.readAllGlobalState.mockResolvedValue(globalState);
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(workspaceState);
				mockStorageReader.readAllSecretKeys.mockResolvedValue(secretKeys);
				mockStorageReader.revealSecret.mockResolvedValue('actual_secret');
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				await service.inspectStorage();

				// Assert
				expect(mockStorageReader.revealSecret).toHaveBeenCalledTimes(3);
				expect(mockStorageReader.revealSecret).toHaveBeenCalledWith('secret1');
				expect(mockStorageReader.revealSecret).toHaveBeenCalledWith('secret2');
				expect(mockStorageReader.revealSecret).toHaveBeenCalledWith('secret3');
			});
		});

		describe('global state entries', () => {
			it('should create entries with global storage type', async () => {
				// Arrange
				const globalState = new Map<string, unknown>([
					['key1', 'value1'],
					['key2', { nested: 'object' }]
				]);

				mockStorageReader.readAllGlobalState.mockResolvedValue(globalState);
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				const entries = result.getAllEntries();
				expect(entries).toHaveLength(2);
				expect(entries[0]!.storageType).toBe('global');
				expect(entries[1]!.storageType).toBe('global');
			});

			it('should handle empty global state', async () => {
				// Arrange
				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result.getAllEntries()).toHaveLength(0);
			});
		});

		describe('workspace state entries', () => {
			it('should create entries with workspace storage type', async () => {
				// Arrange
				const workspaceState = new Map<string, unknown>([
					['ws_key1', 'ws_value1'],
					['ws_key2', 123]
				]);

				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(workspaceState);
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				const entries = result.getAllEntries();
				expect(entries).toHaveLength(2);
				expect(entries[0]!.storageType).toBe('workspace');
				expect(entries[1]!.storageType).toBe('workspace');
			});

			it('should handle empty workspace state', async () => {
				// Arrange
				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result.getAllEntries()).toHaveLength(0);
			});
		});

		describe('secret entries', () => {
			it('should create entries with secret storage type and hidden values', async () => {
				// Arrange
				const secretKeys = ['secret1', 'secret2'];

				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue(secretKeys);
				mockStorageReader.revealSecret.mockResolvedValue('actual_secret_value');
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				const entries = result.getAllEntries();
				expect(entries).toHaveLength(2);
				expect(entries[0]!.storageType).toBe('secret');
				expect(entries[0]!.value).toBe('***');
				expect(entries[1]!.storageType).toBe('secret');
				expect(entries[1]!.value).toBe('***');
			});

			it('should filter out non-existent secrets (undefined values)', async () => {
				// Arrange
				const secretKeys = ['secret1', 'deleted_secret', 'secret3'];

				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue(secretKeys);
				mockStorageReader.revealSecret
					.mockResolvedValueOnce('actual_secret1')
					.mockResolvedValueOnce(undefined) // deleted secret
					.mockResolvedValueOnce('actual_secret3');
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				const entries = result.getAllEntries();
				expect(entries).toHaveLength(2);
				expect(entries[0]!.key).toBe('secret1');
				expect(entries[1]!.key).toBe('secret3');
			});

			it('should handle empty secret keys', async () => {
				// Arrange
				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result.getAllEntries()).toHaveLength(0);
			});
		});

		describe('protected key patterns', () => {
			it('should pass protected patterns to StorageCollection', async () => {
				// Arrange
				const protectedPatterns = ['*token*', '*password*', '*secret*'];

				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map([['key1', 'value1']]));
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue(protectedPatterns);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(mockProtectedKeyProvider.getProtectedKeyPatterns).toHaveBeenCalledTimes(1);
				expect(result).toBeInstanceOf(StorageCollection);
			});

			it('should handle empty protected patterns', async () => {
				// Arrange
				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map([['key1', 'value1']]));
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result).toBeInstanceOf(StorageCollection);
			});
		});

		describe('complex value types', () => {
			it('should handle various value types (strings, numbers, objects, arrays)', async () => {
				// Arrange
				const globalState = new Map<string, unknown>([
					['string_key', 'string_value'],
					['number_key', 42],
					['boolean_key', true],
					['object_key', { nested: { deep: 'value' } }],
					['array_key', [1, 2, 3]],
					['null_key', null]
				]);

				mockStorageReader.readAllGlobalState.mockResolvedValue(globalState);
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result.getAllEntries()).toHaveLength(6);
			});
		});

		describe('completely empty storage', () => {
			it('should return empty StorageCollection when all storage is empty', async () => {
				// Arrange
				mockStorageReader.readAllGlobalState.mockResolvedValue(new Map());
				mockStorageReader.readAllWorkspaceState.mockResolvedValue(new Map());
				mockStorageReader.readAllSecretKeys.mockResolvedValue([]);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue([]);

				// Act
				const result = await service.inspectStorage();

				// Assert
				expect(result).toBeInstanceOf(StorageCollection);
				expect(result.getAllEntries()).toHaveLength(0);
			});
		});
	});

	describe('revealSecret', () => {
		describe('secret revelation', () => {
			it('should delegate to storage reader to reveal secret', async () => {
				// Arrange
				mockStorageReader.revealSecret.mockResolvedValue('actual_secret_value');

				// Act
				const result = await service.revealSecret('my_secret');

				// Assert
				expect(result).toBe('actual_secret_value');
				expect(mockStorageReader.revealSecret).toHaveBeenCalledWith('my_secret');
			});

			it('should return undefined when secret does not exist', async () => {
				// Arrange
				mockStorageReader.revealSecret.mockResolvedValue(undefined);

				// Act
				const result = await service.revealSecret('nonexistent_secret');

				// Assert
				expect(result).toBeUndefined();
			});

			it('should handle various secret values', async () => {
				// Arrange
				const testCases = [
					'simple_string',
					'complex!@#$%^&*()_+password',
					'',
					'multi\nline\nsecret'
				];

				for (const expectedValue of testCases) {
					mockStorageReader.revealSecret.mockResolvedValue(expectedValue);

					// Act
					const result = await service.revealSecret('test_key');

					// Assert
					expect(result).toBe(expectedValue);
				}
			});

			it('should call storage reader once per reveal', async () => {
				// Arrange
				mockStorageReader.revealSecret.mockResolvedValue('secret1');

				// Act
				await service.revealSecret('key1');
				await service.revealSecret('key2');
				await service.revealSecret('key3');

				// Assert
				expect(mockStorageReader.revealSecret).toHaveBeenCalledTimes(3);
			});
		});
	});
});
