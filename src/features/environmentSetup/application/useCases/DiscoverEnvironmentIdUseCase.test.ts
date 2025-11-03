import { IPowerPlatformApiService } from '../../domain/interfaces/IPowerPlatformApiService';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

import { DiscoverEnvironmentIdUseCase, DiscoverEnvironmentIdRequest } from './DiscoverEnvironmentIdUseCase';

describe('DiscoverEnvironmentIdUseCase', () => {
	let useCase: DiscoverEnvironmentIdUseCase;
	let mockPowerPlatformApiService: jest.Mocked<IPowerPlatformApiService>;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;
	let mockCancellationToken: jest.Mocked<ICancellationToken>;

	beforeEach(() => {
		mockPowerPlatformApiService = {
			discoverEnvironmentId: jest.fn()
		};

		mockRepository = {
			getAll: jest.fn(),
			getById: jest.fn(),
			getByName: jest.fn(),
			getActive: jest.fn(),
			save: jest.fn(),
			delete: jest.fn(),
			isNameUnique: jest.fn(),
			getClientSecret: jest.fn(),
			getPassword: jest.fn(),
			deleteSecrets: jest.fn()
		};

		mockCancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: jest.fn()
		} as unknown as jest.Mocked<ICancellationToken>;

		useCase = new DiscoverEnvironmentIdUseCase(
			mockPowerPlatformApiService,
			mockRepository,
			new NullLogger()
		);
	});

	function createValidRequest(overrides?: Partial<DiscoverEnvironmentIdRequest>): DiscoverEnvironmentIdRequest {
		return {
			name: 'Development',
			dataverseUrl: 'https://contoso.crm.dynamics.com',
			tenantId: '00000000-0000-0000-0000-000000000000',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			...overrides
		};
	}

	describe('successful environment ID discovery', () => {
		it('should discover environment ID with interactive authentication', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('00000000-0000-0000-0000-000000000001');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe('00000000-0000-0000-0000-000000000001');
			expect(result.errorMessage).toBeUndefined();
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledTimes(1);
		});

		it('should discover environment ID with client credentials', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'super-secret'
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id-123');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe('env-id-123');
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				'super-secret',
				undefined,
				undefined
			);
			// Verify auth method was set correctly
			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.ServicePrincipal);
		});

		it('should discover environment ID with username/password', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'admin@contoso.com',
				password: 'secret-password'
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id-456');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe('env-id-456');
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				'secret-password',
				undefined
			);
			// Verify username was set correctly
			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getUsername()).toBe('admin@contoso.com');
		});

		it('should preserve existing environment ID for token cache', async () => {
			const request = createValidRequest({
				existingEnvironmentId: 'env-existing-123'
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('discovered-env-id');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getId().getValue()).toBe('env-existing-123');
		});

		it('should generate temporary ID when no existing ID provided', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('discovered-env-id');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getId().getValue()).toMatch(/^env-/);
		});
	});

	describe('credential fallback', () => {
		it('should load client secret from storage when not provided', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
				// clientSecret not provided
			});
			mockRepository.getClientSecret.mockResolvedValue('stored-secret');
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.getClientSecret).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				'stored-secret',
				undefined,
				undefined
			);
		});

		it('should load password from storage when not provided', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'admin@contoso.com'
				// password not provided
			});
			mockRepository.getPassword.mockResolvedValue('stored-password');
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.getPassword).toHaveBeenCalledWith('admin@contoso.com');
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				'stored-password',
				undefined
			);
		});

		it('should use provided credentials over stored credentials', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'new-secret'
			});
			mockRepository.getClientSecret.mockResolvedValue('stored-secret');
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			// Should use provided secret, not stored
			expect(mockRepository.getClientSecret).not.toHaveBeenCalled();
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				'new-secret',
				undefined,
				undefined
			);
		});

		it('should not attempt to load credentials for interactive auth', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.Interactive
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			expect(mockRepository.getClientSecret).not.toHaveBeenCalled();
			expect(mockRepository.getPassword).not.toHaveBeenCalled();
		});

		it('should handle missing stored credentials gracefully', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				undefined
			);
		});
	});

	describe('cancellation token support', () => {
		it('should pass cancellation token to API service', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request, mockCancellationToken);

			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				mockCancellationToken
			);
		});

		it('should work without cancellation token', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockPowerPlatformApiService.discoverEnvironmentId).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				undefined
			);
		});
	});

	describe('error handling', () => {
		it('should return error when API call fails', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue(
				new Error('Failed to discover environment ID: Network error')
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Failed to discover environment ID: Network error');
			expect(result.environmentId).toBeUndefined();
		});

		it('should detect when interactive auth is required', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue(
				new Error('API request failed with 403 Forbidden')
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.requiresInteractiveAuth).toBe(true);
		});

		it('should detect authorization errors requiring interactive auth', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue(
				new Error('Forbidden: Insufficient privileges to access resource')
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.requiresInteractiveAuth).toBe(true);
		});

		it('should handle network errors without requiring interactive auth', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue(
				new Error('Network timeout')
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.requiresInteractiveAuth).toBe(false);
		});

		it('should handle non-Error exceptions', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue('String error');

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Unknown error');
		});

		it('should handle unknown error types', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockRejectedValue({ unknown: 'object' });

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Unknown error');
		});
	});

	describe('environment creation', () => {
		it('should create temporary environment with all provided fields', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'secret'
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getName().getValue()).toBe('Development');
			expect(calledEnv.getDataverseUrl().getValue()).toBe('https://contoso.crm.dynamics.com');
			expect(calledEnv.getTenantId().getValue()).toBe('00000000-0000-0000-0000-000000000000');
		});

		it('should create temporary environment without optional fields', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getPowerPlatformEnvironmentId()).toBeUndefined();
			expect(calledEnv.getClientId()).toBeUndefined();
			expect(calledEnv.getUsername()).toBeUndefined();
		});

		it('should set isActive to false for temporary environment', async () => {
			const request = createValidRequest();
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getIsActive()).toBe(false);
		});
	});

	describe('API service integration', () => {
		it('should call API service with correct environment data', async () => {
			const request = createValidRequest({
				dataverseUrl: 'https://myorg.crm4.dynamics.com'
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-discovered');

			await useCase.execute(request);

			const calledEnv = mockPowerPlatformApiService.discoverEnvironmentId.mock.calls[0][0];
			expect(calledEnv.getDataverseUrl().getValue()).toBe('https://myorg.crm4.dynamics.com');
		});

		it('should return discovered environment ID exactly as returned by API', async () => {
			const request = createValidRequest();
			const discoveredId = '12345678-1234-1234-1234-123456789abc';
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue(discoveredId);

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe(discoveredId);
		});
	});

	describe('multiple authentication methods', () => {
		it.each([
			AuthenticationMethodType.Interactive,
			AuthenticationMethodType.ServicePrincipal,
			AuthenticationMethodType.UsernamePassword
		])('should support %s authentication method', async (authMethod) => {
			const request = createValidRequest({
				authenticationMethod: authMethod,
				...(authMethod === AuthenticationMethodType.ServicePrincipal && {
					clientId: '12345678-1234-1234-1234-123456789abc',
					clientSecret: 'secret'
				}),
				...(authMethod === AuthenticationMethodType.UsernamePassword && {
					username: 'user@example.com',
					password: 'password'
				})
			});
			mockPowerPlatformApiService.discoverEnvironmentId.mockResolvedValue('env-id');

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe('env-id');
		});
	});
});
