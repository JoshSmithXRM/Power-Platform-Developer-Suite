import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentValidationService } from '../../domain/services/EnvironmentValidationService';
import { AuthenticationCacheInvalidationService } from '../../domain/services/AuthenticationCacheInvalidationService';
import { IDomainEventPublisher } from '../interfaces/IDomainEventPublisher';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { ValidationResult } from '../../domain/valueObjects/ValidationResult';
import { createTestEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';
import { Environment } from '../../domain/entities/Environment';

import { SaveEnvironmentUseCase, SaveEnvironmentRequest } from './SaveEnvironmentUseCase';

type MockValidationService = Pick<EnvironmentValidationService, 'validateForSave'>;
type MockCacheInvalidationService = Pick<AuthenticationCacheInvalidationService, 'shouldInvalidateCache'>;

describe('SaveEnvironmentUseCase', () => {
	let useCase: SaveEnvironmentUseCase;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;
	let mockValidationService: jest.Mocked<MockValidationService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;
	let mockCacheInvalidationService: jest.Mocked<MockCacheInvalidationService>;

	beforeEach(() => {
		mockRepository = {
			getAll: jest.fn(),
			getById: jest.fn(),
			getByName: jest.fn(),
			getActive: jest.fn(),
		getDefault: jest.fn(),
			save: jest.fn(),
			delete: jest.fn(),
			isNameUnique: jest.fn(),
			getClientSecret: jest.fn(),
			getPassword: jest.fn(),
			deleteSecrets: jest.fn()
		};

		mockValidationService = {
			validateForSave: jest.fn()
		} as jest.Mocked<MockValidationService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		mockCacheInvalidationService = {
			shouldInvalidateCache: jest.fn()
		} as jest.Mocked<MockCacheInvalidationService>;

		useCase = new SaveEnvironmentUseCase(
			mockRepository,
			mockValidationService,
			mockEventPublisher,
			mockCacheInvalidationService,
			new NullLogger()
		);
	});

	function createValidRequest(overrides?: Partial<SaveEnvironmentRequest>): SaveEnvironmentRequest {
		return {
			name: 'Development',
			dataverseUrl: 'https://contoso.crm.dynamics.com',
			tenantId: '00000000-0000-0000-0000-000000000000',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			...overrides
		};
	}


	describe('create new environment', () => {
		it('should create environment with valid data', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBeDefined();
			expect(result.errors).toBeUndefined();
			expect(mockRepository.save).toHaveBeenCalledTimes(1);
		});

		it('should publish EnvironmentCreated event', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentCreated',
					environmentName: 'Development'
				})
			);
		});

		it('should generate unique environment ID for new environment', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result1 = await useCase.execute(request);
			const result2 = await useCase.execute(request);

			expect(result1.environmentId).toBeDefined();
			expect(result2.environmentId).toBeDefined();
			expect(result1.environmentId).not.toBe(result2.environmentId);
		});

		it('should create environment with optional Power Platform environment ID', async () => {
			const request = createValidRequest({
				powerPlatformEnvironmentId: '00000000-0000-0000-0000-000000000001'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.save).toHaveBeenCalledTimes(1);

			// Verify the environment has the Power Platform environment ID
			const [savedEnv] = mockRepository.save.mock.calls[0]!;
			expect(savedEnv.getPowerPlatformEnvironmentId()).toBe('00000000-0000-0000-0000-000000000001');
		});
	});

	describe('update existing environment', () => {
		it('should update environment when existingEnvironmentId provided', async () => {
			const existingEnv = createTestEnvironment({ id: 'env-123', name: 'Development', authenticationMethod: AuthenticationMethodType.Interactive });
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				name: 'Development Updated'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.environmentId).toBe('env-123');
			expect(mockRepository.save).toHaveBeenCalledTimes(1);
		});

		it('should publish EnvironmentUpdated event with previous name', async () => {
			const existingEnv = createTestEnvironment({ id: 'env-123', name: 'Old Name', authenticationMethod: AuthenticationMethodType.Interactive });
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				name: 'New Name'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentUpdated',
					environmentName: 'New Name',
					previousName: 'Old Name'
				})
			);
		});

		it('should return error when environment not found for update', async () => {
			const request = createValidRequest({
				existingEnvironmentId: 'non-existent'
			});

			mockRepository.getById.mockResolvedValue(null);

			await expect(useCase.execute(request)).rejects.toThrow('Environment not found');
		});

		it('should preserve active status when updating', async () => {
			const existingEnv = createTestEnvironment({ id: 'env-123', name: 'Development', authenticationMethod: AuthenticationMethodType.Interactive });
			// Activate the environment properly
			existingEnv.activate();

			const request = createValidRequest({
				existingEnvironmentId: 'env-123'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.save).toHaveBeenCalledTimes(1);
			const [savedEnv] = mockRepository.save.mock.calls[0]!;
			expect(savedEnv.getIsActive()).toBe(true);
		});
	});

	describe('value object validation', () => {
		it('should return validation error for empty name', async () => {
			const request = createValidRequest({
				name: ''
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toContain('Environment name cannot be empty');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should return validation error for invalid Dataverse URL', async () => {
			const request = createValidRequest({
				dataverseUrl: 'invalid-url'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toContain('Invalid Dataverse URL format');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should return validation error for invalid tenant ID', async () => {
			const request = createValidRequest({
				tenantId: 'invalid-guid-format'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toContain('Invalid Tenant ID format');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should return validation error for invalid client ID', async () => {
			const request = createValidRequest({
				publicClientId: ''
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('domain validation', () => {
		it('should return validation errors when domain validation fails', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(false);
			mockValidationService.validateForSave.mockReturnValue(
				ValidationResult.failure(['Environment name must be unique'])
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toEqual(['Environment name must be unique']);
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should return warnings when domain validation has warnings', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(
				ValidationResult.successWithWarnings(['Client secret not provided - existing secret will be preserved'])
			);

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(result.warnings).toEqual(['Client secret not provided - existing secret will be preserved']);
		});
	});

	describe('credential management', () => {
		it('should save new credentials with environment', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'super-secret'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.any(Environment),
				'super-secret',
				undefined,
				undefined
			);
		});

		it('should save password for username/password authentication', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'admin@contoso.com',
				password: 'secret-password'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.any(Environment),
				undefined,
				'secret-password',
				undefined
			);
		});

		it('should preserve existing credentials when flag is true', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				preserveExistingCredentials: true
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue('existing-secret');
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.any(Environment),
				undefined,
				undefined,
				true
			);
		});
	});

	describe('orphaned secret cleanup', () => {
		it('should delete orphaned client secret when auth method changes', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '11111111-1111-1111-1111-111111111111'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.Interactive
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			// The key includes the secret storage prefix
			expect(mockRepository.deleteSecrets).toHaveBeenCalledWith(
				expect.arrayContaining(['power-platform-dev-suite-secret-11111111-1111-1111-1111-111111111111'])
			);
		});

		it('should delete orphaned password when auth method changes', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'admin@contoso.com'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.Interactive
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			// The key includes the password storage prefix
			expect(mockRepository.deleteSecrets).toHaveBeenCalledWith(
				expect.arrayContaining(['power-platform-dev-suite-password-admin@contoso.com'])
			);
		});

		it('should not delete secrets when auth method stays the same', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue('existing-secret');
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.deleteSecrets).not.toHaveBeenCalled();
		});
	});

	describe('authentication cache invalidation', () => {
		it('should invalidate cache when auth method changes', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.Interactive
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'secret'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockCacheInvalidationService.shouldInvalidateCache.mockReturnValue(true);

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'auth_method_changed'
				})
			);
		});

		it('should invalidate cache when client ID changes', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '11111111-1111-1111-1111-111111111111'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '22222222-2222-2222-2222-222222222222',
				clientSecret: 'secret'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockCacheInvalidationService.shouldInvalidateCache.mockReturnValue(true);

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'credentials_changed'
				})
			);
		});

		it('should invalidate cache when username changes', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'old@contoso.com'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'new@contoso.com',
				password: 'password'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockCacheInvalidationService.shouldInvalidateCache.mockReturnValue(true);

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'credentials_changed'
				})
			);
		});

		it('should invalidate cache when new credentials provided', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'new-secret'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue('old-secret');
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockCacheInvalidationService.shouldInvalidateCache.mockReturnValue(true);

			await useCase.execute(request);

			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'credentials_changed'
				})
			);
		});

		it('should not invalidate cache when preserving existing credentials', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				preserveExistingCredentials: true
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue('existing-secret');
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			// Should only publish EnvironmentUpdated, not cache invalidation
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentUpdated'
				})
			);
		});

		it('should not invalidate cache for new environment creation', async () => {
			const request = createValidRequest();
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			// Should only publish EnvironmentCreated, not cache invalidation
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentCreated'
				})
			);
		});
	});

	describe('validation service integration', () => {
		it('should call validation service with correct parameters', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc',
				clientSecret: 'secret'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockValidationService.validateForSave).toHaveBeenCalledWith(
				expect.any(Environment),
				true, // isNameUnique
				false, // hasExistingClientSecret
				false, // hasExistingPassword
				'secret', // clientSecret
				undefined // password
			);
		});

		it('should check for existing secrets before validation', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockResolvedValue('existing-secret');
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			expect(mockRepository.getClientSecret).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
			expect(mockValidationService.validateForSave).toHaveBeenCalledWith(
				expect.any(Environment),
				true,
				true, // hasExistingClientSecret should be true
				false,
				undefined,
				undefined
			);
		});
	});

	describe('edge cases - repository failures', () => {
		it('should propagate error when repository.save fails', async () => {
			const request = createValidRequest();
			const saveError = new Error('Database connection failed');

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockRepository.save.mockRejectedValue(saveError);

			await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should propagate error when repository.isNameUnique fails', async () => {
			const request = createValidRequest();
			const uniqueCheckError = new Error('Network timeout during name check');

			mockRepository.isNameUnique.mockRejectedValue(uniqueCheckError);

			await expect(useCase.execute(request)).rejects.toThrow('Network timeout during name check');
		});

		it('should propagate error when repository.getClientSecret fails', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '12345678-1234-1234-1234-123456789abc'
			});
			const secretError = new Error('Secret store unavailable');

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getClientSecret.mockRejectedValue(secretError);

			await expect(useCase.execute(request)).rejects.toThrow('Secret store unavailable');
		});

		it('should propagate error when repository.getPassword fails', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'user@contoso.com'
			});
			const passwordError = new Error('Password store locked');

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockRepository.getPassword.mockRejectedValue(passwordError);

			await expect(useCase.execute(request)).rejects.toThrow('Password store locked');
		});

		it('should propagate error when repository.deleteSecrets fails during orphan cleanup', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '11111111-1111-1111-1111-111111111111'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.Interactive
			});
			const deleteError = new Error('Failed to delete orphaned secrets');

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockRepository.deleteSecrets.mockRejectedValue(deleteError);

			await expect(useCase.execute(request)).rejects.toThrow('Failed to delete orphaned secrets');
		});

		it('should handle repository.getById returning null for update operation', async () => {
			const request = createValidRequest({
				existingEnvironmentId: 'non-existent-id'
			});

			mockRepository.getById.mockResolvedValue(null);

			await expect(useCase.execute(request)).rejects.toThrow('Environment not found');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('edge cases - concurrent operations', () => {
		it('should handle race condition when name becomes non-unique between check and save', async () => {
			const request = createValidRequest({ name: 'RaceConditionEnv' });

			// First check passes, but save fails due to uniqueness constraint
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockRepository.save.mockRejectedValue(new Error('UNIQUE constraint failed: name'));

			await expect(useCase.execute(request)).rejects.toThrow('UNIQUE constraint failed: name');
		});

		it('should handle multiple concurrent save operations for same environment', async () => {
			const existingEnv = createTestEnvironment({ id: 'env-123', name: 'Development', authenticationMethod: AuthenticationMethodType.Interactive });
			const request1 = createValidRequest({
				existingEnvironmentId: 'env-123',
				name: 'Updated Name 1'
			});
			const request2 = createValidRequest({
				existingEnvironmentId: 'env-123',
				name: 'Updated Name 2'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockRepository.save.mockResolvedValue();

			// Execute both concurrently
			const [result1, result2] = await Promise.all([
				useCase.execute(request1),
				useCase.execute(request2)
			]);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(mockRepository.save).toHaveBeenCalledTimes(2);
		});

		it('should handle environment being deleted during update operation', async () => {
			let callCount = 0;
			const request = createValidRequest({
				existingEnvironmentId: 'env-to-be-deleted'
			});

			mockRepository.getById.mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					return createTestEnvironment({ id: 'env-to-be-deleted', name: 'Dev', authenticationMethod: AuthenticationMethodType.Interactive });
				}
				// Simulate deletion by another process
				return null;
			});
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockRepository.save.mockRejectedValue(new Error('Environment no longer exists'));

			await expect(useCase.execute(request)).rejects.toThrow('Environment no longer exists');
		});
	});

	describe('edge cases - validation and data integrity', () => {
		it('should handle whitespace-only environment name', async () => {
			const request = createValidRequest({
				name: '   '
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toContain('Environment name cannot be empty');
		});

		it('should handle extremely long environment name', async () => {
			const request = createValidRequest({
				name: 'A'.repeat(1000)
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
		});

		it('should handle malformed GUID formats', async () => {
			const request = createValidRequest({
				tenantId: 'not-a-guid-at-all'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toContain('Invalid Tenant ID format');
		});

		it('should handle URL with special characters and encoding issues', async () => {
			const request = createValidRequest({
				dataverseUrl: 'https://org with spaces.crm.dynamics.com'
			});

			const result = await useCase.execute(request);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
		});

		it('should handle empty strings for optional fields', async () => {
			const request = createValidRequest({
				clientId: '',
				clientSecret: '',
				username: '',
				password: ''
			});

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result = await useCase.execute(request);

			// Should treat empty strings as undefined
			expect(result.success).toBe(true);
		});

		it('should validate that preserveExistingCredentials requires existing environment', async () => {
			const request = createValidRequest({
				preserveExistingCredentials: true // No existingEnvironmentId
			});

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			// Should succeed - flag is simply ignored for new environments
			const result = await useCase.execute(request);
			expect(result.success).toBe(true);
		});
	});

	describe('edge cases - complex credential scenarios', () => {
		it('should handle switching from ServicePrincipal to UsernamePassword with orphan cleanup', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '11111111-1111-1111-1111-111111111111'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.UsernamePassword,
				username: 'newuser@contoso.com',
				password: 'newpassword'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			await useCase.execute(request);

			// Should delete old client secret
			expect(mockRepository.deleteSecrets).toHaveBeenCalledWith(
				expect.arrayContaining([expect.stringContaining('11111111-1111-1111-1111-111111111111')])
			);
			// Should save new password
			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.any(Environment),
				undefined,
				'newpassword',
				undefined
			);
		});

		it('should handle changing client ID with same auth method', async () => {
			const existingEnv = createTestEnvironment({
				id: 'env-123',
				name: 'Development',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '11111111-1111-1111-1111-111111111111'
			});
			const request = createValidRequest({
				existingEnvironmentId: 'env-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				clientId: '22222222-2222-2222-2222-222222222222',
				clientSecret: 'new-secret'
			});

			mockRepository.getById.mockResolvedValue(existingEnv);
			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());
			mockCacheInvalidationService.shouldInvalidateCache.mockReturnValue(true);

			await useCase.execute(request);

			// Should delete old client secret
			expect(mockRepository.deleteSecrets).toHaveBeenCalledWith(
				expect.arrayContaining([expect.stringContaining('11111111-1111-1111-1111-111111111111')])
			);
			// Should invalidate cache
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested'
				})
			);
		});

		it('should handle credential-less authentication methods gracefully', async () => {
			const request = createValidRequest({
				authenticationMethod: AuthenticationMethodType.Interactive
				// No credentials needed
			});

			mockRepository.isNameUnique.mockResolvedValue(true);
			mockValidationService.validateForSave.mockReturnValue(ValidationResult.success());

			const result = await useCase.execute(request);

			expect(result.success).toBe(true);
			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.any(Environment),
				undefined,
				undefined,
				undefined
			);
		});
	});
});
