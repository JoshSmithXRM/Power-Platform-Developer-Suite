/**
 * Tests for TraceLevelFormatter presentation utility.
 * Validates display name formatting for TraceLevel value objects.
 */

import { TraceLevelFormatter } from './TraceLevelFormatter';
import { TraceLevel } from '../../domain/valueObjects/TraceLevel';

describe('TraceLevelFormatter', () => {
	describe('getDisplayName', () => {
		it('should return "Off" for TraceLevel.Off', () => {
			expect(TraceLevelFormatter.getDisplayName(TraceLevel.Off)).toBe('Off');
		});

		it('should return "Exception" for TraceLevel.Exception', () => {
			expect(TraceLevelFormatter.getDisplayName(TraceLevel.Exception)).toBe('Exception');
		});

		it('should return "All" for TraceLevel.All', () => {
			expect(TraceLevelFormatter.getDisplayName(TraceLevel.All)).toBe('All');
		});

		it('should return "Unknown" for invalid trace level value', () => {
			// Create an invalid TraceLevel for testing (not part of Type-Safe Enum)
			const invalidLevel = { value: 999 } as TraceLevel;
			expect(TraceLevelFormatter.getDisplayName(invalidLevel)).toBe('Unknown');
		});

		it('should handle all valid trace level values', () => {
			const levels = [TraceLevel.Off, TraceLevel.Exception, TraceLevel.All];
			const displayNames = ['Off', 'Exception', 'All'];

			levels.forEach((level, index) => {
				expect(TraceLevelFormatter.getDisplayName(level)).toBe(displayNames[index]);
			});
		});
	});
});
