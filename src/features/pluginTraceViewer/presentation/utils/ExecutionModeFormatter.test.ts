/**
 * Tests for ExecutionModeFormatter presentation utility.
 * Validates display name formatting for ExecutionMode value objects.
 */

import { ExecutionModeFormatter } from './ExecutionModeFormatter';
import { ExecutionMode } from '../../application/types';

describe('ExecutionModeFormatter', () => {
	describe('getDisplayName', () => {
		it('should return "Synchronous" for ExecutionMode.Synchronous', () => {
			expect(ExecutionModeFormatter.getDisplayName(ExecutionMode.Synchronous)).toBe('Synchronous');
		});

		it('should return "Asynchronous" for ExecutionMode.Asynchronous', () => {
			expect(ExecutionModeFormatter.getDisplayName(ExecutionMode.Asynchronous)).toBe('Asynchronous');
		});

		it('should return "Unknown" for invalid execution mode value', () => {
			// Create an invalid ExecutionMode for testing (not part of Type-Safe Enum)
			const invalidMode = { value: 999 } as ExecutionMode;
			expect(ExecutionModeFormatter.getDisplayName(invalidMode)).toBe('Unknown');
		});

		it('should handle all valid execution mode values', () => {
			const modes = [ExecutionMode.Synchronous, ExecutionMode.Asynchronous];
			const displayNames = ['Synchronous', 'Asynchronous'];

			modes.forEach((mode, index) => {
				expect(ExecutionModeFormatter.getDisplayName(mode)).toBe(displayNames[index]);
			});
		});
	});
});
