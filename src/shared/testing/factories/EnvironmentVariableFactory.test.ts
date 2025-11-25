import { EnvironmentVariableType } from '../../../features/environmentVariables/domain/entities/EnvironmentVariable';
import {
	createTestEnvironmentVariable,
	createTestEnvironmentVariableWithOverride,
	createTestSecretEnvironmentVariable,
	createTestJsonEnvironmentVariable,
	createTestManagedEnvironmentVariable
} from './EnvironmentVariableFactory';

describe('EnvironmentVariableFactory', () => {
	describe('createTestEnvironmentVariable', () => {
		it('should create a String type environment variable with default values', () => {
			const variable = createTestEnvironmentVariable();

			expect(variable.definitionId).toBe('def-123');
			expect(variable.schemaName).toBe('env_test_variable');
			expect(variable.displayName).toBe('Test Variable');
			expect(variable.type).toBe(EnvironmentVariableType.String);
			expect(variable.defaultValue).toBe('default-value');
			expect(variable.currentValue).toBeNull();
			expect(variable.isManaged).toBe(false);
			expect(variable.description).toBe('Test environment variable');
			expect(variable.valueId).toBeNull();
		});

		it('should allow overriding default values', () => {
			const variable = createTestEnvironmentVariable({
				displayName: 'Custom Variable',
				defaultValue: 'custom-default'
			});

			expect(variable.displayName).toBe('Custom Variable');
			expect(variable.defaultValue).toBe('custom-default');
			expect(variable.type).toBe(EnvironmentVariableType.String);
		});
	});

	describe('createTestEnvironmentVariableWithOverride', () => {
		it('should have a current value that differs from default value', () => {
			const variable = createTestEnvironmentVariableWithOverride();

			expect(variable.currentValue).toBe('current-value');
			expect(variable.defaultValue).toBe('default-value');
			expect(variable.currentValue).not.toBe(variable.defaultValue);
		});

		it('should have an environment-specific schema name indicating override', () => {
			const variable = createTestEnvironmentVariableWithOverride();

			expect(variable.schemaName).toBe('cr_OverrideVariable');
			expect(variable.displayName).toBe('Override Variable');
		});

		it('should have a valueId indicating an override value exists', () => {
			const variable = createTestEnvironmentVariableWithOverride();

			expect(variable.valueId).toBe('envvarval-123');
			expect(variable.valueId).not.toBeNull();
		});

		it('should allow overriding values', () => {
			const variable = createTestEnvironmentVariableWithOverride({
				currentValue: 'custom-override',
				defaultValue: 'custom-default'
			});

			expect(variable.currentValue).toBe('custom-override');
			expect(variable.defaultValue).toBe('custom-default');
		});

		it('should have hasOverride return true when currentValue differs from defaultValue', () => {
			const variable = createTestEnvironmentVariableWithOverride();

			expect(variable.hasOverride()).toBe(true);
		});
	});

	describe('createTestSecretEnvironmentVariable', () => {
		it('should create a Secret type environment variable', () => {
			const variable = createTestSecretEnvironmentVariable();

			expect(variable.type).toBe(EnvironmentVariableType.Secret);
		});

		it('should have secret-specific schema name', () => {
			const variable = createTestSecretEnvironmentVariable();

			expect(variable.schemaName).toBe('cr_SecretVariable');
			expect(variable.displayName).toBe('Secret Variable');
		});

		it('should have null default and current values for secrets', () => {
			const variable = createTestSecretEnvironmentVariable();

			expect(variable.defaultValue).toBeNull();
			expect(variable.currentValue).toBeNull();
		});

		it('should return true for isSecret method', () => {
			const variable = createTestSecretEnvironmentVariable();

			expect(variable.isSecret()).toBe(true);
		});

		it('should allow overriding default and current values', () => {
			const variable = createTestSecretEnvironmentVariable({
				defaultValue: 'secret-default',
				currentValue: 'secret-current'
			});

			expect(variable.defaultValue).toBe('secret-default');
			expect(variable.currentValue).toBe('secret-current');
			expect(variable.type).toBe(EnvironmentVariableType.Secret);
		});

		it('should maintain Secret type when overriding other values', () => {
			const variable = createTestSecretEnvironmentVariable({
				displayName: 'Custom Secret'
			});

			expect(variable.type).toBe(EnvironmentVariableType.Secret);
			expect(variable.displayName).toBe('Custom Secret');
		});
	});

	describe('createTestJsonEnvironmentVariable', () => {
		it('should create a JSON type environment variable', () => {
			const variable = createTestJsonEnvironmentVariable();

			expect(variable.type).toBe(EnvironmentVariableType.JSON);
		});

		it('should have a valid JSON string as default value', () => {
			const variable = createTestJsonEnvironmentVariable();

			expect(variable.defaultValue).toBe('{"key":"value"}');
			expect(() => JSON.parse(variable.defaultValue!)).not.toThrow();
		});

		it('should have JSON-specific schema name', () => {
			const variable = createTestJsonEnvironmentVariable();

			expect(variable.schemaName).toBe('cr_JsonVariable');
			expect(variable.displayName).toBe('JSON Variable');
		});

		it('should have null current value by default', () => {
			const variable = createTestJsonEnvironmentVariable();

			expect(variable.currentValue).toBeNull();
		});

		it('should allow overriding JSON values', () => {
			const jsonValue = '{"custom":"json"}';
			const variable = createTestJsonEnvironmentVariable({
				defaultValue: jsonValue,
				currentValue: '{"override":"true"}'
			});

			expect(variable.defaultValue).toBe(jsonValue);
			expect(variable.currentValue).toBe('{"override":"true"}');
			expect(variable.type).toBe(EnvironmentVariableType.JSON);
		});

		it('should maintain JSON type when overriding other values', () => {
			const variable = createTestJsonEnvironmentVariable({
				displayName: 'Custom JSON Variable'
			});

			expect(variable.type).toBe(EnvironmentVariableType.JSON);
			expect(variable.displayName).toBe('Custom JSON Variable');
		});
	});

	describe('createTestManagedEnvironmentVariable', () => {
		it('should create a managed environment variable', () => {
			const variable = createTestManagedEnvironmentVariable();

			expect(variable.isManaged).toBe(true);
		});

		it('should inherit default String type from base factory', () => {
			const variable = createTestManagedEnvironmentVariable();

			expect(variable.type).toBe(EnvironmentVariableType.String);
		});

		it('should allow overriding type while maintaining managed flag', () => {
			const variable = createTestManagedEnvironmentVariable({
				type: EnvironmentVariableType.Secret
			});

			expect(variable.isManaged).toBe(true);
			expect(variable.type).toBe(EnvironmentVariableType.Secret);
		});

		it('should allow overriding other properties while maintaining managed flag', () => {
			const variable = createTestManagedEnvironmentVariable({
				displayName: 'Custom Managed Variable',
				defaultValue: 'managed-default'
			});

			expect(variable.isManaged).toBe(true);
			expect(variable.displayName).toBe('Custom Managed Variable');
			expect(variable.defaultValue).toBe('managed-default');
		});

		it('should inherit default property values from base factory', () => {
			const variable = createTestManagedEnvironmentVariable();

			expect(variable.definitionId).toBe('def-123');
			expect(variable.schemaName).toBe('env_test_variable');
			expect(variable.displayName).toBe('Test Variable');
			expect(variable.defaultValue).toBe('default-value');
			expect(variable.currentValue).toBeNull();
		});
	});

	describe('Factory interaction tests', () => {
		it('should create distinct instances with different characteristics', () => {
			const basic = createTestEnvironmentVariable();
			const withOverride = createTestEnvironmentVariableWithOverride();
			const secret = createTestSecretEnvironmentVariable();
			const json = createTestJsonEnvironmentVariable();
			const managed = createTestManagedEnvironmentVariable();

			// Verify they are different instances
			expect(basic).not.toBe(withOverride);
			expect(basic).not.toBe(secret);
			expect(basic).not.toBe(json);
			expect(basic).not.toBe(managed);

			// Verify key differences
			expect(basic.currentValue).toBeNull();
			expect(withOverride.currentValue).not.toBeNull();
			expect(secret.type).toBe(EnvironmentVariableType.Secret);
			expect(json.type).toBe(EnvironmentVariableType.JSON);
			expect(managed.isManaged).toBe(true);
		});

		it('should support chaining overrides across factory functions', () => {
			const secretManaged = createTestManagedEnvironmentVariable({
				type: EnvironmentVariableType.Secret
			});

			expect(secretManaged.isManaged).toBe(true);
			expect(secretManaged.type).toBe(EnvironmentVariableType.Secret);
			expect(secretManaged.isSecret()).toBe(true);
		});
	});
});
