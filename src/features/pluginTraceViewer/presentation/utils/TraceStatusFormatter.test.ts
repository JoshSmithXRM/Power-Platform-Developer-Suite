import { TraceStatusFormatter } from './TraceStatusFormatter';
import { TraceStatus } from '../../application/types';

describe('TraceStatusFormatter', () => {
	describe('getDisplayName', () => {
		it('should return "Success" for Success status', () => {
			const result = TraceStatusFormatter.getDisplayName(TraceStatus.Success);
			expect(result).toBe('Success');
		});

		it('should return "Exception" for Exception status', () => {
			const result = TraceStatusFormatter.getDisplayName(TraceStatus.Exception);
			expect(result).toBe('Exception');
		});

		it('should return the status value property', () => {
			expect(TraceStatusFormatter.getDisplayName(TraceStatus.Success)).toBe(TraceStatus.Success.value);
			expect(TraceStatusFormatter.getDisplayName(TraceStatus.Exception)).toBe(TraceStatus.Exception.value);
		});
	});

	describe('getBadgeClass', () => {
		it('should return "status-success" for Success status', () => {
			const result = TraceStatusFormatter.getBadgeClass(TraceStatus.Success);
			expect(result).toBe('status-success');
		});

		it('should return "status-exception" for Exception status', () => {
			const result = TraceStatusFormatter.getBadgeClass(TraceStatus.Exception);
			expect(result).toBe('status-exception');
		});

		it('should return empty string for unknown status value', () => {
			// Create a TraceStatus with an unknown value by bypassing the factory
			// This tests the default case in the switch statement
			const unknownStatus = Object.create(TraceStatus.prototype);
			Object.defineProperty(unknownStatus, 'value', {
				value: 'Unknown',
				writable: false,
				enumerable: true,
				configurable: false
			});

			const result = TraceStatusFormatter.getBadgeClass(unknownStatus);
			expect(result).toBe('');
		});
	});
});
