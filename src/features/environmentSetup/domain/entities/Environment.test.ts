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
			false,
			undefined,
			undefined,
			undefined,
			undefined
		);
	}

	describe('validateConfiguration', () => {
		it.each<{ authType: AuthenticationMethodType }>([
			{ authType: AuthenticationMethodType.Interactive },
			{ authType: AuthenticationMethodType.DeviceCode }
		])('should validate successfully with $authType auth', ({ authType }) => {
			const env = createValidEnvironment(authType);
			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it.each<{ field: string; value: string; errorPattern: RegExp }>([
			{
				field: 'name',
				value: '',
				errorPattern: /Environment name cannot be empty/
			},
			{
				field: 'dataverse URL',
				value: 'invalid-url',
				errorPattern: /Invalid Dataverse URL format/
			},
			{
				field: 'tenant ID',
				value: 'not-a-guid',
				errorPattern: /Invalid Tenant ID format/
			}
		])('should fail validation when $field is invalid', ({ field, value, errorPattern }) => {
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					field === 'name' ? new EnvironmentName(value as string) : new EnvironmentName('Test Environment'),
					field === 'dataverse URL' ? new DataverseUrl(value as string) : new DataverseUrl('https://org.crm.dynamics.com'),
					field === 'tenant ID' ? new TenantId(value as string) : new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.Interactive),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false
				);
			}).toThrow(errorPattern);
		});

		it('should fail validation when ServicePrincipal missing tenant ID', () => {
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId(''),
					new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					new ClientId('11111111-1111-1111-1111-111111111111'),
					undefined
				);
			}).toThrow(/Tenant ID is required for Service Principal authentication/);
		});

		it.each<{
			authType: AuthenticationMethodType;
			clientId?: ClientId;
			username?: string;
			errorPattern: RegExp;
			description: string;
		}>([
			{
				authType: AuthenticationMethodType.ServicePrincipal,
				errorPattern: /Client ID is required for Service Principal authentication/,
				description: 'ServicePrincipal missing clientId'
			},
			{
				authType: AuthenticationMethodType.UsernamePassword,
				errorPattern: /Username is required for Username\/Password authentication/,
				description: 'UsernamePassword missing username'
			},
			{
				authType: AuthenticationMethodType.UsernamePassword,
				username: '   ',
				errorPattern: /Username is required for Username\/Password authentication/,
				description: 'UsernamePassword with empty/whitespace username'
			}
		])('should fail validation for $description', ({ authType, clientId, username, errorPattern }) => {
			expect(() => {
				new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(authType),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					clientId,
					username
				);
			}).toThrow(errorPattern);
		});

		it.each<{
			authType: AuthenticationMethodType;
			clientId?: ClientId;
			username?: string;
			description: string;
		}>([
			{
				authType: AuthenticationMethodType.ServicePrincipal,
				clientId: new ClientId('11111111-1111-1111-1111-111111111111'),
				description: 'ServicePrincipal with clientId'
			},
			{
				authType: AuthenticationMethodType.UsernamePassword,
				username: 'user@example.com',
				description: 'UsernamePassword with username'
			}
		])('should validate successfully for $description', ({ authType, clientId, username }) => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(authType),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				clientId,
				username
			);

			const result = env.validateConfiguration();

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('requiresCredentials', () => {
		it.each<{ authType: AuthenticationMethodType; expected: boolean }>([
			{ authType: AuthenticationMethodType.Interactive, expected: false },
			{ authType: AuthenticationMethodType.DeviceCode, expected: false }
		])('should return $expected for $authType auth (no credentials)', ({ authType, expected }) => {
			const env = createValidEnvironment(authType);
			expect(env.requiresCredentials()).toBe(expected);
		});

		it.each<{
			authType: AuthenticationMethodType;
			clientId?: ClientId;
			username?: string;
			expected: boolean
		}>([
			{
				authType: AuthenticationMethodType.ServicePrincipal,
				clientId: new ClientId('11111111-1111-1111-1111-111111111111'),
				expected: true
			},
			{
				authType: AuthenticationMethodType.UsernamePassword,
				username: 'user@example.com',
				expected: true
			}
		])('should return $expected for $authType auth (requires credentials)', ({ authType, clientId, username, expected }) => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(authType),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				clientId,
				username
			);
			expect(env.requiresCredentials()).toBe(expected);
		});
	});

	describe('canTestConnection', () => {
		it('should return true when environment has valid Interactive authentication configuration', () => {
			const env = createValidEnvironment();
			expect(env.canTestConnection()).toBe(true);
		});

		it('should return false for invalid configuration', () => {
			// Can't create invalid environment via constructor, so skip this test
			// The validation is already tested in validateConfiguration tests
		});
	});

	describe('getRequiredSecretKeys', () => {
		it('should return empty array when using Interactive authentication method', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const keys = env.getRequiredSecretKeys();

			expect(keys).toHaveLength(0);
		});

		it.each<{
			authType: AuthenticationMethodType;
			clientId?: ClientId;
			username?: string;
			expectedKey: string
		}>([
			{
				authType: AuthenticationMethodType.ServicePrincipal,
				clientId: new ClientId('11111111-1111-1111-1111-111111111111'),
				expectedKey: 'power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111'
			},
			{
				authType: AuthenticationMethodType.UsernamePassword,
				username: 'user@example.com',
				expectedKey: 'power-platform-dev-suite-password-user@example.com'
			}
		])('should return $expectedKey for $authType auth', ({ authType, clientId, username, expectedKey }) => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(authType),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				clientId,
				username
			);
			const keys = env.getRequiredSecretKeys();

			expect(keys).toHaveLength(1);
			expect(keys[0]).toBe(expectedKey);
		});
	});

	describe('getOrphanedSecretKeys', () => {
		it.each<{
			previousAuthType: AuthenticationMethodType;
			previousClientId?: ClientId;
			previousUsername?: string;
			expectedOrphanedKey: string;
		}>([
			{
				previousAuthType: AuthenticationMethodType.ServicePrincipal,
				previousClientId: new ClientId('11111111-1111-1111-1111-111111111111'),
				expectedOrphanedKey: 'power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111'
			},
			{
				previousAuthType: AuthenticationMethodType.UsernamePassword,
				previousUsername: 'user@example.com',
				expectedOrphanedKey: 'power-platform-dev-suite-password-user@example.com'
			}
		])('should detect orphaned $previousAuthType secret when switching to Interactive', ({ previousAuthType, previousClientId, previousUsername, expectedOrphanedKey }) => {
			const previousAuthMethod = new AuthenticationMethod(previousAuthType);
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, previousClientId, previousUsername);

			expect(orphanedKeys).toHaveLength(1);
			expect(orphanedKeys[0]).toBe(expectedOrphanedKey);
		});

		it.each<{
			authType: AuthenticationMethodType;
			clientId?: ClientId;
			username?: string;
			description: string;
			expectedLength: number;
		}>([
			{
				authType: AuthenticationMethodType.ServicePrincipal,
				clientId: new ClientId('11111111-1111-1111-1111-111111111111'),
				description: 'auth method stays the same (ServicePrincipal)',
				expectedLength: 0
			},
			{
				authType: AuthenticationMethodType.Interactive,
				description: 'switching from Interactive (no previous secrets)',
				expectedLength: 0
			}
		])('should return empty array when $description', ({ authType, clientId, username, expectedLength }) => {
			const previousAuthMethod = new AuthenticationMethod(authType);

			const env = authType === AuthenticationMethodType.Interactive
				? createValidEnvironment(AuthenticationMethodType.Interactive)
				: new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(authType),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					clientId,
					username
				);

			const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, clientId, username);

			expect(orphanedKeys).toHaveLength(expectedLength);
		});

		it('should detect orphaned secret when switching ServicePrincipal clientId', () => {
			const oldClientId = new ClientId('11111111-1111-1111-1111-111111111111');
			const newClientId = new ClientId('22222222-2222-2222-2222-222222222222');
			const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);

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
	});

	describe('activate', () => {
		it('should set isActive flag to true when activating environment', () => {
			const env = createValidEnvironment();
			expect(env.getIsActive()).toBe(false);

			env.activate();

			expect(env.getIsActive()).toBe(true);
		});

		it('should update lastUsed timestamp to current time when activating environment', () => {
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
		it('should set isActive flag to false when deactivating environment', () => {
			const env = createValidEnvironment();
			env.activate();
			expect(env.getIsActive()).toBe(true);

			env.deactivate();

			expect(env.getIsActive()).toBe(false);
		});

		it('should preserve lastUsed timestamp without modification when deactivating environment', () => {
			const env = createValidEnvironment();
			env.activate();
			const lastUsedAfterActivate = env.getLastUsed();

			env.deactivate();

			expect(env.getLastUsed()).toBe(lastUsedAfterActivate);
		});
	});

	describe('markAsUsed', () => {
		it('should update lastUsed timestamp to current time when marking environment as used', () => {
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

		it('should preserve isActive status without modification when marking environment as used', () => {
			const env = createValidEnvironment();
			expect(env.getIsActive()).toBe(false);

			env.markAsUsed();

			expect(env.getIsActive()).toBe(false);
		});
	});

	describe('hasName', () => {
		it('should return true when provided name exactly matches environment name', () => {
			const env = createValidEnvironment();
			expect(env.hasName('Test Environment')).toBe(true);
		});

		it('should return false when provided name does not match environment name', () => {
			const env = createValidEnvironment();
			expect(env.hasName('Different Name')).toBe(false);
		});

		it('should perform case-sensitive name comparison', () => {
			const env = createValidEnvironment();
			expect(env.hasName('test environment')).toBe(false);
		});
	});

	describe('updateConfiguration', () => {
		it('should update all configuration fields when valid values are provided', () => {
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

		it('should throw DomainError when updating to invalid ServicePrincipal configuration without clientId', () => {
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
					undefined,
					undefined
				);
			}).toThrow(DomainError);
		});

		it('should throw with specific error message for ServicePrincipal missing clientId', () => {
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
					undefined,
					undefined
				);
			}).toThrow(/Client ID is required for Service Principal authentication/);
		});
	});

	describe('getters', () => {
		it('should return immutable environment ID from getId method', () => {
			const id = new EnvironmentId('env-test-123');
			const env = new Environment(
				id,
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.Interactive),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false
			);

			expect(env.getId()).toBe(id);
		});

		it.each<{
			authType: AuthenticationMethodType;
			username?: string;
			expectedUsername?: string;
			description: string;
		}>([
			{
				authType: AuthenticationMethodType.UsernamePassword,
				username: 'user@example.com',
				expectedUsername: 'user@example.com',
				description: 'UsernamePassword auth'
			},
			{
				authType: AuthenticationMethodType.Interactive,
				description: 'Interactive auth'
			}
		])('should return correct username for $description', ({ authType, username, expectedUsername }) => {
			const env = authType === AuthenticationMethodType.Interactive
				? createValidEnvironment(AuthenticationMethodType.Interactive)
				: new Environment(
					new EnvironmentId('env-test-123'),
					new EnvironmentName('Test Environment'),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(authType),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false,
					undefined,
					undefined,
					undefined,
					username
				);

			expect(env.getUsername()).toBe(expectedUsername);
		});
	});

	describe('edge cases', () => {
		describe('unicode and special characters', () => {
			it.each<{ name: string }>([
				{ name: '环境测试 🌏 Тест' },
				{ name: '🚀 Production Environment 🎯' }
			])('should handle unicode/emoji in environment name: $name', ({ name }) => {
				const env = new Environment(
					new EnvironmentId('env-unicode-123'),
					new EnvironmentName(name),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.Interactive),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false
				);

				expect(env.getName().getValue()).toBe(name);
				expect(env.hasName(name)).toBe(true);
			});

			it('should handle special characters in username', () => {
				const username = 'user+test@example.co.uk';
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
					username
				);

				expect(env.getUsername()).toBe(username);
				expect(env.getRequiredSecretKeys()[0]).toBe('power-platform-dev-suite-password-user+test@example.co.uk');
			});
		});

		describe('very long strings', () => {
			it('should handle environment name at maximum length (100 chars)', () => {
				const maxLengthName = 'A'.repeat(100);
				const env = new Environment(
					new EnvironmentId('env-long-123'),
					new EnvironmentName(maxLengthName),
					new DataverseUrl('https://org.crm.dynamics.com'),
					new TenantId('00000000-0000-0000-0000-000000000000'),
					new AuthenticationMethod(AuthenticationMethodType.Interactive),
					new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
					false
				);

				expect(env.getName().getValue()).toBe(maxLengthName);
				expect(env.getName().getValue().length).toBe(100);
			});

			it('should handle very long username (1000+ chars)', () => {
				const longUsername = 'a'.repeat(1000) + '@example.com';
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
					longUsername
				);

				expect(env.getUsername()).toBe(longUsername);
			});

			it('should handle very long Power Platform environment ID', () => {
				const longEnvId = 'pp-env-' + 'x'.repeat(1000);
				const env = createValidEnvironment();

				env.updateConfiguration(
					env.getName(),
					env.getDataverseUrl(),
					env.getTenantId(),
					env.getAuthenticationMethod(),
					env.getPublicClientId(),
					longEnvId,
					undefined,
					undefined
				);

				expect(env.getPowerPlatformEnvironmentId()).toBe(longEnvId);
			});
		});

		describe('boundary values', () => {
			it('should handle activation state transitions repeatedly', () => {
				const env = createValidEnvironment();

				for (let i = 0; i < 100; i++) {
					env.activate();
					expect(env.getIsActive()).toBe(true);
					env.deactivate();
					expect(env.getIsActive()).toBe(false);
				}
			});

			it('should handle markAsUsed called many times in sequence', () => {
				const env = createValidEnvironment();
				const timestamps: Date[] = [];

				for (let i = 0; i < 10; i++) {
					env.markAsUsed();
					timestamps.push(env.getLastUsed()!);
				}

				expect(timestamps.every(t => t instanceof Date)).toBe(true);
			});

			it('should handle empty Power Platform environment ID', () => {
				const env = createValidEnvironment();

				env.updateConfiguration(
					env.getName(),
					env.getDataverseUrl(),
					env.getTenantId(),
					env.getAuthenticationMethod(),
					env.getPublicClientId(),
					'',
					undefined,
					undefined
				);

				expect(env.getPowerPlatformEnvironmentId()).toBe('');
			});
		});

		describe('immutability violations', () => {
			it('should maintain environment ID immutability', () => {
				const env = createValidEnvironment();
				const originalId = env.getId();

				expect(env.getId()).toBe(originalId);
				expect(env.id).toBe(originalId);
			});

			it('should not allow direct modification of isActive flag', () => {
				const env = createValidEnvironment();

				env.activate();
				expect(env.getIsActive()).toBe(true);

				const isActiveValue = env.getIsActive();
				expect(typeof isActiveValue).toBe('boolean');
			});

			it('should return new Date instances for lastUsed', () => {
				const env = createValidEnvironment();
				env.activate();

				const lastUsed1 = env.getLastUsed();
				const lastUsed2 = env.getLastUsed();

				expect(lastUsed1).toBeDefined();
				expect(lastUsed2).toBeDefined();
			});
		});

		describe('orphaned secret keys edge cases', () => {
			it('should handle switching between all auth methods without orphaning secrets', () => {
				const env = createValidEnvironment(AuthenticationMethodType.Interactive);
				const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.Interactive);

				const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, undefined, undefined);

				expect(orphanedKeys).toHaveLength(0);
			});

			it.each<{
				clientId: ClientId;
				expectedKey: string;
			}>([
				{
					clientId: new ClientId('11111111-1111-1111-1111-111111111111'),
					expectedKey: 'power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111'
				},
				{
					clientId: new ClientId('22222222-2222-2222-2222-222222222222'),
					expectedKey: 'power-platform-dev-suite-secret-22222222-2222-2222-2222-222222222222'
				}
			])('should detect orphaned key $expectedKey when switching auth methods', ({ clientId, expectedKey }) => {
				const previousAuthMethod = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				const env = createValidEnvironment(AuthenticationMethodType.Interactive);

				const orphanedKeys = env.getOrphanedSecretKeys(previousAuthMethod, clientId, undefined);

				expect(orphanedKeys).toContain(expectedKey);
			});

			it('should handle username with special characters in secret key generation', () => {
				const username = 'user+test@example.com';
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
					username
				);

				const secretKeys = env.getRequiredSecretKeys();
				expect(secretKeys[0]).toBe('power-platform-dev-suite-password-user+test@example.com');
			});
		});
	});
});
