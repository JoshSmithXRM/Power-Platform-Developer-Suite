import { EnvironmentVariableToDeploymentSettingsMapper } from './EnvironmentVariableToDeploymentSettingsMapper';
import { EnvironmentVariable, EnvironmentVariableType } from '../../domain/entities/EnvironmentVariable';

describe('EnvironmentVariableToDeploymentSettingsMapper', () => {
	let mapper: EnvironmentVariableToDeploymentSettingsMapper;

	beforeEach(() => {
		mapper = new EnvironmentVariableToDeploymentSettingsMapper();
	});

	// Test data factory
	function createEnvironmentVariable(
		schemaName: string,
		defaultValue: string | null,
		currentValue: string | null,
		type: EnvironmentVariableType = EnvironmentVariableType.String
	): EnvironmentVariable {
		return new EnvironmentVariable(
			`def-${schemaName}`,
			schemaName,
			`Display ${schemaName}`,
			type,
			defaultValue,
			currentValue,
			false,
			'Test environment variable',
			new Date(),
			currentValue ? `val-${schemaName}` : null
		);
	}

	describe('toDeploymentSettingsEntry', () => {
		describe('maps all properties correctly', () => {
			it('should map schemaName', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', 'default', null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('MyEnvVar');
			});

			it('should map current value when set', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', 'default', 'current');

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('current');
			});

			it('should use default value when current value is null', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', 'default', null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('default');
			});
		});

		describe('handles null/undefined values', () => {
			it('should use default value when current value is null', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', 'default value', null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('default value');
			});

			it('should use empty string when both default and current are null', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', null, null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('');
			});

			it('should use current value when both default and current are set', () => {
				// Arrange
				const envVar = createEnvironmentVariable('MyEnvVar', 'default', 'current');

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('current');
			});
		});

		describe('handles different types', () => {
			it('should map String type environment variable', () => {
				// Arrange
				const envVar = createEnvironmentVariable(
					'StringVar',
					'default string',
					'current string',
					EnvironmentVariableType.String
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('StringVar');
				expect(result.Value).toBe('current string');
			});

			it('should map Number type environment variable', () => {
				// Arrange
				const envVar = createEnvironmentVariable(
					'NumberVar',
					'100',
					'200',
					EnvironmentVariableType.Number
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('NumberVar');
				expect(result.Value).toBe('200');
			});

			it('should map Boolean type environment variable', () => {
				// Arrange
				const envVar = createEnvironmentVariable(
					'BooleanVar',
					'false',
					'true',
					EnvironmentVariableType.Boolean
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('BooleanVar');
				expect(result.Value).toBe('true');
			});

			it('should map Secret type environment variable with empty value', () => {
				// Arrange
				// Secrets should not export their actual values for security
				const envVar = createEnvironmentVariable(
					'SecretVar',
					null,
					null,
					EnvironmentVariableType.Secret
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('SecretVar');
				expect(result.Value).toBe('');
			});

			it('should map JSON type environment variable', () => {
				// Arrange
				const envVar = createEnvironmentVariable(
					'JsonVar',
					'{"key":"default"}',
					'{"key":"current"}',
					EnvironmentVariableType.JSON
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('JsonVar');
				expect(result.Value).toBe('{"key":"current"}');
			});

			it('should map DataSource type environment variable', () => {
				// Arrange
				const envVar = createEnvironmentVariable(
					'DataSourceVar',
					'https://default.api.com',
					'https://current.api.com',
					EnvironmentVariableType.DataSource
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('DataSourceVar');
				expect(result.Value).toBe('https://current.api.com');
			});
		});

		describe('edge cases', () => {
			it('should handle empty schemaName', () => {
				// Arrange
				const envVar = createEnvironmentVariable('', 'default', null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.SchemaName).toBe('');
			});

			it('should handle very long values', () => {
				// Arrange
				const longValue = 'A'.repeat(10000);
				const envVar = createEnvironmentVariable('LongVar', longValue, null);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe(longValue);
				expect(result.Value).toHaveLength(10000);
			});

			it('should handle special characters in values', () => {
				// Arrange
				const specialChars = '{"test": "value with \\"quotes\\" and \\nnewlines"}';
				const envVar = createEnvironmentVariable('SpecialVar', null, specialChars);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe(specialChars);
			});

			it('should handle unicode characters in values', () => {
				// Arrange
				const unicodeValue = 'Test 你好 🎉 Emoji';
				const envVar = createEnvironmentVariable('UnicodeVar', null, unicodeValue);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe(unicodeValue);
			});

			it('should handle whitespace-only values', () => {
				// Arrange
				const envVar = createEnvironmentVariable('WhitespaceVar', null, '   ');

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe('   ');
			});

			it('should handle URL values', () => {
				// Arrange
				const urlValue = 'https://example.com/api/v1/endpoint?param=value&other=123';
				const envVar = createEnvironmentVariable('UrlVar', null, urlValue);

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(result.Value).toBe(urlValue);
			});
		});

		describe('deployment settings structure', () => {
			it('should return object with SchemaName and Value properties only', () => {
				// Arrange
				const envVar = createEnvironmentVariable('TestVar', 'default', 'current');

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert
				expect(Object.keys(result)).toEqual(['SchemaName', 'Value']);
			});

			it('should return readonly entry structure', () => {
				// Arrange
				const envVar = createEnvironmentVariable('TestVar', 'default', 'current');

				// Act
				const result = mapper.toDeploymentSettingsEntry(envVar);

				// Assert - TypeScript enforces readonly at compile time
				expect(result.SchemaName).toBeDefined();
				expect(result.Value).toBeDefined();
			});
		});
	});

	describe('toDeploymentSettingsEntries', () => {
		describe('maps array of environment variables', () => {
			it('should map multiple environment variables', () => {
				// Arrange
				const envVars = [
					createEnvironmentVariable('Var1', 'default1', 'current1'),
					createEnvironmentVariable('Var2', 'default2', 'current2'),
					createEnvironmentVariable('Var3', 'default3', null)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(3);
				expect(result[0]?.SchemaName).toBe('Var1');
				expect(result[0]?.Value).toBe('current1');
				expect(result[1]?.SchemaName).toBe('Var2');
				expect(result[1]?.Value).toBe('current2');
				expect(result[2]?.SchemaName).toBe('Var3');
				expect(result[2]?.Value).toBe('default3');
			});

			it('should preserve array order', () => {
				// Arrange
				const envVars = [
					createEnvironmentVariable('ZVar', 'z', null),
					createEnvironmentVariable('AVar', 'a', null),
					createEnvironmentVariable('MVar', 'm', null)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result[0]?.SchemaName).toBe('ZVar');
				expect(result[1]?.SchemaName).toBe('AVar');
				expect(result[2]?.SchemaName).toBe('MVar');
			});

			it('should handle empty array', () => {
				// Arrange
				const envVars: EnvironmentVariable[] = [];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(0);
				expect(result).toEqual([]);
			});

			it('should handle single-element array', () => {
				// Arrange
				const envVars = [
					createEnvironmentVariable('SingleVar', 'value', null)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(1);
				expect(result[0]?.SchemaName).toBe('SingleVar');
			});
		});

		describe('handles mixed types in array', () => {
			it('should map array with different variable types', () => {
				// Arrange
				const envVars = [
					createEnvironmentVariable('StringVar', 'str', null, EnvironmentVariableType.String),
					createEnvironmentVariable('NumberVar', '42', null, EnvironmentVariableType.Number),
					createEnvironmentVariable('BoolVar', 'true', null, EnvironmentVariableType.Boolean),
					createEnvironmentVariable('SecretVar', null, null, EnvironmentVariableType.Secret)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(4);
				expect(result[0]?.SchemaName).toBe('StringVar');
				expect(result[1]?.SchemaName).toBe('NumberVar');
				expect(result[2]?.SchemaName).toBe('BoolVar');
				expect(result[3]?.SchemaName).toBe('SecretVar');
			});
		});

		describe('handles edge cases in array', () => {
			it('should handle array with all null values', () => {
				// Arrange
				const envVars = [
					createEnvironmentVariable('Var1', null, null),
					createEnvironmentVariable('Var2', null, null),
					createEnvironmentVariable('Var3', null, null)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(3);
				expect(result.every(entry => entry.Value === '')).toBe(true);
			});

			it('should handle large array', () => {
				// Arrange
				const envVars = Array.from({ length: 100 }, (_, i) =>
					createEnvironmentVariable(`Var${i}`, `default${i}`, null)
				);

				// Act
				const result = mapper.toDeploymentSettingsEntries(envVars);

				// Assert
				expect(result).toHaveLength(100);
				expect(result[0]?.SchemaName).toBe('Var0');
				expect(result[99]?.SchemaName).toBe('Var99');
			});
		});
	});
});
