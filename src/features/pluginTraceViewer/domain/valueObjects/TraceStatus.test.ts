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

	describe('isError', () => {
		it('should return true for Exception status', () => {
			expect(TraceStatus.Exception.isError()).toBe(true);
		});

		it('should return false for Success status', () => {
			expect(TraceStatus.Success.isError()).toBe(false);
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
