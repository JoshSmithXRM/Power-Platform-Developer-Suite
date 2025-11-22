import { EnvironmentVariable, EnvironmentVariableType } from './EnvironmentVariable';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('EnvironmentVariable', () => {
	// Test data factory
	function createValidVariable(overrides?: {
		definitionId?: string;
		schemaName?: string;
		displayName?: string;
		type?: EnvironmentVariableType;
		defaultValue?: string | null;
		currentValue?: string | null;
		isManaged?: boolean;
		description?: string;
		modifiedOn?: Date;
		valueId?: string | null;
	}): EnvironmentVariable {
		return new EnvironmentVariable(
			overrides?.definitionId ?? 'def-123',
			overrides?.schemaName ?? 'env_test_variable',
			overrides?.displayName ?? 'Test Variable',
			overrides?.type ?? EnvironmentVariableType.String,
			overrides && 'defaultValue' in overrides ? overrides.defaultValue : 'default-value',
			overrides && 'currentValue' in overrides ? overrides.currentValue : null,
			overrides?.isManaged ?? false,
			overrides?.description ?? 'Test description',
			overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides && 'valueId' in overrides ? overrides.valueId : null
		);
	}

	describe('constructor', () => {
		describe('successful creation', () => {
			it('should create environment variable with String type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.String
				});

				expect(variable.type).toBe(EnvironmentVariableType.String);
			});

			it('should create environment variable with Number type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.Number
				});

				expect(variable.type).toBe(EnvironmentVariableType.Number);
			});

			it('should create environment variable with Boolean type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.Boolean
				});

				expect(variable.type).toBe(EnvironmentVariableType.Boolean);
			});

			it('should create environment variable with JSON type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.JSON
				});

				expect(variable.type).toBe(EnvironmentVariableType.JSON);
			});

			it('should create environment variable with Secret type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.Secret
				});

				expect(variable.type).toBe(EnvironmentVariableType.Secret);
			});

			it('should create environment variable with DataSource type', () => {
				const variable = createValidVariable({
					type: EnvironmentVariableType.DataSource
				});

				expect(variable.type).toBe(EnvironmentVariableType.DataSource);
			});

			it('should create environment variable with all required fields', () => {
				const variable = createValidVariable();

				expect(variable.definitionId).toBe('def-123');
				expect(variable.schemaName).toBe('env_test_variable');
				expect(variable.displayName).toBe('Test Variable');
				expect(variable.type).toBe(EnvironmentVariableType.String);
			});

			it('should create managed environment variable', () => {
				const variable = createValidVariable({ isManaged: true });

				expect(variable.isManaged).toBe(true);
			});

			it('should create unmanaged environment variable', () => {
				const variable = createValidVariable();

				expect(variable.isManaged).toBe(false);
			});

			it('should accept null default value', () => {
				const variable = createValidVariable({ defaultValue: null });

				expect(variable.defaultValue).toBeNull();
			});

			it('should accept null current value', () => {
				const variable = createValidVariable();

				expect(variable.currentValue).toBeNull();
			});

			it('should accept null value ID', () => {
				const variable = createValidVariable();

				expect(variable.valueId).toBeNull();
			});

			it('should accept empty description', () => {
				const variable = createValidVariable({ description: '' });

				expect(variable.description).toBe('');
			});
		});

		describe('validation errors', () => {
			it('should throw ValidationError for invalid type code', () => {
				expect(() =>
					createValidVariable({ type: 999 as EnvironmentVariableType })
				).toThrow(ValidationError);
			});

			it('should throw ValidationError with correct message for invalid type', () => {
				expect(() =>
					createValidVariable({ type: 999 as EnvironmentVariableType })
				).toThrow('Must be a valid EnvironmentVariableType enum value');
			});

			it('should throw ValidationError with entity name for invalid type', () => {
				expect(() =>
					createValidVariable({ type: 999 as EnvironmentVariableType })
				).toThrow(expect.objectContaining({
					entityName: 'EnvironmentVariable'
				}));
			});

			it('should throw ValidationError with field name for invalid type', () => {
				expect(() =>
					createValidVariable({ type: 999 as EnvironmentVariableType })
				).toThrow(expect.objectContaining({
					field: 'type'
				}));
			});
		});

		describe('type code validation', () => {
			it('should accept type code 100000000 (String)', () => {
				const variable = createValidVariable({ type: 100000000 });

				expect(variable.type).toBe(100000000);
			});

			it('should accept type code 100000001 (Number)', () => {
				const variable = createValidVariable({ type: 100000001 });

				expect(variable.type).toBe(100000001);
			});

			it('should accept type code 100000002 (Boolean)', () => {
				const variable = createValidVariable({ type: 100000002 });

				expect(variable.type).toBe(100000002);
			});

			it('should accept type code 100000003 (JSON)', () => {
				const variable = createValidVariable({ type: 100000003 });

				expect(variable.type).toBe(100000003);
			});

			it('should accept type code 100000004 (Secret)', () => {
				const variable = createValidVariable({ type: 100000004 });

				expect(variable.type).toBe(100000004);
			});

			it('should accept type code 100000005 (DataSource)', () => {
				const variable = createValidVariable({ type: 100000005 });

				expect(variable.type).toBe(100000005);
			});

			it('should reject type code 100000006 (invalid)', () => {
				expect(() =>
					createValidVariable({ type: 100000006 as EnvironmentVariableType })
				).toThrow(ValidationError);
			});

			it('should reject type code 0 (invalid)', () => {
				expect(() =>
					createValidVariable({ type: 0 as EnvironmentVariableType })
				).toThrow(ValidationError);
			});

			it('should reject negative type code', () => {
				expect(() =>
					createValidVariable({ type: -1 as EnvironmentVariableType })
				).toThrow(ValidationError);
			});
		});
	});

	describe('getEffectiveValue', () => {
		it('should return current value when both current and default exist', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: 'current-value'
			});

			expect(variable.getEffectiveValue()).toBe('current-value');
		});

		it('should return default value when current value is null', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: null
			});

			expect(variable.getEffectiveValue()).toBe('default-value');
		});

		it('should return null when both values are null', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: null
			});

			expect(variable.getEffectiveValue()).toBeNull();
		});

		it('should return current value even when default is null', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: 'current-value'
			});

			expect(variable.getEffectiveValue()).toBe('current-value');
		});

		it('should return empty string as valid current value', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: ''
			});

			expect(variable.getEffectiveValue()).toBe('');
		});

		it('should return empty string as valid default value when current is null', () => {
			const variable = createValidVariable({
				defaultValue: '',
				currentValue: null
			});

			expect(variable.getEffectiveValue()).toBe('');
		});
	});

	describe('hasValue', () => {
		it('should return true when current value exists', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: 'current-value'
			});

			expect(variable.hasValue()).toBe(true);
		});

		it('should return true when only default value exists', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: null
			});

			expect(variable.hasValue()).toBe(true);
		});

		it('should return false when both values are null', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: null
			});

			expect(variable.hasValue()).toBe(false);
		});

		it('should return true when current value is empty string', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: ''
			});

			expect(variable.hasValue()).toBe(true);
		});

		it('should return true when default value is empty string', () => {
			const variable = createValidVariable({
				defaultValue: '',
				currentValue: null
			});

			expect(variable.hasValue()).toBe(true);
		});
	});

	describe('hasOverride', () => {
		it('should return true when current value differs from default', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: 'current-value'
			});

			expect(variable.hasOverride()).toBe(true);
		});

		it('should return false when current value matches default', () => {
			const variable = createValidVariable({
				defaultValue: 'same-value',
				currentValue: 'same-value'
			});

			expect(variable.hasOverride()).toBe(false);
		});

		it('should return false when current value is null', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: null
			});

			expect(variable.hasOverride()).toBe(false);
		});

		it('should return true when current is set and default is null', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: 'current-value'
			});

			expect(variable.hasOverride()).toBe(true);
		});

		it('should return false when both are null', () => {
			const variable = createValidVariable({
				defaultValue: null,
				currentValue: null
			});

			expect(variable.hasOverride()).toBe(false);
		});

		it('should return true when current is empty and default has value', () => {
			const variable = createValidVariable({
				defaultValue: 'default-value',
				currentValue: ''
			});

			expect(variable.hasOverride()).toBe(true);
		});

		it('should return false when both are empty strings', () => {
			const variable = createValidVariable({
				defaultValue: '',
				currentValue: ''
			});

			expect(variable.hasOverride()).toBe(false);
		});
	});

	describe('isSecret - SECURITY CRITICAL', () => {
		it('should return true for Secret type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Secret
			});

			expect(variable.isSecret()).toBe(true);
		});

		it('should return false for String type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.String
			});

			expect(variable.isSecret()).toBe(false);
		});

		it('should return false for Number type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Number
			});

			expect(variable.isSecret()).toBe(false);
		});

		it('should return false for Boolean type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Boolean
			});

			expect(variable.isSecret()).toBe(false);
		});

		it('should return false for JSON type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.JSON
			});

			expect(variable.isSecret()).toBe(false);
		});

		it('should return false for DataSource type', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.DataSource
			});

			expect(variable.isSecret()).toBe(false);
		});

		it('should identify secret even with null value', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Secret,
				defaultValue: null,
				currentValue: null
			});

			expect(variable.isSecret()).toBe(true);
		});

		it('should identify secret even with empty string value', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Secret,
				defaultValue: '',
				currentValue: ''
			});

			expect(variable.isSecret()).toBe(true);
		});

		it('should identify secret with actual secret value', () => {
			const variable = createValidVariable({
				type: EnvironmentVariableType.Secret,
				defaultValue: 'super-secret-password',
				currentValue: 'override-secret'
			});

			expect(variable.isSecret()).toBe(true);
		});
	});

	describe('isInSolution', () => {
		it('should return true when definition ID is in solution', () => {
			const variable = createValidVariable({ definitionId: 'def-123' });
			const solutionComponentIds = new Set(['def-123', 'def-456']);

			expect(variable.isInSolution(solutionComponentIds)).toBe(true);
		});

		it('should return false when definition ID is not in solution', () => {
			const variable = createValidVariable({ definitionId: 'def-123' });
			const solutionComponentIds = new Set(['def-456', 'def-789']);

			expect(variable.isInSolution(solutionComponentIds)).toBe(false);
		});

		it('should return false when solution set is empty', () => {
			const variable = createValidVariable({ definitionId: 'def-123' });
			const solutionComponentIds = new Set<string>();

			expect(variable.isInSolution(solutionComponentIds)).toBe(false);
		});

		it('should handle case-sensitive comparison', () => {
			const variable = createValidVariable({ definitionId: 'def-123' });
			const solutionComponentIds = new Set(['DEF-123']);

			expect(variable.isInSolution(solutionComponentIds)).toBe(false);
		});

		it('should return true when definition ID is only item in solution', () => {
			const variable = createValidVariable({ definitionId: 'def-123' });
			const solutionComponentIds = new Set(['def-123']);

			expect(variable.isInSolution(solutionComponentIds)).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle very long schema names', () => {
			const longName = 'a'.repeat(1000);
			const variable = createValidVariable({ schemaName: longName });

			expect(variable.schemaName).toBe(longName);
		});

		it('should handle very long display names', () => {
			const longName = 'a'.repeat(1000);
			const variable = createValidVariable({ displayName: longName });

			expect(variable.displayName).toBe(longName);
		});

		it('should handle very long descriptions', () => {
			const longDesc = 'a'.repeat(5000);
			const variable = createValidVariable({ description: longDesc });

			expect(variable.description).toBe(longDesc);
		});

		it('should handle very old dates', () => {
			const oldDate = new Date('1900-01-01T00:00:00Z');
			const variable = createValidVariable({ modifiedOn: oldDate });

			expect(variable.modifiedOn).toEqual(oldDate);
		});

		it('should handle future dates', () => {
			const futureDate = new Date('2099-12-31T23:59:59Z');
			const variable = createValidVariable({ modifiedOn: futureDate });

			expect(variable.modifiedOn).toEqual(futureDate);
		});

		it('should handle special characters in values', () => {
			const specialValue = '<script>alert("XSS")</script>';
			const variable = createValidVariable({ defaultValue: specialValue });

			expect(variable.defaultValue).toBe(specialValue);
		});

		it('should handle Unicode characters in values', () => {
			const unicodeValue = '你好世界 🌍 مرحبا';
			const variable = createValidVariable({ defaultValue: unicodeValue });

			expect(variable.defaultValue).toBe(unicodeValue);
		});

		it('should handle JSON strings in String type', () => {
			const jsonValue = '{"key": "value", "nested": {"data": 123}}';
			const variable = createValidVariable({
				type: EnvironmentVariableType.String,
				defaultValue: jsonValue
			});

			expect(variable.defaultValue).toBe(jsonValue);
		});
	});
});
