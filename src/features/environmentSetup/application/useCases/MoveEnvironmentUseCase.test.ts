import { MoveEnvironmentUseCase } from './MoveEnvironmentUseCase';
import { createMockEnvironmentRepository } from '../../../../shared/testing/setup/repositorySetup';
import { createTestEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('MoveEnvironmentUseCase', () => {
	let useCase: MoveEnvironmentUseCase;
	let mockRepository: ReturnType<typeof createMockEnvironmentRepository>;
	let logger: NullLogger;

	beforeEach(() => {
		mockRepository = createMockEnvironmentRepository();
		logger = new NullLogger();
		useCase = new MoveEnvironmentUseCase(mockRepository, logger);
	});

	describe('execute', () => {
		describe('moving up', () => {
			it('should swap sortOrder with previous environment when moving up', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 1 });
				const env3 = createTestEnvironment({ id: 'env-3', name: 'Third', sortOrder: 2 });

				mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

				// Act
				const result = await useCase.execute('env-2', 'up');

				// Assert
				expect(result).toBe(true);
				expect(mockRepository.save).toHaveBeenCalledTimes(2);
				expect(env2.getSortOrder()).toBe(0);
				expect(env1.getSortOrder()).toBe(1);
			});

			it('should return false when environment is already at top', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 1 });

				mockRepository.getAll.mockResolvedValue([env1, env2]);

				// Act
				const result = await useCase.execute('env-1', 'up');

				// Assert
				expect(result).toBe(false);
				expect(mockRepository.save).not.toHaveBeenCalled();
			});
		});

		describe('moving down', () => {
			it('should swap sortOrder with next environment when moving down', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 1 });
				const env3 = createTestEnvironment({ id: 'env-3', name: 'Third', sortOrder: 2 });

				mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

				// Act
				const result = await useCase.execute('env-2', 'down');

				// Assert
				expect(result).toBe(true);
				expect(mockRepository.save).toHaveBeenCalledTimes(2);
				expect(env2.getSortOrder()).toBe(2);
				expect(env3.getSortOrder()).toBe(1);
			});

			it('should return false when environment is already at bottom', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 1 });

				mockRepository.getAll.mockResolvedValue([env1, env2]);

				// Act
				const result = await useCase.execute('env-2', 'down');

				// Assert
				expect(result).toBe(false);
				expect(mockRepository.save).not.toHaveBeenCalled();
			});
		});

		describe('edge cases', () => {
			it('should return false when only one environment exists', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'Only One' });
				mockRepository.getAll.mockResolvedValue([env1]);

				// Act
				const result = await useCase.execute('env-1', 'up');

				// Assert
				expect(result).toBe(false);
				expect(mockRepository.save).not.toHaveBeenCalled();
			});

			it('should throw error when environment not found', async () => {
				// Arrange - need at least 2 environments to get past length check
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First' });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second' });
				mockRepository.getAll.mockResolvedValue([env1, env2]);

				// Act & Assert
				await expect(useCase.execute('non-existent', 'up'))
					.rejects.toThrow('Environment not found: non-existent');
			});

			it('should handle environments with same sortOrder by reassigning sequential values', async () => {
				// Arrange - all have sortOrder 0 (default)
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 0 });
				const env3 = createTestEnvironment({ id: 'env-3', name: 'Third', sortOrder: 0 });

				mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

				// Act
				const result = await useCase.execute('env-2', 'up');

				// Assert
				expect(result).toBe(true);
				expect(mockRepository.save).toHaveBeenCalledTimes(2);
				// After reassignment and swap, env2 should have lower sortOrder than env1
				expect(env2.getSortOrder()).toBeLessThan(env1.getSortOrder());
			});
		});

		describe('preserving credentials', () => {
			it('should pass preserveExistingCredentials=true when saving', async () => {
				// Arrange
				const env1 = createTestEnvironment({ id: 'env-1', name: 'First', sortOrder: 0 });
				const env2 = createTestEnvironment({ id: 'env-2', name: 'Second', sortOrder: 1 });

				mockRepository.getAll.mockResolvedValue([env1, env2]);

				// Act
				await useCase.execute('env-2', 'up');

				// Assert
				expect(mockRepository.save).toHaveBeenCalledWith(
					expect.anything(),
					undefined,
					undefined,
					true
				);
			});
		});
	});
});
