import { EnvironmentVariable, EnvironmentVariableType } from '../../../features/environmentVariables/domain/entities/EnvironmentVariable';

/**
 * Test factory for creating EnvironmentVariable entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestEnvironmentVariable(overrides?: {
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
		overrides?.defaultValue !== undefined ? overrides.defaultValue : 'default-value',
		overrides?.currentValue ?? null,
		overrides?.isManaged ?? false,
		overrides?.description ?? 'Test environment variable',
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
		overrides?.valueId ?? null
	);
}

/**
 * Creates an EnvironmentVariable with a current value override.
 * Environment-specific overrides indicate configuration that varies by environment.
 */
export function createTestEnvironmentVariableWithOverride(overrides?: {
	definitionId?: string;
	schemaName?: string;
	displayName?: string;
	type?: EnvironmentVariableType;
	defaultValue?: string | null;
	currentValue?: string;
	isManaged?: boolean;
	description?: string;
	modifiedOn?: Date;
	valueId?: string;
}): EnvironmentVariable {
	return new EnvironmentVariable(
		overrides?.definitionId ?? 'envvardef-override-123',
		overrides?.schemaName ?? 'cr_OverrideVariable',
		overrides?.displayName ?? 'Override Variable',
		overrides?.type ?? EnvironmentVariableType.String,
		overrides?.defaultValue ?? 'default-value',
		overrides?.currentValue ?? 'current-value',
		overrides?.isManaged ?? false,
		overrides?.description ?? 'Environment variable with override',
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
		overrides?.valueId ?? 'envvarval-123'
	);
}

/**
 * Creates a secret type EnvironmentVariable.
 * Secrets require special handling in UI (masked display, secure storage).
 */
export function createTestSecretEnvironmentVariable(overrides?: {
	definitionId?: string;
	schemaName?: string;
	displayName?: string;
	defaultValue?: string | null;
	currentValue?: string | null;
	isManaged?: boolean;
	description?: string;
	modifiedOn?: Date;
	valueId?: string | null;
}): EnvironmentVariable {
	return new EnvironmentVariable(
		overrides?.definitionId ?? 'envvardef-secret-123',
		overrides?.schemaName ?? 'cr_SecretVariable',
		overrides?.displayName ?? 'Secret Variable',
		EnvironmentVariableType.Secret,
		overrides?.defaultValue ?? null,
		overrides?.currentValue ?? null,
		overrides?.isManaged ?? false,
		overrides?.description ?? 'Secret environment variable',
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
		overrides?.valueId ?? null
	);
}

/**
 * Creates a JSON type EnvironmentVariable.
 */
export function createTestJsonEnvironmentVariable(overrides?: {
	definitionId?: string;
	schemaName?: string;
	displayName?: string;
	defaultValue?: string | null;
	currentValue?: string | null;
	isManaged?: boolean;
	description?: string;
	modifiedOn?: Date;
	valueId?: string | null;
}): EnvironmentVariable {
	return new EnvironmentVariable(
		overrides?.definitionId ?? 'envvardef-json-123',
		overrides?.schemaName ?? 'cr_JsonVariable',
		overrides?.displayName ?? 'JSON Variable',
		EnvironmentVariableType.JSON,
		overrides?.defaultValue ?? '{"key":"value"}',
		overrides?.currentValue ?? null,
		overrides?.isManaged ?? false,
		overrides?.description ?? 'JSON environment variable',
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
		overrides?.valueId ?? null
	);
}

/**
 * Creates a managed EnvironmentVariable entity.
 */
export function createTestManagedEnvironmentVariable(overrides?: {
	definitionId?: string;
	schemaName?: string;
	displayName?: string;
	type?: EnvironmentVariableType;
	defaultValue?: string | null;
	currentValue?: string | null;
	description?: string;
	modifiedOn?: Date;
	valueId?: string | null;
}): EnvironmentVariable {
	return createTestEnvironmentVariable({
		isManaged: true,
		...overrides
	});
}
