import { DateTimeFilter, ValidationError } from './DateTimeFilter';
import { localDateTimeToUtc, utcToLocalDateTime } from '../../presentation/utils/DateTimeFormatters';
import { formatDateForOData } from '../../../features/pluginTraceViewer/domain/utils/ODataFormatters';

describe('DateTimeFilter', () => {
	describe('fromUtcIso', () => {
		it('should accept valid UTC ISO format with milliseconds', () => {
			const utcIso = '2025-11-11T00:46:00.000Z';
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			expect(filter.getUtcIso()).toBe(utcIso);
		});

		it('should accept valid UTC ISO format without milliseconds', () => {
			const utcIso = '2025-11-11T00:46:00Z';
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			expect(filter.getUtcIso()).toBe(utcIso);
		});

		it('should throw ValidationError for empty string', () => {
			expect(() => DateTimeFilter.fromUtcIso('')).toThrow(ValidationError);
			expect(() => DateTimeFilter.fromUtcIso('')).toThrow('Invalid UTC ISO datetime');
		});

		it('should throw ValidationError for invalid UTC ISO', () => {
			expect(() => DateTimeFilter.fromUtcIso('invalid')).toThrow(ValidationError);
		});

		it('should throw ValidationError for local datetime format', () => {
			// Should reject datetime-local format (missing timezone)
			expect(() => DateTimeFilter.fromUtcIso('2025-11-10T16:46')).toThrow(ValidationError);
		});

		it('should throw ValidationError for malformed ISO', () => {
			expect(() => DateTimeFilter.fromUtcIso('2025-13-40T25:70:00Z')).toThrow(ValidationError);
		});
	});

	describe('getUtcIso', () => {
		it('should return canonical UTC ISO format', () => {
			const utcIso = '2025-11-11T00:46:00.000Z';
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			expect(filter.getUtcIso()).toBe(utcIso);
		});

		it('should preserve original UTC ISO format', () => {
			const utcIso = '2025-11-11T00:46:00Z';
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			expect(filter.getUtcIso()).toBe(utcIso);
		});
	});

	describe('equals', () => {
		it('should return true for filters with same UTC value', () => {
			const filter1 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
			const filter2 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');

			expect(filter1.equals(filter2)).toBe(true);
		});

		it('should return false for filters with different UTC values', () => {
			const filter1 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
			const filter2 = DateTimeFilter.fromUtcIso('2025-11-11T01:46:00.000Z');

			expect(filter1.equals(filter2)).toBe(false);
		});

		it('should handle different millisecond precision', () => {
			const filter1 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
			const filter2 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00Z');

			// Different string representations but same instant in time
			// equals() compares string representation, so these are different
			expect(filter1.equals(filter2)).toBe(false);
		});
	});

	describe('immutability', () => {
		it('should be immutable', () => {
			const utcIso = '2025-11-11T00:46:00.000Z';
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			// getUtcIso() returns a string, not a reference to internal state
			const utc1 = filter.getUtcIso();
			const utc2 = filter.getUtcIso();

			expect(utc1).toBe(utcIso);
			expect(utc2).toBe(utcIso);
			expect(utc1).toBe(utc2);
		});
	});

	describe('edge cases', () => {
		it('should handle leap year dates', () => {
			const filter = DateTimeFilter.fromUtcIso('2024-02-29T12:00:00.000Z');

			expect(filter.getUtcIso()).toBe('2024-02-29T12:00:00.000Z');
		});

		it('should handle year boundaries', () => {
			const filter = DateTimeFilter.fromUtcIso('2024-12-31T23:59:59.999Z');

			expect(filter.getUtcIso()).toBe('2024-12-31T23:59:59.999Z');
		});

		it('should handle far future dates', () => {
			const filter = DateTimeFilter.fromUtcIso('2099-12-31T23:59:59.000Z');

			expect(filter.getUtcIso()).toBe('2099-12-31T23:59:59.000Z');
		});

		it('should handle past dates', () => {
			const filter = DateTimeFilter.fromUtcIso('2020-01-01T00:00:00.000Z');

			expect(filter.getUtcIso()).toBe('2020-01-01T00:00:00.000Z');
		});
	});
});

