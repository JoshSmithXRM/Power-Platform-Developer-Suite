/**
 * Unit tests for ErrorUtils
 */

import { normalizeError, isError } from './ErrorUtils';

describe('ErrorUtils', () => {
	describe('normalizeError', () => {
		it('should return Error instance unchanged', () => {
			const error = new Error('Test error');
			const result = normalizeError(error);

			expect(result).toBe(error);
			expect(result.message).toBe('Test error');
		});

		it('should convert string to Error', () => {
			const result = normalizeError('String error message');

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('String error message');
		});

		it('should convert empty string to Error', () => {
			const result = normalizeError('');

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('');
		});

		it('should extract message from object with message property', () => {
			const errorObj = { message: 'Error from object' };
			const result = normalizeError(errorObj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('Error from object');
		});

		it('should extract message even if object has other properties', () => {
			const errorObj = {
				message: 'Error message',
				code: 500,
				details: 'Some details'
			};
			const result = normalizeError(errorObj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('Error message');
		});

		it('should stringify object without message property', () => {
			const errorObj = { code: 404, reason: 'Not found' };
			const result = normalizeError(errorObj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(JSON.stringify(errorObj));
		});

		it('should stringify empty object', () => {
			const errorObj = {};
			const result = normalizeError(errorObj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('{}');
		});

		it('should handle object with non-string message property', () => {
			const errorObj = { message: 123 };
			const result = normalizeError(errorObj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(JSON.stringify(errorObj));
		});

		it('should convert number to Error', () => {
			const result = normalizeError(42);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('42');
		});

		it('should convert boolean to Error', () => {
			const result = normalizeError(true);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('true');
		});

		it('should convert undefined to Error', () => {
			const result = normalizeError(undefined);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('undefined');
		});

		it('should convert null to Error', () => {
			const result = normalizeError(null);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('null');
		});

		it('should convert symbol to Error', () => {
			const sym = Symbol('test');
			const result = normalizeError(sym);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('Symbol(test)');
		});

		it('should handle array', () => {
			const arr = [1, 2, 3];
			const result = normalizeError(arr);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe('[1,2,3]');
		});

		it('should handle custom Error subclass', () => {
			class CustomError extends Error {
				constructor(message: string, public code: number) {
					super(message);
					this.name = 'CustomError';
				}
			}

			const customError = new CustomError('Custom error', 500);
			const result = normalizeError(customError);

			expect(result).toBe(customError);
			expect(result.message).toBe('Custom error');
		});
	});

	describe('isError', () => {
		it('should return true for Error instance', () => {
			const error = new Error('Test error');
			expect(isError(error)).toBe(true);
		});

		it('should return true for Error subclass', () => {
			class CustomError extends Error {}
			const error = new CustomError('Custom error');
			expect(isError(error)).toBe(true);
		});

		it('should return false for string', () => {
			expect(isError('error message')).toBe(false);
		});

		it('should return false for object', () => {
			expect(isError({ message: 'error' })).toBe(false);
		});

		it('should return false for null', () => {
			expect(isError(null)).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isError(undefined)).toBe(false);
		});

		it('should return false for number', () => {
			expect(isError(42)).toBe(false);
		});

		it('should return false for boolean', () => {
			expect(isError(true)).toBe(false);
		});
	});

	describe('Real-world scenarios', () => {
		it('should handle error from rejected Promise', async () => {
			try {
				await Promise.reject('Async error');
			} catch (error) {
				const normalized = normalizeError(error);
				expect(normalized).toBeInstanceOf(Error);
				expect(normalized.message).toBe('Async error');
			}
		});

		it('should handle error from throw statement', () => {
			try {
				throw { code: 500, message: 'Server error' };
			} catch (error) {
				const normalized = normalizeError(error);
				expect(normalized).toBeInstanceOf(Error);
				expect(normalized.message).toBe('Server error');
			}
		});

		it('should handle error from third-party library', () => {
			const axiosLikeError = {
				message: 'Request failed',
				response: {
					status: 404,
					data: { error: 'Not found' }
				}
			};

			const normalized = normalizeError(axiosLikeError);
			expect(normalized).toBeInstanceOf(Error);
			expect(normalized.message).toBe('Request failed');
		});
	});
});
