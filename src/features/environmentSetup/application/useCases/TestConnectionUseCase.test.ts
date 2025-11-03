import { IWhoAmIService } from '../../domain/interfaces/IWhoAmIService';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

import { TestConnectionUseCase, TestConnectionRequest } from './TestConnectionUseCase';

describe('TestConnectionUseCase', () => {
	let useCase: TestConnectionUseCase;
	let mockWhoAmIService: jest.Mocked<IWhoAmIService>;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;

	beforeEach(() => {
		mockWhoAmIService = {
			testConnection: jest.fn()
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

		useCase = new TestConnectionUseCase(
			mockWhoAmIService,
			mockRepository,
			new NullLogger()
		);
	});

	function createValidRequest(overrides?: Partial<TestConnectionRequest>): TestConnectionRequest {
		return {
			name: 'Development',
			dataverseUrl: 'https://contoso.crm.dynamics.com',
			tenantId: '00000000-0000-0000-0000-000000000000',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			...overrides
		};
	}

	describe('successful connection test', () => {
		it('should test connection with interactive authentication', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.userId).toBe('user-123');
			expect(result.businessUnitId).toBe('bu-123');
			expect(result.organizationId).toBe('org-123');
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledTimes(1);
		});

		it('should test connection with client credentials', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'super-secret'
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				'super-secret',
				undefined
			);
			// Verify auth method was set correctly
			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
			expect(calledEnv.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.ServicePrincipal);
		});

		it('should test connection with username/password', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'admin@contoso.com',
				password: 'secret-password'
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				'secret-password'
			);
			// Verify username was set correctly
			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
			expect(calledEnv.getUsername()).toBe('admin@contoso.com');
		});

		it('should preserve existing environment ID for token cache', async () => {
			const request = createValidRequest({
				existingEnvironmentId: 'env-existing-123'
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			await useCase.execute(request);

			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
			expect(calledEnv.getId().getValue()).toBe('env-existing-123');
		});

		it('should generate temporary ID when no existing ID provided', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			await useCase.execute(request);

			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
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
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.getClientSecret).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				'stored-secret',
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
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.getPassword).toHaveBeenCalledWith('admin@contoso.com');
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				'stored-password'
			);
		});

		it('should use provided credentials over stored credentials', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'new-secret'
			});
			mockRepository.getClientSecret.mockResolvedValue('stored-secret');
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			await useCase.execute(request);

			// Should use provided secret, not stored
			expect(mockRepository.getClientSecret).not.toHaveBeenCalled();
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				'new-secret',
				undefined
			);
		});

		it('should not attempt to load credentials for interactive auth', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.Interactive
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

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
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			await useCase.execute(request);

			expect(mockWhoAmIService.testConnection).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined
			);
		});
	});

	describe('validation and errors', () => {
		it('should return error when WhoAmI service not available', async () => {
			const useCaseNoService = new TestConnectionUseCase(
				null,
				mockRepository,
				new NullLogger()
			);
			const request = createValidRequest();

			const result = await useCaseNoService.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('WhoAmI service not yet implemented');
		});

		it('should return error when connection test fails', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockRejectedValue(
				new Error('Authentication failed: Invalid credentials')
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Authentication failed: Invalid credentials');
			expect(result.userId).toBeUndefined();
		});

		it('should return error when configuration is invalid', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal
				// Missing clientId - should fail environment validation
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('Client ID is required');
		});

		it('should handle non-Error exceptions', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockRejectedValue('String error');

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Unknown error');
		});

		it('should handle unknown error types', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockRejectedValue({ unknown: 'object' });

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe('Unknown error');
		});
	});

	describe('domain validation', () => {
		it('should validate that interactive auth can test connection', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.Interactive
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
		});

		it('should reject client credentials without client ID', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientSecret: 'secret'
				// Missing clientId
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('Client ID is required');
			expect(mockWhoAmIService.testConnection).not.toHaveBeenCalled();
		});

		it('should reject username/password without username', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				password: 'password'
				// Missing username
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('Username is required');
			expect(mockWhoAmIService.testConnection).not.toHaveBeenCalled();
		});
	});

	describe('WhoAmI response handling', () => {
		it('should return all WhoAmI response fields', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-guid',
				businessUnitId: 'bu-guid',
				organizationId: 'org-guid'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.userId).toBe('user-guid');
			expect(result.businessUnitId).toBe('bu-guid');
			expect(result.organizationId).toBe('org-guid');
		});

		it('should handle partial WhoAmI response', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-guid',
				businessUnitId: 'bu-guid',
				organizationId: 'org-guid'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.userId).toBe('user-guid');
			expect(result.businessUnitId).toBe('bu-guid');
			expect(result.organizationId).toBe('org-guid');
		});
	});

	describe('environment creation', () => {
		it('should create temporary environment with all provided fields', async () => {
			const request = createValidRequest({
				powerPlatformEnvironmentId: '00000000-0000-0000-0000-000000000001',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'secret'
			});
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledTimes(1);

			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
			expect(calledEnv.getName().getValue()).toBe('Development');
			expect(calledEnv.getDataverseUrl().getValue()).toBe('https://contoso.crm.dynamics.com');
			expect(calledEnv.getPowerPlatformEnvironmentId()).toBe('00000000-0000-0000-0000-000000000001');
		});

		it('should create temporary environment without optional fields', async () => {
			const request = createValidRequest();
			mockWhoAmIService.testConnection.mockResolvedValue({
				userId: 'user-123',
				businessUnitId: 'bu-123',
				organizationId: 'org-123'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockWhoAmIService.testConnection).toHaveBeenCalledTimes(1);

			const calledEnv = mockWhoAmIService.testConnection.mock.calls[0][0];
			expect(calledEnv.getPowerPlatformEnvironmentId()).toBeUndefined();
			expect(calledEnv.getClientId()).toBeUndefined();
			expect(calledEnv.getUsername()).toBeUndefined();
		});
	});
});
