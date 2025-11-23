import { StorageType, StorageTypeValue } from './StorageType';

describe('StorageType', () => {
	describe('Static Constants', () => {
		it('should have GLOBAL constant with value "global"', () => {
			// Arrange & Act
			const globalType = StorageType.GLOBAL;

			// Assert
			expect(globalType).toBe('global');
		});

		it('should have WORKSPACE constant with value "workspace"', () => {
			// Arrange & Act
			const workspaceType = StorageType.WORKSPACE;

			// Assert
			expect(workspaceType).toBe('workspace');
		});

		it('should have SECRET constant with value "secret"', () => {
			// Arrange & Act
			const secretType = StorageType.SECRET;

			// Assert
			expect(secretType).toBe('secret');
		});

		it('should have all three constants as distinct values', () => {
			// Arrange & Act & Assert
			expect(StorageType.GLOBAL).not.toBe(StorageType.WORKSPACE);
			expect(StorageType.GLOBAL).not.toBe(StorageType.SECRET);
			expect(StorageType.WORKSPACE).not.toBe(StorageType.SECRET);
		});
	});

	describe('create() factory method', () => {
		it('should create StorageType instance with "global" value', () => {
			// Arrange
			const value: 'global' | 'workspace' | 'secret' = 'global';

			// Act
			const storageType = StorageType.create(value);

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe('global');
		});

		it('should create StorageType instance with "workspace" value', () => {
			// Arrange
			const value: 'global' | 'workspace' | 'secret' = 'workspace';

			// Act
			const storageType = StorageType.create(value);

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe('workspace');
		});

		it('should create StorageType instance with "secret" value', () => {
			// Arrange
			const value: 'global' | 'workspace' | 'secret' = 'secret';

			// Act
			const storageType = StorageType.create(value);

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe('secret');
		});
	});

	describe('createGlobal() factory method', () => {
		it('should create StorageType instance for global storage', () => {
			// Arrange & Act
			const storageType = StorageType.createGlobal();

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe(StorageType.GLOBAL);
		});

		it('should return instance that reports isGlobal() as true', () => {
			// Arrange & Act
			const storageType = StorageType.createGlobal();

			// Assert
			expect(storageType.isGlobal()).toBe(true);
		});

		it('should return instance that reports isWorkspace() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createGlobal();

			// Assert
			expect(storageType.isWorkspace()).toBe(false);
		});

		it('should return instance that reports isSecret() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createGlobal();

			// Assert
			expect(storageType.isSecret()).toBe(false);
		});
	});

	describe('createWorkspace() factory method', () => {
		it('should create StorageType instance for workspace storage', () => {
			// Arrange & Act
			const storageType = StorageType.createWorkspace();

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe(StorageType.WORKSPACE);
		});

		it('should return instance that reports isWorkspace() as true', () => {
			// Arrange & Act
			const storageType = StorageType.createWorkspace();

			// Assert
			expect(storageType.isWorkspace()).toBe(true);
		});

		it('should return instance that reports isGlobal() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createWorkspace();

			// Assert
			expect(storageType.isGlobal()).toBe(false);
		});

		it('should return instance that reports isSecret() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createWorkspace();

			// Assert
			expect(storageType.isSecret()).toBe(false);
		});
	});

	describe('createSecret() factory method', () => {
		it('should create StorageType instance for secret storage', () => {
			// Arrange & Act
			const storageType = StorageType.createSecret();

			// Assert
			expect(storageType).toBeInstanceOf(StorageType);
			expect(storageType.value).toBe(StorageType.SECRET);
		});

		it('should return instance that reports isSecret() as true', () => {
			// Arrange & Act
			const storageType = StorageType.createSecret();

			// Assert
			expect(storageType.isSecret()).toBe(true);
		});

		it('should return instance that reports isGlobal() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createSecret();

			// Assert
			expect(storageType.isGlobal()).toBe(false);
		});

		it('should return instance that reports isWorkspace() as false', () => {
			// Arrange & Act
			const storageType = StorageType.createSecret();

			// Assert
			expect(storageType.isWorkspace()).toBe(false);
		});
	});

	describe('value getter', () => {
		it('should return "global" for global StorageType', () => {
			// Arrange
			const storageType = StorageType.createGlobal();

			// Act
			const value = storageType.value;

			// Assert
			expect(value).toBe('global');
		});

		it('should return "workspace" for workspace StorageType', () => {
			// Arrange
			const storageType = StorageType.createWorkspace();

			// Act
			const value = storageType.value;

			// Assert
			expect(value).toBe('workspace');
		});

		it('should return "secret" for secret StorageType', () => {
			// Arrange
			const storageType = StorageType.createSecret();

			// Act
			const value = storageType.value;

			// Assert
			expect(value).toBe('secret');
		});
	});

	describe('Type discrimination methods', () => {
		it('should isGlobal() should return true only for global storage type', () => {
			// Arrange
			const globalType = StorageType.createGlobal();
			const workspaceType = StorageType.createWorkspace();
			const secretType = StorageType.createSecret();

			// Act & Assert
			expect(globalType.isGlobal()).toBe(true);
			expect(workspaceType.isGlobal()).toBe(false);
			expect(secretType.isGlobal()).toBe(false);
		});

		it('should isWorkspace() should return true only for workspace storage type', () => {
			// Arrange
			const globalType = StorageType.createGlobal();
			const workspaceType = StorageType.createWorkspace();
			const secretType = StorageType.createSecret();

			// Act & Assert
			expect(globalType.isWorkspace()).toBe(false);
			expect(workspaceType.isWorkspace()).toBe(true);
			expect(secretType.isWorkspace()).toBe(false);
		});

		it('should isSecret() should return true only for secret storage type', () => {
			// Arrange
			const globalType = StorageType.createGlobal();
			const workspaceType = StorageType.createWorkspace();
			const secretType = StorageType.createSecret();

			// Act & Assert
			expect(globalType.isSecret()).toBe(false);
			expect(workspaceType.isSecret()).toBe(false);
			expect(secretType.isSecret()).toBe(true);
		});

		it('should have exactly one discriminator method returning true per instance', () => {
			// Arrange
			const allTypes = [
				StorageType.createGlobal(),
				StorageType.createWorkspace(),
				StorageType.createSecret(),
			];

			// Act & Assert
			allTypes.forEach((storageType) => {
				const trueCount = [
					storageType.isGlobal(),
					storageType.isWorkspace(),
					storageType.isSecret(),
				].filter((result) => result === true).length;

				expect(trueCount).toBe(1);
			});
		});
	});

	describe('Value object consistency', () => {
		it('should create() with constant should produce same type as dedicated factory', () => {
			// Arrange & Act
			const globalViaCreate = StorageType.create(StorageType.GLOBAL);
			const globalViaDedicatedFactory = StorageType.createGlobal();

			// Assert
			expect(globalViaCreate.value).toBe(globalViaDedicatedFactory.value);
			expect(globalViaCreate.isGlobal()).toBe(globalViaDedicatedFactory.isGlobal());
		});

		it('should all factory methods should create valid instances', () => {
			// Arrange & Act
			const globalType = StorageType.createGlobal();
			const workspaceType = StorageType.createWorkspace();
			const secretType = StorageType.createSecret();

			// Assert
			expect(globalType).toBeInstanceOf(StorageType);
			expect(workspaceType).toBeInstanceOf(StorageType);
			expect(secretType).toBeInstanceOf(StorageType);
		});

		it('should maintain type safety with StorageTypeValue type alias', () => {
			// Arrange
			const globalValue: StorageTypeValue = StorageType.GLOBAL;
			const workspaceValue: StorageTypeValue = StorageType.WORKSPACE;
			const secretValue: StorageTypeValue = StorageType.SECRET;

			// Act
			const globalType = StorageType.create(globalValue);
			const workspaceType = StorageType.create(workspaceValue);
			const secretType = StorageType.create(secretValue);

			// Assert
			expect(globalType.isGlobal()).toBe(true);
			expect(workspaceType.isWorkspace()).toBe(true);
			expect(secretType.isSecret()).toBe(true);
		});
	});

	describe('Edge cases', () => {
		it('should have immutable value (no setter)', () => {
			// Arrange
			const storageType = StorageType.createGlobal();

			// Act & Assert
			expect(() => {
				// @ts-expect-error - Testing that value is read-only
				storageType.value = 'workspace';
			}).toThrow();
		});

		it('should handle multiple instances with same type independently', () => {
			// Arrange & Act
			const globalType1 = StorageType.createGlobal();
			const globalType2 = StorageType.createGlobal();

			// Assert - Different instances but same value
			expect(globalType1).not.toBe(globalType2); // Different objects
			expect(globalType1.value).toBe(globalType2.value); // Same value
		});

		it('should maintain type identity when used with spread operator and array operations', () => {
			// Arrange & Act
			const allTypes: StorageType[] = [
				StorageType.createGlobal(),
				StorageType.createWorkspace(),
				StorageType.createSecret(),
			];

			const spreadTypes: StorageType[] = [...allTypes];

			// Assert
			expect(spreadTypes).toHaveLength(3);
			expect(spreadTypes[0]?.isGlobal()).toBe(true);
			expect(spreadTypes[1]?.isWorkspace()).toBe(true);
			expect(spreadTypes[2]?.isSecret()).toBe(true);
		});
	});
});
