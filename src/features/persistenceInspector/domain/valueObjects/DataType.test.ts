import { DataType } from './DataType';

describe('DataType Value Object', () => {
	describe('String Type Detection', () => {
		it('should identify empty string as string type', () => {
			// Arrange
			const value = '';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});

		it('should identify non-empty string as string type', () => {
			// Arrange
			const value = 'hello world';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});

		it('should identify string with special characters as string type', () => {
			// Arrange
			const value = 'special!@#$%^&*()_+-=[]{}|;:,.<>?';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});

		it('should identify multiline string as string type', () => {
			// Arrange
			const value = 'line1\nline2\nline3';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});

		it('should identify string with numbers as string type', () => {
			// Arrange
			const value = '12345';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});

		it('should identify unicode string as string type', () => {
			// Arrange
			const value = '你好世界 مرحبا';

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('string');
		});
	});

	describe('Number Type Detection', () => {
		it('should identify positive integer as number type', () => {
			// Arrange
			const value = 42;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify negative integer as number type', () => {
			// Arrange
			const value = -42;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify zero as number type', () => {
			// Arrange
			const value = 0;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify floating-point number as number type', () => {
			// Arrange
			const value = 3.14159;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify NaN as number type', () => {
			// Arrange
			const value = NaN;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify Infinity as number type', () => {
			// Arrange
			const value = Infinity;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify negative Infinity as number type', () => {
			// Arrange
			const value = -Infinity;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify very large number as number type', () => {
			// Arrange
			const value = Number.MAX_VALUE;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});

		it('should identify very small number as number type', () => {
			// Arrange
			const value = Number.MIN_VALUE;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('number');
		});
	});

	describe('Boolean Type Detection', () => {
		it('should identify true as boolean type', () => {
			// Arrange
			const value = true;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('boolean');
		});

		it('should identify false as boolean type', () => {
			// Arrange
			const value = false;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('boolean');
		});
	});

	describe('Null Type Detection', () => {
		it('should identify null as null type', () => {
			// Arrange
			const value = null;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('null');
		});
	});

	describe('Undefined Type Detection', () => {
		it('should identify undefined as undefined type', () => {
			// Arrange
			const value = undefined;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('undefined');
		});

		it('should identify void(0) as undefined type', () => {
			// Arrange
			const value = void 0;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('undefined');
		});
	});

	describe('Array Type Detection', () => {
		it('should identify empty array as array type', () => {
			// Arrange
			const value: unknown = [];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});

		it('should identify array with strings as array type', () => {
			// Arrange
			const value: unknown = ['a', 'b', 'c'];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});

		it('should identify array with numbers as array type', () => {
			// Arrange
			const value: unknown = [1, 2, 3];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});

		it('should identify mixed array as array type', () => {
			// Arrange
			const value: unknown = [1, 'two', true, null, undefined];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});

		it('should identify nested array as array type', () => {
			// Arrange
			const value: unknown = [[1, 2], [3, 4], [5, 6]];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});

		it('should identify array with objects as array type', () => {
			// Arrange
			const value: unknown = [{ id: 1 }, { id: 2 }];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
		});
	});

	describe('Object Type Detection', () => {
		it('should identify empty object as object type', () => {
			// Arrange
			const value: unknown = {};

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify object with properties as object type', () => {
			// Arrange
			const value: unknown = { name: 'John', age: 30 };

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify nested object as object type', () => {
			// Arrange
			const value: unknown = { user: { name: 'John', address: { city: 'NYC' } } };

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Date object as object type', () => {
			// Arrange
			const value: unknown = new Date();

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify RegExp as object type', () => {
			// Arrange
			const value: unknown = /test/g;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Map as object type', () => {
			// Arrange
			const value: unknown = new Map([['key', 'value']]);

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Set as object type', () => {
			// Arrange
			const value: unknown = new Set([1, 2, 3]);

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Error as object type', () => {
			// Arrange
			const value: unknown = new Error('test error');

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify custom class instance as object type', () => {
			// Arrange
			class CustomClass {
				value = 42;
			}
			const value: unknown = new CustomClass();

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Object.create(null) as object type', () => {
			// Arrange
			const value: unknown = Object.create(null);

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});
	});

	describe('Edge Cases and Special Types', () => {
		it('should identify function as object type (fallback)', () => {
			// Arrange
			const value: unknown = function test() {};

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify arrow function as object type (fallback)', () => {
			// Arrange
			const value: unknown = () => {};

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify async function as object type (fallback)', () => {
			// Arrange
			const value: unknown = async () => {};

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify Symbol as object type (fallback)', () => {
			// Arrange
			const value: unknown = Symbol('test');

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});

		it('should identify BigInt as object type (fallback)', () => {
			// Arrange
			const value: unknown = BigInt(9007199254740991);

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('object');
		});
	});

	describe('Value Object Behavior', () => {
		it('should return same DataType instance structure for same input', () => {
			// Arrange
			const value = 'test';

			// Act
			const dataType1 = DataType.fromValue(value);
			const dataType2 = DataType.fromValue(value);

			// Assert
			expect(dataType1.value).toBe(dataType2.value);
		});

		it('should have readonly value property', () => {
			// Arrange
			const dataType = DataType.fromValue('test');

			// Act & Assert
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing readonly property immutability
			(dataType as any).value = 'number';
			}).toThrow();
		});

		it('should correctly identify array before checking for object', () => {
			// Arrange - Arrays are objects in JavaScript, but should return 'array'
			const value: unknown = [1, 2, 3];

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('array');
			expect(typeof value).toBe('object'); // Verify arrays are indeed objects
		});

		it('should distinguish between null and undefined', () => {
			// Arrange
			const nullValue = null;
			const undefinedValue = undefined;

			// Act
			const nullDataType = DataType.fromValue(nullValue);
			const undefinedDataType = DataType.fromValue(undefinedValue);

			// Assert
			expect(nullDataType.value).toBe('null');
			expect(undefinedDataType.value).toBe('undefined');
			expect(nullDataType.value).not.toBe(undefinedDataType.value);
		});

		it('should prioritize null check before typeof operator', () => {
			// Arrange - null typeof is 'object', but should return 'null'
			const value = null;

			// Act
			const dataType = DataType.fromValue(value);

			// Assert
			expect(dataType.value).toBe('null');
			expect(typeof value).toBe('object'); // Verify null is typeof 'object'
		});
	});
});
