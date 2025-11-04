import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentListViewModelMapper } from '../mappers/EnvironmentListViewModelMapper';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

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

	function createTestEnvironment(id: string, name: string, isActive: boolean, lastUsed?: Date): Environment {
		return new Environment(
			new EnvironmentId(id),
			new EnvironmentName(name),
			new DataverseUrl('https://org.crm.dynamics.com'),
			new TenantId('00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(AuthenticationMethodType.Interactive),
			new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
			isActive,
			lastUsed ?? undefined,
			undefined,
			undefined,
			undefined
		);
	}

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
			const env1 = createTestEnvironment('env-1', 'Development', false);
			const env2 = createTestEnvironment('env-2', 'Production', false);
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
			const env1 = createTestEnvironment('env-1', 'Development', false);
			const env2 = createTestEnvironment('env-2', 'Production', true); // Active
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			const result = await useCase.execute();

			expect(result.activeEnvironmentId).toBe('env-2');
		});

		it('should return undefined activeEnvironmentId when no environment is active', async () => {
			const env1 = createTestEnvironment('env-1', 'Development', false);
			const env2 = createTestEnvironment('env-2', 'Production', false);
			mockRepository.getAll.mockResolvedValue([env1, env2]);

			const result = await useCase.execute();

			expect(result.activeEnvironmentId).toBeUndefined();
		});

		it('should sort environments by last used (most recent first)', async () => {
			const now = new Date();
			const yesterday = new Date(now.getTime() - 86400000);
			const lastWeek = new Date(now.getTime() - 604800000);

			const env1 = createTestEnvironment('env-1', 'Development', false, lastWeek);
			const env2 = createTestEnvironment('env-2', 'Production', false, now);
			const env3 = createTestEnvironment('env-3', 'Staging', false, yesterday);

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

			const env1 = createTestEnvironment('env-1', 'Zebra', false); // No lastUsed
			const env2 = createTestEnvironment('env-2', 'Production', false, now); // Has lastUsed
			const env3 = createTestEnvironment('env-3', 'Alpha', false); // No lastUsed

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
			const env = createTestEnvironment('env-1', 'Development', true);
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
