import { EnvironmentFormViewModelMapper } from './EnvironmentFormViewModelMapper';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';

describe('EnvironmentFormViewModelMapper', () => {
	let mapper: EnvironmentFormViewModelMapper;

	beforeEach(() => {
		mapper = new EnvironmentFormViewModelMapper();
	});

	// Test data factory
	function createEnvironment(
		authMethodType: AuthenticationMethodType,
		options: {
			id?: string;
			name?: string;
			dataverseUrl?: string;
			tenantId?: string;
			clientId?: string;
			publicClientId?: string;
			username?: string;
			powerPlatformEnvironmentId?: string;
		} = {}
	): Environment {
		// Automatically provide required fields based on auth method to satisfy validation
		const actualClientId = options.clientId ??
			(authMethodType === AuthenticationMethodType.ServicePrincipal ? '11111111-2222-3333-4444-555555555555' : undefined);
		const actualUsername = options.username ??
			(authMethodType === AuthenticationMethodType.UsernamePassword ? 'user@contoso.com' : undefined);

		return new Environment(
			new EnvironmentId(options.id ?? 'env-123'),
			new EnvironmentName(options.name ?? 'Test Environment'),
			new DataverseUrl(options.dataverseUrl ?? 'https://test.crm.dynamics.com'),
			new TenantId(options.tenantId ?? '00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(authMethodType),
			new ClientId(options.publicClientId ?? '51f81489-12ee-4a9e-aaae-a2591f45987d'),
			false,
			undefined, // lastUsed
			options.powerPlatformEnvironmentId,
			actualClientId ? new ClientId(actualClientId) : undefined,
			actualUsername
		);
	}

	describe('maps all properties correctly', () => {
		it('should map id from EnvironmentId', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				id: 'env-abc-123'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.id).toBe('env-abc-123');
		});

		it('should map name from EnvironmentName', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				name: 'Production'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.name).toBe('Production');
		});

		it('should map dataverseUrl from DataverseUrl', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				dataverseUrl: 'https://prod.crm.dynamics.com'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.dataverseUrl).toBe('https://prod.crm.dynamics.com');
		});

		it('should map tenantId from TenantId', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
				tenantId: '12345678-1234-1234-1234-123456789012'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.tenantId).toBe('12345678-1234-1234-1234-123456789012');
		});

		it('should map authenticationMethod as string', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.authenticationMethod).toBe('ServicePrincipal');
		});

		it('should map publicClientId from ClientId', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				publicClientId: '66666666-7777-8888-9999-000000000000'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.publicClientId).toBe('66666666-7777-8888-9999-000000000000');
		});

		it('should set isExisting to true', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.isExisting).toBe(true);
		});
	});

	describe('handles credential flags', () => {
		it('should map hasStoredClientSecret when true', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal);

			// Act
			const result = mapper.toFormViewModel(environment, true, false);

			// Assert
			expect(result.hasStoredClientSecret).toBe(true);
			expect(result.clientSecretPlaceholder).toBe('••••••••• (stored)');
		});

		it('should map hasStoredClientSecret when false', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal);

			// Act
			const result = mapper.toFormViewModel(environment, false, false);

			// Assert
			expect(result.hasStoredClientSecret).toBe(false);
			expect(result.clientSecretPlaceholder).toBeUndefined();
		});

		it('should map hasStoredPassword when true', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.UsernamePassword);

			// Act
			const result = mapper.toFormViewModel(environment, false, true);

			// Assert
			expect(result.hasStoredPassword).toBe(true);
			expect(result.passwordPlaceholder).toBe('••••••••• (stored)');
		});

		it('should map hasStoredPassword when false', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.UsernamePassword);

			// Act
			const result = mapper.toFormViewModel(environment, false, false);

			// Assert
			expect(result.hasStoredPassword).toBe(false);
			expect(result.passwordPlaceholder).toBeUndefined();
		});

		it('should default credential flags to false when not provided', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.hasStoredClientSecret).toBe(false);
			expect(result.hasStoredPassword).toBe(false);
		});
	});

	describe('handles optional fields', () => {
		it('should include clientId when set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
				clientId: '22222222-3333-4444-5555-666666666666'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.clientId).toBe('22222222-3333-4444-5555-666666666666');
		});

		it('should exclude clientId when not set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.clientId).toBeUndefined();
		});

		it('should include username when set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.UsernamePassword, {
				username: 'user@contoso.com'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.username).toBe('user@contoso.com');
		});

		it('should exclude username when not set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.username).toBeUndefined();
		});

		it('should include powerPlatformEnvironmentId when set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				powerPlatformEnvironmentId: 'Default-12345678-1234-1234-1234-123456789012'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.powerPlatformEnvironmentId).toBe('Default-12345678-1234-1234-1234-123456789012');
		});

		it('should exclude powerPlatformEnvironmentId when not set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.powerPlatformEnvironmentId).toBeUndefined();
		});

		it('should convert empty tenantId to empty string', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				tenantId: ''
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.tenantId).toBe('');
		});
	});

	describe('handles authentication methods', () => {
		it('should map Interactive authentication method', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.authenticationMethod).toBe('Interactive');
			expect(result.requiredFields).toEqual(['name', 'dataverseUrl', 'publicClientId', 'authenticationMethod']);
		});

		it('should map ServicePrincipal authentication method', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.authenticationMethod).toBe('ServicePrincipal');
			expect(result.requiredFields).toEqual([
				'name',
				'dataverseUrl',
				'publicClientId',
				'authenticationMethod',
				'tenantId',
				'clientId',
				'clientSecret'
			]);
		});

		it('should map UsernamePassword authentication method', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.UsernamePassword);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.authenticationMethod).toBe('UsernamePassword');
			expect(result.requiredFields).toEqual([
				'name',
				'dataverseUrl',
				'publicClientId',
				'authenticationMethod',
				'username',
				'password'
			]);
		});
	});

	describe('edge cases', () => {
		it('should handle environment with all optional fields set', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
				clientId: '22222222-3333-4444-5555-666666666666',
				username: 'user@contoso.com',
				powerPlatformEnvironmentId: 'ppenv-123'
			});

			// Act
			const result = mapper.toFormViewModel(environment, true, true);

			// Assert
			expect(result.clientId).toBe('22222222-3333-4444-5555-666666666666');
			expect(result.username).toBe('user@contoso.com');
			expect(result.powerPlatformEnvironmentId).toBe('ppenv-123');
			expect(result.hasStoredClientSecret).toBe(true);
			expect(result.hasStoredPassword).toBe(true);
			expect(result.clientSecretPlaceholder).toBe('••••••••• (stored)');
			expect(result.passwordPlaceholder).toBe('••••••••• (stored)');
		});

		it('should handle environment with no optional fields', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.clientId).toBeUndefined();
			expect(result.username).toBeUndefined();
			expect(result.powerPlatformEnvironmentId).toBeUndefined();
			expect(result.clientSecretPlaceholder).toBeUndefined();
			expect(result.passwordPlaceholder).toBeUndefined();
		});

		it('should handle special characters in name', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				name: 'Dev-Test (2024) & Staging'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.name).toBe('Dev-Test (2024) & Staging');
		});

		it('should handle very long URLs', () => {
			// Arrange
			const longUrl = 'https://' + 'a'.repeat(200) + '.crm.dynamics.com';
			const environment = createEnvironment(AuthenticationMethodType.Interactive, {
				dataverseUrl: longUrl
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.dataverseUrl).toBe(longUrl);
		});

		it('should handle GUIDs in all ID fields', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal, {
				id: '12345678-1234-1234-1234-123456789012',
				tenantId: '87654321-4321-4321-4321-210987654321',
				clientId: '11111111-2222-3333-4444-555555555555',
				publicClientId: '66666666-7777-8888-9999-000000000000'
			});

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.id).toBe('12345678-1234-1234-1234-123456789012');
			expect(result.tenantId).toBe('87654321-4321-4321-4321-210987654321');
			expect(result.clientId).toBe('11111111-2222-3333-4444-555555555555');
			expect(result.publicClientId).toBe('66666666-7777-8888-9999-000000000000');
		});
	});

	describe('required fields logic', () => {
		it('should return base fields for Interactive authentication', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.Interactive);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.requiredFields).toHaveLength(4);
			expect(result.requiredFields).toContain('name');
			expect(result.requiredFields).toContain('dataverseUrl');
			expect(result.requiredFields).toContain('publicClientId');
			expect(result.requiredFields).toContain('authenticationMethod');
		});

		it('should add service principal fields for ServicePrincipal authentication', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.ServicePrincipal);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.requiredFields).toHaveLength(7);
			expect(result.requiredFields).toContain('tenantId');
			expect(result.requiredFields).toContain('clientId');
			expect(result.requiredFields).toContain('clientSecret');
		});

		it('should add username/password fields for UsernamePassword authentication', () => {
			// Arrange
			const environment = createEnvironment(AuthenticationMethodType.UsernamePassword);

			// Act
			const result = mapper.toFormViewModel(environment);

			// Assert
			expect(result.requiredFields).toHaveLength(6);
			expect(result.requiredFields).toContain('username');
			expect(result.requiredFields).toContain('password');
		});
	});
});
