import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentListViewModelMapper } from '../mappers/EnvironmentListViewModelMapper';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { createTestEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';

import { LoadEnvironmentsUseCase } from './LoadEnvironmentsUseCase';

describe('LoadEnvironmentsUseCase', () => {
	let useCase: LoadEnvironmentsUseCase;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;
	let mapper: EnvironmentListViewModelMapper;

	beforeEach(() => {
		// Create mock repository
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

		// Use real mapper (unit test - mapper is simple)
		mapper = new EnvironmentListViewModelMapper();

		useCase = new LoadEnvironmentsUseCase(mockRepository, mapper, new NullLogger());
	});

	describe('execute', () => {
		it('should return empty list when no environments exist', async () => {
			mockRepository.getAll.mockResolvedValue([]);

			const result = await useCase.execute();

			expect(result.environments).toHaveLength(0);
			expect(result.totalCount).toBe(0);
			expect(result.activeEnvironmentId).toBeUndefined();
			expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
		});

		it('should return all environments as view models', async () => {
			const env1 = createTestEnvironment({ id: 'env-1', name: 'Development', isActive: false });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Production', isActive: false });
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			const result = await useCase.execute();

			expect(result.environments).toHaveLength(2);
			expect(result.totalCount).toBe(2);
			expect(result.environments[0]).toBeDefined();
			expect(result.environments[0]!.name).toBe('Development');
			expect(result.environments[1]).toBeDefined();
			expect(result.environments[1]!.name).toBe('Production');
		});

		it('should identify active environment', async () => {
			const env1 = createTestEnvironment({ id: 'env-1', name: 'Development', isActive: false });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Production', isActive: true }); // Active
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			const result = await useCase.execute();

			expect(result.activeEnvironmentId).toBe('env-2');
		});

		it('should return undefined activeEnvironmentId when no environment is active', async () => {
			const env1 = createTestEnvironment({ id: 'env-1', name: 'Development', isActive: false });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Production', isActive: false });
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			const result = await useCase.execute();

			expect(result.activeEnvironmentId).toBeUndefined();
		});

		it('should sort environments by last used (most recent first)', async () => {
			const now = new Date();
			const yesterday = new Date(now.getTime() - 86400000);
			const lastWeek = new Date(now.getTime() - 604800000);

			const env1 = createTestEnvironment({ id: 'env-1', name: 'Development', isActive: false, lastUsed: lastWeek });
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Production', isActive: false, lastUsed: now });
			const env3 = createTestEnvironment({ id: 'env-3', name: 'Staging', isActive: false, lastUsed: yesterday });

			mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

			const result = await useCase.execute();

			// Should be sorted: Production (now), Staging (yesterday), Development (last week)
			expect(result.environments[0]).toBeDefined();
			expect(result.environments[0]!.name).toBe('Production');
			expect(result.environments[1]).toBeDefined();
			expect(result.environments[1]!.name).toBe('Staging');
			expect(result.environments[2]).toBeDefined();
			expect(result.environments[2]!.name).toBe('Development');
		});

		it('should sort environments without lastUsed alphabetically at the end', async () => {
			const now = new Date();

			const env1 = createTestEnvironment({ id: 'env-1', name: 'Zebra', isActive: false }); // No lastUsed
			const env2 = createTestEnvironment({ id: 'env-2', name: 'Production', isActive: false, lastUsed: now }); // Has lastUsed
			const env3 = createTestEnvironment({ id: 'env-3', name: 'Alpha', isActive: false }); // No lastUsed

			mockRepository.getAll.mockResolvedValue([env1, env2, env3]);

			const result = await useCase.execute();

			// Should be sorted: Production (has lastUsed), then Alpha, Zebra (alphabetically)
			expect(result.environments[0]).toBeDefined();
			expect(result.environments[0]!.name).toBe('Production');
			expect(result.environments[1]).toBeDefined();
			expect(result.environments[1]!.name).toBe('Alpha');
			expect(result.environments[2]).toBeDefined();
			expect(result.environments[2]!.name).toBe('Zebra');
		});

		it('should map environment properties correctly', async () => {
			const env = createTestEnvironment({ id: 'env-1', name: 'Development', isActive: true });
			mockRepository.getAll.mockResolvedValue([env]);

			const result = await useCase.execute();

			const viewModel = result.environments[0];
			expect(viewModel).toBeDefined();
			expect(viewModel!.id).toBe('env-1');
			expect(viewModel!.name).toBe('Development');
			expect(viewModel!.dataverseUrl).toBe('https://org.crm.dynamics.com');
			expect(viewModel!.authenticationMethod).toBe('Interactive');
			expect(viewModel!.isActive).toBe(true);
			expect(viewModel!.statusBadge).toBe('active');
		});

		it('should throw error when repository fails to load environments', async () => {
			const repositoryError = new Error('Failed to read from storage');
			mockRepository.getAll.mockRejectedValue(repositoryError);

			await expect(useCase.execute()).rejects.toThrow('Failed to read from storage');
			expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
		});
	});
});
