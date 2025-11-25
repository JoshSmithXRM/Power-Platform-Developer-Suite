import { Duration } from './Duration';

describe('Duration', () => {
	describe('fromMilliseconds', () => {
		it('should create duration when valid milliseconds provided', () => {
			const duration = Duration.fromMilliseconds(1000);
			expect(duration.milliseconds).toBe(1000);
		});

		it('should create duration when zero milliseconds provided', () => {
			const duration = Duration.fromMilliseconds(0);
			expect(duration.milliseconds).toBe(0);
		});

		it('should throw error when negative milliseconds provided', () => {
			expect(() => Duration.fromMilliseconds(-1)).toThrow('Cannot be negative');
		});
	});

	describe('isSlowerThan', () => {
		it('should return true when duration is slower than other', () => {
			const slower = Duration.fromMilliseconds(2000);
			const faster = Duration.fromMilliseconds(1000);
			expect(slower.isSlowerThan(faster)).toBe(true);
		});

		it('should return false when duration is faster than other', () => {
			const faster = Duration.fromMilliseconds(1000);
			const slower = Duration.fromMilliseconds(2000);
			expect(faster.isSlowerThan(slower)).toBe(false);
		});

		it('should return false when durations are equal', () => {
			const duration1 = Duration.fromMilliseconds(1000);
			const duration2 = Duration.fromMilliseconds(1000);
			expect(duration1.isSlowerThan(duration2)).toBe(false);
		});
	});

	describe('add', () => {
		it('should add two durations when both are valid', () => {
			const duration1 = Duration.fromMilliseconds(500);
			const duration2 = Duration.fromMilliseconds(300);
			const result = duration1.add(duration2);
			expect(result.milliseconds).toBe(800);
		});

		it('should return new duration instance when adding durations', () => {
			const duration1 = Duration.fromMilliseconds(500);
			const duration2 = Duration.fromMilliseconds(300);
			const result = duration1.add(duration2);
			expect(result).not.toBe(duration1);
			expect(result).not.toBe(duration2);
		});

		it('should not modify original durations when adding', () => {
			const duration1 = Duration.fromMilliseconds(500);
			const duration2 = Duration.fromMilliseconds(300);
			duration1.add(duration2);
			expect(duration1.milliseconds).toBe(500);
			expect(duration2.milliseconds).toBe(300);
		});

		it('should handle adding zero duration when zero is added', () => {
			const duration = Duration.fromMilliseconds(500);
			const zero = Duration.fromMilliseconds(0);
			const result = duration.add(zero);
			expect(result.milliseconds).toBe(500);
		});
	});
});
