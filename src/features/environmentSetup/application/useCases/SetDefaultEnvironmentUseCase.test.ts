import { SetDefaultEnvironmentUseCase } from './SetDefaultEnvironmentUseCase';
import { createMockEnvironmentRepository } from '../../../../shared/testing/setup/repositorySetup';
import { createTestEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('SetDefaultEnvironmentUseCase', () => {
	let useCase: SetDefaultEnvironmentUseCase;
	let mockRepository: ReturnType<typeof createMockEnvironmentRepository>;
	let logger: NullLogger;

	beforeEach(() => {
		mockRepository = createMockEnvironmentRepository();
		logger = new NullLogger();
		useCase = new SetDefaultEnvironmentUseCase(mockRepository, logger);
	});

	describe('execute', () => {
		it('should set the specified environment as default', async () => {
			// Arrange
			const env1 = createTestEnvironment({ id: 'env-1', name: 'First' });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Second' });

			mockRepository.getById.mockResolvedValue(env2);
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			// Act
			await useCase.execute('env-2');

			// Assert
			expect(env2.getIsDefault()).toBe(true);
			expect(mockRepository.save).toHaveBeenCalledWith(
				env2,
				undefined,
				undefined,
				true
			);
		});

		it('should clear default from other environments', async () => {
			// Arrange
			const env1 = createTestEnvironment({ id: 'env-1', name: 'First', isDefault: true });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Second' });

			mockRepository.getById.mockResolvedValue(env2);
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			// Act
			await useCase.execute('env-2');

			// Assert
			expect(env1.getIsDefault()).toBe(false);
			expect(env2.getIsDefault()).toBe(true);
			expect(mockRepository.save).toHaveBeenCalledTimes(2);
		});

		it('should not save if environment is already default', async () => {
			// Arrange
			const env1 = createTestEnvironment({ id: 'env-1', name: 'First' });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', isDefault: true });

			mockRepository.getById.mockResolvedValue(env2);
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			// Act
			await useCase.execute('env-2');

			// Assert
			expect(env2.getIsDefault()).toBe(true);
			// Should not call save since env2 is already default
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should throw error when environment not found', async () => {
			// Arrange
			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute('non-existent'))
				.rejects.toThrow('Environment not found: non-existent');
		});

		it('should handle multiple environments with none as default', async () => {
			// Arrange
			const env1 = createTestEnvironment({ id: 'env-1', name: 'First' });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Second' });
			const env3 = createTestEnvironment({ id: 'env-3', name: 'Third' });

			mockRepository.getById.mockResolvedValue(env2);
			mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

			// Act
			await useCase.execute('env-2');

			// Assert
			expect(env1.getIsDefault()).toBe(false);
			expect(env2.getIsDefault()).toBe(true);
			expect(env3.getIsDefault()).toBe(false);
			// Only env2 should be saved (the one being set as default)
			expect(mockRepository.save).toHaveBeenCalledTimes(1);
		});
	});
});
