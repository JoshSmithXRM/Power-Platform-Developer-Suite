import { ExecutionMode } from './ExecutionMode';

describe('ExecutionMode', () => {
	describe('constants', () => {
		test.each([
			[ExecutionMode.Synchronous, 0],
			[ExecutionMode.Asynchronous, 1]
		])('should have constant with value %i', (mode, expectedValue) => {
			expect(mode.value).toBe(expectedValue);
		});
	});

	describe('fromNumber', () => {
		test.each([
			[0, ExecutionMode.Synchronous],
			[1, ExecutionMode.Asynchronous]
		])('should create correct mode from number %i', (value, expectedMode) => {
			const mode = ExecutionMode.fromNumber(value);
			expect(mode).toBe(expectedMode);
		});

		test.each([
			[2, 'Invalid ExecutionMode: unknown numeric value 2'],
			[-1, 'Invalid ExecutionMode: unknown numeric value -1']
		])('should throw error for invalid value %i', (value, expectedError) => {
			expect(() => ExecutionMode.fromNumber(value)).toThrow(expectedError);
		});
	});

	describe('isSynchronous', () => {
		test.each([
			[ExecutionMode.Synchronous, true],
			[ExecutionMode.Asynchronous, false]
		])('should return %s for mode', (mode, expected) => {
			expect(mode.isSynchronous()).toBe(expected);
		});
	});

	describe('equals', () => {
		test.each([
			[ExecutionMode.Synchronous, ExecutionMode.Synchronous, true],
			[ExecutionMode.Asynchronous, ExecutionMode.Asynchronous, true],
			[ExecutionMode.Synchronous, ExecutionMode.Asynchronous, false],
			[ExecutionMode.Asynchronous, ExecutionMode.Synchronous, false]
		])('should return %s when comparing modes', (mode1, mode2, expected) => {
			expect(mode1.equals(mode2)).toBe(expected);
		});

		it('should return false for null', () => {
			expect(ExecutionMode.Synchronous.equals(null)).toBe(false);
		});
	});
});
