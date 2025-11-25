import { EnvironmentVariableFactory } from './EnvironmentVariableFactory';
import { EnvironmentVariableType } from '../entities/EnvironmentVariable';
import type {
	EnvironmentVariableDefinitionData,
	EnvironmentVariableValueData
} from '../interfaces/IEnvironmentVariableRepository';

describe('EnvironmentVariableFactory', () => {
	let factory: EnvironmentVariableFactory;

	beforeEach(() => {
		factory = new EnvironmentVariableFactory();
	});

	// Test data factories
	function createValidDefinition(
		overrides?: Partial<EnvironmentVariableDefinitionData>
	): EnvironmentVariableDefinitionData {
		return {
			environmentvariabledefinitionid: 'def-123',
			schemaname: 'env_test_variable',
			displayname: 'Test Variable',
			type: EnvironmentVariableType.String,
			defaultvalue: 'default-value',
			ismanaged: false,
			description: 'Test description',
			modifiedon: '2024-01-01T10:00:00Z',
			...overrides
		};
	}

	function createValidValue(
		overrides?: Partial<EnvironmentVariableValueData>
	): EnvironmentVariableValueData {
		return {
			environmentvariablevalueid: 'val-123',
			_environmentvariabledefinitionid_value: 'def-123',
			value: 'current-value',
			...overrides
		};
	}

	describe('createFromDefinitionsAndValues', () => {
		describe('successful creation with values', () => {
			it('should create environment variable when definition has matching value', () => {
				const definitions = [createValidDefinition()];
				const values = [createValidValue()];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(1);
				expect(variables[0]?.definitionId).toBe('def-123');
				expect(variables[0]?.currentValue).toBe('current-value');
			});

			it('should map all definition fields correctly', () => {
				const definitions = [createValidDefinition()];
				const values = [createValidValue()];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.schemaName).toBe('env_test_variable');
				expect(variables[0]?.displayName).toBe('Test Variable');
				expect(variables[0]?.type).toBe(EnvironmentVariableType.String);
				expect(variables[0]?.defaultValue).toBe('default-value');
				expect(variables[0]?.isManaged).toBe(false);
				expect(variables[0]?.description).toBe('Test description');
			});

			it('should map value ID when value exists', () => {
				const definitions = [createValidDefinition()];
				const values = [createValidValue()];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.valueId).toBe('val-123');
			});

			it('should convert ISO date string to Date object', () => {
				const definitions = [
					createValidDefinition({ modifiedon: '2024-03-15T14:30:00Z' })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.modifiedOn).toEqual(new Date('2024-03-15T14:30:00Z'));
			});

			it('should handle multiple definitions with matching values', () => {
				const definitions = [
					createValidDefinition({
						environmentvariabledefinitionid: 'def-1',
						schemaname: 'var1'
					}),
					createValidDefinition({
						environmentvariabledefinitionid: 'def-2',
						schemaname: 'var2'
					})
				];
				const values = [
					createValidValue({
						environmentvariablevalueid: 'val-1',
						_environmentvariabledefinitionid_value: 'def-1',
						value: 'value-1'
					}),
					createValidValue({
						environmentvariablevalueid: 'val-2',
						_environmentvariabledefinitionid_value: 'def-2',
						value: 'value-2'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(2);
				expect(variables[0]?.schemaName).toBe('var1');
				expect(variables[0]?.currentValue).toBe('value-1');
				expect(variables[1]?.schemaName).toBe('var2');
				expect(variables[1]?.currentValue).toBe('value-2');
			});
		});

		describe('definitions without values (left join)', () => {
			it('should create environment variable with null current value when no matching value', () => {
				const definitions = [createValidDefinition()];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(1);
				expect(variables[0]?.currentValue).toBeNull();
			});

			it('should set value ID to null when no matching value', () => {
				const definitions = [createValidDefinition()];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.valueId).toBeNull();
			});

			it('should include all definitions even when values array is empty', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-1' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-2' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-3' })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(3);
				expect(variables[0]?.currentValue).toBeNull();
				expect(variables[1]?.currentValue).toBeNull();
				expect(variables[2]?.currentValue).toBeNull();
			});

			it('should handle partial matches (some definitions have values)', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-1' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-2' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-3' })
				];
				const values = [
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-1',
						value: 'value-1'
					}),
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-3',
						value: 'value-3'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(3);
				expect(variables[0]?.currentValue).toBe('value-1');
				expect(variables[1]?.currentValue).toBeNull();
				expect(variables[2]?.currentValue).toBe('value-3');
			});

			it('should ignore orphaned values (values without matching definitions)', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-1' })
				];
				const values = [
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-1',
						value: 'value-1'
					}),
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-orphan',
						value: 'orphaned-value'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(1);
				expect(variables[0]?.definitionId).toBe('def-1');
			});
		});

		describe('null and empty field handling', () => {
			it('should handle null default value', () => {
				const definitions = [createValidDefinition({ defaultvalue: null })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.defaultValue).toBeNull();
			});

			it('should handle null current value from value record', () => {
				const definitions = [createValidDefinition()];
				const values = [createValidValue({ value: null })];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.currentValue).toBeNull();
			});

			it('should convert null description to empty string', () => {
				const definitions = [createValidDefinition({ description: null })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.description).toBe('');
			});

			it('should preserve empty string description', () => {
				const definitions = [createValidDefinition({ description: '' })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.description).toBe('');
			});

			it('should handle empty string as valid default value', () => {
				const definitions = [createValidDefinition({ defaultvalue: '' })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.defaultValue).toBe('');
			});

			it('should handle empty string as valid current value', () => {
				const definitions = [createValidDefinition()];
				const values = [createValidValue({ value: '' })];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.currentValue).toBe('');
			});
		});

		describe('type conversion', () => {
			it('should handle String type (100000000)', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.String })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000000);
			});

			it('should handle Number type (100000001)', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.Number })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000001);
			});

			it('should handle Boolean type (100000002)', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.Boolean })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000002);
			});

			it('should handle JSON type (100000003)', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.JSON })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000003);
			});

			it('should handle Secret type (100000004) - SECURITY CRITICAL', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.Secret })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000004);
				expect(variables[0]!.isSecret()).toBe(true);
			});

			it('should handle DataSource type (100000005)', () => {
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.DataSource })
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.type).toBe(100000005);
			});
		});

		describe('secret handling - SECURITY CRITICAL', () => {
			it('should create secret with null value', () => {
				const definitions = [
					createValidDefinition({
						type: EnvironmentVariableType.Secret,
						defaultvalue: null
					})
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]!.isSecret()).toBe(true);
				expect(variables[0]?.defaultValue).toBeNull();
			});

			it('should create secret with empty string value', () => {
				const definitions = [
					createValidDefinition({
						type: EnvironmentVariableType.Secret,
						defaultvalue: ''
					})
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]!.isSecret()).toBe(true);
				expect(variables[0]?.defaultValue).toBe('');
			});

			it('should create secret with actual secret value', () => {
				const definitions = [
					createValidDefinition({
						type: EnvironmentVariableType.Secret,
						defaultvalue: 'super-secret-password'
					})
				];
				const values = [
					createValidValue({
						value: 'override-secret-password'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]!.isSecret()).toBe(true);
				expect(variables[0]?.defaultValue).toBe('super-secret-password');
				expect(variables[0]?.currentValue).toBe('override-secret-password');
			});

			it('should handle secret with null current value override', () => {
				const definitions = [
					createValidDefinition({
						type: EnvironmentVariableType.Secret,
						defaultvalue: 'default-secret'
					})
				];
				const values = [createValidValue({ value: null })];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]!.isSecret()).toBe(true);
				expect(variables[0]?.currentValue).toBeNull();
				expect(variables[0]!.getEffectiveValue()).toBe('default-secret');
			});

			it('should handle multiple secrets', () => {
				const definitions = [
					createValidDefinition({
						environmentvariabledefinitionid: 'def-secret-1',
						type: EnvironmentVariableType.Secret,
						schemaname: 'secret1'
					}),
					createValidDefinition({
						environmentvariabledefinitionid: 'def-secret-2',
						type: EnvironmentVariableType.Secret,
						schemaname: 'secret2'
					})
				];
				const values = [
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-secret-1',
						value: 'secret-value-1'
					}),
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-secret-2',
						value: 'secret-value-2'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(2);
				expect(variables[0]!.isSecret()).toBe(true);
				expect(variables[1]!.isSecret()).toBe(true);
			});
		});

		describe('managed vs unmanaged', () => {
			it('should handle managed environment variable', () => {
				const definitions = [createValidDefinition({ ismanaged: true })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.isManaged).toBe(true);
			});

			it('should handle unmanaged environment variable', () => {
				const definitions = [createValidDefinition({ ismanaged: false })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.isManaged).toBe(false);
			});

			it('should handle mix of managed and unmanaged', () => {
				const definitions = [
					createValidDefinition({
						environmentvariabledefinitionid: 'def-1',
						ismanaged: true
					}),
					createValidDefinition({
						environmentvariabledefinitionid: 'def-2',
						ismanaged: false
					})
				];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.isManaged).toBe(true);
				expect(variables[1]?.isManaged).toBe(false);
			});
		});

		describe('edge cases', () => {
			it('should handle empty definitions array', () => {
				const definitions: EnvironmentVariableDefinitionData[] = [];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(0);
			});

			it('should handle large number of definitions', () => {
				const definitions = Array.from({ length: 1000 }, (_, i) =>
					createValidDefinition({
						environmentvariabledefinitionid: `def-${i}`,
						schemaname: `var_${i}`
					})
				);
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(1000);
			});

			it('should handle duplicate definition IDs (last value wins in Map)', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-same' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-same' })
				];
				const values = [
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-same',
						value: 'value-1'
					}),
					createValidValue({
						_environmentvariabledefinitionid_value: 'def-same',
						value: 'value-2'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(2);
				expect(variables[0]?.currentValue).toBe('value-2');
				expect(variables[1]?.currentValue).toBe('value-2');
			});

			it('should handle very long values', () => {
				const longValue = 'x'.repeat(10000);
				const definitions = [createValidDefinition({ defaultvalue: longValue })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.defaultValue).toBe(longValue);
			});

			it('should handle special characters in values', () => {
				const specialValue = '<>&"\'{}[]()';
				const definitions = [createValidDefinition({ defaultvalue: specialValue })];
				const values: EnvironmentVariableValueData[] = [];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.defaultValue).toBe(specialValue);
			});

			it('should handle Unicode in values', () => {
				const unicodeValue = '你好 🌍 مرحبا';
				const definitions = [createValidDefinition()];
				const values = [createValidValue({ value: unicodeValue })];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.currentValue).toBe(unicodeValue);
			});

			it('should handle JSON string in value field', () => {
				const jsonValue = '{"key": "value", "nested": {"data": 123}}';
				const definitions = [
					createValidDefinition({ type: EnvironmentVariableType.JSON })
				];
				const values = [createValidValue({ value: jsonValue })];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.currentValue).toBe(jsonValue);
			});

			it('should handle date parsing edge cases', () => {
				const edgeDates = [
					'1900-01-01T00:00:00Z',
					'2099-12-31T23:59:59.999Z',
					'2024-02-29T12:00:00Z' // Leap year
				];

				edgeDates.forEach((dateStr) => {
					const definitions = [createValidDefinition({ modifiedon: dateStr })];
					const values: EnvironmentVariableValueData[] = [];

					const variables = factory.createFromDefinitionsAndValues(
						definitions,
						values
					);

					expect(variables[0]?.modifiedOn).toEqual(new Date(dateStr));
				});
			});
		});

		describe('Map construction and lookup', () => {
			it('should build Map correctly for fast lookups', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-1' }),
					createValidDefinition({ environmentvariabledefinitionid: 'def-2' })
				];
				const values = [
					createValidValue({
						environmentvariablevalueid: 'val-1',
						_environmentvariabledefinitionid_value: 'def-1',
						value: 'value-1'
					}),
					createValidValue({
						environmentvariablevalueid: 'val-2',
						_environmentvariabledefinitionid_value: 'def-2',
						value: 'value-2'
					})
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables[0]?.valueId).toBe('val-1');
				expect(variables[1]?.valueId).toBe('val-2');
			});

			it('should handle case where value array has more items than definitions', () => {
				const definitions = [
					createValidDefinition({ environmentvariabledefinitionid: 'def-1' })
				];
				const values = [
					createValidValue({ _environmentvariabledefinitionid_value: 'def-1' }),
					createValidValue({ _environmentvariabledefinitionid_value: 'def-2' }),
					createValidValue({ _environmentvariabledefinitionid_value: 'def-3' })
				];

				const variables = factory.createFromDefinitionsAndValues(definitions, values);

				expect(variables).toHaveLength(1);
			});
		});
	});
});
