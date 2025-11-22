import { StorageCollection } from './StorageCollection';
import { StorageEntry } from './StorageEntry';
import { StorageType } from '../valueObjects/StorageType';

describe('StorageCollection', () => {
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

	function createCollection(entries: StorageEntry[], protectedPatterns: string[] = []): StorageCollection {
		return StorageCollection.create(entries, protectedPatterns);
	}

	describe('create', () => {
		describe('with protected patterns', () => {
			it('should create collection with protected key patterns', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { environments: [] })
				];
				const protectedPatterns = ['power-platform-dev-suite-environments'];

				// Act
				const collection = createCollection(entries, protectedPatterns);

				// Assert
				expect(collection).toBeDefined();
				expect(collection.getAllEntries()).toHaveLength(1);
			});

			it('should create collection with multiple protected patterns', () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', {}),
					createGlobalEntry('key2', {})
				];
				const protectedPatterns = ['pattern1', 'pattern2', 'pattern3'];

				// Act
				const collection = createCollection(entries, protectedPatterns);

				// Assert
				expect(collection).toBeDefined();
			});
		});

		describe('with empty entries', () => {
			it('should create empty collection', () => {
				// Arrange & Act
				const collection = createCollection([], []);

				// Assert
				expect(collection.getAllEntries()).toHaveLength(0);
			});
		});

		describe('with mixed protected/non-protected entries', () => {
			it('should create collection with mixed entry types', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { environments: [] }),
					createGlobalEntry('clearable-key', { data: 'value' }),
					createSecretEntry('secret-key')
				];

				// Act
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Assert
				expect(collection.getAllEntries()).toHaveLength(3);
			});
		});
	});

	describe('validateClearOperation', () => {
		describe('prevents deletion of protected keys', () => {
			it('should return not allowed for protected environments key', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });
				const collection = createCollection([entry], ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearOperation('power-platform-dev-suite-environments');

				// Assert
				expect(result.isAllowed).toBe(false);
				expect(result.reason).toContain('protected');
			});

			it('should return validation result with error message for protected keys', () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { data: 'critical' });
				const collection = createCollection([entry], ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearOperation('power-platform-dev-suite-environments');

				// Assert
				expect(result.isAllowed).toBe(false);
				expect(result.reason).toBeDefined();
			});
		});

		describe('allows deletion of non-protected keys', () => {
			it('should return allowed for non-protected key', () => {
				// Arrange
				const entry = createGlobalEntry('clearable-key', { data: 'value' });
				const collection = createCollection([entry], []);

				// Act
				const result = collection.validateClearOperation('clearable-key');

				// Assert
				expect(result.isAllowed).toBe(true);
			});

			it('should return allowed for secret entries', () => {
				// Arrange
				const entry = createSecretEntry('secret-key');
				const collection = createCollection([entry], []);

				// Act
				const result = collection.validateClearOperation('secret-key');

				// Assert
				expect(result.isAllowed).toBe(true);
			});
		});

		describe('returns validation result with correct status', () => {
			it('should return validation result for allowed operation', () => {
				// Arrange
				const entry = createGlobalEntry('test-key', {});
				const collection = createCollection([entry], []);

				// Act
				const result = collection.validateClearOperation('test-key');

				// Assert
				expect(result.isAllowed).toBe(true);
				expect(result.key).toBe('test-key');
			});

			it('should include key in validation result', () => {
				// Arrange
				const entry = createGlobalEntry('my-key', { data: 'value' });
				const collection = createCollection([entry], []);

				// Act
				const result = collection.validateClearOperation('my-key');

				// Assert
				expect(result.key).toBe('my-key');
			});
		});

		describe('edge case: key not found', () => {
			it('should return not allowed when key does not exist', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act
				const result = collection.validateClearOperation('nonexistent-key');

				// Assert
				expect(result.isAllowed).toBe(false);
			});

			it('should return error message for nonexistent key', () => {
				// Arrange
				const entry = createGlobalEntry('existing-key', {});
				const collection = createCollection([entry], []);

				// Act
				const result = collection.validateClearOperation('missing-key');

				// Assert
				expect(result.isAllowed).toBe(false);
				expect(result.reason).toContain('not found');
			});
		});

		describe('edge case: null/undefined key', () => {
			it('should handle null key gracefully', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act
				const result = collection.validateClearOperation(null as unknown as string);

				// Assert
				expect(result.isAllowed).toBe(false);
			});

			it('should handle undefined key gracefully', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act
				const result = collection.validateClearOperation(undefined as unknown as string);

				// Assert
				expect(result.isAllowed).toBe(false);
			});
		});
	});

	describe('validateClearAllOperation', () => {
		describe('counts protected vs clearable entries correctly', () => {
			it('should count clearable entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('clearable1', {}),
					createGlobalEntry('clearable2', {}),
					createGlobalEntry('clearable3', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(3);
				expect(result.protectedCount).toBe(0);
			});

			it('should count protected entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { environments: [] }),
					createGlobalEntry('clearable', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(1);
				expect(result.protectedCount).toBe(1);
			});

			it('should count both protected and clearable correctly', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable1', {}),
					createGlobalEntry('clearable2', {}),
					createSecretEntry('secret-key')
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(3);
				expect(result.protectedCount).toBe(1);
			});
		});

		describe('prevents clearing if all entries are protected', () => {
			it('should indicate operation not allowed when all entries protected', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { data: 'critical' })
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(0);
				expect(result.protectedCount).toBe(1);
			});
		});

		describe('allows clearing if some entries are clearable', () => {
			it('should allow operation when at least one clearable entry exists', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable-key', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(1);
			});

			it('should count multiple clearable entries correctly', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable1', {}),
					createGlobalEntry('clearable2', {}),
					createGlobalEntry('clearable3', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(3);
				expect(result.protectedCount).toBe(1);
			});
		});

		describe('returns accurate counts', () => {
			it('should return correct clearable count', () => {
				// Arrange
				const entries = [
					createGlobalEntry('a', {}),
					createGlobalEntry('b', {}),
					createGlobalEntry('c', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(3);
			});

			it('should return correct protected count', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.protectedCount).toBe(1);
			});

			it('should return correct total count', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable1', {}),
					createGlobalEntry('clearable2', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount + result.protectedCount).toBe(3);
			});
		});

		describe('edge case: empty collection', () => {
			it('should return zero counts for empty collection', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(0);
				expect(result.protectedCount).toBe(0);
			});
		});

		describe('edge case: all protected', () => {
			it('should return zero clearable when all protected', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { data: 'value' })
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(0);
				expect(result.protectedCount).toBe(1);
			});
		});

		describe('edge case: all clearable', () => {
			it('should return zero protected when all clearable', () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', {}),
					createGlobalEntry('key2', {}),
					createGlobalEntry('key3', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const result = collection.validateClearAllOperation();

				// Assert
				expect(result.clearableCount).toBe(3);
				expect(result.protectedCount).toBe(0);
			});
		});
	});

	describe('isKeyProtected', () => {
		describe('regex pattern matching for protected keys', () => {
			it('should match protected key with exact pattern', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-environments']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-environments')).toBe(true);
			});

			it('should match protected key with wildcard pattern', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-secret-*']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-secret-user@example.com')).toBe(true);
				expect(collection.isKeyProtected('power-platform-dev-suite-secret-apikey')).toBe(true);
			});
		});

		describe('exact match for power-platform-dev-suite-environments', () => {
			it('should match environments key exactly', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-environments']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-environments')).toBe(true);
			});

			it('should not match similar but different keys', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-environments']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-environment')).toBe(false);
				expect(collection.isKeyProtected('power-platform-dev-suite-environments-backup')).toBe(false);
			});
		});

		describe('pattern match for power-platform-dev-suite-secret-*', () => {
			it('should match secret pattern', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-secret-*']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-secret-key1')).toBe(true);
				expect(collection.isKeyProtected('power-platform-dev-suite-secret-user@example.com')).toBe(true);
			});

			it('should not match non-secret keys', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-secret-*']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-other-key')).toBe(false);
			});
		});

		describe('pattern match for power-platform-dev-suite-password-*', () => {
			it('should match password pattern', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-password-*']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-password-user1')).toBe(true);
				expect(collection.isKeyProtected('power-platform-dev-suite-password-admin@example.com')).toBe(true);
			});

			it('should not match non-password keys', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-password-*']);

				// Act & Assert
				expect(collection.isKeyProtected('power-platform-dev-suite-token-key')).toBe(false);
			});
		});

		describe('returns false for non-protected keys', () => {
			it('should return false for regular keys', () => {
				// Arrange
				const collection = createCollection([], ['power-platform-dev-suite-environments']);

				// Act & Assert
				expect(collection.isKeyProtected('regular-key')).toBe(false);
				expect(collection.isKeyProtected('some-other-key')).toBe(false);
			});

			it('should return false when no patterns defined', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act & Assert
				expect(collection.isKeyProtected('any-key')).toBe(false);
			});
		});

		describe('edge cases: special characters, wildcards', () => {
			it('should handle keys with special characters', () => {
				// Arrange
				const collection = createCollection([], ['key-with-special-$-char']);

				// Act & Assert
				expect(collection.isKeyProtected('key-with-special-$-char')).toBe(true);
			});

			it('should handle multiple patterns', () => {
				// Arrange
				const collection = createCollection([], ['pattern1', 'pattern2', 'pattern3']);

				// Act & Assert
				expect(collection.isKeyProtected('pattern1')).toBe(true);
				expect(collection.isKeyProtected('pattern2')).toBe(true);
				expect(collection.isKeyProtected('pattern3')).toBe(true);
				expect(collection.isKeyProtected('pattern4')).toBe(false);
			});
		});
	});

	describe('getClearableEntries', () => {
		describe('filters out protected entries', () => {
			it('should exclude protected environments key', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable-key', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const clearable = collection.getClearableEntries();

				// Assert
				expect(clearable).toHaveLength(1);
				expect(clearable[0]?.key).toBe('clearable-key');
			});
		});

		describe('returns only clearable entries', () => {
			it('should return all non-protected entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', {}),
					createGlobalEntry('key2', {}),
					createGlobalEntry('key3', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const clearable = collection.getClearableEntries();

				// Assert
				expect(clearable).toHaveLength(3);
			});

			it('should return secret entries if not protected', () => {
				// Arrange
				const entries = [
					createSecretEntry('secret-key'),
					createGlobalEntry('global-key', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const clearable = collection.getClearableEntries();

				// Assert
				expect(clearable).toHaveLength(2);
			});
		});

		describe('returns empty array if all protected', () => {
			it('should return empty array when all entries are protected', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const clearable = collection.getClearableEntries();

				// Assert
				expect(clearable).toHaveLength(0);
			});
		});
	});

	describe('getProtectedEntries', () => {
		describe('filters out clearable entries', () => {
			it('should exclude clearable entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('clearable-key', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const protectedEntries = collection.getProtectedEntries();

				// Assert
				expect(protectedEntries).toHaveLength(1);
				expect(protectedEntries[0]?.key).toBe('power-platform-dev-suite-environments');
			});
		});

		describe('returns only protected entries', () => {
			it('should return only protected environments key', () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', {}),
					createGlobalEntry('key1', {}),
					createGlobalEntry('key2', {})
				];
				const collection = createCollection(entries, ['power-platform-dev-suite-environments']);

				// Act
				const protectedEntries = collection.getProtectedEntries();

				// Assert
				expect(protectedEntries).toHaveLength(1);
				expect(protectedEntries[0]?.key).toBe('power-platform-dev-suite-environments');
			});
		});

		describe('returns empty array if none protected', () => {
			it('should return empty array when no protected entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', {}),
					createGlobalEntry('key2', {})
				];
				const collection = createCollection(entries, []);

				// Act
				const protectedEntries = collection.getProtectedEntries();

				// Assert
				expect(protectedEntries).toHaveLength(0);
			});
		});
	});

	describe('getTotalSize', () => {
		describe('calculates total size correctly', () => {
			it('should sum sizes across all entries', () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', { data: 'value1' }),
					createGlobalEntry('key2', { data: 'value2' }),
					createGlobalEntry('key3', { data: 'value3' })
				];
				const collection = createCollection(entries, []);

				// Act
				const totalSize = collection.getTotalSize();

				// Assert
				expect(totalSize).toBeGreaterThan(0);
			});

			it('should include all entry types in size calculation', () => {
				// Arrange
				const entries = [
					createGlobalEntry('global', { data: 'value' }),
					createWorkspaceEntry('workspace', { data: 'value' }),
					createSecretEntry('secret')
				];
				const collection = createCollection(entries, []);

				// Act
				const totalSize = collection.getTotalSize();

				// Assert
				expect(totalSize).toBeGreaterThan(0);
			});
		});

		describe('returns 0 for empty collection', () => {
			it('should return zero for empty collection', () => {
				// Arrange
				const collection = createCollection([], []);

				// Act
				const totalSize = collection.getTotalSize();

				// Assert
				expect(totalSize).toBe(0);
			});
		});
	});

	describe('getAllEntries', () => {
		it('should return all entries in collection', () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', {}),
				createGlobalEntry('key2', {}),
				createGlobalEntry('key3', {})
			];
			const collection = createCollection(entries, []);

			// Act
			const allEntries = collection.getAllEntries();

			// Assert
			expect(allEntries).toHaveLength(3);
		});

		it('should return readonly array', () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			// Act
			const allEntries = collection.getAllEntries();

			// Assert
			expect(Array.isArray(allEntries)).toBe(true);
			// Readonly arrays should not be modifiable (TypeScript enforces this at compile time)
		});
	});

	describe('getEntry', () => {
		it('should retrieve entry by key', () => {
			// Arrange
			const entries = [
				createGlobalEntry('key1', { data: 'value1' }),
				createGlobalEntry('key2', { data: 'value2' })
			];
			const collection = createCollection(entries, []);

			// Act
			const entry = collection.getEntry('key1');

			// Assert
			expect(entry).toBeDefined();
			expect(entry?.key).toBe('key1');
		});

		it('should return undefined for non-existent key', () => {
			// Arrange
			const entries = [createGlobalEntry('key1', {})];
			const collection = createCollection(entries, []);

			// Act
			const entry = collection.getEntry('nonexistent');

			// Assert
			expect(entry).toBeUndefined();
		});
	});

	describe('getEntriesByType', () => {
		it('should filter entries by GLOBAL type', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createGlobalEntry('global2', {}),
				createWorkspaceEntry('workspace1', {})
			];
			const collection = createCollection(entries, []);

			// Act
			const globalEntries = collection.getEntriesByType(StorageType.GLOBAL);

			// Assert
			expect(globalEntries).toHaveLength(2);
		});

		it('should filter entries by WORKSPACE type', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createWorkspaceEntry('workspace1', {}),
				createWorkspaceEntry('workspace2', {})
			];
			const collection = createCollection(entries, []);

			// Act
			const workspaceEntries = collection.getEntriesByType(StorageType.WORKSPACE);

			// Assert
			expect(workspaceEntries).toHaveLength(2);
		});

		it('should filter entries by SECRET type', () => {
			// Arrange
			const entries = [
				createGlobalEntry('global1', {}),
				createSecretEntry('secret1'),
				createSecretEntry('secret2')
			];
			const collection = createCollection(entries, []);

			// Act
			const secretEntries = collection.getEntriesByType(StorageType.SECRET);

			// Assert
			expect(secretEntries).toHaveLength(2);
		});
	});
});
