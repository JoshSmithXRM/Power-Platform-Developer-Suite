import { RelativeTimeFormatter } from './RelativeTimeFormatter';

describe('RelativeTimeFormatter', () => {
	describe('formatRelativeTime', () => {
		it('should return "Never" for undefined date', () => {
			const result = RelativeTimeFormatter.formatRelativeTime(undefined);
			expect(result).toBe('Never');
		});

		it('should return "Just now" for date less than 1 minute ago', () => {
			const now = new Date();
			const thirtySecondsAgo = new Date(now.getTime() - 30000); // 30 seconds ago

			const result = RelativeTimeFormatter.formatRelativeTime(thirtySecondsAgo);

			expect(result).toBe('Just now');
		});

		it('should return "1 minute ago" for exactly 1 minute ago', () => {
			const now = new Date();
			const oneMinuteAgo = new Date(now.getTime() - 60000); // 60 seconds = 1 minute

			const result = RelativeTimeFormatter.formatRelativeTime(oneMinuteAgo);

			expect(result).toBe('1 minute ago');
		});

		it('should return plural minutes for multiple minutes ago', () => {
			const now = new Date();
			const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000); // 5 minutes

			const result = RelativeTimeFormatter.formatRelativeTime(fiveMinutesAgo);

			expect(result).toBe('5 minutes ago');
		});

		it('should return "1 hour ago" for exactly 1 hour ago', () => {
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 60 * 60000); // 60 minutes = 1 hour

			const result = RelativeTimeFormatter.formatRelativeTime(oneHourAgo);

			expect(result).toBe('1 hour ago');
		});

		it('should return plural hours for multiple hours ago', () => {
			const now = new Date();
			const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60000); // 3 hours

			const result = RelativeTimeFormatter.formatRelativeTime(threeHoursAgo);

			expect(result).toBe('3 hours ago');
		});

		it('should return "1 day ago" for exactly 1 day ago', () => {
			const now = new Date();
			const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60000); // 24 hours = 1 day

			const result = RelativeTimeFormatter.formatRelativeTime(oneDayAgo);

			expect(result).toBe('1 day ago');
		});

		it('should return plural days for multiple days ago', () => {
			const now = new Date();
			const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60000); // 3 days

			const result = RelativeTimeFormatter.formatRelativeTime(threeDaysAgo);

			expect(result).toBe('3 days ago');
		});

		it('should return localized date string for 7 days or more ago', () => {
			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60000); // 7 days

			const result = RelativeTimeFormatter.formatRelativeTime(sevenDaysAgo);

			expect(result).toBe(sevenDaysAgo.toLocaleDateString());
		});

		it('should return localized date string for dates more than 7 days ago', () => {
			const now = new Date();
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60000); // 30 days

			const result = RelativeTimeFormatter.formatRelativeTime(thirtyDaysAgo);

			expect(result).toBe(thirtyDaysAgo.toLocaleDateString());
		});
	});
});
