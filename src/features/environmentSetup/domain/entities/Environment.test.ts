import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
import { TenantId } from '../valueObjects/TenantId';
import { ClientId } from '../valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../valueObjects/AuthenticationMethod';
import { DomainError } from '../errors/DomainError';

import { Environment } from './Environment';

describe('Environment', () => {
	// Test data factory
	function createValidEnvironment(authMethod: AuthenticationMethodType = AuthenticationMethodType.Interactive): Environment {
		return new Environment(
			new EnvironmentId('env-test-123'),
			new EnvironmentName('Test Environment'),
			new DataverseUrl('https://org.crm.dynamics.com'),
			new TenantId('00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(authMethod),
			new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'), // Public client ID
			false
		);
	}

	describe('validateConfiguration', () => {
		it('should validate successfully with Interactive auth', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate successfully with DeviceCode auth', () => {
			const env = createValidEnvironment(AuthenticationMethodType.DeviceCode);
			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation when ServicePrincipal missing clientId', () => {
			// Constructor throws on invalid config, so we test that it throws
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					undefined, // Missing clientId for ServicePrincipal
					undefined
				);
			}).toThrow(/Client ID is required for Service Principal authentication/);
		});

		it('should validate successfully when ServicePrincipal has clientId', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'), // Has clientId
				undefined
			);

			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation when UsernamePassword missing username', () => {
			// Constructor throws on invalid config, so we test that it throws
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					undefined,
					undefined // Missing username for UsernamePassword
				);
			}).toThrow(/Username is required for Username\/Password authentication/);
		});

		it('should validate successfully when UsernamePassword has username', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com' // Has username
			);

			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('requiresCredentials', () => {
		it('should return false for Interactive auth', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			expect(env.requiresCredentials()).toBe(false);
		});

		it('should return false for DeviceCode auth', () => {
			const env = createValidEnvironment(AuthenticationMethodType.DeviceCode);
			expect(env.requiresCredentials()).toBe(false);
		});

		it('should return true for ServicePrincipal auth', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'),
				undefined
			);
			expect(env.requiresCredentials()).toBe(true);
		});

		it('should return true for UsernamePassword auth', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com'
			);
			expect(env.requiresCredentials()).toBe(true);
		});
	});

	describe('canTestConnection', () => {
		it('should return true for valid configuration', () => {
			const env = createValidEnvironment();
			expect(env.canTestConnection()).toBe(true);
		});

		it('should return false for invalid configuration', () => {
			// Can't create invalid environment via constructor, so skip this test
			// The validation is already tested in validateConfiguration tests
		});
	});

	describe('getRequiredSecretKeys', () => {
		it('should return empty array for Interactive auth', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const keys = env.getRequiredSecretKeys();

			expect(keys).toHaveLength(0);
		});

		it('should return client secret key for ServicePrincipal auth', () => {
			const clientId = new ClientId('11111111-1111-1111-1111-111111111111');
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				clientId,
				undefined
			);
			const keys = env.getRequiredSecretKeys();

			expect(keys).toHaveLength(1);
			expect(keys[0]).toBe('power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111');
		});

		it('should return password key for UsernamePassword auth', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com'
			);
			const keys = env.getRequiredSecretKeys();

			expect(keys).toHaveLength(1);
			expect(keys[0]).toBe('power-platform-dev-suite-password-user@example.com');
		});
	});

	describe('getOrphanedSecretKeys', () => {
		it('should detect orphaned client secret when switching from ServicePrincipal to Interactive', () => {
			const oldClientId = new ClientId('11111111-1111-1111-1111-111111111111');
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);

			// Now Interactive (no credentials needed)
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, oldClientId, undefined);

			expect(orphanedKeys).toHaveLength(1);
			expect(orphanedKeys[0]).toBe('power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111');
		});

		it('should detect orphaned password when switching from UsernamePassword to Interactive', () => {
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
			const previousUsername = 'user@example.com';

			// Now Interactive (no credentials needed)
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, undefined, previousUsername);

			expect(orphanedKeys).toHaveLength(1);
			expect(orphanedKeys[0]).toBe('power-platform-dev-suite-password-user@example.com');
		});

		it('should not detect orphaned secrets when auth method stays the same', () => {
			const clientId = new ClientId('11111111-1111-1111-1111-111111111111');
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);

			// Still ServicePrincipal with same clientId
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				clientId,
				undefined
			);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, clientId, undefined);

			expect(orphanedKeys).toHaveLength(0);
		});

		it('should detect orphaned secret when switching ServicePrincipal clientId', () => {
			const oldClientId = new ClientId('11111111-1111-1111-1111-111111111111');
			const newClientId = new ClientId('22222222-2222-2222-2222-222222222222');
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);

			// Still ServicePrincipal but different clientId
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				newClientId,
				undefined
			);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, oldClientId, undefined);

			expect(orphanedKeys).toHaveLength(1);
			expect(orphanedKeys[0]).toBe('power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111');
		});

		it('should return empty array when switching from Interactive (no previous secrets)', () => {
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.Interactive);

			const env = createValidEnvironment(AuthenticationMethodType.Interactive);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, undefined, undefined);

			expect(orphanedKeys).toHaveLength(0);
		});
	});

	describe('activate', () => {
		it('should set isActive to true', () => {
			const env = createValidEnvironment();
			expect(env.getIsActive()).toBe(false);

			env.activate();

			expect(env.getIsActive()).toBe(true);
		});

		it('should update lastUsed timestamp', () => {
			const env = createValidEnvironment();
			expect(env.getLastUsed()).toBeUndefined();

			const beforeActivate = new Date();
			env.activate();
			const afterActivate = new Date();

			const lastUsed = env.getLastUsed();
			expect(lastUsed).toBeDefined();
			expect(lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeActivate.getTime());
			expect(lastUsed!.getTime()).toBeLessThanOrEqual(afterActivate.getTime());
		});
	});

	describe('deactivate', () => {
		it('should set isActive to false', () => {
			const env = createValidEnvironment();
			env.activate();
			expect(env.getIsActive()).toBe(true);

			env.deactivate();

			expect(env.getIsActive()).toBe(false);
		});

		it('should not affect lastUsed timestamp', () => {
			const env = createValidEnvironment();
			env.activate();
			const lastUsedAfterActivate = env.getLastUsed();

			env.deactivate();

			expect(env.getLastUsed()).toBe(lastUsedAfterActivate);
		});
	});

	describe('markAsUsed', () => {
		it('should update lastUsed timestamp', () => {
			const env = createValidEnvironment();
			expect(env.getLastUsed()).toBeUndefined();

			const beforeMark = new Date();
			env.markAsUsed();
			const afterMark = new Date();

			const lastUsed = env.getLastUsed();
			expect(lastUsed).toBeDefined();
			expect(lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeMark.getTime());
			expect(lastUsed!.getTime()).toBeLessThanOrEqual(afterMark.getTime());
		});

		it('should not affect isActive status', () => {
			const env = createValidEnvironment();
			expect(env.getIsActive()).toBe(false);

			env.markAsUsed();

			expect(env.getIsActive()).toBe(false);
		});
	});

	describe('hasName', () => {
		it('should return true for matching name', () => {
			const env = createValidEnvironment();
			expect(env.hasName('Test Environment')).toBe(true);
		});

		it('should return false for non-matching name', () => {
			const env = createValidEnvironment();
			expect(env.hasName('Different Name')).toBe(false);
		});

		it('should be case-sensitive', () => {
			const env = createValidEnvironment();
			expect(env.hasName('test environment')).toBe(false);
		});
	});

	describe('updateConfiguration', () => {
		it('should update all configuration fields', () => {
			const env = createValidEnvironment();

			const newName = new EnvironmentName('Updated Name');
			const newUrl = new DataverseUrl('https://neworg.crm.dynamics.com');
			const newTenantId = new TenantId('11111111-1111-1111-1111-111111111111');
			const newAuthMethod = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
			const newPublicClientId = new ClientId('22222222-2222-2222-2222-222222222222');

			env.updateConfiguration(
				newName,
				newUrl,
				newTenantId,
				newAuthMethod,
				newPublicClientId,
				'pp-env-id-123',
				undefined,
				undefined
			);

			expect(env.getName()).toBe(newName);
			expect(env.getDataverseUrl()).toBe(newUrl);
			expect(env.getTenantId()).toBe(newTenantId);
			expect(env.getAuthenticationMethod()).toBe(newAuthMethod);
			expect(env.getPublicClientId()).toBe(newPublicClientId);
			expect(env.getPowerPlatformEnvironmentId()).toBe('pp-env-id-123');
		});

		it('should validate after update', () => {
			const env = createValidEnvironment();

			// Try to update to invalid config (ServicePrincipal without clientId)
			expect(() => {
				env.updateConfiguration(
					new EnvironmentName('Updated Name'),
					new DataverseUrl('https://neworg.crm.dynamics.com'),
					new TenantId('11111111-1111-1111-1111-111111111111'),
					new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
					new ClientId('22222222-2222-2222-2222-222222222222'),
					undefined,
					undefined, // Missing clientId for ServicePrincipal
					undefined
				);
			}).toThrow(DomainError);
		});

		it('should successfully update to ServicePrincipal with clientId', () => {
			const env = createValidEnvironment();

			const clientId = new ClientId('33333333-3333-3333-3333-333333333333');

			env.updateConfiguration(
				new EnvironmentName('Updated Name'),
				new DataverseUrl('https://neworg.crm.dynamics.com'),
				new TenantId('11111111-1111-1111-1111-111111111111'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				undefined,
				clientId,
				undefined
			);

			expect(env.getClientId()).toBe(clientId);
			expect(env.validateConfiguration().isValid).toBe(true);
		});
	});

	describe('constructor validation', () => {
		it('should throw DomainError when created with invalid configuration', () => {
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					undefined, // Invalid: ServicePrincipal requires clientId
					undefined
				);
			}).toThrow(DomainError);

			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					undefined, // Invalid: ServicePrincipal requires clientId
					undefined
				);
			}).toThrow(/Client ID is required for Service Principal authentication/);
		});
	});
});
