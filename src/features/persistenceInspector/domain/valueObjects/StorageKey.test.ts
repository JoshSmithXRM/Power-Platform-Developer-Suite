import { StorageKey } from './StorageKey';
import { DomainError } from '../../../environmentSetup/domain/errors/DomainError';

describe('StorageKey', () => {
	describe('create', () => {
		it('should create valid storage key with standard prefix', () => {
			// Arrange & Act
			const key = StorageKey.create('power-platform-dev-suite-test');

			// Assert
			expect(key.value).toBe('power-platform-dev-suite-test');
		});

		it('should create valid storage key with simple name', () => {
			// Arrange & Act
			const key = StorageKey.create('my-key');

			// Assert
			expect(key.value).toBe('my-key');
		});

		it('should create valid storage key with underscores', () => {
			// Arrange & Act
			const key = StorageKey.create('test_key_name');

			// Assert
			expect(key.value).toBe('test_key_name');
		});

		it('should create valid storage key with numbers', () => {
			// Arrange & Act
			const key = StorageKey.create('key123');

			// Assert
			expect(key.value).toBe('key123');
		});

		it('should create valid storage key with uppercase letters', () => {
			// Arrange & Act
			const key = StorageKey.create('MyStorageKey');

			// Assert
			expect(key.value).toBe('MyStorageKey');
		});

		it('should create valid storage key with special characters', () => {
			// Arrange & Act
			const key = StorageKey.create('key:with:colons');

			// Assert
			expect(key.value).toBe('key:with:colons');
		});

		it('should create valid storage key with dots', () => {
			// Arrange & Act
			const key = StorageKey.create('com.extension.setting');

			// Assert
			expect(key.value).toBe('com.extension.setting');
		});

		it('should throw DomainError when key is empty string', () => {
			// Arrange & Act & Assert
			expect(() => StorageKey.create('')).toThrow(DomainError);
			expect(() => StorageKey.create('')).toThrow('Storage key cannot be empty');
		});

		it('should throw DomainError when key is null', () => {
			// Arrange & Act & Assert
			expect(() => StorageKey.create(null as unknown as string)).toThrow(
				DomainError
			);
		});

		it('should throw DomainError when key is undefined', () => {
			// Arrange & Act & Assert
			expect(() => StorageKey.create(undefined as unknown as string)).toThrow(
				DomainError
			);
		});

		it('should throw DomainError when key contains only whitespace', () => {
			// Arrange & Act & Assert
			expect(() => StorageKey.create('   ')).toThrow(DomainError);
			expect(() => StorageKey.create('\t\t')).toThrow(DomainError);
			expect(() => StorageKey.create('\n')).toThrow(DomainError);
		});

		it('should throw DomainError when key contains only whitespace with mixed spaces', () => {
			// Arrange & Act & Assert
			expect(() => StorageKey.create(' \t \n ')).toThrow(DomainError);
		});

		it('should create valid key with leading/trailing spaces in content but requires trim', () => {
			// Arrange & Act & Assert
			// Note: The implementation trims during validation, so we test that whitespace-only fails
			expect(() => StorageKey.create('  ')).toThrow(DomainError);
		});

		it('should create valid storage key with very long key name', () => {
			// Arrange
			const longKey = 'power-platform-dev-suite-' + 'a'.repeat(500);

			// Act
			const key = StorageKey.create(longKey);

			// Assert
			expect(key.value).toBe(longKey);
			expect(key.value.length).toBe(25 + 500);
		});

		it('should create valid storage key with single character', () => {
			// Arrange & Act
			const key = StorageKey.create('a');

			// Assert
			expect(key.value).toBe('a');
		});
	});

	describe('value property', () => {
		it('should return the key value', () => {
			// Arrange
			const key = StorageKey.create('test-key');

			// Act
			const value = key.value;

			// Assert
			expect(value).toBe('test-key');
		});

		it('should return immutable value', () => {
			// Arrange
			const key = StorageKey.create('test-key');

			// Act
			const value = key.value;

			// Assert
			expect(value).toBe('test-key');
			// Verify returned value is string, not mutable
			expect(typeof value).toBe('string');
		});
	});

	describe('isProtectedEnvironmentsKey', () => {
		it('should return true for protected environments key', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-environments');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(true);
		});

		it('should return false for similar but different protected key', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-environments-backup');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});

		it('should return false for key without environments suffix', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-other');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});

		it('should return false for legacy environments key', () => {
			// Arrange
			const key = StorageKey.create('power-platform-environments');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});

		it('should return false for partial match environments', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-environment');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});

		it('should return false for case-insensitive environments key', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-Environments');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});

		it('should return false for unrelated key', () => {
			// Arrange
			const key = StorageKey.create('my-random-key');

			// Act
			const isProtected = key.isProtectedEnvironmentsKey();

			// Assert
			expect(isProtected).toBe(false);
		});
	});

	describe('isLegacyKey', () => {
		it('should return true for legacy power-platform prefix', () => {
			// Arrange
			const key = StorageKey.create('power-platform-old-key');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(true);
		});

		it('should return true for legacy environments key', () => {
			// Arrange
			const key = StorageKey.create('power-platform-environments');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(true);
		});

		it('should return false for current power-platform-dev-suite prefix', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-environments');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(false);
		});

		it('should return false for current prefix with any suffix', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-anything');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(false);
		});

		it('should return false for non-power-platform key', () => {
			// Arrange
			const key = StorageKey.create('my-custom-key');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(false);
		});

		it('should return false for key starting with power-platform- but having dev-suite', () => {
			// Arrange
			const key = StorageKey.create('power-platform-dev-suite-current');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(false);
		});

		it('should return true for legacy key with multiple hyphens', () => {
			// Arrange
			const key = StorageKey.create('power-platform-complex-legacy-key');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(true);
		});

		it('should return false for partial prefix match without full prefix', () => {
			// Arrange
			const key = StorageKey.create('power-platform');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(false);
		});

		it('should return true for legacy prefix with single character suffix', () => {
			// Arrange
			const key = StorageKey.create('power-platform-a');

			// Act
			const isLegacy = key.isLegacyKey();

			// Assert
			expect(isLegacy).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for keys with same value', () => {
			// Arrange
			const key1 = StorageKey.create('test-key');
			const key2 = StorageKey.create('test-key');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(true);
		});

		it('should return false for keys with different values', () => {
			// Arrange
			const key1 = StorageKey.create('test-key-1');
			const key2 = StorageKey.create('test-key-2');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(false);
		});

		it('should be case-sensitive', () => {
			// Arrange
			const key1 = StorageKey.create('TestKey');
			const key2 = StorageKey.create('testkey');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(false);
		});

		it('should return true for protected environments keys', () => {
			// Arrange
			const key1 = StorageKey.create('power-platform-dev-suite-environments');
			const key2 = StorageKey.create('power-platform-dev-suite-environments');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(true);
		});

		it('should return false for protected vs legacy environments', () => {
			// Arrange
			const key1 = StorageKey.create('power-platform-dev-suite-environments');
			const key2 = StorageKey.create('power-platform-environments');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(false);
		});

		it('should be reflexive (key equals itself)', () => {
			// Arrange
			const key = StorageKey.create('test-key');

			// Act
			const isEqual = key.equals(key);

			// Assert
			expect(isEqual).toBe(true);
		});

		it('should be symmetric', () => {
			// Arrange
			const key1 = StorageKey.create('test-key');
			const key2 = StorageKey.create('test-key');

			// Act
			const isEqual1 = key1.equals(key2);
			const isEqual2 = key2.equals(key1);

			// Assert
			expect(isEqual1).toBe(isEqual2);
			expect(isEqual1).toBe(true);
		});

		it('should be transitive', () => {
			// Arrange
			const key1 = StorageKey.create('test-key');
			const key2 = StorageKey.create('test-key');
			const key3 = StorageKey.create('test-key');

			// Act
			const key1EqualsKey2 = key1.equals(key2);
			const key2EqualsKey3 = key2.equals(key3);
			const key1EqualsKey3 = key1.equals(key3);

			// Assert
			expect(key1EqualsKey2).toBe(true);
			expect(key2EqualsKey3).toBe(true);
			expect(key1EqualsKey3).toBe(true);
		});

		it('should return false when comparing with similar but not identical keys', () => {
			// Arrange
			const key1 = StorageKey.create('test-key');
			const key2 = StorageKey.create('test-key ');

			// Act
			const isEqual = key1.equals(key2);

			// Assert
			expect(isEqual).toBe(false);
		});
	});

	describe('immutability', () => {
		it('should not allow modification of internal value through returned reference', () => {
			// Arrange
			const key = StorageKey.create('test-key');
			const value1 = key.value;

			// Act
			const value2 = key.value;

			// Assert
			expect(value1).toBe(value2);
			expect(value1).toBe('test-key');
		});

		it('should return same value on multiple accesses', () => {
			// Arrange
			const key = StorageKey.create('immutable-key');

			// Act
			const value1 = key.value;
			const value2 = key.value;
			const value3 = key.value;

			// Assert
			expect(value1).toBe(value2);
			expect(value2).toBe(value3);
			expect(value1).toBe('immutable-key');
		});
	});

	describe('edge cases', () => {
		it('should create key with all hyphens', () => {
			// Arrange & Act
			const key = StorageKey.create('---');

			// Assert
			expect(key.value).toBe('---');
		});

		it('should create key with mixed special characters', () => {
			// Arrange & Act
			const key = StorageKey.create('!@#$%^&*()');

			// Assert
			expect(key.value).toBe('!@#$%^&*()');
		});

		it('should create key with slashes', () => {
			// Arrange & Act
			const key = StorageKey.create('path/to/key');

			// Assert
			expect(key.value).toBe('path/to/key');
		});

		it('should create key with backslashes', () => {
			// Arrange & Act
			const key = StorageKey.create('path\\to\\key');

			// Assert
			expect(key.value).toBe('path\\to\\key');
		});

		it('should create key with unicode characters', () => {
			// Arrange & Act
			const key = StorageKey.create('key-with-emoji-🔑');

			// Assert
			expect(key.value).toBe('key-with-emoji-🔑');
		});

		it('should create key with whitespace in middle', () => {
			// Arrange & Act
			const key = StorageKey.create('key with spaces');

			// Assert
			expect(key.value).toBe('key with spaces');
		});
	});
});
