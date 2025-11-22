import { ProtectedKeyPattern } from './ProtectedKeyPattern';

describe('ProtectedKeyPattern', () => {
	describe('Exact match patterns (no wildcard)', () => {
		test('matches exact key for power-platform-dev-suite-environments', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-environments');

			// Act
			const result = pattern.matches('power-platform-dev-suite-environments');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match partial key when pattern is exact', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-environments');

			// Act
			const result = pattern.matches('power-platform-dev-suite-environment');

			// Assert
			expect(result).toBe(false);
		});

		test('does not match key with extra suffix when pattern is exact', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-environments');

			// Act
			const result = pattern.matches('power-platform-dev-suite-environments-extra');

			// Assert
			expect(result).toBe(false);
		});

		test('does not match key with extra prefix when pattern is exact', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-environments');

			// Act
			const result = pattern.matches('prefix-power-platform-dev-suite-environments');

			// Assert
			expect(result).toBe(false);
		});

		test('is case-sensitive for exact matches', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-environments');

			// Act
			const result = pattern.matches('Power-Platform-Dev-Suite-Environments');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Wildcard pattern matching: power-platform-dev-suite-*', () => {
		test('matches exact key with power-platform-dev-suite prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-environments');

			// Assert
			expect(result).toBe(true);
		});

		test('matches secret key with power-platform-dev-suite-secret prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-secret-abc123');

			// Assert
			expect(result).toBe(true);
		});

		test('matches password key with power-platform-dev-suite-password prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-password-xyz');

			// Assert
			expect(result).toBe(true);
		});

		test('matches key immediately after prefix with wildcard', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-a');

			// Assert
			expect(result).toBe(true);
		});

		test('matches key with empty string after prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match key without power-platform-dev-suite prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('other-extension-key');

			// Assert
			expect(result).toBe(false);
		});

		test('does not match partial prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suit');

			// Assert
			expect(result).toBe(false);
		});

		test('is case-sensitive for wildcard patterns', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('Power-Platform-Dev-Suite-something');

			// Assert
			expect(result).toBe(false);
		});

		test('matches key with multiple dashes after prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-secret-key-name');

			// Assert
			expect(result).toBe(true);
		});

		test('matches key with numbers after prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-123456');

			// Assert
			expect(result).toBe(true);
		});

		test('matches key with special characters after prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-!@#$%^&()');

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('Wildcard pattern matching: power-platform-dev-suite-secret-*', () => {
		test('matches secret key with numeric suffix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-secret-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-secret-abc');

			// Assert
			expect(result).toBe(true);
		});

		test('matches secret key with alphanumeric suffix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-secret-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-secret-key123');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match password key when pattern is secret', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-secret-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-password-xyz');

			// Assert
			expect(result).toBe(false);
		});

		test('does not match base prefix without secret', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-secret-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-environments');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Wildcard pattern matching: power-platform-dev-suite-password-*', () => {
		test('matches password key with suffix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-password-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-password-xyz');

			// Assert
			expect(result).toBe(true);
		});

		test('matches password key with numeric suffix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-password-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-password-123');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match secret key when pattern is password', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-password-*');

			// Act
			const result = pattern.matches('power-platform-dev-suite-secret-abc');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Regex metacharacter handling (escaping)', () => {
		test('matches key with literal dot in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app.config.setting');

			// Act
			const result = pattern.matches('app.config.setting');

			// Assert
			expect(result).toBe(true);
		});

		test('does not treat dot as regex wildcard in exact pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app.config.setting');

			// Act
			const result = pattern.matches('appXconfigXsetting');

			// Assert
			expect(result).toBe(false);
		});

		test('handles literal plus sign in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app+config');

			// Act
			const result = pattern.matches('app+config');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal question mark in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app?config');

			// Act
			const result = pattern.matches('app?config');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal caret in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app^config');

			// Act
			const result = pattern.matches('app^config');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal dollar sign in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app$config');

			// Act
			const result = pattern.matches('app$config');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal curly braces in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app{config}');

			// Act
			const result = pattern.matches('app{config}');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal parentheses in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app(config)');

			// Act
			const result = pattern.matches('app(config)');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal pipe in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app|config');

			// Act
			const result = pattern.matches('app|config');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal square brackets in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app[config]');

			// Act
			const result = pattern.matches('app[config]');

			// Assert
			expect(result).toBe(true);
		});

		test('handles literal backslash in pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app\\config');

			// Act
			const result = pattern.matches('app\\config');

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('Wildcard with special characters', () => {
		test('matches wildcard pattern with dot prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app.config.*');

			// Act
			const result = pattern.matches('app.config.setting');

			// Assert
			expect(result).toBe(true);
		});

		test('does not treat dot as wildcard in prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app.config.*');

			// Act
			const result = pattern.matches('appXconfigXsetting');

			// Assert
			expect(result).toBe(false);
		});

		test('matches wildcard pattern with plus in prefix', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app+config-*');

			// Act
			const result = pattern.matches('app+config-test');

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('Edge cases: empty strings and whitespace', () => {
		test('matches exact empty string pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('');

			// Act
			const result = pattern.matches('');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match non-empty key against empty pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('');

			// Act
			const result = pattern.matches('some-key');

			// Assert
			expect(result).toBe(false);
		});

		test('matches pattern with whitespace', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app config');

			// Act
			const result = pattern.matches('app config');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match with different whitespace', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('app config');

			// Act
			const result = pattern.matches('appXconfig');

			// Assert
			expect(result).toBe(false);
		});

		test('matches wildcard-only pattern', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('*');

			// Act & Assert
			expect(pattern.matches('anything')).toBe(true);
			expect(pattern.matches('another-thing')).toBe(true);
			expect(pattern.matches('')).toBe(true);
		});
	});

	describe('Multiple wildcards in pattern', () => {
		test('matches pattern with multiple wildcards', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('prefix-*-middle-*-suffix');

			// Act
			const result = pattern.matches('prefix-start-middle-end-suffix');

			// Assert
			expect(result).toBe(true);
		});

		test('matches pattern with consecutive wildcards', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('prefix-**-suffix');

			// Act
			const result = pattern.matches('prefix--suffix');

			// Assert
			expect(result).toBe(true);
		});

		test('does not match pattern with multiple wildcards if prefix mismatch', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('prefix-*-middle-*-suffix');

			// Act
			const result = pattern.matches('wrong-start-middle-end-suffix');

			// Assert
			expect(result).toBe(false);
		});

		test('does not match pattern with multiple wildcards if suffix mismatch', () => {
			// Arrange
			const pattern = ProtectedKeyPattern.create('prefix-*-middle-*-suffix');

			// Act
			const result = pattern.matches('prefix-start-middle-end-wrong');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Factory method', () => {
		test('creates pattern instance successfully', () => {
			// Arrange & Act
			const pattern = ProtectedKeyPattern.create('test-pattern');

			// Assert
			expect(pattern).toBeDefined();
			expect(pattern).toBeInstanceOf(ProtectedKeyPattern);
		});

		test('creates separate instances for different patterns', () => {
			// Arrange & Act
			const pattern1 = ProtectedKeyPattern.create('pattern1');
			const pattern2 = ProtectedKeyPattern.create('pattern2');

			// Assert
			expect(pattern1).not.toBe(pattern2);
		});
	});
});
