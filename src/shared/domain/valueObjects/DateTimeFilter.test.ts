import { DateTimeFilter, ValidationError } from './DateTimeFilter';

describe('DateTimeFilter', () => {
	describe('fromLocalDateTime', () => {
		it('should convert local datetime to UTC ISO format', () => {
			// Note: Test will vary based on machine timezone
			// We test the conversion happens correctly, not specific timezone
			const localDateTime = '2025-11-10T16:46';
			const filter = DateTimeFilter.fromLocalDateTime(localDateTime);
			const utcIso = filter.getUtcIso();

			// Should be valid ISO 8601 with timezone
			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should handle midnight local time', () => {
			const filter = DateTimeFilter.fromLocalDateTime('2025-11-10T00:00');
			const utcIso = filter.getUtcIso();

			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should handle end of day local time', () => {
			const filter = DateTimeFilter.fromLocalDateTime('2025-11-10T23:59');
			const utcIso = filter.getUtcIso();

			expect(utcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should throw ValidationError for empty string', () => {
			expect(() => DateTimeFilter.fromLocalDateTime('')).toThrow(ValidationError);
			expect(() => DateTimeFilter.fromLocalDateTime('')).toThrow('Invalid local datetime');
		});

		it('should throw ValidationError for invalid datetime', () => {
			expect(() => DateTimeFilter.fromLocalDateTime('invalid')).toThrow(ValidationError);
			expect(() => DateTimeFilter.fromLocalDateTime('invalid')).toThrow('Invalid local datetime');
		});

		it('should throw ValidationError for malformed datetime', () => {
			expect(() => DateTimeFilter.fromLocalDateTime('2025-13-40T25:70')).toThrow(ValidationError);
		});
	});

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

	describe('toUtcIso', () => {
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

	describe('toLocalDateTime', () => {
		it('should convert UTC to local datetime-local format', () => {
			// Create a known UTC time
			const utcIso = '2025-11-11T08:00:00.000Z'; // 8 AM UTC
			const filter = DateTimeFilter.fromUtcIso(utcIso);
			const local = filter.getLocalDateTime();

			// Should be in YYYY-MM-DDTHH:MM format (no seconds, no timezone)
			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

			// Should NOT have seconds or timezone
			expect(local).not.toContain('Z');
			expect(local.split(':').length).toBe(2); // Only HH:MM
		});

		it('should handle UTC midnight', () => {
			const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:00:00.000Z');
			const local = filter.getLocalDateTime();

			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('should round-trip correctly (local → UTC → local)', () => {
			const originalLocal = '2025-11-10T16:46';
			const filter = DateTimeFilter.fromLocalDateTime(originalLocal);
			const roundTripped = filter.getLocalDateTime();

			// Should get back the same local time
			expect(roundTripped).toBe(originalLocal);
		});
	});

	describe('toODataFormat', () => {
		it('should remove milliseconds from UTC ISO format', () => {
			const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
			const odata = filter.getODataFormat();

			expect(odata).toBe('2025-11-11T00:46:00Z');
			expect(odata).not.toContain('.000');
		});

		it('should preserve UTC ISO format without milliseconds', () => {
			const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00Z');
			const odata = filter.getODataFormat();

			expect(odata).toBe('2025-11-11T00:46:00Z');
		});

		it('should produce Dataverse-compatible format', () => {
			const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.123Z');
			const odata = filter.getODataFormat();

			// Format must be: YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
			expect(odata).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
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

			// toUtcIso() returns a string, not a reference to internal state
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
			const odata = filter.getODataFormat();

			expect(odata).toBe('2024-12-31T23:59:59Z');
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

	describe('integration scenarios', () => {
		it('should handle typical user input flow', () => {
			// User enters datetime in local timezone
			const userInput = '2025-11-10T16:46';

			// Frontend converts to DateTimeFilter
			const filter = DateTimeFilter.fromLocalDateTime(userInput);

			// Backend stores UTC ISO
			const storedValue = filter.getUtcIso();
			expect(storedValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

			// Infrastructure formats for OData
			const odataValue = filter.getODataFormat();
			expect(odataValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

			// Frontend displays in local timezone
			const displayValue = filter.getLocalDateTime();
			expect(displayValue).toBe(userInput);
		});

		it('should handle loading from storage', () => {
			// Load stored UTC ISO value
			const storedValue = '2025-11-11T00:46:00.000Z';
			const filter = DateTimeFilter.fromUtcIso(storedValue);

			// Convert to local for display
			const local = filter.getLocalDateTime();
			expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

			// Format for OData query
			const odata = filter.getODataFormat();
			expect(odata).toBe('2025-11-11T00:46:00Z');
		});
	});
});
