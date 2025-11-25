import { StorageEntryMapper } from './StorageEntryMapper';
import { StorageMetadataMapper } from './StorageMetadataMapper';
import { StorageEntry } from '../../domain/entities/StorageEntry';
import { StorageType } from '../../domain/valueObjects/StorageType';

describe('StorageEntryMapper', () => {
	let mapper: StorageEntryMapper;
	let metadataMapper: StorageMetadataMapper;

	beforeEach(() => {
		metadataMapper = new StorageMetadataMapper();
		mapper = new StorageEntryMapper(metadataMapper);
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

	describe('toViewModel - basic mapping', () => {
		it('should map key', () => {
			// Arrange
			const entry = createGlobalEntry('test-key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.key).toBe('test-key');
		});

		it('should map value', () => {
			// Arrange
			const value = { data: 'test' };
			const entry = createGlobalEntry('key', value);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.value).toEqual(value);
		});

		it('should map storageType to "global"', () => {
			// Arrange
			const entry = createGlobalEntry('key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.storageType).toBe('global');
		});

		it('should map storageType to "workspace"', () => {
			// Arrange
			const entry = createWorkspaceEntry('key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.storageType).toBe('workspace');
		});

		it('should map storageType to "secret"', () => {
			// Arrange
			const entry = createSecretEntry('key');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.storageType).toBe('secret');
		});

		it('should map metadata using metadataMapper', () => {
			// Arrange
			const entry = createGlobalEntry('key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.metadata).toBeDefined();
			expect(result.metadata.dataType).toBeDefined();
			expect(result.metadata.sizeInBytes).toBeDefined();
			expect(result.metadata.displaySize).toBeDefined();
		});
	});

	describe('toViewModel - boolean flags', () => {
		it('should map isProtected to true for protected key', () => {
			// Arrange
			const entry = createGlobalEntry('power-platform-dev-suite-environments', []);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isProtected).toBe(true);
		});

		it('should map isProtected to false for non-protected key', () => {
			// Arrange
			const entry = createGlobalEntry('custom-key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isProtected).toBe(false);
		});

		it('should map isSecret to true for secret storage type', () => {
			// Arrange
			const entry = createSecretEntry('password-key');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isSecret).toBe(true);
		});

		it('should map isSecret to false for non-secret storage type', () => {
			// Arrange
			const entry = createGlobalEntry('key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isSecret).toBe(false);
		});

		it('should map canBeCleared to false for protected entry', () => {
			// Arrange
			const entry = createGlobalEntry('power-platform-dev-suite-environments', []);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.canBeCleared).toBe(false);
		});

		it('should map canBeCleared to true for non-protected entry', () => {
			// Arrange
			const entry = createGlobalEntry('custom-key', 'value');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.canBeCleared).toBe(true);
		});
	});

	describe('toViewModel - display value formatting', () => {
		it('should format simple string value with quotes', () => {
			// Arrange
			const entry = createGlobalEntry('key', 'simple string');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('"simple string"');
		});

		it('should format object as JSON', () => {
			// Arrange
			const entry = createGlobalEntry('key', { test: 'value' });

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toContain('{');
			expect(result.displayValue).toContain('test');
		});

		it('should hide secret values with ***', () => {
			// Arrange
			const entry = createSecretEntry('password-key');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('***');
		});

		it('should format array value', () => {
			// Arrange
			const entry = createGlobalEntry('key', ['item1', 'item2']);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toContain('[');
			expect(result.displayValue).toContain('item1');
		});

		it('should format null value', () => {
			// Arrange
			const entry = createGlobalEntry('key', null);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('null');
		});

		it('should format undefined value', () => {
			// Arrange
			const entry = createGlobalEntry('key', undefined);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('undefined');
		});

		it('should format number value', () => {
			// Arrange
			const entry = createGlobalEntry('key', 42);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('42');
		});

		it('should format boolean value', () => {
			// Arrange
			const entry = createGlobalEntry('key', true);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.displayValue).toBe('true');
		});
	});

	describe('toViewModel - isExpandable flag', () => {
		it('should mark object as expandable', () => {
			// Arrange
			const entry = createGlobalEntry('key', { nested: 'value' });

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isExpandable).toBe(true);
		});

		it('should mark array as expandable', () => {
			// Arrange
			const entry = createGlobalEntry('key', [1, 2, 3]);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isExpandable).toBe(true);
		});

		it('should mark string as not expandable', () => {
			// Arrange
			const entry = createGlobalEntry('key', 'simple string');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isExpandable).toBe(false);
		});

		it('should mark number as not expandable', () => {
			// Arrange
			const entry = createGlobalEntry('key', 42);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isExpandable).toBe(false);
		});

		it('should mark null as not expandable', () => {
			// Arrange
			const entry = createGlobalEntry('key', null);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.isExpandable).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle complex nested objects', () => {
			// Arrange
			const complexValue = {
				environments: [
					{ name: 'Dev', url: 'https://dev.crm.dynamics.com' },
					{ name: 'Prod', url: 'https://prod.crm.dynamics.com' }
				],
				metadata: {
					version: '1.0',
					lastUpdated: '2025-01-01'
				}
			};
			const entry = createGlobalEntry('complex-key', complexValue);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.value).toEqual(complexValue);
			expect(result.isExpandable).toBe(true);
			expect(result.displayValue).toContain('environments');
		});

		it('should handle special characters in key', () => {
			// Arrange
			const entry = createGlobalEntry('power-platform-dev-suite-secret-user@example.com', '***');

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.key).toBe('power-platform-dev-suite-secret-user@example.com');
		});

		it('should handle empty object', () => {
			// Arrange
			const entry = createGlobalEntry('key', {});

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.value).toEqual({});
			expect(result.isExpandable).toBe(true);
		});

		it('should handle empty array', () => {
			// Arrange
			const entry = createGlobalEntry('key', []);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.value).toEqual([]);
			expect(result.isExpandable).toBe(true);
		});

		it('should handle very long string value', () => {
			// Arrange
			const longString = 'A'.repeat(10000);
			const entry = createGlobalEntry('key', longString);

			// Act
			const result = mapper.toViewModel(entry);

			// Assert
			expect(result.value).toBe(longString);
			expect(result.displayValue.length).toBeGreaterThan(0);
		});
	});
});
