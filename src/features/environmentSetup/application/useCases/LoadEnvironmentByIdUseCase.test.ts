import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentFormViewModelMapper } from '../mappers/EnvironmentFormViewModelMapper';
import { EnvironmentFormViewModel } from '../viewModels/EnvironmentFormViewModel';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { ApplicationError } from '../errors/ApplicationError';

import { LoadEnvironmentByIdUseCase, LoadEnvironmentByIdRequest } from './LoadEnvironmentByIdUseCase';

describe('LoadEnvironmentByIdUseCase', () => {
	let useCase: LoadEnvironmentByIdUseCase;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;
	let mockMapper: {
		toFormViewModel: jest.Mock<EnvironmentFormViewModel, [Environment, boolean?, boolean?]>;
	} & EnvironmentFormViewModelMapper;

	beforeEach(() => {
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

		mockMapper = {
			toFormViewModel: jest.fn()
		} as {
			toFormViewModel: jest.Mock<EnvironmentFormViewModel, [Environment, boolean?, boolean?]>;
		} & EnvironmentFormViewModelMapper;

		useCase = new LoadEnvironmentByIdUseCase(
			mockRepository,
			mockMapper,
			new NullLogger()
		);
	});

	function createTestEnvironment(
		id: string,
		name: string,
		authMethod: AuthenticationMethodType,
		clientId?: string,
		username?: string
	): Environment {
		return new Environment(
			new EnvironmentId(id),
			new EnvironmentName(name),
			new DataverseUrl('https://contoso.crm.dynamics.com'),
			new TenantId('00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(authMethod),
			new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
			false,
			undefined,
			undefined,
			clientId ? new ClientId(clientId) : undefined,
			username
		);
	}

	function createValidRequest(environmentId: string): LoadEnvironmentByIdRequest {
		return { environmentId };
	}

	function createFormViewModel(
		name: string,
		hasStoredClientSecret: boolean,
		hasStoredPassword: boolean
	): EnvironmentFormViewModel {
		return {
			id: 'env-123',
			name,
			dataverseUrl: 'https://contoso.crm.dynamics.com',
			tenantId: '00000000-0000-0000-0000-000000000000',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			hasStoredClientSecret,
			hasStoredPassword,
			isExisting: true,
			requiredFields: []
		};
	}

	describe('successful environment loading', () => {
		it('should load environment by ID and return form view model', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment('env-123', 'Development', AuthenticationMethodType.Interactive);
			const expectedViewModel = createFormViewModel('Development', false, false);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getById).toHaveBeenCalledWith(expect.any(EnvironmentId));
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, false, false);
		});

		it('should detect stored client secret when available', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment(
				'env-123',
				'Development',
				AuthenticationMethodType.ServicePrincipal,
				'12345678-1234-1234-1234-123456789abc'
			);
			const expectedViewModel = createFormViewModel('Development', true, false);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue('stored-secret');
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getClientSecret).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, true, false);
		});

		it('should detect stored password when available', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment(
				'env-123',
				'Development',
				AuthenticationMethodType.UsernamePassword,
				undefined,
				'admin@contoso.com'
			);
			const expectedViewModel = createFormViewModel('Development', false, true);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue('stored-password');
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getPassword).toHaveBeenCalledWith('admin@contoso.com');
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, false, true);
		});

		it('should detect both stored client secret and password', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment(
				'env-123',
				'Development',
				AuthenticationMethodType.ServicePrincipal,
				'12345678-1234-1234-1234-123456789abc',
				'admin@contoso.com'
			);
			const expectedViewModel = createFormViewModel('Development', true, true);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue('stored-secret');
			mockRepository.getPassword.mockResolvedValue('stored-password');
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getClientSecret).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
			expect(mockRepository.getPassword).toHaveBeenCalledWith('admin@contoso.com');
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, true, true);
		});

		it('should handle environment without client ID', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment('env-123', 'Development', AuthenticationMethodType.Interactive);
			const expectedViewModel = createFormViewModel('Development', false, false);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getClientSecret).not.toHaveBeenCalled();
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, false, false);
		});

		it('should handle environment without username', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment('env-123', 'Development', AuthenticationMethodType.Interactive);
			const expectedViewModel = createFormViewModel('Development', false, false);

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockMapper.toFormViewModel.mockReturnValue(expectedViewModel);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result).toBe(expectedViewModel);
			expect(mockRepository.getPassword).not.toHaveBeenCalled();
			expect(mockMapper.toFormViewModel).toHaveBeenCalledWith(environment, false, false);
		});
	});

	describe('environment not found scenarios', () => {
		it('should throw ApplicationError when environment does not exist', async () => {
			// Arrange
			const request = createValidRequest('non-existent-env');
			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow(ApplicationError);
			await expect(useCase.execute(request)).rejects.toThrow('Environment not found: non-existent-env');
		});

		it('should not check credentials when environment not found', async () => {
			// Arrange
			const request = createValidRequest('non-existent-env');
			mockRepository.getById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow(ApplicationError);
			expect(mockRepository.getClientSecret).not.toHaveBeenCalled();
			expect(mockRepository.getPassword).not.toHaveBeenCalled();
			expect(mockMapper.toFormViewModel).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should propagate repository errors during getById', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const repositoryError = new Error('Database connection failed');
			mockRepository.getById.mockRejectedValue(repositoryError);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
		});

		it('should propagate repository errors during credential lookup', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment(
				'env-123',
				'Development',
				AuthenticationMethodType.ServicePrincipal,
				'12345678-1234-1234-1234-123456789abc'
			);
			const credentialError = new Error('Secret store unavailable');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockRejectedValue(credentialError);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Secret store unavailable');
		});

		it('should propagate mapper errors', async () => {
			// Arrange
			const request = createValidRequest('env-123');
			const environment = createTestEnvironment('env-123', 'Development', AuthenticationMethodType.Interactive);
			const mapperError = new Error('Mapping failed');

			mockRepository.getById.mockResolvedValue(environment);
			mockRepository.getClientSecret.mockResolvedValue(undefined);
			mockRepository.getPassword.mockResolvedValue(undefined);
			mockMapper.toFormViewModel.mockImplementation(() => {
				throw mapperError;
			});

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Mapping failed');
		});

		it('should handle invalid environment ID format', async () => {
			// Arrange
			const request = createValidRequest('');

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow();
		});
	});
});
