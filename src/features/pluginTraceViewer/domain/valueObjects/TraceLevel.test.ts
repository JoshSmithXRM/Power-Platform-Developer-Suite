import { TraceLevel } from './TraceLevel';

describe('TraceLevel', () => {
	describe('constants', () => {
		it('should have Off constant with value 0', () => {
			expect(TraceLevel.Off.value).toBe(0);
		});

		it('should have Exception constant with value 1', () => {
			expect(TraceLevel.Exception.value).toBe(1);
		});

		it('should have All constant with value 2', () => {
			expect(TraceLevel.All.value).toBe(2);
		});
	});

	describe('fromNumber', () => {
		it('should create Off from 0', () => {
			const level = TraceLevel.fromNumber(0);
			expect(level).toBe(TraceLevel.Off);
		});

		it('should create Exception from 1', () => {
			const level = TraceLevel.fromNumber(1);
			expect(level).toBe(TraceLevel.Exception);
		});

		it('should create All from 2', () => {
			const level = TraceLevel.fromNumber(2);
			expect(level).toBe(TraceLevel.All);
		});

		it('should throw error for invalid value', () => {
			expect(() => TraceLevel.fromNumber(3)).toThrow('Invalid trace level: 3');
		});

		it('should throw error for negative value', () => {
			expect(() => TraceLevel.fromNumber(-1)).toThrow('Invalid trace level: -1');
		});
	});

	describe('fromString', () => {
		it('should create Off from "Off"', () => {
			const level = TraceLevel.fromString('Off');
			expect(level).toBe(TraceLevel.Off);
		});

		it('should create Exception from "Exception"', () => {
			const level = TraceLevel.fromString('Exception');
			expect(level).toBe(TraceLevel.Exception);
		});

		it('should create All from "All"', () => {
			const level = TraceLevel.fromString('All');
			expect(level).toBe(TraceLevel.All);
		});

		it('should throw error for invalid string', () => {
			expect(() => TraceLevel.fromString('Invalid')).toThrow('Invalid trace level string: Invalid');
		});

		it('should throw error for lowercase string', () => {
			expect(() => TraceLevel.fromString('all')).toThrow('Invalid trace level string: all');
		});
	});

	describe('equals', () => {
		it('should return true for same trace level', () => {
			expect(TraceLevel.Off.equals(TraceLevel.Off)).toBe(true);
			expect(TraceLevel.Exception.equals(TraceLevel.Exception)).toBe(true);
			expect(TraceLevel.All.equals(TraceLevel.All)).toBe(true);
		});

		it('should return false for different trace levels', () => {
			expect(TraceLevel.Off.equals(TraceLevel.Exception)).toBe(false);
			expect(TraceLevel.Exception.equals(TraceLevel.All)).toBe(false);
			expect(TraceLevel.All.equals(TraceLevel.Off)).toBe(false);
		});

		it('should return false for null', () => {
			expect(TraceLevel.Off.equals(null)).toBe(false);
		});
	});

	describe('isPerformanceIntensive', () => {
		it('should return true for All level', () => {
			expect(TraceLevel.All.isPerformanceIntensive()).toBe(true);
		});

		it('should return false for Off level', () => {
			expect(TraceLevel.Off.isPerformanceIntensive()).toBe(false);
		});

		it('should return false for Exception level', () => {
			expect(TraceLevel.Exception.isPerformanceIntensive()).toBe(false);
		});
	});
});