// Tests for presentation layer helpers (moved from DateTimeFilter)
describe('DateTimeFormatters (presentation helpers)', () => {
	describe('localDateTimeToUtc', () => {
		it('should convert local datetime to UTC ISO format', () => {
			// Note: Test will vary based on machine timezone
			// We test the conversion happens correctly, not specific timezone
			const localDateTime = '2025-11-10T16:46';
			const utcIso = localDateTimeToUtc(localDateTime);

			// Should be valid ISO 8601 with timezone
			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should handle midnight local time', () => {
			const utcIso = localDateTimeToUtc('2025-11-10T00:00');

			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should handle end of day local time', () => {
			const utcIso = localDateTimeToUtc('2025-11-10T23:59');

			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should throw Error for empty string', () => {
			expect(() => localDateTimeToUtc('')).toThrow(Error);
			expect(() => localDateTimeToUtc('')).toThrow('Invalid local datetime');
		});

		it('should throw Error for invalid datetime', () => {
			expect(() => localDateTimeToUtc('invalid')).toThrow(Error);
			expect(() => localDateTimeToUtc('invalid')).toThrow('Invalid local datetime');
		});

		it('should throw Error for malformed datetime', () => {
			expect(() => localDateTimeToUtc('2025-13-40T25:70')).toThrow(Error);
		});
	});

	describe('utcToLocalDateTime', () => {
		it('should convert UTC to local datetime-local format', () => {
			// Create a known UTC time
			const utcIso = '2025-11-11T08:00:00.000Z'; // 8 AM UTC
			const local = utcToLocalDateTime(utcIso);

			// Should be in YYYY-MM-DDTHH:MM format (no seconds, no timezone)
			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

			// Should NOT have seconds or timezone
			expect(local).not.toContain('Z');
			expect(local.split(':').length).toBe(2); // Only HH:MM
		});

		it('should handle UTC midnight', () => {
			const local = utcToLocalDateTime('2025-11-11T00:00:00.000Z');

			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('should round-trip correctly (local → UTC → local)', () => {
			const originalLocal = '2025-11-10T16:46';
			const utcIso = localDateTimeToUtc(originalLocal);
			const roundTripped = utcToLocalDateTime(utcIso);

			// Should get back the same local time
			expect(roundTripped).toBe(originalLocal);
		});

		it('should throw Error for invalid UTC ISO', () => {
			expect(() => utcToLocalDateTime('invalid')).toThrow(Error);
			expect(() => utcToLocalDateTime('invalid')).toThrow('Invalid UTC ISO datetime');
		});
	});

	describe('integration scenarios', () => {
		it('should handle typical user input flow', () => {
			// User enters datetime in local timezone
			const userInput = '2025-11-10T16:46';

			// Frontend converts to UTC ISO
			const utcIso = localDateTimeToUtc(userInput);
			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

			// Create domain object
			const filter = DateTimeFilter.fromUtcIso(utcIso);

			// Backend stores UTC ISO
			const storedValue = filter.getUtcIso();
			expect(storedValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

			// Infrastructure formats for OData
			const odataValue = formatDateForOData(storedValue);
			expect(odataValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

			// Frontend displays in local timezone
			const displayValue = utcToLocalDateTime(storedValue);
			expect(displayValue).toBe(userInput);
		});

		it('should handle loading from storage', () => {
			// Load stored UTC ISO value
			const storedValue = '2025-11-11T00:46:00.000Z';
			const filter = DateTimeFilter.fromUtcIso(storedValue);

			// Convert to local for display
			const local = utcToLocalDateTime(filter.getUtcIso());
			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

			// Format for OData query
			const odata = formatDateForOData(filter.getUtcIso());
			expect(odata).toBe('2025-11-11T00:46:00Z');
		});
	});
});

// Tests for infrastructure layer helpers (moved from DateTimeFilter)
describe('ODataFormatters (infrastructure helpers)', () => {
	describe('formatDateForOData', () => {
		it('should remove milliseconds from UTC ISO format', () => {
			const utcIso = '2025-11-11T00:46:00.000Z';
			const odata = formatDateForOData(utcIso);

			expect(odata).toBe('2025-11-11T00:46:00Z');
			expect(odata).not.toContain('.000');
		});

		it('should preserve UTC ISO format without milliseconds', () => {
			const utcIso = '2025-11-11T00:46:00Z';
			const odata = formatDateForOData(utcIso);

			expect(odata).toBe('2025-11-11T00:46:00Z');
		});

		it('should produce Dataverse-compatible format', () => {
			const utcIso = '2025-11-11T00:46:00.123Z';
			const odata = formatDateForOData(utcIso);

			// Format must be: YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
			expect(odata).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
		});

		it('should handle year boundaries', () => {
			const utcIso = '2024-12-31T23:59:59.999Z';
			const odata = formatDateForOData(utcIso);

			expect(odata).toBe('2024-12-31T23:59:59Z');
		});
	});
});
