import { Duration } from '../../application/types';
import { DurationFormatter } from './DurationFormatter';

describe('DurationFormatter', () => {
	describe('format', () => {
		it('should format duration as milliseconds for durations < 1 second', () => {
			const duration = Duration.fromMilliseconds(500);
			expect(DurationFormatter.format(duration)).toBe('500ms');
		});

		it('should format duration as milliseconds for zero duration', () => {
			const duration = Duration.fromMilliseconds(0);
			expect(DurationFormatter.format(duration)).toBe('0ms');
		});

		it('should format duration as milliseconds for 999ms', () => {
			const duration = Duration.fromMilliseconds(999);
			expect(DurationFormatter.format(duration)).toBe('999ms');
		});

		it('should format duration as seconds with 1 decimal place for durations >= 1 second and < 1 minute', () => {
			const duration = Duration.fromMilliseconds(3200);
			expect(DurationFormatter.format(duration)).toBe('3.2s');
		});

		it('should format duration as seconds for exactly 1 second', () => {
			const duration = Duration.fromMilliseconds(1000);
			expect(DurationFormatter.format(duration)).toBe('1.0s');
		});

		it('should format duration as seconds for 59.9 seconds', () => {
			const duration = Duration.fromMilliseconds(59900);
			expect(DurationFormatter.format(duration)).toBe('59.9s');
		});

		it('should format duration with minutes and seconds for durations >= 1 minute', () => {
			const duration = Duration.fromMilliseconds(125000); // 2m 5s
			expect(DurationFormatter.format(duration)).toBe('2m 5s');
		});

		it('should format duration as 1m 0s for exactly 1 minute', () => {
			const duration = Duration.fromMilliseconds(60000);
			expect(DurationFormatter.format(duration)).toBe('1m 0s');
		});

		it('should format duration as 5m 30s', () => {
			const duration = Duration.fromMilliseconds(330000); // 5.5 minutes
			expect(DurationFormatter.format(duration)).toBe('5m 30s');
		});

		it('should format duration with no decimal places for seconds in minute format', () => {
			const duration = Duration.fromMilliseconds(125500); // 2m 5.5s
			expect(DurationFormatter.format(duration)).toBe('2m 6s'); // Rounds to 6s
		});
	});
});
