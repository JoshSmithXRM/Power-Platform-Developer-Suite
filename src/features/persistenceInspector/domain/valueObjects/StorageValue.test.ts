import { StorageValue } from './StorageValue';

describe('StorageValue', () => {
	describe('create', () => {
		it('should create a StorageValue with a string value', () => {
			// Arrange
			const testValue = 'test string';

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(testValue);
		});

		it('should create a StorageValue with a number value', () => {
			// Arrange
			const testValue = 42;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(testValue);
		});

		it('should create a StorageValue with a boolean value (true)', () => {
			// Arrange
			const testValue = true;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(testValue);
		});

		it('should create a StorageValue with a boolean value (false)', () => {
			// Arrange
			const testValue = false;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(testValue);
		});

		it('should create a StorageValue with a null value', () => {
			// Arrange
			const testValue = null;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(null);
		});

		it('should create a StorageValue with an undefined value', () => {
			// Arrange
			const testValue = undefined;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toBe(undefined);
		});

		it('should create a StorageValue with an empty object', () => {
			// Arrange
			const testValue = {};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create a StorageValue with a complex object', () => {
			// Arrange
			const testValue = {
				name: 'John',
				age: 30,
				active: true,
				roles: ['admin', 'user']
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create a StorageValue with a nested object', () => {
			// Arrange
			const testValue = {
				user: {
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						contact: {
							email: 'john@example.com'
						}
					}
				}
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create a StorageValue with an empty array', () => {
			// Arrange
			const testValue: unknown[] = [];

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create a StorageValue with an array of primitives', () => {
			// Arrange
			const testValue = [1, 'two', true, null, undefined];

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create a StorageValue with an array of objects', () => {
			// Arrange
			const testValue = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' }
			];

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should create metadata for string value', () => {
			// Arrange
			const testValue = 'test';

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('string');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should create metadata for number value', () => {
			// Arrange
			const testValue = 123;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('number');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should create metadata for object value', () => {
			// Arrange
			const testValue = { key: 'value' };

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('object');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should create metadata for array value', () => {
			// Arrange
			const testValue = [1, 2, 3];

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('array');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should create metadata for null value', () => {
			// Arrange
			const testValue = null;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('null');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should create metadata for undefined value', () => {
			// Arrange
			const testValue = undefined;

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.dataType).toBe('undefined');
			expect(storageValue.metadata.isSecret).toBe(false);
		});

		it('should calculate size in bytes for created value', () => {
			// Arrange
			const testValue = 'test';

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.metadata.sizeInBytes).toBeGreaterThan(0);
		});
	});

	describe('createSecret', () => {
		it('should create a secret StorageValue', () => {
			// Act
			const storageValue = StorageValue.createSecret();

			// Assert
			expect(storageValue.value).toBe('***');
		});

		it('should mark secret as non-accessible', () => {
			// Act
			const storageValue = StorageValue.createSecret();

			// Assert
			expect(storageValue.isSecret()).toBe(true);
		});

		it('should set correct metadata for secret', () => {
			// Act
			const storageValue = StorageValue.createSecret();

			// Assert
			expect(storageValue.metadata.dataType).toBe('secret');
			expect(storageValue.metadata.isSecret).toBe(true);
		});

		it('should set size to zero for secret', () => {
			// Act
			const storageValue = StorageValue.createSecret();

			// Assert
			expect(storageValue.metadata.sizeInBytes).toBe(0);
		});
	});

	describe('value getter', () => {
		it('should return the original value', () => {
			// Arrange
			const testValue = { key: 'value' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.value;

			// Assert
			expect(result).toEqual(testValue);
		});
	});

	describe('metadata getter', () => {
		it('should return metadata object', () => {
			// Arrange
			const storageValue = StorageValue.create('test');

			// Act
			const result = storageValue.metadata;

			// Assert
			expect(result).toBeDefined();
			expect(result.dataType).toBeDefined();
			expect(result.sizeInBytes).toBeDefined();
			expect(result.isSecret).toBeDefined();
		});
	});

	describe('isObject', () => {
		it('should return true for object values', () => {
			// Arrange
			const storageValue = StorageValue.create({ key: 'value' });

			// Act
			const result = storageValue.isObject();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for array values', () => {
			// Arrange
			const storageValue = StorageValue.create([1, 2, 3]);

			// Act
			const result = storageValue.isObject();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for primitive values', () => {
			// Arrange
			const storageValue = StorageValue.create('string');

			// Act
			const result = storageValue.isObject();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isArray', () => {
		it('should return true for array values', () => {
			// Arrange
			const storageValue = StorageValue.create([1, 2, 3]);

			// Act
			const result = storageValue.isArray();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for object values', () => {
			// Arrange
			const storageValue = StorageValue.create({ key: 'value' });

			// Act
			const result = storageValue.isArray();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for primitive values', () => {
			// Arrange
			const storageValue = StorageValue.create(42);

			// Act
			const result = storageValue.isArray();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for empty array', () => {
			// Arrange
			const storageValue = StorageValue.create([]);

			// Act
			const result = storageValue.isArray();

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('isSecret', () => {
		it('should return true for secret values', () => {
			// Arrange
			const storageValue = StorageValue.createSecret();

			// Act
			const result = storageValue.isSecret();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for non-secret values', () => {
			// Arrange
			const storageValue = StorageValue.create('test');

			// Act
			const result = storageValue.isSecret();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('getPropertyAtPath', () => {
		it('should return entire value when path is empty', () => {
			// Arrange
			const testValue = { key: 'value' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath([]);

			// Assert
			expect(result).toEqual(testValue);
		});

		it('should return top-level property value', () => {
			// Arrange
			const testValue = { name: 'John', age: 30 };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['name']);

			// Assert
			expect(result).toBe('John');
		});

		it('should return nested property value', () => {
			// Arrange
			const testValue = {
				user: {
					profile: {
						name: 'John'
					}
				}
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['user', 'profile', 'name']);

			// Assert
			expect(result).toBe('John');
		});

		it('should return array element by index', () => {
			// Arrange
			const testValue = {
				items: ['first', 'second', 'third']
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['items', '1']);

			// Assert
			expect(result).toBe('second');
		});

		it('should return undefined for non-existent path', () => {
			// Arrange
			const testValue = { name: 'John' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['nonexistent']);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should return undefined when accessing property on null', () => {
			// Arrange
			const testValue = { nested: null };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['nested', 'property']);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should return undefined when accessing property on undefined', () => {
			// Arrange
			const testValue = { nested: undefined };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['nested', 'property']);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should return undefined when accessing property on primitive', () => {
			// Arrange
			const testValue = { value: 'string' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['value', 'property']);

			// Assert
			expect(result).toBeUndefined();
		});

		it('should handle path with multiple array indices', () => {
			// Arrange
			const testValue = {
				data: [
					{ items: ['a', 'b', 'c'] },
					{ items: ['x', 'y', 'z'] }
				]
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['data', '1', 'items', '2']);

			// Assert
			expect(result).toBe('z');
		});

		it('should handle path to numeric property', () => {
			// Arrange
			const testValue = {
				config: {
					'0': 'zero',
					'1': 'one'
				}
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['config', '0']);

			// Assert
			expect(result).toBe('zero');
		});

		it('should return object at intermediate path', () => {
			// Arrange
			const testValue = {
				level1: {
					level2: {
						level3: 'value'
					}
				}
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['level1', 'level2']);

			// Assert
			expect(result).toEqual({ level3: 'value' });
		});

		it('should return array at intermediate path', () => {
			// Arrange
			const testValue = {
				data: [1, 2, 3]
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.getPropertyAtPath(['data']);

			// Assert
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe('hasProperty', () => {
		it('should return true for existing top-level property', () => {
			// Arrange
			const testValue = { name: 'John' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['name']);

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for existing nested property', () => {
			// Arrange
			const testValue = {
				user: {
					profile: {
						name: 'John'
					}
				}
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['user', 'profile', 'name']);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for non-existent property', () => {
			// Arrange
			const testValue = { name: 'John' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['nonexistent']);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for path through null', () => {
			// Arrange
			const testValue = { nested: null };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['nested', 'property']);

			// Assert
			expect(result).toBe(false);
		});

		it('should return true for empty path', () => {
			// Arrange
			const testValue = { key: 'value' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty([]);

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for array element access', () => {
			// Arrange
			const testValue = {
				items: ['first', 'second']
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['items', '0']);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for out-of-bounds array index', () => {
			// Arrange
			const testValue = {
				items: ['first', 'second']
			};
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['items', '5']);

			// Assert
			expect(result).toBe(false);
		});

		it('should handle property with falsy value', () => {
			// Arrange
			const testValue = { count: 0 };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['count']);

			// Assert
			expect(result).toBe(true);
		});

		it('should handle property with false value', () => {
			// Arrange
			const testValue = { active: false };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['active']);

			// Assert
			expect(result).toBe(true);
		});

		it('should handle property with empty string value', () => {
			// Arrange
			const testValue = { name: '' };
			const storageValue = StorageValue.create(testValue);

			// Act
			const result = storageValue.hasProperty(['name']);

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('complex value types', () => {
		it('should handle deeply nested structures', () => {
			// Arrange
			const testValue = {
				level1: {
					level2: {
						level3: {
							level4: {
								level5: 'deep value'
							}
						}
					}
				}
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.getPropertyAtPath(['level1', 'level2', 'level3', 'level4', 'level5'])).toBe('deep value');
		});

		it('should handle mixed array and object structures', () => {
			// Arrange
			const testValue = {
				users: [
					{ id: 1, roles: ['admin', 'user'] },
					{ id: 2, roles: ['user'] }
				]
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.getPropertyAtPath(['users', '0', 'roles', '0'])).toBe('admin');
			expect(storageValue.getPropertyAtPath(['users', '1', 'roles', '0'])).toBe('user');
		});

		it('should preserve all data types in complex structure', () => {
			// Arrange
			const testValue = {
				string: 'text',
				number: 42,
				boolean: true,
				null: null,
				array: [1, 2, 3],
				nested: { key: 'value' }
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.value).toEqual(testValue);
		});

		it('should handle value with numeric string keys', () => {
			// Arrange
			const testValue = {
				'123': 'numeric key',
				'456': 'another'
			};

			// Act
			const storageValue = StorageValue.create(testValue);

			// Assert
			expect(storageValue.getPropertyAtPath(['123'])).toBe('numeric key');
		});
	});
});
