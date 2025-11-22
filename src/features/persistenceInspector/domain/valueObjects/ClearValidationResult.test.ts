import { ClearValidationResult } from './ClearValidationResult';

describe('ClearValidationResult', () => {
	describe('allowed() factory method', () => {
		it('should create allowed result with isAllowed true', () => {
			// Arrange
			const key = 'testKey';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.isAllowed).toBe(true);
		});

		it('should create allowed result with empty reason', () => {
			// Arrange
			const key = 'testKey';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.reason).toBe('');
		});

		it('should store key in allowed result', () => {
			// Arrange
			const key = 'myStorageKey';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe('myStorageKey');
		});

		it('should handle special characters in key', () => {
			// Arrange
			const key = 'key-with_special.chars@123';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe('key-with_special.chars@123');
			expect(result.isAllowed).toBe(true);
		});

		it('should handle empty string key', () => {
			// Arrange
			const key = '';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe('');
			expect(result.isAllowed).toBe(true);
		});

		it('should handle long key names', () => {
			// Arrange
			const key = 'a'.repeat(1000);

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe(key);
			expect(result.key.length).toBe(1000);
		});
	});

	describe('protected() factory method', () => {
		it('should create protected result with isAllowed false', () => {
			// Arrange
			const key = 'protectedKey';

			// Act
			const result = ClearValidationResult.protected(key);

			// Assert
			expect(result.isAllowed).toBe(false);
		});

		it('should create protected result with protection reason', () => {
			// Arrange
			const key = 'protectedKey';

			// Act
			const result = ClearValidationResult.protected(key);

			// Assert
			expect(result.reason).toBe('This key is protected and cannot be cleared');
		});

		it('should store key in protected result', () => {
			// Arrange
			const key = 'systemKey';

			// Act
			const result = ClearValidationResult.protected(key);

			// Assert
			expect(result.key).toBe('systemKey');
		});

		it('should have consistent protection reason across instances', () => {
			// Arrange
			const key1 = 'key1';
			const key2 = 'key2';

			// Act
			const result1 = ClearValidationResult.protected(key1);
			const result2 = ClearValidationResult.protected(key2);

			// Assert
			expect(result1.reason).toBe(result2.reason);
		});

		it('should handle special characters in protected key', () => {
			// Arrange
			const key = 'system@config#settings';

			// Act
			const result = ClearValidationResult.protected(key);

			// Assert
			expect(result.key).toBe('system@config#settings');
			expect(result.isAllowed).toBe(false);
		});
	});

	describe('notFound() factory method', () => {
		it('should create not found result with isAllowed false', () => {
			// Arrange
			const key = 'nonexistentKey';

			// Act
			const result = ClearValidationResult.notFound(key);

			// Assert
			expect(result.isAllowed).toBe(false);
		});

		it('should create not found result with not found reason', () => {
			// Arrange
			const key = 'nonexistentKey';

			// Act
			const result = ClearValidationResult.notFound(key);

			// Assert
			expect(result.reason).toBe('Key not found in storage');
		});

		it('should store key in not found result', () => {
			// Arrange
			const key = 'missingKey';

			// Act
			const result = ClearValidationResult.notFound(key);

			// Assert
			expect(result.key).toBe('missingKey');
		});

		it('should have consistent not found reason across instances', () => {
			// Arrange
			const key1 = 'missing1';
			const key2 = 'missing2';

			// Act
			const result1 = ClearValidationResult.notFound(key1);
			const result2 = ClearValidationResult.notFound(key2);

			// Assert
			expect(result1.reason).toBe(result2.reason);
		});

		it('should handle special characters in missing key', () => {
			// Arrange
			const key = 'config.user-settings#old';

			// Act
			const result = ClearValidationResult.notFound(key);

			// Assert
			expect(result.key).toBe('config.user-settings#old');
			expect(result.isAllowed).toBe(false);
		});
	});

	describe('isAllowed getter', () => {
		it('should return true for allowed result', () => {
			// Arrange
			const result = ClearValidationResult.allowed('key');

			// Act & Assert
			expect(result.isAllowed).toBe(true);
		});

		it('should return false for protected result', () => {
			// Arrange
			const result = ClearValidationResult.protected('key');

			// Act & Assert
			expect(result.isAllowed).toBe(false);
		});

		it('should return false for not found result', () => {
			// Arrange
			const result = ClearValidationResult.notFound('key');

			// Act & Assert
			expect(result.isAllowed).toBe(false);
		});
	});

	describe('reason getter', () => {
		it('should return empty string for allowed result', () => {
			// Arrange
			const result = ClearValidationResult.allowed('key');

			// Act & Assert
			expect(result.reason).toBe('');
		});

		it('should return protection message for protected result', () => {
			// Arrange
			const result = ClearValidationResult.protected('key');

			// Act & Assert
			expect(result.reason).toContain('protected');
			expect(result.reason).toContain('cannot be cleared');
		});

		it('should return not found message for notFound result', () => {
			// Arrange
			const result = ClearValidationResult.notFound('key');

			// Act & Assert
			expect(result.reason).toContain('not found');
			expect(result.reason).toContain('storage');
		});
	});

	describe('key getter', () => {
		it('should return correct key for allowed result', () => {
			// Arrange
			const expectedKey = 'testKey123';

			// Act
			const result = ClearValidationResult.allowed(expectedKey);

			// Assert
			expect(result.key).toBe(expectedKey);
		});

		it('should return correct key for protected result', () => {
			// Arrange
			const expectedKey = 'protectedKey456';

			// Act
			const result = ClearValidationResult.protected(expectedKey);

			// Assert
			expect(result.key).toBe(expectedKey);
		});

		it('should return correct key for not found result', () => {
			// Arrange
			const expectedKey = 'missingKey789';

			// Act
			const result = ClearValidationResult.notFound(expectedKey);

			// Assert
			expect(result.key).toBe(expectedKey);
		});

		it('should preserve original key value without modification', () => {
			// Arrange
			const originalKey = 'OriginalKey_WithMixedCase-123';

			// Act
			const result = ClearValidationResult.allowed(originalKey);

			// Assert
			expect(result.key).toBe(originalKey);
			expect(result.key).not.toBe(originalKey.toLowerCase());
			expect(result.key).not.toBe(originalKey.toUpperCase());
		});
	});

	describe('Integration tests', () => {
		it('should allow conditional logic based on isAllowed', () => {
			// Arrange
			const allowedResult = ClearValidationResult.allowed('key1');
			const protectedResult = ClearValidationResult.protected('key2');
			const notFoundResult = ClearValidationResult.notFound('key3');

			// Act & Assert
			if (allowedResult.isAllowed) {
				expect(allowedResult.reason).toBe('');
			}

			if (!protectedResult.isAllowed) {
				expect(protectedResult.reason).toContain('protected');
			}

			if (!notFoundResult.isAllowed) {
				expect(notFoundResult.reason).toContain('not found');
			}
		});

		it('should distinguish between different failure reasons', () => {
			// Arrange
			const protectedResult = ClearValidationResult.protected('key1');
			const notFoundResult = ClearValidationResult.notFound('key2');

			// Act
			const protectedMessage = protectedResult.reason;
			const notFoundMessage = notFoundResult.reason;

			// Assert
			expect(protectedMessage).not.toBe(notFoundMessage);
			expect(protectedResult.isAllowed).toBe(notFoundResult.isAllowed);
		});

		it('should support multiple results in collection', () => {
			// Arrange
			const results = [
				ClearValidationResult.allowed('key1'),
				ClearValidationResult.protected('key2'),
				ClearValidationResult.notFound('key3'),
				ClearValidationResult.allowed('key4'),
			];

			// Act
			const allowedCount = results.filter((r) => r.isAllowed).length;
			const failedCount = results.filter((r) => !r.isAllowed).length;

			// Assert
			expect(allowedCount).toBe(2);
			expect(failedCount).toBe(2);
			expect(results[1]?.reason).toContain('protected');
			expect(results[2]?.reason).toContain('not found');
		});

		it('should work with error handling patterns', () => {
			// Arrange
			const result = ClearValidationResult.protected('systemKey');

			// Act & Assert
			if (!result.isAllowed) {
				const error = new Error(result.reason);
				expect(error.message).toBe('This key is protected and cannot be cleared');
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle numeric-like string keys', () => {
			// Arrange
			const key = '12345';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe('12345');
			expect(typeof result.key).toBe('string');
		});

		it('should handle whitespace in keys', () => {
			// Arrange
			const key = 'key with spaces and \t tabs';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe(key);
		});

		it('should handle unicode characters in keys', () => {
			// Arrange
			const key = 'key_with_emoji_😀_and_unicode_文字';

			// Act
			const result = ClearValidationResult.allowed(key);

			// Assert
			expect(result.key).toBe(key);
		});

		it('should be immutable after creation', () => {
			// Arrange
			const result = ClearValidationResult.allowed('key');
			const originalKey = result.key;

			// Act & Assert - Attempting to modify should throw in strict mode
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(result as any).key = 'modified';
			}).toThrow();
			// And the original value should remain unchanged
			expect(result.key).toBe(originalKey);
			expect(result.key).toBe('key');
		});
	});
});
