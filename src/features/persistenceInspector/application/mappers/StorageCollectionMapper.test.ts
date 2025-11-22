import { StorageCollectionMapper } from './StorageCollectionMapper';
import { StorageCollection } from '../../domain/entities/StorageCollection';
import { StorageEntry } from '../../domain/entities/StorageEntry';
import { StorageType } from '../../domain/valueObjects/StorageType';

describe('StorageCollectionMapper', () => {
	let mapper: StorageCollectionMapper;

	beforeEach(() => {
		mapper = StorageCollectionMapper.create();
	});

	// Test data factories
	function createGlobalEntry(key: string, value: unknown): StorageEntry {
		return StorageEntry.create(key, value, StorageType.GLOBAL);
	}

	function createWorkspaceEntry(key: string, value: unknown): StorageEntry {
		return StorageEntry.create(key, value, StorageType.WORKSPACE);
	}

	function createSecretEntry(key: string): StorageEntry {
		return StorageEntry.create(key, '***', StorageType.SECRET);
	}

	function createCollection(entries: StorageEntry[]): StorageCollection {
		return StorageCollection.create(entries, [
			'power-platform-dev-suite-environments',
			'power-platform-dev-suite-secret-*',
			'power-platform-dev-suite-password-*'
		]);
	}

	describe('toViewModel - basic mapping', () => {
		it('should map totalEntries', () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', 'value1'),
				createWorkspaceEntry('key2', 'value2'),
				createSecretEntry('key3')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.totalEntries).toBe(3);
		});

		it('should map totalSize', () => {
			// Arrange
			const entries = [
				createGlobalEntry('key', 'value')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.totalSize).toBeGreaterThan(0);
		});

		it('should map empty collection', () => {
			// Arrange
			const collection = createCollection([]);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.totalEntries).toBe(0);
			expect(result.totalSize).toBe(0);
			expect(result.globalStateEntries).toEqual([]);
			expect(result.workspaceStateEntries).toEqual([]);
			expect(result.secretEntries).toEqual([]);
		});
	});

	describe('toViewModel - entry segregation by type', () => {
		it('should map globalStateEntries', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', 'value1'),
				createGlobalEntry('global2', 'value2'),
				createWorkspaceEntry('workspace1', 'value3')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries).toHaveLength(2);
			expect(result.globalStateEntries[0]?.key).toBe('global1');
			expect(result.globalStateEntries[1]?.key).toBe('global2');
		});

		it('should map workspaceStateEntries', () => {
			// Arrange
			const entries = [
				createWorkspaceEntry('workspace1', { expanded: true }),
				createWorkspaceEntry('workspace2', { expanded: false }),
				createGlobalEntry('global1', 'value')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.workspaceStateEntries).toHaveLength(2);
			expect(result.workspaceStateEntries[0]?.key).toBe('workspace1');
			expect(result.workspaceStateEntries[1]?.key).toBe('workspace2');
		});

		it('should map secretEntries', () => {
			// Arrange
			const entries = [
				createSecretEntry('password1'),
				createSecretEntry('password2'),
				createGlobalEntry('global1', 'value')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.secretEntries).toHaveLength(2);
			expect(result.secretEntries[0]?.key).toBe('password1');
			expect(result.secretEntries[1]?.key).toBe('password2');
		});

		it('should handle collection with only global entries', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', 'value1'),
				createGlobalEntry('global2', 'value2')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries).toHaveLength(2);
			expect(result.workspaceStateEntries).toHaveLength(0);
			expect(result.secretEntries).toHaveLength(0);
		});

		it('should handle collection with only workspace entries', () => {
			// Arrange
			const entries = [
				createWorkspaceEntry('workspace1', 'value1'),
				createWorkspaceEntry('workspace2', 'value2')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries).toHaveLength(0);
			expect(result.workspaceStateEntries).toHaveLength(2);
			expect(result.secretEntries).toHaveLength(0);
		});

		it('should handle collection with only secret entries', () => {
			// Arrange
			const entries = [
				createSecretEntry('secret1'),
				createSecretEntry('secret2')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries).toHaveLength(0);
			expect(result.workspaceStateEntries).toHaveLength(0);
			expect(result.secretEntries).toHaveLength(2);
		});
	});

	describe('toViewModel - entry view models', () => {
		it('should map entry properties correctly', () => {
			// Arrange
			const entries = [
				createGlobalEntry('test-key', { data: 'test' })
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			const entryVm = result.globalStateEntries[0];
			expect(entryVm).toBeDefined();
			expect(entryVm?.key).toBe('test-key');
			expect(entryVm?.value).toEqual({ data: 'test' });
			expect(entryVm?.storageType).toBe('global');
			expect(entryVm?.metadata).toBeDefined();
			expect(entryVm?.isProtected).toBe(false);
			expect(entryVm?.isSecret).toBe(false);
			expect(entryVm?.canBeCleared).toBe(true);
			expect(entryVm?.isExpandable).toBe(true);
		});

		it('should map protected entry flags correctly', () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', [])
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			const entryVm = result.globalStateEntries[0];
			expect(entryVm?.isProtected).toBe(true);
			expect(entryVm?.canBeCleared).toBe(false);
		});

		it('should map secret entry display value correctly', () => {
			// Arrange
			const entries = [
				createSecretEntry('password-key')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			const entryVm = result.secretEntries[0];
			expect(entryVm?.isSecret).toBe(true);
			expect(entryVm?.displayValue).toBe('***');
		});
	});

	describe('edge cases', () => {
		it('should handle mixed storage types', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', 'value1'),
				createGlobalEntry('global2', 'value2'),
				createWorkspaceEntry('workspace1', 'value3'),
				createWorkspaceEntry('workspace2', 'value4'),
				createSecretEntry('secret1'),
				createSecretEntry('secret2')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.totalEntries).toBe(6);
			expect(result.globalStateEntries).toHaveLength(2);
			expect(result.workspaceStateEntries).toHaveLength(2);
			expect(result.secretEntries).toHaveLength(2);
		});

		it('should handle large collection', () => {
			// Arrange
			const entries = Array.from({ length: 100 }, (_, i) =>
				createGlobalEntry(`key${i}`, `value${i}`)
			);
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.totalEntries).toBe(100);
			expect(result.globalStateEntries).toHaveLength(100);
		});

		it('should preserve entry order', () => {
			// Arrange
			const entries = [
				createGlobalEntry('first', '1'),
				createGlobalEntry('second', '2'),
				createGlobalEntry('third', '3')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries[0]?.key).toBe('first');
			expect(result.globalStateEntries[1]?.key).toBe('second');
			expect(result.globalStateEntries[2]?.key).toBe('third');
		});

		it('should handle entries with special characters', () => {
			// Arrange
			const entries = [
				createGlobalEntry('power-platform-dev-suite-secret-user@example.com', 'value'),
				createSecretEntry('power-platform-dev-suite-password-admin@domain.com')
			];
			const collection = createCollection(entries);

			// Act
			const result = mapper.toViewModel(collection);

			// Assert
			expect(result.globalStateEntries).toHaveLength(1);
			expect(result.secretEntries).toHaveLength(1);
		});
	});

	describe('factory method', () => {
		it('should create mapper with all dependencies', () => {
			// Arrange & Act
			const createdMapper = StorageCollectionMapper.create();

			// Assert
			expect(createdMapper).toBeInstanceOf(StorageCollectionMapper);
		});

		it('should create functional mapper', () => {
			// Arrange
			const createdMapper = StorageCollectionMapper.create();
			const entries = [createGlobalEntry('key', 'value')];
			const collection = createCollection(entries);

			// Act
			const result = createdMapper.toViewModel(collection);

			// Assert
			expect(result.totalEntries).toBe(1);
			expect(result.globalStateEntries).toHaveLength(1);
		});
	});
});
