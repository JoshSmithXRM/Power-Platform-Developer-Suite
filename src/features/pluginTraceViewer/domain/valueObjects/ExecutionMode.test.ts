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

	describe('fromString', () => {
		test.each([
			['Synchronous', ExecutionMode.Synchronous],
			['Asynchronous', ExecutionMode.Asynchronous]
		])('should create correct mode from string "%s"', (value, expectedMode) => {
			const mode = ExecutionMode.fromString(value);
			expect(mode).toBe(expectedMode);
		});

		test.each([
			['synchronous', 'Invalid ExecutionMode: unknown string value "synchronous"'],
			['Unknown', 'Invalid ExecutionMode: unknown string value "Unknown"'],
			['', 'Invalid ExecutionMode: unknown string value ""']
		])('should throw error for invalid string "%s"', (value, expectedError) => {
			expect(() => ExecutionMode.fromString(value)).toThrow(expectedError);
		});
	});

	describe('toNumber', () => {
		it('should return 0 for Synchronous', () => {
			expect(ExecutionMode.Synchronous.toNumber()).toBe(0);
		});

		it('should return 1 for Asynchronous', () => {
			expect(ExecutionMode.Asynchronous.toNumber()).toBe(1);
		});
	});

	describe('toString', () => {
		it('should return "Synchronous" for Synchronous mode', () => {
			expect(ExecutionMode.Synchronous.toString()).toBe('Synchronous');
		});

		it('should return "Asynchronous" for Asynchronous mode', () => {
			expect(ExecutionMode.Asynchronous.toString()).toBe('Asynchronous');
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
