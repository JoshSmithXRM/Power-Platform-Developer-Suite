import { TraceStatus } from './TraceStatus';

describe('TraceStatus', () => {
	describe('constants', () => {
		it('should have Success constant with value "Success"', () => {
			expect(TraceStatus.Success.value).toBe('Success');
		});

		it('should have Exception constant with value "Exception"', () => {
			expect(TraceStatus.Exception.value).toBe('Exception');
		});
	});

	describe('isException', () => {
		it('should return true for Exception status', () => {
			expect(TraceStatus.Exception.isException()).toBe(true);
		});

		it('should return false for Success status', () => {
			expect(TraceStatus.Success.isException()).toBe(false);
		});
	});

	describe('fromString', () => {
		it('should create Success status from "Success" string', () => {
			const status = TraceStatus.fromString('Success');
			expect(status).toBe(TraceStatus.Success);
			expect(status.value).toBe('Success');
		});

		it('should create Exception status from "Exception" string', () => {
			const status = TraceStatus.fromString('Exception');
			expect(status).toBe(TraceStatus.Exception);
			expect(status.value).toBe('Exception');
		});

		it('should create Exception status from "Failed" string', () => {
			const status = TraceStatus.fromString('Failed');
			expect(status).toBe(TraceStatus.Exception);
			expect(status.value).toBe('Exception');
		});

		it('should throw error for invalid status string', () => {
			expect(() => TraceStatus.fromString('Invalid')).toThrow('Invalid TraceStatus: unknown value "Invalid"');
		});

		it('should throw error for empty string', () => {
			expect(() => TraceStatus.fromString('')).toThrow('Invalid TraceStatus: unknown value ""');
		});

		it('should throw error for case-sensitive mismatch', () => {
			expect(() => TraceStatus.fromString('success')).toThrow('Invalid TraceStatus: unknown value "success"');
		});
	});

	describe('toString', () => {
		it('should return "Success" for Success status', () => {
			expect(TraceStatus.Success.toString()).toBe('Success');
		});

		it('should return "Exception" for Exception status', () => {
			expect(TraceStatus.Exception.toString()).toBe('Exception');
		});

		it('should return same value as .value property', () => {
			expect(TraceStatus.Success.toString()).toBe(TraceStatus.Success.value);
			expect(TraceStatus.Exception.toString()).toBe(TraceStatus.Exception.value);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			expect(TraceStatus.Success.equals(TraceStatus.Success)).toBe(true);
			expect(TraceStatus.Exception.equals(TraceStatus.Exception)).toBe(true);
		});

		it('should return false for different status', () => {
			expect(TraceStatus.Success.equals(TraceStatus.Exception)).toBe(false);
			expect(TraceStatus.Exception.equals(TraceStatus.Success)).toBe(false);
		});

		it('should return false for null', () => {
			expect(TraceStatus.Success.equals(null)).toBe(false);
		});
	});
});
