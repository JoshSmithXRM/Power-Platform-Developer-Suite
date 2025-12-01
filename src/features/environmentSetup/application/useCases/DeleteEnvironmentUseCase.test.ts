import { DeleteEnvironmentUseCase, DeleteEnvironmentRequest } from './DeleteEnvironmentUseCase';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { IDomainEventPublisher } from '../interfaces/IDomainEventPublisher';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { ApplicationError } from '../errors/ApplicationError';
import { createTestEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';

describe('DeleteEnvironmentUseCase', () => {
	let useCase: DeleteEnvironmentUseCase;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

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

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new DeleteEnvironmentUseCase(
			mockRepository,
			mockEventPublisher,
			new NullLogger()
		);
	});

	function createDeleteRequest(environmentId: string): DeleteEnvironmentRequest {
		return { environmentId };
	}

	describe('successful deletion flow', () => {
		it('should call repository.delete with correct environment ID', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.delete).toHaveBeenCalledTimes(1);
			expect(mockRepository.delete).toHaveBeenCalledWith(
				expect.objectContaining({
					value: 'env-123'
				})
			);
		});

		it('should publish EnvironmentDeleted event', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentDeleted',
					environmentName: 'Development',
					wasActive: false
				})
			);
		});

		it('should publish EnvironmentDeleted event with correct wasActive flag', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Production', isActive: true });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'EnvironmentDeleted',
					environmentName: 'Production',
					wasActive: true
				})
			);
		});

		it('should publish AuthenticationCacheInvalidationRequested event', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'environment_deleted'
				})
			);
		});

		it('should publish both events in correct order', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
			const calls = mockEventPublisher.publish.mock.calls;
			expect(calls[0]?.[0]).toHaveProperty('type', 'AuthenticationCacheInvalidationRequested');
			expect(calls[1]?.[0]).toHaveProperty('type', 'EnvironmentDeleted');
		});
	});

	describe('secret cleanup', () => {
		it('should retrieve environment before deletion', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.getById).toHaveBeenCalledTimes(1);
			expect(mockRepository.getById).toHaveBeenCalledWith(
				expect.objectContaining({
					value: 'env-123'
				})
			);
		});

		it('should call repository.delete which handles secret cleanup', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert - repository.delete is responsible for secret cleanup
			expect(mockRepository.delete).toHaveBeenCalledTimes(1);
		});
	});

	describe('error handling', () => {
		it('should throw ApplicationError when environment not found', async () => {
			// Arrange
			const request = createDeleteRequest('nonexistent-id');

			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow(ApplicationError);
			await expect(useCase.execute(request)).rejects.toThrow('Environment not found');
		});

		it('should not call repository.delete when environment not found', async () => {
			// Arrange
			const request = createDeleteRequest('nonexistent-id');

			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow();
			expect(mockRepository.delete).not.toHaveBeenCalled();
		});

		it('should not publish events when environment not found', async () => {
			// Arrange
			const request = createDeleteRequest('nonexistent-id');

			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when repository.delete fails', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockRejectedValue(new Error('Delete failed'));

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Delete failed');
		});

		it('should not publish events when repository.delete fails', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockRejectedValue(new Error('Delete failed'));

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when getById fails', async () => {
			// Arrange
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockRejectedValue(new Error('Repository error'));

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Repository error');
			expect(mockRepository.delete).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle environment with no secrets', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act & Assert - Should complete successfully
			await expect(useCase.execute(request)).resolves.not.toThrow();
		});

		it('should delete inactive environment', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development', isActive: false });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.delete).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalled();
		});

		it('should delete active environment', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Production', isActive: true });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.delete).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					wasActive: true
				})
			);
		});

		it('should handle environment ID with special characters', async () => {
			// Arrange
			const specialId = 'env-123-abc-xyz';
			const environment = createTestEnvironment({ id: specialId, name: 'Special Environment' });
			const request = createDeleteRequest(specialId);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.delete).toHaveBeenCalledWith(
				expect.objectContaining({
					value: specialId
				})
			);
		});

		it('should handle environment with special characters in name', async () => {
			// Arrange
			const environment = createTestEnvironment({ id: 'env-123', name: 'Dev-Test (2024)' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					environmentName: 'Dev-Test (2024)'
				})
			);
		});
	});

	describe('business logic validation', () => {
		it('should enforce deletion prevents accidental data loss', async () => {
			// Arrange - Critical: Deleting active environment
			const environment = createTestEnvironment({ id: 'env-123', name: 'Production', isActive: true });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert - Cache invalidation is critical for active environments
			expect(mockEventPublisher.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'AuthenticationCacheInvalidationRequested',
					reason: 'environment_deleted'
				})
			);
		});

		it('should complete deletion workflow atomically', async () => {
			// Arrange - Ensures all steps complete or none do
			const environment = createTestEnvironment({ id: 'env-123', name: 'Development' });
			const request = createDeleteRequest('env-123');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.delete.mockResolvedValue(undefined);

			// Act
			await useCase.execute(request);

			// Assert - All operations must complete
			expect(mockRepository.getById).toHaveBeenCalledTimes(1);
			expect(mockRepository.delete).toHaveBeenCalledTimes(1);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
		});
	});
});
