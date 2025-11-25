/**
 * Unit tests for assertDefined assertion helper
 */

import { assertDefined } from './assertDefined';

describe('assertDefined', () => {
	describe('when value is defined', () => {
		it('should not throw when value is a string', () => {
			const value = 'test string';
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is a number', () => {
			const value = 42;
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is zero', () => {
			const value = 0;
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is false', () => {
			const value = false;
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is empty string', () => {
			const value = '';
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is an object', () => {
			const value = { key: 'value' };
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is an empty object', () => {
			const value = {};
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is an array', () => {
			const value = [1, 2, 3];
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should not throw when value is an empty array', () => {
			const value: unknown[] = [];
			expect(() => assertDefined(value)).not.toThrow();
		});

		it('should narrow type to T when value is defined', () => {
			const value: string | undefined = 'test';
			assertDefined(value);
			// If this compiles without error, type narrowing works
			// TypeScript will infer 'value' is 'string' here
			const strLength: number = value.length;
			expect(strLength).toBe(4);
		});
	});

	describe('when value is undefined', () => {
		it('should throw Error when value is undefined', () => {
			const value = undefined;
			expect(() => assertDefined(value)).toThrow(Error);
		});

		it('should throw Error with default message when value is undefined', () => {
			const value = undefined;
			expect(() => assertDefined(value)).toThrow('Expected value to be defined');
		});

		it('should throw Error with custom message when value is undefined and message provided', () => {
			const value = undefined;
			const customMessage = 'Custom error message';
			expect(() => assertDefined(value, customMessage)).toThrow(customMessage);
		});
	});

	describe('when value is null', () => {
		it('should throw Error when value is null', () => {
			const value = null;
			expect(() => assertDefined(value)).toThrow(Error);
		});

		it('should throw Error with default message when value is null', () => {
			const value = null;
			expect(() => assertDefined(value)).toThrow('Expected value to be defined');
		});

		it('should throw Error with custom message when value is null and message provided', () => {
			const value = null;
			const customMessage = 'Value must not be null';
			expect(() => assertDefined(value, customMessage)).toThrow(customMessage);
		});
	});

	describe('assertion narrowing', () => {
		it('should narrow type correctly with type guard', () => {
			const value: string | null | undefined = 'valid';
			assertDefined(value);
			// Type should be narrowed to string
			const length: number = value.length;
			expect(length).toBe(5);
		});

		it('should work with union types including primitives', () => {
			const value: number | undefined = 100;
			assertDefined(value);
			// Type should be narrowed to number
			const doubled: number = value * 2;
			expect(doubled).toBe(200);
		});

		it('should work with custom object types', () => {
			interface User {
				id: number;
				name: string;
			}

			const user: User | undefined = { id: 1, name: 'Alice' };
			assertDefined(user);
			expect(user.id).toBe(1);
			expect(user.name).toBe('Alice');
		});
	});

	describe('error message variations', () => {
		it('should use default message when no custom message provided', () => {
			const value: string | null = null;
			expect(() => assertDefined(value)).toThrow(Error);
		});

		it('should use custom message when provided', () => {
			const value: string | null = null;
			const customMsg = 'Value cannot be empty';
			expect(() => assertDefined(value, customMsg)).toThrow(customMsg);
		});

		it('should preserve custom message with special characters', () => {
			const value: string | undefined = undefined;
			const customMsg = 'Error: Value is required! (id: 123)';
			expect(() => assertDefined(value, customMsg)).toThrow(customMsg);
		});

		it('should preserve custom message with empty string', () => {
			const value: string | null = null;
			const customMsg = '';
			expect(() => assertDefined(value, customMsg)).toThrow('');
		});
	});
});
