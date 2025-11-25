import { DateFormatter } from './DateFormatter';

describe('DateFormatter', () => {
	describe('formatDate', () => {
		it('should format a valid Date object to locale string', () => {
			const date = new Date('2023-01-15T10:30:00Z');
			const result = DateFormatter.formatDate(date);

			// Result should be a non-empty string (exact format depends on locale)
			expect(result).toBeTruthy();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		it('should return empty string for null date', () => {
			const result = DateFormatter.formatDate(null);
			expect(result).toBe('');
		});
	});

	describe('formatDuration', () => {
		it('should return empty string for null duration', () => {
			const result = DateFormatter.formatDuration(null);
			expect(result).toBe('');
		});

		it('should format duration with only seconds for durations < 60 seconds', () => {
			const durationMs = 23 * 1000; // 23 seconds
			expect(DateFormatter.formatDuration(durationMs)).toBe('23s');
		});

		it('should format duration with only seconds for exactly 0 seconds', () => {
			const durationMs = 0;
			expect(DateFormatter.formatDuration(durationMs)).toBe('0s');
		});

		it('should format duration with minutes and seconds for durations >= 60 seconds and < 1 hour', () => {
			const durationMs = 3 * 60 * 1000 + 45 * 1000; // 3m 45s
			expect(DateFormatter.formatDuration(durationMs)).toBe('3m 45s');
		});

		it('should format duration with minutes and seconds for exactly 1 minute', () => {
			const durationMs = 60 * 1000; // 1m 0s
			expect(DateFormatter.formatDuration(durationMs)).toBe('1m 0s');
		});

		it('should format duration with minutes and seconds for 59 minutes', () => {
			const durationMs = 59 * 60 * 1000 + 30 * 1000; // 59m 30s
			expect(DateFormatter.formatDuration(durationMs)).toBe('59m 30s');
		});

		it('should format duration with hours and minutes for durations >= 1 hour', () => {
			const durationMs = 2 * 60 * 60 * 1000 + 15 * 60 * 1000; // 2h 15m
			expect(DateFormatter.formatDuration(durationMs)).toBe('2h 15m');
		});

		it('should format duration with hours and minutes for exactly 1 hour', () => {
			const durationMs = 60 * 60 * 1000; // 1h 0m
			expect(DateFormatter.formatDuration(durationMs)).toBe('1h 0m');
		});

		it('should format duration with hours and minutes for multiple hours', () => {
			const durationMs = 5 * 60 * 60 * 1000 + 42 * 60 * 1000; // 5h 42m
			expect(DateFormatter.formatDuration(durationMs)).toBe('5h 42m');
		});

		it('should format duration with hours and 0 minutes', () => {
			const durationMs = 3 * 60 * 60 * 1000; // 3h 0m
			expect(DateFormatter.formatDuration(durationMs)).toBe('3h 0m');
		});
	});
});
