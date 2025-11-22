import { StorageClearingService } from './StorageClearingService';
import { IStorageClearer } from '../interfaces/IStorageClearer';
import { IProtectedKeyProvider } from '../interfaces/IProtectedKeyProvider';
import { StorageEntry } from '../entities/StorageEntry';
import { StorageCollection } from '../entities/StorageCollection';
import { PropertyPath } from '../valueObjects/PropertyPath';
import { ClearAllResult } from '../results/ClearAllResult';
import { ProtectedKeyError } from '../errors/ProtectedKeyError';
import { PropertyNotFoundError } from '../errors/PropertyNotFoundError';
import { InvalidOperationError } from '../errors/InvalidOperationError';
import { StorageType } from '../valueObjects/StorageType';

describe('StorageClearingService', () => {
	let service: StorageClearingService;
	let mockStorageClearer: jest.Mocked<IStorageClearer>;
	let mockProtectedKeyProvider: jest.Mocked<IProtectedKeyProvider>;

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

	beforeEach(() => {
		mockStorageClearer = {
			clearGlobalStateKey: jest.fn(),
			clearWorkspaceStateKey: jest.fn(),
			clearSecretKey: jest.fn(),
			clearGlobalStateProperty: jest.fn(),
			clearWorkspaceStateProperty: jest.fn(),
			clearAllNonProtected: jest.fn()
		};

		mockProtectedKeyProvider = {
			getProtectedKeyPatterns: jest.fn().mockReturnValue(['protected-pattern'])
		};

		service = new StorageClearingService(mockStorageClearer, mockProtectedKeyProvider);
	});

	describe('clearEntry', () => {
		describe('global storage type', () => {
			it('should clear global storage entry when entry is not protected', async () => {
				// Arrange
				const entry = createGlobalEntry('test-key', { data: 'value' });
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearGlobalStateKey).toHaveBeenCalledWith('test-key');
				expect(mockStorageClearer.clearWorkspaceStateKey).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearSecretKey).not.toHaveBeenCalled();
			});

			it('should route to correct storage type for global entries', async () => {
				// Arrange
				const entry = createGlobalEntry('global-settings', { setting: 'value' });
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearGlobalStateKey).toHaveBeenCalledWith('global-settings');
			});
		});

		describe('workspace storage type', () => {
			it('should clear workspace storage entry when entry is not protected', async () => {
				// Arrange
				const entry = createWorkspaceEntry('workspace-key', { data: 'value' });
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearWorkspaceStateKey).toHaveBeenCalledWith('workspace-key');
				expect(mockStorageClearer.clearGlobalStateKey).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearSecretKey).not.toHaveBeenCalled();
			});

			it('should route to correct storage type for workspace entries', async () => {
				// Arrange
				const entry = createWorkspaceEntry('panel-state', { expanded: true });
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearWorkspaceStateKey).toHaveBeenCalledWith('panel-state');
			});
		});

		describe('secret storage type', () => {
			it('should clear secret storage entry when entry is not protected', async () => {
				// Arrange
				const entry = createSecretEntry('secret-key');
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearSecretKey).toHaveBeenCalledWith('secret-key');
				expect(mockStorageClearer.clearGlobalStateKey).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearWorkspaceStateKey).not.toHaveBeenCalled();
			});

			it('should route to correct storage type for secret entries', async () => {
				// Arrange
				const entry = createSecretEntry('power-platform-dev-suite-password-user@example.com');
				const collection = createCollection([entry], []);

				// Act
				await service.clearEntry(entry, collection);

				// Assert
				expect(mockStorageClearer.clearSecretKey).toHaveBeenCalledWith('power-platform-dev-suite-password-user@example.com');
			});
		});

		describe('protected key validation', () => {
			it('should throw ProtectedKeyError when entry is protected', async () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { environments: [] });
				const collection = createCollection([entry], []);

				// Act & Assert
				await expect(service.clearEntry(entry, collection)).rejects.toThrow(ProtectedKeyError);
			});

			it('should throw ProtectedKeyError with validation reason', async () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { data: 'value' });
				const collection = createCollection([entry], []);

				// Act & Assert
				await expect(service.clearEntry(entry, collection)).rejects.toThrow(ProtectedKeyError);
				expect(mockStorageClearer.clearGlobalStateKey).not.toHaveBeenCalled();
			});

			it('should not call storage clearer when entry is protected', async () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { data: 'important' });
				const collection = createCollection([entry], []);

				// Act & Assert
				await expect(service.clearEntry(entry, collection)).rejects.toThrow();
				expect(mockStorageClearer.clearGlobalStateKey).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearWorkspaceStateKey).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearSecretKey).not.toHaveBeenCalled();
			});
		});
	});

	describe('clearProperty', () => {
		describe('global storage property clearing', () => {
			it('should clear property from global storage when entry is not protected', async () => {
				// Arrange
				const entry = createGlobalEntry('settings', { environments: [], other: 'data' });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('environments');

				// Act
				await service.clearProperty(entry, path, collection);

				// Assert
				expect(mockStorageClearer.clearGlobalStateProperty).toHaveBeenCalledWith('settings', path);
				expect(mockStorageClearer.clearWorkspaceStateProperty).not.toHaveBeenCalled();
			});

			it('should clear nested property from global storage', async () => {
				// Arrange
				const entry = createGlobalEntry('config', {
					data: {
						nested: {
							value: 'test'
						}
					}
				});
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('data.nested.value');

				// Act
				await service.clearProperty(entry, path, collection);

				// Assert
				expect(mockStorageClearer.clearGlobalStateProperty).toHaveBeenCalledWith('config', path);
			});
		});

		describe('workspace storage property clearing', () => {
			it('should clear property from workspace storage when entry is not protected', async () => {
				// Arrange
				const entry = createWorkspaceEntry('panel-state', { expanded: true, width: 300 });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('expanded');

				// Act
				await service.clearProperty(entry, path, collection);

				// Assert
				expect(mockStorageClearer.clearWorkspaceStateProperty).toHaveBeenCalledWith('panel-state', path);
				expect(mockStorageClearer.clearGlobalStateProperty).not.toHaveBeenCalled();
			});

			it('should clear array element from workspace storage', async () => {
				// Arrange
				const entry = createWorkspaceEntry('recent-items', { items: ['item1', 'item2', 'item3'] });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('items[0]');

				// Act
				await service.clearProperty(entry, path, collection);

				// Assert
				expect(mockStorageClearer.clearWorkspaceStateProperty).toHaveBeenCalledWith('recent-items', path);
			});
		});

		describe('protected key validation', () => {
			it('should throw ProtectedKeyError when entry is protected', async () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', { data: { nested: 'value' } });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('data.nested');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(ProtectedKeyError);
			});

			it('should not clear property when entry is protected', async () => {
				// Arrange
				const entry = createGlobalEntry('power-platform-dev-suite-environments', {
					environments: [{ name: 'Dev' }]
				});
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('environments[0]');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(ProtectedKeyError);
				expect(mockStorageClearer.clearGlobalStateProperty).not.toHaveBeenCalled();
			});
		});

		describe('secret storage validation', () => {
			it('should throw InvalidOperationError when trying to clear property of secret entry', async () => {
				// Arrange
				const entry = createSecretEntry('secret-key');
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('property');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(InvalidOperationError);
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow('Cannot clear properties of secret entries');
			});

			it('should not call storage clearer for secret entry properties', async () => {
				// Arrange
				const entry = createSecretEntry('password-key');
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('nested.property');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(InvalidOperationError);
				expect(mockStorageClearer.clearGlobalStateProperty).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearWorkspaceStateProperty).not.toHaveBeenCalled();
			});
		});

		describe('property existence validation', () => {
			it('should throw PropertyNotFoundError when property does not exist', async () => {
				// Arrange
				const entry = createGlobalEntry('config', { existingProp: 'value' });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('nonExistentProp');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(PropertyNotFoundError);
			});

			it('should throw PropertyNotFoundError with property path in message', async () => {
				// Arrange
				const entry = createGlobalEntry('settings', { data: { nested: 'value' } });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('data.missing.property');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow('Property data.missing.property not found');
			});

			it('should not call storage clearer when property does not exist', async () => {
				// Arrange
				const entry = createWorkspaceEntry('state', { prop1: 'value' });
				const collection = createCollection([entry], []);
				const path = PropertyPath.create('nonExistent');

				// Act & Assert
				await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(PropertyNotFoundError);
				expect(mockStorageClearer.clearGlobalStateProperty).not.toHaveBeenCalled();
				expect(mockStorageClearer.clearWorkspaceStateProperty).not.toHaveBeenCalled();
			});
		});
	});

	describe('clearAll', () => {
		describe('successful clear all operation', () => {
			it('should clear all non-protected entries and return result', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', { data: 'value1' }),
					createWorkspaceEntry('key2', { data: 'value2' })
				];
				const collection = createCollection(entries, []);
				const expectedResult = new ClearAllResult(2, 1, []);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result).toBe(expectedResult);
				expect(mockStorageClearer.clearAllNonProtected).toHaveBeenCalledWith(['protected-pattern']);
			});

			it('should pass protected patterns to storage clearer', async () => {
				// Arrange
				const entries = [createGlobalEntry('clearable-key', { data: 'value' })];
				const collection = createCollection(entries, []);
				const expectedResult = new ClearAllResult(1, 0, []);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);
				mockProtectedKeyProvider.getProtectedKeyPatterns.mockReturnValue(['pattern1', 'pattern2']);

				// Act
				await service.clearAll(collection);

				// Assert
				expect(mockStorageClearer.clearAllNonProtected).toHaveBeenCalledWith(['pattern1', 'pattern2']);
			});

			it('should return correct cleared counts from storage clearer', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('global1', {}),
					createGlobalEntry('global2', {}),
					createSecretEntry('secret1')
				];
				const collection = createCollection(entries, []);
				const expectedResult = new ClearAllResult(2, 1, []);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result.clearedGlobalKeys).toBe(2);
				expect(result.clearedSecretKeys).toBe(1);
				expect(result.totalCleared).toBe(3);
			});
		});

		describe('validation failures', () => {
			it('should throw InvalidOperationError when no clearable entries exist', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { environments: [] })
				];
				const collection = createCollection(entries, []);

				// Act & Assert
				await expect(service.clearAll(collection)).rejects.toThrow(InvalidOperationError);
				await expect(service.clearAll(collection)).rejects.toThrow('No clearable entries found');
			});

			it('should throw InvalidOperationError when all entries are protected', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { data: 'value1' })
				];
				const collection = createCollection(entries, []);

				// Act & Assert
				await expect(service.clearAll(collection)).rejects.toThrow(InvalidOperationError);
			});

			it('should not call storage clearer when validation fails', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { data: 'value' })
				];
				const collection = createCollection(entries, []);

				// Act & Assert
				await expect(service.clearAll(collection)).rejects.toThrow(InvalidOperationError);
				expect(mockStorageClearer.clearAllNonProtected).not.toHaveBeenCalled();
			});
		});

		describe('mixed protected and clearable entries', () => {
			it('should clear only non-protected entries when collection has mixed entries', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('clearable1', { data: 'value1' }),
					createGlobalEntry('power-platform-dev-suite-environments', { critical: 'data' }),
					createGlobalEntry('clearable2', { data: 'value2' })
				];
				const collection = createCollection(entries, []);
				const expectedResult = new ClearAllResult(2, 0, []);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result.clearedGlobalKeys).toBe(2);
				expect(mockStorageClearer.clearAllNonProtected).toHaveBeenCalledWith(['protected-pattern']);
			});

			it('should succeed when at least one clearable entry exists', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('power-platform-dev-suite-environments', { data: 'value1' }),
					createGlobalEntry('clearable', { data: 'value3' })
				];
				const collection = createCollection(entries, []);
				const expectedResult = new ClearAllResult(1, 0, []);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result.clearedGlobalKeys).toBe(1);
			});
		});

		describe('error handling in clear all result', () => {
			it('should return result with errors when storage clearer encounters errors', async () => {
				// Arrange
				const entries = [createGlobalEntry('key1', { data: 'value' })];
				const collection = createCollection(entries, []);
				const errors = [{ key: 'key1', error: 'Failed to clear' }];
				const expectedResult = new ClearAllResult(0, 0, errors);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result.hasErrors()).toBe(true);
				expect(result.errors).toHaveLength(1);
				expect(result.errors[0]?.key).toBe('key1');
			});

			it('should return result with partial success when some entries fail', async () => {
				// Arrange
				const entries = [
					createGlobalEntry('key1', { data: 'value1' }),
					createGlobalEntry('key2', { data: 'value2' })
				];
				const collection = createCollection(entries, []);
				const errors = [{ key: 'key2', error: 'Failed to clear' }];
				const expectedResult = new ClearAllResult(1, 0, errors);
				mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

				// Act
				const result = await service.clearAll(collection);

				// Assert
				expect(result.clearedGlobalKeys).toBe(1);
				expect(result.hasErrors()).toBe(true);
				expect(result.errors).toHaveLength(1);
			});
		});
	});

	describe('business logic validation', () => {
		it('should enforce protection rules preventing accidental deletion of critical data', async () => {
			// Arrange - Protected environments key cannot be cleared
			const entry = createGlobalEntry('power-platform-dev-suite-environments', {
				environments: [{ name: 'Production', url: 'https://prod.crm.dynamics.com' }]
			});
			const collection = createCollection([entry], ['power-platform-dev-suite-environments']);

			// Act & Assert
			await expect(service.clearEntry(entry, collection)).rejects.toThrow(ProtectedKeyError);
		});

		it('should allow fine-grained property clearing for complex storage values', async () => {
			// Arrange - Remove single environment from array without clearing entire key
			const entry = createGlobalEntry('user-settings', {
				recentEnvironments: ['env1', 'env2', 'env3'],
				preferences: { theme: 'dark' }
			});
			const collection = createCollection([entry], []);
			const path = PropertyPath.create('recentEnvironments[0]');

			// Act
			await service.clearProperty(entry, path, collection);

			// Assert
			expect(mockStorageClearer.clearGlobalStateProperty).toHaveBeenCalledWith('user-settings', path);
		});

		it('should enforce all-or-nothing rule for secret entries', async () => {
			// Arrange - Secrets cannot be partially cleared (security requirement)
			const entry = createSecretEntry('power-platform-dev-suite-password-user@example.com');
			const collection = createCollection([entry], []);
			const path = PropertyPath.create('password');

			// Act & Assert
			await expect(service.clearProperty(entry, path, collection)).rejects.toThrow(InvalidOperationError);
		});

		it('should provide nuclear option for troubleshooting while protecting critical data', async () => {
			// Arrange - Clear all for troubleshooting, but protect critical environments
			const entries = [
				createGlobalEntry('power-platform-dev-suite-environments', { environments: [] }),
				createGlobalEntry('cache-data', { cached: 'value' }),
				createWorkspaceEntry('temp-state', { temp: 'data' }),
				createSecretEntry('password-key')
			];
			const collection = createCollection(entries, []);
			const expectedResult = new ClearAllResult(1, 1, []);
			mockStorageClearer.clearAllNonProtected.mockResolvedValue(expectedResult);

			// Act
			const result = await service.clearAll(collection);

			// Assert
			expect(result.totalCleared).toBe(2);
			expect(mockStorageClearer.clearAllNonProtected).toHaveBeenCalledWith(['protected-pattern']);
		});
	});
});
