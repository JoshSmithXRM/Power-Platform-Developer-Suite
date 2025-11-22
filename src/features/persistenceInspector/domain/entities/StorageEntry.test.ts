import { StorageEntry } from './StorageEntry';
import { StorageType } from '../valueObjects/StorageType';

describe('StorageEntry', () => {
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

	describe('create', () => {
		describe('different storage types', () => {
			it('should create entry with GLOBAL storage type', () => {
				// Arrange & Act
				const entry = createGlobalEntry('test-key', { data: 'value' });

				// Assert
				expect(entry.storageType).toBe(StorageType.GLOBAL);
				expect(entry.key).toBe('test-key');
			});

			it('should create entry with WORKSPACE storage type', () => {
				// Arrange & Act
				const entry = createWorkspaceEntry('panel-state', { expanded: true });

				// Assert
				expect(entry.storageType).toBe(StorageType.WORKSPACE);
				expect(entry.key).toBe('panel-state');
			});

			it('should create entry with SECRET storage type', () => {
				// Arrange & Act
				const entry = createSecretEntry('password-key');

				// Assert
				expect(entry.storageType).toBe(StorageType.SECRET);
				expect(entry.key).toBe('password-key');
			});
		});

		describe('secret value handling', () => {
			it('should hide secret values with ***', () => {
				// Arrange & Act
				const entry = createSecretEntry('secret-key');

				// Assert
				expect(entry.value).toBe('***');
				expect(entry.isSecret()).toBe(true);
			});

			it('should mark secret entry as secret type', () => {
				// Arrange & Act
				const entry = createSecretEntry('power-platform-dev-suite-password-user@example.com');

				// Assert
				expect(entry.isSecret()).toBe(true);
			});
		});

		describe('complex nested objects', () => {
			it('should create entry with nested object value', () => {
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

				// Act
				const entry = createGlobalEntry('complex-data', complexValue);

				// Assert
				expect(entry.value).toEqual(complexValue);
			});

			it('should create entry with array value', () => {
				// Arrange
				const arrayValue = ['item1', 'item2', 'item3'];

				// Act
				const entry = createGlobalEntry('array-data', arrayValue);

				// Assert
				expect(entry.value).toEqual(arrayValue);
			});

			it('should create entry with primitive values', () => {
				// Arrange & Act
				const stringEntry = createGlobalEntry('string-key', 'string value');
				const numberEntry = createGlobalEntry('number-key', 42);
				const booleanEntry = createGlobalEntry('boolean-key', true);

				// Assert
				expect(stringEntry.value).toBe('string value');
				expect(numberEntry.value).toBe(42);
				expect(booleanEntry.value).toBe(true);
			});
		});
	});

	describe('isProtected', () => {
		describe('protected environments key', () => {
			it('should return true for power-platform-dev-suite-environments', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });

				// Act & Assert
				expect(entry.isProtected()).toBe(true);
			});

			it('should identify protected key regardless of storage type', () => {
				// Arrange
				const globalEntry = createGlobalEntry('power-platform-dev-suite-environments', {});
				const workspaceEntry = createWorkspaceEntry('power-platform-dev-suite-environments', {});

				// Act & Assert
				expect(globalEntry.isProtected()).toBe(true);
				expect(workspaceEntry.isProtected()).toBe(true);
			});
		});

		describe('non-protected keys', () => {
			it('should return false for non-protected keys', () => {
				// Arrange
				const entry = createGlobalEntry('regular-key', { data: 'value' });

				// Act & Assert
				expect(entry.isProtected()).toBe(false);
			});

			it('should return false for similar but non-matching keys', () => {
				// Arrange
				const entry1 = createGlobalEntry('power-platform-dev-suite-environment', { data: 'value' });
				const entry2 = createGlobalEntry('power-platform-dev-suite-environments-backup', { data: 'value' });

				// Act & Assert
				expect(entry1.isProtected()).toBe(false);
				expect(entry2.isProtected()).toBe(false);
			});
		});
	});

	describe('canBeCleared', () => {
		describe('protected entries', () => {
			it('should return false for protected entries', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });

				// Act & Assert
				expect(entry.canBeCleared()).toBe(false);
			});
		});

		describe('non-protected entries', () => {
			it('should return true for non-protected entries', () => {
				// Arrange
				const entry = createGlobalEntry('clearable-key', { data: 'value' });

				// Act & Assert
				expect(entry.canBeCleared()).toBe(true);
			});

			it('should return true for all non-protected storage types', () => {
				// Arrange
				const globalEntry = createGlobalEntry('global-key', {});
				const workspaceEntry = createWorkspaceEntry('workspace-key', {});
				const secretEntry = createSecretEntry('secret-key');

				// Act & Assert
				expect(globalEntry.canBeCleared()).toBe(true);
				expect(workspaceEntry.canBeCleared()).toBe(true);
				expect(secretEntry.canBeCleared()).toBe(true);
			});
		});
	});

	describe('getPropertyAtPath', () => {
		describe('navigate nested object properties', () => {
			it('should retrieve property from 2-level deep nested object', () => {
				// Arrange
				const entry = createGlobalEntry('config', {
					data: {
						nested: 'value'
					}
				});

				// Act
				const result = entry.getPropertyAtPath(['data', 'nested']);

				// Assert
				expect(result).toBe('value');
			});

			it('should retrieve property from 3-level deep nested object', () => {
				// Arrange
				const entry = createGlobalEntry('deep-config', {
					level1: {
						level2: {
							level3: 'deep value'
						}
					}
				});

				// Act
				const result = entry.getPropertyAtPath(['level1', 'level2', 'level3']);

				// Assert
				expect(result).toBe('deep value');
			});
		});

		describe('navigate arrays with indices', () => {
			it('should retrieve array element by index', () => {
				// Arrange
				const entry = createGlobalEntry('array-data', {
					items: ['first', 'second', 'third']
				});

				// Act
				const result = entry.getPropertyAtPath(['items', '0']);

				// Assert
				expect(result).toBe('first');
			});

			it('should retrieve nested object from array', () => {
				// Arrange
				const entry = createGlobalEntry('environments', {
					list: [
						{ name: 'Dev', url: 'https://dev.crm.dynamics.com' },
						{ name: 'Prod', url: 'https://prod.crm.dynamics.com' }
					]
				});

				// Act
				const result = entry.getPropertyAtPath(['list', '1', 'name']);

				// Assert
				expect(result).toBe('Prod');
			});
		});

		describe('missing paths', () => {
			it('should return undefined for missing property', () => {
				// Arrange
				const entry = createGlobalEntry('data', { existing: 'value' });

				// Act
				const result = entry.getPropertyAtPath(['nonExistent']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should return undefined for missing nested property', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					level1: {
						existing: 'value'
					}
				});

				// Act
				const result = entry.getPropertyAtPath(['level1', 'missing', 'nested']);

				// Assert
				expect(result).toBeUndefined();
			});
		});

		describe('null and undefined intermediate objects', () => {
			it('should return undefined when navigating through null', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					nullValue: null
				});

				// Act
				const result = entry.getPropertyAtPath(['nullValue', 'nested']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should return undefined when navigating through undefined', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					undefinedValue: undefined
				});

				// Act
				const result = entry.getPropertyAtPath(['undefinedValue', 'nested']);

				// Assert
				expect(result).toBeUndefined();
			});
		});

		describe('primitive values', () => {
			it('should return undefined when trying to navigate through string', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					stringValue: 'text'
				});

				// Act
				const result = entry.getPropertyAtPath(['stringValue', 'property']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should return undefined when trying to navigate through number', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					numberValue: 42
				});

				// Act
				const result = entry.getPropertyAtPath(['numberValue', 'property']);

				// Assert
				expect(result).toBeUndefined();
			});
		});

		describe('edge cases', () => {
			it('should return entire value for empty path array', () => {
				// Arrange
				const value = { data: 'test' };
				const entry = createGlobalEntry('key', value);

				// Act
				const result = entry.getPropertyAtPath([]);

				// Assert
				expect(result).toEqual(value);
			});

			it('should handle path to root object', () => {
				// Arrange
				const value = { top: 'level' };
				const entry = createGlobalEntry('key', value);

				// Act
				const result = entry.getPropertyAtPath([]);

				// Assert
				expect(result).toBe(value);
			});
		});
	});

	describe('hasProperty', () => {
		describe('existing property', () => {
			it('should return true for existing top-level property', () => {
				// Arrange
				const entry = createGlobalEntry('data', { existing: 'value' });

				// Act & Assert
				expect(entry.hasProperty(['existing'])).toBe(true);
			});

			it('should return true for existing nested property', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					level1: {
						level2: 'value'
					}
				});

				// Act & Assert
				expect(entry.hasProperty(['level1', 'level2'])).toBe(true);
			});
		});

		describe('missing property', () => {
			it('should return false for missing top-level property', () => {
				// Arrange
				const entry = createGlobalEntry('data', { existing: 'value' });

				// Act & Assert
				expect(entry.hasProperty(['missing'])).toBe(false);
			});

			it('should return false for missing nested property', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					level1: {
						existing: 'value'
					}
				});

				// Act & Assert
				expect(entry.hasProperty(['level1', 'missing'])).toBe(false);
			});
		});

		describe('handles nested paths', () => {
			it('should return true for deeply nested existing property', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					a: {
						b: {
							c: {
								d: 'deep value'
							}
						}
					}
				});

				// Act & Assert
				expect(entry.hasProperty(['a', 'b', 'c', 'd'])).toBe(true);
			});

			it('should return false for partially existing path', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					a: {
						b: 'value'
					}
				});

				// Act & Assert
				expect(entry.hasProperty(['a', 'b', 'c'])).toBe(false);
			});
		});

		describe('handles array indices', () => {
			it('should return true for existing array element', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					items: ['first', 'second', 'third']
				});

				// Act & Assert
				expect(entry.hasProperty(['items', '1'])).toBe(true);
			});

			it('should return false for out-of-bounds array index', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					items: ['first', 'second']
				});

				// Act & Assert
				expect(entry.hasProperty(['items', '5'])).toBe(false);
			});
		});
	});

	describe('isSecret', () => {
		it('should return true for secret storage entries', () => {
			// Arrange
			const entry = createSecretEntry('password-key');

			// Act & Assert
			expect(entry.isSecret()).toBe(true);
		});

		it('should return false for non-secret storage entries', () => {
			// Arrange
			const globalEntry = createGlobalEntry('global-key', {});
			const workspaceEntry = createWorkspaceEntry('workspace-key', {});

			// Act & Assert
			expect(globalEntry.isSecret()).toBe(false);
			expect(workspaceEntry.isSecret()).toBe(false);
		});
	});

	describe('isWorkspace', () => {
		it('should return true for workspace storage entries', () => {
			// Arrange
			const entry = createWorkspaceEntry('panel-state', { expanded: true });

			// Act & Assert
			expect(entry.isWorkspace()).toBe(true);
		});

		it('should return false for non-workspace storage entries', () => {
			// Arrange
			const globalEntry = createGlobalEntry('global-key', {});
			const secretEntry = createSecretEntry('secret-key');

			// Act & Assert
			expect(globalEntry.isWorkspace()).toBe(false);
			expect(secretEntry.isWorkspace()).toBe(false);
		});
	});

	describe('metadata', () => {
		it('should provide metadata for entry', () => {
			// Arrange
			const entry = createGlobalEntry('test-key', { data: 'value' });

			// Act
			const metadata = entry.metadata;

			// Assert
			expect(metadata).toBeDefined();
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should have metadata for secret entries', () => {
			// Arrange
			const entry = createSecretEntry('secret-key');

			// Act
			const metadata = entry.metadata;

			// Assert
			expect(metadata).toBeDefined();
			expect(metadata.isSecret).toBe(true);
		});
	});
});
