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
			it('should mask secret values with asterisks to prevent exposure', () => {
				// Arrange & Act
				const entry = createSecretEntry('secret-key');

				// Assert
				expect(entry.value).toBe('***');
				expect(entry.isSecret()).toBe(true);
			});

			it('should correctly identify password secret entries by storage type', () => {
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
			it('should return true when key exactly matches protected environments configuration key', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });

				// Act & Assert
				expect(entry.isProtected()).toBe(true);
			});

			it('should identify protected environments key across all storage types', () => {
				// Arrange
				const globalEntry = createGlobalEntry('power-platform-dev-suite-environments', {});
				const workspaceEntry = createWorkspaceEntry('power-platform-dev-suite-environments', {});

				// Act & Assert
				expect(globalEntry.isProtected()).toBe(true);
				expect(workspaceEntry.isProtected()).toBe(true);
			});
		});

		describe('non-protected keys', () => {
			it('should return false when key does not match any protected pattern', () => {
				// Arrange
				const entry = createGlobalEntry('regular-key', { data: 'value' });

				// Act & Assert
				expect(entry.isProtected()).toBe(false);
			});

			it('should return false when key is similar but not exact match to protected key', () => {
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
			it('should return false when entry is protected to prevent accidental deletion', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });

				// Act & Assert
				expect(entry.canBeCleared()).toBe(false);
			});
		});

		describe('non-protected entries', () => {
			it('should return true when entry is not protected allowing safe deletion', () => {
				// Arrange
				const entry = createGlobalEntry('clearable-key', { data: 'value' });

				// Act & Assert
				expect(entry.canBeCleared()).toBe(true);
			});

			it('should return true for non-protected entries across all storage types', () => {
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
		it('should return true when entry belongs to SECRET storage type', () => {
			// Arrange
			const entry = createSecretEntry('password-key');

			// Act & Assert
			expect(entry.isSecret()).toBe(true);
		});

		it('should return false when entry belongs to non-secret storage types', () => {
			// Arrange
			const globalEntry = createGlobalEntry('global-key', {});
			const workspaceEntry = createWorkspaceEntry('workspace-key', {});

			// Act & Assert
			expect(globalEntry.isSecret()).toBe(false);
			expect(workspaceEntry.isSecret()).toBe(false);
		});
	});

	describe('isWorkspace', () => {
		it('should return true when entry belongs to WORKSPACE storage type', () => {
			// Arrange
			const entry = createWorkspaceEntry('panel-state', { expanded: true });

			// Act & Assert
			expect(entry.isWorkspace()).toBe(true);
		});

		it('should return false when entry belongs to non-workspace storage types', () => {
			// Arrange
			const globalEntry = createGlobalEntry('global-key', {});
			const secretEntry = createSecretEntry('secret-key');

			// Act & Assert
			expect(globalEntry.isWorkspace()).toBe(false);
			expect(secretEntry.isWorkspace()).toBe(false);
		});
	});

	describe('metadata', () => {
		it('should provide metadata including size in bytes for storage entry', () => {
			// Arrange
			const entry = createGlobalEntry('test-key', { data: 'value' });

			// Act
			const metadata = entry.metadata;

			// Assert
			expect(metadata).toBeDefined();
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should provide metadata with isSecret flag set for secret entries', () => {
			// Arrange
			const entry = createSecretEntry('secret-key');

			// Act
			const metadata = entry.metadata;

			// Assert
			expect(metadata).toBeDefined();
			expect(metadata.isSecret).toBe(true);
		});
	});

	describe('edge cases', () => {
		describe('unicode and special characters', () => {
			it('should handle unicode characters in key', () => {
				// Arrange & Act
				const entry = createGlobalEntry('key-测试-🔑', { data: 'value' });

				// Assert
				expect(entry.key).toBe('key-测试-🔑');
			});

			it('should handle special characters in key', () => {
				// Arrange & Act
				const entry = createGlobalEntry('key!@#$%^&*()', { data: 'value' });

				// Assert
				expect(entry.key).toBe('key!@#$%^&*()');
			});

			it('should handle unicode in stored values', () => {
				// Arrange
				const unicodeValue = {
					name: '用户姓名',
					description: 'Описание проекта',
					emoji: '🎉🎊🎈'
				};

				// Act
				const entry = createGlobalEntry('unicode-data', unicodeValue);

				// Assert
				expect(entry.value).toEqual(unicodeValue);
			});

			it('should handle emoji in object properties', () => {
				// Arrange
				const value = {
					'🔑': 'key-with-emoji',
					'status': '✅ complete'
				};

				// Act
				const entry = createGlobalEntry('emoji-props', value);

				// Assert
				expect(entry.value).toEqual(value);
			});
		});

		describe('very long strings', () => {
			it('should handle very long key (1000+ chars)', () => {
				// Arrange
				const longKey = 'power-platform-dev-suite-' + 'x'.repeat(1000);

				// Act
				const entry = createGlobalEntry(longKey, { data: 'value' });

				// Assert
				expect(entry.key).toBe(longKey);
				expect(entry.key.length).toBeGreaterThan(1000);
			});

			it('should handle very long string value (10000+ chars)', () => {
				// Arrange
				const longValue = 'A'.repeat(10000);

				// Act
				const entry = createGlobalEntry('long-value-key', longValue);

				// Assert
				expect(entry.value).toBe(longValue);
				expect((entry.value as string).length).toBe(10000);
			});

			it('should handle very large nested object', () => {
				// Arrange
				const largeObject = {
					environments: Array.from({ length: 100 }, (_, i) => ({
						id: `env-${i}`,
						name: `Environment ${i}`,
						url: `https://env${i}.crm.dynamics.com`,
						description: 'x'.repeat(100)
					}))
				};

				// Act
				const entry = createGlobalEntry('large-object', largeObject);

				// Assert
				expect(entry.value).toEqual(largeObject);
				expect((entry.value as Record<string, unknown>)['environments']).toHaveLength(100);
			});

			it('should handle deeply nested path navigation (10+ levels)', () => {
				// Arrange
				const deepObject = {
					l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: 'deep value' } } } } } } } } }
				};
				const entry = createGlobalEntry('deep-data', deepObject);

				// Act
				const result = entry.getPropertyAtPath(['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10']);

				// Assert
				expect(result).toBe('deep value');
			});
		});

		describe('boundary values', () => {
			it('should handle single character key', () => {
				// Arrange & Act
				const entry = createGlobalEntry('x', { data: 'value' });

				// Assert
				expect(entry.key).toBe('x');
				expect(entry.key.length).toBe(1);
			});

			it('should handle empty object as value', () => {
				// Arrange & Act
				const entry = createGlobalEntry('empty-object', {});

				// Assert
				expect(entry.value).toEqual({});
			});

			it('should handle empty array as value', () => {
				// Arrange & Act
				const entry = createGlobalEntry('empty-array', []);

				// Assert
				expect(entry.value).toEqual([]);
			});

			it('should handle zero as value', () => {
				// Arrange & Act
				const entry = createGlobalEntry('zero-value', 0);

				// Assert
				expect(entry.value).toBe(0);
			});

			it('should handle false as value', () => {
				// Arrange & Act
				const entry = createGlobalEntry('false-value', false);

				// Assert
				expect(entry.value).toBe(false);
			});

			it('should handle very large arrays', () => {
				// Arrange
				const largeArray = Array.from({ length: 1000 }, (_, i) => ({ index: i }));

				// Act
				const entry = createGlobalEntry('large-array', largeArray);

				// Assert
				expect((entry.value as unknown[]).length).toBe(1000);
			});
		});

		describe('immutability', () => {
			it('should maintain key immutability', () => {
				// Arrange
				const entry = createGlobalEntry('immutable-key', { data: 'value' });

				// Act
				const key1 = entry.key;
				const key2 = entry.key;

				// Assert
				expect(key1).toBe(key2);
				expect(key1).toBe('immutable-key');
			});

			it('should maintain storage type immutability', () => {
				// Arrange
				const entry = createGlobalEntry('test-key', { data: 'value' });

				// Act
				const type1 = entry.storageType;
				const type2 = entry.storageType;

				// Assert
				expect(type1).toBe(type2);
				expect(type1).toBe(StorageType.GLOBAL);
			});

			it('should return consistent value references', () => {
				// Arrange
				const value = { data: 'test', nested: { prop: 'value' } };
				const entry = createGlobalEntry('test-key', value);

				// Act
				const value1 = entry.value;
				const value2 = entry.value;

				// Assert
				expect(value1).toBe(value2);
			});
		});

		describe('property path edge cases', () => {
			it('should handle array index out of bounds', () => {
				// Arrange
				const entry = createGlobalEntry('data', { items: [1, 2, 3] });

				// Act
				const result = entry.getPropertyAtPath(['items', '999']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should handle negative array indices', () => {
				// Arrange
				const entry = createGlobalEntry('data', { items: [1, 2, 3] });

				// Act
				const result = entry.getPropertyAtPath(['items', '-1']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should handle non-existent path in deep structure', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					a: { b: { c: 'value' } }
				});

				// Act
				const result = entry.getPropertyAtPath(['a', 'b', 'x', 'y', 'z']);

				// Assert
				expect(result).toBeUndefined();
			});

			it('should handle special characters in property names', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					'key-with-dash': 'value1',
					'key.with.dot': 'value2',
					'key@with@at': 'value3'
				});

				// Act & Assert
				expect(entry.getPropertyAtPath(['key-with-dash'])).toBe('value1');
				expect(entry.getPropertyAtPath(['key.with.dot'])).toBe('value2');
				expect(entry.getPropertyAtPath(['key@with@at'])).toBe('value3');
			});

			it('should handle numeric property names', () => {
				// Arrange
				const entry = createGlobalEntry('data', {
					'123': 'numeric-key',
					'0': 'zero-key'
				});

				// Act & Assert
				expect(entry.getPropertyAtPath(['123'])).toBe('numeric-key');
				expect(entry.getPropertyAtPath(['0'])).toBe('zero-key');
			});
		});
	});
});
