import { ClearAllValidationResult } from './ClearAllValidationResult';

describe('ClearAllValidationResult', () => {
	describe('create', () => {
		it('should create instance with valid counts', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(5, 3);

			// Assert
			expect(result).toBeInstanceOf(ClearAllValidationResult);
			expect(result.clearableCount).toBe(5);
			expect(result.protectedCount).toBe(3);
		});

		it('should create instance with zero clearable count', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(0, 5);

			// Assert
			expect(result).toBeInstanceOf(ClearAllValidationResult);
			expect(result.clearableCount).toBe(0);
			expect(result.protectedCount).toBe(5);
		});

		it('should create instance with zero protected count', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(10, 0);

			// Assert
			expect(result).toBeInstanceOf(ClearAllValidationResult);
			expect(result.clearableCount).toBe(10);
			expect(result.protectedCount).toBe(0);
		});

		it('should create instance with both counts zero', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(0, 0);

			// Assert
			expect(result).toBeInstanceOf(ClearAllValidationResult);
			expect(result.clearableCount).toBe(0);
			expect(result.protectedCount).toBe(0);
		});

		it('should create instance with large counts', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(1000000, 500000);

			// Assert
			expect(result.clearableCount).toBe(1000000);
			expect(result.protectedCount).toBe(500000);
		});
	});

	describe('clearableCount getter', () => {
		it('should return clearable count correctly', () => {
			// Arrange
			const result = ClearAllValidationResult.create(7, 2);

			// Act & Assert
			expect(result.clearableCount).toBe(7);
		});

		it('should return zero clearable count', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 10);

			// Act & Assert
			expect(result.clearableCount).toBe(0);
		});

		it('should return clearable count with single entry', () => {
			// Arrange
			const result = ClearAllValidationResult.create(1, 5);

			// Act & Assert
			expect(result.clearableCount).toBe(1);
		});
	});

	describe('protectedCount getter', () => {
		it('should return protected count correctly', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 3);

			// Act & Assert
			expect(result.protectedCount).toBe(3);
		});

		it('should return zero protected count', () => {
			// Arrange
			const result = ClearAllValidationResult.create(10, 0);

			// Act & Assert
			expect(result.protectedCount).toBe(0);
		});

		it('should return protected count with single entry', () => {
			// Arrange
			const result = ClearAllValidationResult.create(8, 1);

			// Act & Assert
			expect(result.protectedCount).toBe(1);
		});
	});

	describe('hasClearableEntries', () => {
		it('should return true when clearable count is greater than zero', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 0);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(true);
		});

		it('should return true when clearable count is 1', () => {
			// Arrange
			const result = ClearAllValidationResult.create(1, 10);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(true);
		});

		it('should return true when clearable and protected counts are both positive', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 3);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(true);
		});

		it('should return false when clearable count is zero', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 5);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(false);
		});

		it('should return false when both counts are zero', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 0);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(false);
		});

		it('should return false when all entries are protected', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 100);

			// Act & Assert
			expect(result.hasClearableEntries()).toBe(false);
		});
	});

	describe('getConfirmationMessage', () => {
		it('should generate message with clearable and protected counts', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 3);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('5');
			expect(message).toContain('3');
			expect(message).toContain('clear');
			expect(message).toContain('protected');
			expect(message).toContain('cannot be undone');
		});

		it('should generate message with only clearable entries', () => {
			// Arrange
			const result = ClearAllValidationResult.create(10, 0);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('10');
			expect(message).toContain('0');
			expect(message).toContain('cannot be undone');
		});

		it('should generate message with only protected entries', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 8);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('0');
			expect(message).toContain('8');
			expect(message).toContain('cannot be undone');
		});

		it('should generate message with no entries', () => {
			// Arrange
			const result = ClearAllValidationResult.create(0, 0);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('0');
			expect(message).toContain('cannot be undone');
		});

		it('should generate message with single clearable entry', () => {
			// Arrange
			const result = ClearAllValidationResult.create(1, 5);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('1 entries');
			expect(message).toContain('5');
		});

		it('should generate message with single protected entry', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 1);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('5');
			expect(message).toContain('1');
		});

		it('should generate message with large counts', () => {
			// Arrange
			const result = ClearAllValidationResult.create(1000000, 500000);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toContain('1000000');
			expect(message).toContain('500000');
			expect(message).toContain('cannot be undone');
		});

		it('should always include warning about irreversibility', () => {
			// Arrange
			const result1 = ClearAllValidationResult.create(5, 3);
			const result2 = ClearAllValidationResult.create(0, 0);
			const result3 = ClearAllValidationResult.create(100, 0);

			// Act
			const message1 = result1.getConfirmationMessage();
			const message2 = result2.getConfirmationMessage();
			const message3 = result3.getConfirmationMessage();

			// Assert
			expect(message1).toContain('cannot be undone');
			expect(message2).toContain('cannot be undone');
			expect(message3).toContain('cannot be undone');
		});

		it('should have consistent message format', () => {
			// Arrange
			const result = ClearAllValidationResult.create(7, 2);

			// Act
			const message = result.getConfirmationMessage();

			// Assert
			expect(message).toMatch(/This will clear \d+ entries\./);
			expect(message).toMatch(/\d+ protected entries will be preserved\./);
			expect(message).toMatch(/This action cannot be undone\.$/);
		});
	});

	describe('edge cases', () => {
		it('should handle result with all entries clearable', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(100, 0);

			// Assert
			expect(result.hasClearableEntries()).toBe(true);
			expect(result.clearableCount).toBe(100);
			expect(result.protectedCount).toBe(0);
			expect(result.getConfirmationMessage()).toContain('100');
			expect(result.getConfirmationMessage()).toContain('0');
		});

		it('should handle result with all entries protected', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(0, 100);

			// Assert
			expect(result.hasClearableEntries()).toBe(false);
			expect(result.clearableCount).toBe(0);
			expect(result.protectedCount).toBe(100);
			expect(result.getConfirmationMessage()).toContain('0');
			expect(result.getConfirmationMessage()).toContain('100');
		});

		it('should handle result with no entries', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(0, 0);

			// Assert
			expect(result.hasClearableEntries()).toBe(false);
			expect(result.clearableCount).toBe(0);
			expect(result.protectedCount).toBe(0);
		});

		it('should handle result with single clearable, many protected', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(1, 999);

			// Assert
			expect(result.hasClearableEntries()).toBe(true);
			expect(result.clearableCount).toBe(1);
			expect(result.protectedCount).toBe(999);
		});

		it('should handle result with many clearable, single protected', () => {
			// Arrange & Act
			const result = ClearAllValidationResult.create(999, 1);

			// Assert
			expect(result.hasClearableEntries()).toBe(true);
			expect(result.clearableCount).toBe(999);
			expect(result.protectedCount).toBe(1);
		});
	});

	describe('immutability', () => {
		it('should not allow modification of clearableCount after creation', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 3);
			const resultAsUnknown = result as unknown as Record<string, unknown>;

			// Act & Assert
			expect(() => {
				resultAsUnknown['clearableCount'] = 10;
			}).toThrow();
			expect(result.clearableCount).toBe(5);
		});

		it('should not allow modification of protectedCount after creation', () => {
			// Arrange
			const result = ClearAllValidationResult.create(5, 3);
			const resultAsUnknown = result as unknown as Record<string, unknown>;

			// Act & Assert
			expect(() => {
				resultAsUnknown['protectedCount'] = 10;
			}).toThrow();
			expect(result.protectedCount).toBe(3);
		});
	});
});
