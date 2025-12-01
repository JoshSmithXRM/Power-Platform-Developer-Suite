import { Environment } from '../../../features/environmentSetup/domain/entities/Environment';
import { EnvironmentId } from '../../../features/environmentSetup/domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../../features/environmentSetup/domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../../features/environmentSetup/domain/valueObjects/DataverseUrl';
import { TenantId } from '../../../features/environmentSetup/domain/valueObjects/TenantId';
import { ClientId } from '../../../features/environmentSetup/domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../../features/environmentSetup/domain/valueObjects/AuthenticationMethod';

/**
 * Test factory for creating Environment entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestEnvironment(overrides?: {
	id?: string;
	name?: string;
	dataverseUrl?: string;
	tenantId?: string;
	authenticationMethod?: AuthenticationMethodType;
	publicClientId?: string;
	isActive?: boolean;
	lastUsed?: Date;
	powerPlatformEnvironmentId?: string;
	clientId?: string;
	username?: string;
	sortOrder?: number;
	isDefault?: boolean;
}): Environment {
	const authMethod = overrides?.authenticationMethod ?? AuthenticationMethodType.Interactive;

	return new Environment(
		new EnvironmentId(overrides?.id ?? 'test-env-123'),
		new EnvironmentName(overrides?.name ?? 'Test Environment'),
		new DataverseUrl(overrides?.dataverseUrl ?? 'https://org.crm.dynamics.com'),
		new TenantId(overrides?.tenantId ?? '00000000-0000-0000-0000-000000000000'),
		new AuthenticationMethod(authMethod),
		new ClientId(overrides?.publicClientId ?? '51f81489-12ee-4a9e-aaae-a2591f45987d'),
		overrides?.isActive ?? false,
		overrides?.lastUsed,
		overrides?.powerPlatformEnvironmentId,
		overrides?.clientId ? new ClientId(overrides.clientId) : undefined,
		overrides?.username,
		overrides?.sortOrder ?? 0,
		overrides?.isDefault ?? false
	);
}

/**
 * Creates an Environment configured for Service Principal authentication.
 * Includes required tenant ID and client ID for Service Principal flow.
 */
export function createTestServicePrincipalEnvironment(overrides?: {
	id?: string;
	name?: string;
	dataverseUrl?: string;
	tenantId?: string;
	publicClientId?: string;
	clientId?: string;
	isActive?: boolean;
	sortOrder?: number;
	isDefault?: boolean;
}): Environment {
	return new Environment(
		new EnvironmentId(overrides?.id ?? 'test-env-sp-123'),
		new EnvironmentName(overrides?.name ?? 'Test SP Environment'),
		new DataverseUrl(overrides?.dataverseUrl ?? 'https://org.crm.dynamics.com'),
		new TenantId(overrides?.tenantId ?? '00000000-0000-0000-0000-000000000000'),
		new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
		new ClientId(overrides?.publicClientId ?? '51f81489-12ee-4a9e-aaae-a2591f45987d'),
		overrides?.isActive ?? false,
		undefined,
		undefined,
		new ClientId(overrides?.clientId ?? '11111111-1111-1111-1111-111111111111'),
		undefined,
		overrides?.sortOrder ?? 0,
		overrides?.isDefault ?? false
	);
}

/**
 * Creates an Environment configured for Username/Password authentication.
 * Includes required username for Username/Password flow.
 */
export function createTestUsernamePasswordEnvironment(overrides?: {
	id?: string;
	name?: string;
	dataverseUrl?: string;
	tenantId?: string;
	publicClientId?: string;
	username?: string;
	isActive?: boolean;
	sortOrder?: number;
	isDefault?: boolean;
}): Environment {
	return new Environment(
		new EnvironmentId(overrides?.id ?? 'test-env-up-123'),
		new EnvironmentName(overrides?.name ?? 'Test UP Environment'),
		new DataverseUrl(overrides?.dataverseUrl ?? 'https://org.crm.dynamics.com'),
		new TenantId(overrides?.tenantId ?? '00000000-0000-0000-0000-000000000000'),
		new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
		new ClientId(overrides?.publicClientId ?? '51f81489-12ee-4a9e-aaae-a2591f45987d'),
		overrides?.isActive ?? false,
		undefined,
		undefined,
		undefined,
		overrides?.username ?? 'user@example.com',
		overrides?.sortOrder ?? 0,
		overrides?.isDefault ?? false
	);
}
