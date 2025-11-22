import { AuthenticationCacheInvalidationService } from './AuthenticationCacheInvalidationService';
import { Environment } from '../entities/Environment';
import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
import { TenantId } from '../valueObjects/TenantId';
import { ClientId } from '../valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../valueObjects/AuthenticationMethod';

describe('AuthenticationCacheInvalidationService', () => {
	let service: AuthenticationCacheInvalidationService;

	// Test data factory
	function createEnvironment(
		authMethod: AuthenticationMethodType = AuthenticationMethodType.Interactive,
		options: {
			url?: string;
			tenantId?: string;
			publicClientId?: string;
			clientId?: string;
			username?: string;
		} = {}
	): Environment {
		return new Environment(
			new EnvironmentId('env-test-123'),
			new EnvironmentName('Test Environment'),
			new DataverseUrl(options.url || 'https://org.crm.dynamics.com'),
			new TenantId(options.tenantId || '00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(authMethod),
			new ClientId(options.publicClientId || '51f81489-12ee-4a9e-aaae-a2591f45987d'),
			false,
			undefined,
			undefined,
			options.clientId ? new ClientId(options.clientId) : undefined,
			options.username
		);
	}

	beforeEach(() => {
		service = new AuthenticationCacheInvalidationService();
	});

	describe('shouldInvalidateCache', () => {
		describe('new environment handling', () => {
			it('should return false when previous environment is null', () => {
				// Arrange
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(null, updated);

				// Assert
				expect(result).toBe(false);
			});

			it('should return false for new environment regardless of authentication method', () => {
				// Arrange
				const servicePrincipal = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(null, servicePrincipal);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('no changes scenario', () => {
			it('should return false when nothing has changed', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});

			it('should return false when ServicePrincipal configuration unchanged', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});

			it('should return false when UsernamePassword configuration unchanged', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'test@example.com',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});
				const updated = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'test@example.com',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('authentication method change', () => {
			it('should return true when auth method changes from Interactive to ServicePrincipal', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when auth method changes from ServicePrincipal to Interactive', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when auth method changes from Interactive to DeviceCode', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.DeviceCode);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when auth method changes from UsernamePassword to ServicePrincipal', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'test@example.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});
		});

		describe('client ID change', () => {
			it('should return true when client ID changes for ServicePrincipal', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle null client ID in previous environment', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle null client ID in updated environment', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle both client IDs null', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('username change', () => {
			it('should return true when username changes for UsernamePassword auth', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user1@example.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user2@example.com'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle undefined username in previous environment', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user@example.com'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle undefined username in updated environment', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user@example.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should handle both usernames undefined', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('Dataverse URL change', () => {
			it('should return true when Dataverse URL changes', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://org1.crm.dynamics.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://org2.crm.dynamics.com'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when URL changes from prod to dev environment', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					url: 'https://prod.crm.dynamics.com',
					clientId: '11111111-1111-1111-1111-111111111111'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					url: 'https://dev.crm.dynamics.com',
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return false when URL remains unchanged', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://org.crm.dynamics.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://org.crm.dynamics.com'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('tenant ID change', () => {
			it('should return true when tenant ID changes', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					tenantId: '11111111-1111-1111-1111-111111111111',
					clientId: '22222222-2222-2222-2222-222222222222'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					tenantId: '33333333-3333-3333-3333-333333333333',
					clientId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when switching between different Azure AD tenants', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive, {
					tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive, {
					tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return false when tenant ID remains unchanged', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					tenantId: '11111111-1111-1111-1111-111111111111',
					clientId: '22222222-2222-2222-2222-222222222222'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					tenantId: '11111111-1111-1111-1111-111111111111',
					clientId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('multiple changes', () => {
			it('should return true when both auth method and URL change', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://org1.crm.dynamics.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					url: 'https://org2.crm.dynamics.com',
					clientId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when client ID, URL, and tenant ID all change', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111',
					url: 'https://org1.crm.dynamics.com',
					tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '22222222-2222-2222-2222-222222222222',
					url: 'https://org2.crm.dynamics.com',
					tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should return true when username and URL change for UsernamePassword auth', () => {
				// Arrange
				const previous = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user1@example.com',
					url: 'https://org1.crm.dynamics.com'
				});
				const updated = createEnvironment(AuthenticationMethodType.UsernamePassword, {
					username: 'user2@example.com',
					url: 'https://org2.crm.dynamics.com'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});
		});

		describe('business logic validation', () => {
			it('should invalidate cache when credentials change to prevent stale tokens', () => {
				// Arrange - Simulating user changing their Service Principal credentials
				const previous = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '11111111-1111-1111-1111-111111111111',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});
				const updated = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
					clientId: '33333333-3333-3333-3333-333333333333',
					url: 'https://org.crm.dynamics.com',
					tenantId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should invalidate cache when switching environments to prevent cross-environment token usage', () => {
				// Arrange - Simulating user switching from DEV to PROD environment
				const previous = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://dev-org.crm.dynamics.com',
					tenantId: '11111111-1111-1111-1111-111111111111'
				});
				const updated = createEnvironment(AuthenticationMethodType.Interactive, {
					url: 'https://prod-org.crm.dynamics.com',
					tenantId: '11111111-1111-1111-1111-111111111111'
				});

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(true);
			});

			it('should not invalidate cache when only non-credential fields change', () => {
				// Arrange - Environment name doesn't affect authentication cache
				const previous = createEnvironment(AuthenticationMethodType.Interactive);
				const updated = createEnvironment(AuthenticationMethodType.Interactive);

				// Act
				const result = service.shouldInvalidateCache(previous, updated);

				// Assert
				expect(result).toBe(false);
			});
		});
	});
});
