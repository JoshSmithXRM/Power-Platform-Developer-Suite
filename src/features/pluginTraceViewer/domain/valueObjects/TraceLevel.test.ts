import { TraceLevel } from './TraceLevel';

describe('TraceLevel', () => {
	describe('constants', () => {
		test.each([
			[TraceLevel.Off, 0],
			[TraceLevel.Exception, 1],
			[TraceLevel.All, 2]
		])('should have constant with value %i', (level, expectedValue) => {
			expect(level.value).toBe(expectedValue);
		});
	});

	describe('fromNumber', () => {
		test.each([
			[0, TraceLevel.Off],
			[1, TraceLevel.Exception],
			[2, TraceLevel.All]
		])('should create correct level from number %i', (value, expectedLevel) => {
			const level = TraceLevel.fromNumber(value);
			expect(level).toBe(expectedLevel);
		});

		test.each([
			[3, 'Invalid trace level: 3'],
			[-1, 'Invalid trace level: -1']
		])('should throw error for invalid value %i', (value, expectedError) => {
			expect(() => TraceLevel.fromNumber(value)).toThrow(expectedError);
		});
	});

	describe('fromString', () => {
		test.each([
			['Off', TraceLevel.Off],
			['Exception', TraceLevel.Exception],
			['All', TraceLevel.All]
		])('should create correct level from string "%s"', (value, expectedLevel) => {
			const level = TraceLevel.fromString(value);
			expect(level).toBe(expectedLevel);
		});

		test.each([
			['Invalid', 'Invalid trace level string: Invalid'],
			['all', 'Invalid trace level string: all']
		])('should throw error for invalid string "%s"', (value, expectedError) => {
			expect(() => TraceLevel.fromString(value)).toThrow(expectedError);
		});
	});

	describe('equals', () => {
		test.each([
			[TraceLevel.Off, TraceLevel.Off, true],
			[TraceLevel.Exception, TraceLevel.Exception, true],
			[TraceLevel.All, TraceLevel.All, true],
			[TraceLevel.Off, TraceLevel.Exception, false],
			[TraceLevel.Exception, TraceLevel.All, false],
			[TraceLevel.All, TraceLevel.Off, false]
		])('should return %s when comparing levels', (level1, level2, expected) => {
			expect(level1.equals(level2)).toBe(expected);
		});

		it('should return false for null', () => {
			expect(TraceLevel.Off.equals(null)).toBe(false);
		});
	});

	describe('isPerformanceIntensive', () => {
		test.each([
			[TraceLevel.All, true],
			[TraceLevel.Off, false],
			[TraceLevel.Exception, false]
		])('should return %s for level', (level, expected) => {
			expect(level.isPerformanceIntensive()).toBe(expected);
		});
	});
});
