import * as vscode from 'vscode';
import { EnvironmentRepository } from './EnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentDomainMapper } from '../mappers/EnvironmentDomainMapper';
import { EnvironmentConnectionDto, PowerPlatformSettingsDto } from '../dtos/EnvironmentConnectionDto';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

describe('EnvironmentRepository', () => {
	let repository: EnvironmentRepository;
	let mockGlobalState: jest.Mocked<vscode.Memento>;
	let mockSecrets: jest.Mocked<vscode.SecretStorage>;
	let mockMapper: jest.Mocked<EnvironmentDomainMapper>;
	let mockLogger: jest.Mocked<ILogger>;

	const createMockEnvironment = (
		id: string = 'env-1',
		name: string = 'Test Environment',
		authMethod: AuthenticationMethodType = AuthenticationMethodType.Interactive,
		isActive: boolean = false,
		clientId?: string,
		username?: string
	): Environment => {
		return new Environment(
			new EnvironmentId(id),
			new EnvironmentName(name),
			new DataverseUrl('https://test.crm.dynamics.com'),
			new TenantId('12345678-1234-1234-1234-123456789012'),
			new AuthenticationMethod(authMethod),
			new ClientId('87654321-4321-4321-4321-210987654321'),
			isActive,
			undefined,
			undefined,
			clientId ? new ClientId(clientId) : undefined,
			username
		);
	};

	const createMockDto = (
		id: string = 'env-1',
		name: string = 'Test Environment',
		authMethod: 'Interactive' | 'ServicePrincipal' | 'UsernamePassword' | 'DeviceCode' = 'Interactive',
		isActive: boolean = false,
		clientId?: string,
		username?: string
	): EnvironmentConnectionDto => {
		const settings: PowerPlatformSettingsDto = {
			tenantId: '12345678-1234-1234-1234-123456789012',
			dataverseUrl: 'https://test.crm.dynamics.com',
			authenticationMethod: authMethod,
			publicClientId: '87654321-4321-4321-4321-210987654321'
		};

		if (clientId !== undefined) {
			settings.clientId = clientId;
		}

		if (username !== undefined) {
			settings.username = username;
		}

		return {
			id,
			name,
			settings,
			isActive
		};
	};

	beforeEach(() => {
		mockGlobalState = {
			get: jest.fn(),
			update: jest.fn(),
			keys: jest.fn()
		} as unknown as jest.Mocked<vscode.Memento>;

		mockSecrets = {
			get: jest.fn(),
			store: jest.fn(),
			delete: jest.fn(),
			onDidChange: jest.fn()
		};

		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		mockMapper = {
			toDomain: jest.fn(),
			toDto: jest.fn()
		} as unknown as jest.Mocked<EnvironmentDomainMapper>;

		repository = new EnvironmentRepository(
			mockGlobalState,
			mockSecrets,
			mockMapper,
			mockLogger
		);
	});

	describe('getAll', () => {
		it('should return all environments from storage when storage has data', async () => {
			// Arrange
			const dtos = [
				createMockDto('env-1', 'Environment 1'),
				createMockDto('env-2', 'Environment 2')
			];
			const environments = [
				createMockEnvironment('env-1', 'Environment 1'),
				createMockEnvironment('env-2', 'Environment 2')
			];

			mockGlobalState.get.mockReturnValue(dtos);
			mockMapper.toDomain
				.mockReturnValueOnce(environments[0]!)
				.mockReturnValueOnce(environments[1]!);

			// Act
			const result = await repository.getAll();

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]?.getName().getValue()).toBe('Environment 1');
			expect(result[1]?.getName().getValue()).toBe('Environment 2');
			expect(mockLogger.debug).toHaveBeenCalledWith('Loaded environments from storage', { count: 2 });
		});

		it('should return empty array when storage is empty', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([]);

			// Act
			const result = await repository.getAll();

			// Assert
			expect(result).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith('Loaded environments from storage', { count: 0 });
		});

		it('should log and rethrow error when mapper fails', async () => {
			// Arrange
			const dtos = [createMockDto()];
			const error = new Error('Mapping failed');

			mockGlobalState.get.mockReturnValue(dtos);
			mockMapper.toDomain.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.getAll()).rejects.toThrow('Mapping failed');
			expect(mockLogger.error).toHaveBeenCalledWith('EnvironmentRepository: Failed to load environments', error);
		});
	});

	describe('getById', () => {
		it('should return environment when ID exists', async () => {
			// Arrange
			const dto = createMockDto('env-1', 'Test Environment');
			const environment = createMockEnvironment('env-1', 'Test Environment');

			mockGlobalState.get.mockReturnValue([dto]);
			mockMapper.toDomain.mockReturnValue(environment);

			// Act
			const result = await repository.getById(new EnvironmentId('env-1'));

			// Assert
			expect(result).not.toBeNull();
			expect(result?.getId().getValue()).toBe('env-1');
			expect(mockLogger.debug).toHaveBeenCalledWith('EnvironmentRepository: Loading environment', { id: 'env-1' });
		});

		it('should return null when ID does not exist', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1')]);

			// Act
			const result = await repository.getById(new EnvironmentId('non-existent'));

			// Assert
			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('Environment not found', { id: 'non-existent' });
		});

		it('should log and rethrow error when storage fails', async () => {
			// Arrange
			const error = new Error('Storage error');
			mockGlobalState.get.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.getById(new EnvironmentId('env-1'))).rejects.toThrow('Storage error');
			expect(mockLogger.error).toHaveBeenCalledWith('EnvironmentRepository: Failed to load environment by ID', error);
		});
	});

	describe('getByName', () => {
		it('should return environment when name exists', async () => {
			// Arrange
			const dto = createMockDto('env-1', 'Test Environment');
			const environment = createMockEnvironment('env-1', 'Test Environment');

			mockGlobalState.get.mockReturnValue([dto]);
			mockMapper.toDomain.mockReturnValue(environment);

			// Act
			const result = await repository.getByName('Test Environment');

			// Assert
			expect(result).not.toBeNull();
			expect(result?.getName().getValue()).toBe('Test Environment');
		});

		it('should return null when name does not exist', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Different Name')]);

			// Act
			const result = await repository.getByName('Test Environment');

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('getActive', () => {
		it('should return active environment when one exists', async () => {
			// Arrange
			const dtos = [
				createMockDto('env-1', 'Inactive', 'Interactive', false),
				createMockDto('env-2', 'Active', 'Interactive', true)
			];
			const environments = [
				createMockEnvironment('env-1', 'Inactive', AuthenticationMethodType.Interactive, false),
				createMockEnvironment('env-2', 'Active', AuthenticationMethodType.Interactive, true)
			];

			mockGlobalState.get.mockReturnValue(dtos);
			mockMapper.toDomain.mockReturnValueOnce(environments[1]!);

			// Act
			const result = await repository.getActive();

			// Assert
			expect(result).not.toBeNull();
			expect(result?.getName().getValue()).toBe('Active');
		});

		it('should return null when no active environment exists', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Inactive', 'Interactive', false)]);

			// Act
			const result = await repository.getActive();

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('save', () => {
		it('should save new environment without credentials', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'New Environment');
			const dto = createMockDto('env-1', 'New Environment');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();

			// Act
			await repository.save(environment);

			// Assert
			expect(mockGlobalState.update).toHaveBeenCalledWith(
				'power-platform-dev-suite-environments',
				[dto]
			);
			expect(mockLogger.info).toHaveBeenCalledWith('Environment saved', { name: 'New Environment' });
		});

		it('should update existing environment', async () => {
			// Arrange
			const existingDto = createMockDto('env-1', 'Old Name');
			const updatedEnvironment = createMockEnvironment('env-1', 'Updated Name');
			const updatedDto = createMockDto('env-1', 'Updated Name');

			mockGlobalState.get.mockReturnValue([existingDto]);
			mockMapper.toDto.mockReturnValue(updatedDto);
			mockGlobalState.update.mockResolvedValue();

			// Act
			await repository.save(updatedEnvironment);

			// Assert
			expect(mockGlobalState.update).toHaveBeenCalledWith(
				'power-platform-dev-suite-environments',
				[updatedDto]
			);
			expect(mockLogger.debug).toHaveBeenCalledWith('Updated existing environment', { index: 0 });
		});

		it('should store client secret when provided for ServicePrincipal', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'SP Environment', AuthenticationMethodType.ServicePrincipal, false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			const dto = createMockDto('env-1', 'SP Environment', 'ServicePrincipal', false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();
			mockSecrets.store.mockResolvedValue();

			// Act
			await repository.save(environment, 'secret-123');

			// Assert
			expect(mockSecrets.store).toHaveBeenCalledWith(
				'power-platform-dev-suite-secret-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
				'secret-123'
			);
			expect(mockLogger.debug).toHaveBeenCalledWith('Client secret stored');
		});

		it('should delete client secret when not provided and preserveExistingCredentials is false', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'SP Environment', AuthenticationMethodType.ServicePrincipal, false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			const dto = createMockDto('env-1', 'SP Environment', 'ServicePrincipal', false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();
			mockSecrets.delete.mockResolvedValue();

			// Act
			await repository.save(environment, undefined, undefined, false);

			// Assert
			expect(mockSecrets.delete).toHaveBeenCalledWith('power-platform-dev-suite-secret-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			expect(mockLogger.debug).toHaveBeenCalledWith('Client secret deleted');
		});

		it('should preserve client secret when not provided and preserveExistingCredentials is true', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'SP Environment', AuthenticationMethodType.ServicePrincipal, false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			const dto = createMockDto('env-1', 'SP Environment', 'ServicePrincipal', false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();

			// Act
			await repository.save(environment, undefined, undefined, true);

			// Assert
			expect(mockSecrets.delete).not.toHaveBeenCalled();
			expect(mockSecrets.store).not.toHaveBeenCalled();
		});

		it('should store password when provided for UsernamePassword', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'UP Environment', AuthenticationMethodType.UsernamePassword, false, undefined, 'user@test.com');
			const dto = createMockDto('env-1', 'UP Environment', 'UsernamePassword', false, undefined, 'user@test.com');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();
			mockSecrets.store.mockResolvedValue();

			// Act
			await repository.save(environment, undefined, 'password-123');

			// Assert
			expect(mockSecrets.store).toHaveBeenCalledWith(
				'power-platform-dev-suite-password-user@test.com',
				'password-123'
			);
			expect(mockLogger.debug).toHaveBeenCalledWith('Password stored');
		});

		it('should delete password when not provided and preserveExistingCredentials is false', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'UP Environment', AuthenticationMethodType.UsernamePassword, false, undefined, 'user@test.com');
			const dto = createMockDto('env-1', 'UP Environment', 'UsernamePassword', false, undefined, 'user@test.com');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockReturnValue(dto);
			mockGlobalState.update.mockResolvedValue();
			mockSecrets.delete.mockResolvedValue();

			// Act
			await repository.save(environment, undefined, undefined, false);

			// Assert
			expect(mockSecrets.delete).toHaveBeenCalledWith('power-platform-dev-suite-password-user@test.com');
			expect(mockLogger.debug).toHaveBeenCalledWith('Password deleted');
		});

		it('should log and rethrow error when save fails', async () => {
			// Arrange
			const environment = createMockEnvironment();
			const error = new Error('Save failed');

			mockGlobalState.get.mockReturnValue([]);
			mockMapper.toDto.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.save(environment)).rejects.toThrow('Save failed');
			expect(mockLogger.error).toHaveBeenCalledWith('EnvironmentRepository: Failed to save environment', error);
		});
	});

	describe('delete', () => {
		it('should delete environment and associated secrets', async () => {
			// Arrange
			const environment = createMockEnvironment('env-1', 'Test', AuthenticationMethodType.ServicePrincipal, false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			const dto = createMockDto('env-1', 'Test', 'ServicePrincipal', false, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

			mockGlobalState.get.mockReturnValue([dto]);
			mockMapper.toDomain.mockReturnValue(environment);
			mockSecrets.delete.mockResolvedValue();
			mockGlobalState.update.mockResolvedValue();

			// Act
			await repository.delete(new EnvironmentId('env-1'));

			// Assert
			expect(mockSecrets.delete).toHaveBeenCalledWith('power-platform-dev-suite-secret-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			expect(mockGlobalState.update).toHaveBeenCalledWith('power-platform-dev-suite-environments', []);
			expect(mockLogger.debug).toHaveBeenCalledWith('Deleted secrets', { count: 1 });
			expect(mockLogger.info).toHaveBeenCalledWith('Environment deleted', { id: 'env-1' });
		});

		it('should delete environment even when environment not found in storage', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-2')]);
			mockGlobalState.update.mockResolvedValue();

			// Act
			await repository.delete(new EnvironmentId('env-1'));

			// Assert
			expect(mockGlobalState.update).toHaveBeenCalledWith(
				'power-platform-dev-suite-environments',
				[createMockDto('env-2')]
			);
		});

		it('should log and rethrow error when delete fails', async () => {
			// Arrange
			const error = new Error('Delete failed');
			mockGlobalState.get.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.delete(new EnvironmentId('env-1'))).rejects.toThrow('Delete failed');
			expect(mockLogger.error).toHaveBeenCalledWith('EnvironmentRepository: Failed to delete environment', error);
		});
	});

	describe('isNameUnique', () => {
		it('should return true when name does not exist', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Existing')]);

			// Act
			const result = await repository.isNameUnique('New Name');

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when name exists', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Existing')]);

			// Act
			const result = await repository.isNameUnique('Existing');

			// Assert
			expect(result).toBe(false);
		});

		it('should return true when name exists but belongs to excluded ID', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Existing')]);

			// Act
			const result = await repository.isNameUnique('Existing', new EnvironmentId('env-1'));

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when name exists and belongs to different ID', async () => {
			// Arrange
			mockGlobalState.get.mockReturnValue([createMockDto('env-1', 'Existing')]);

			// Act
			const result = await repository.isNameUnique('Existing', new EnvironmentId('env-2'));

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('getClientSecret', () => {
		it('should retrieve client secret from SecretStorage', async () => {
			// Arrange
			mockSecrets.get.mockResolvedValue('secret-123');

			// Act
			const result = await repository.getClientSecret('client-id-123');

			// Assert
			expect(result).toBe('secret-123');
			expect(mockSecrets.get).toHaveBeenCalledWith('power-platform-dev-suite-secret-client-id-123');
		});

		it('should return undefined when secret does not exist', async () => {
			// Arrange
			mockSecrets.get.mockResolvedValue(undefined);

			// Act
			const result = await repository.getClientSecret('client-id-123');

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe('getPassword', () => {
		it('should retrieve password from SecretStorage', async () => {
			// Arrange
			mockSecrets.get.mockResolvedValue('password-123');

			// Act
			const result = await repository.getPassword('user@test.com');

			// Assert
			expect(result).toBe('password-123');
			expect(mockSecrets.get).toHaveBeenCalledWith('power-platform-dev-suite-password-user@test.com');
		});

		it('should return undefined when password does not exist', async () => {
			// Arrange
			mockSecrets.get.mockResolvedValue(undefined);

			// Act
			const result = await repository.getPassword('user@test.com');

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe('deleteSecrets', () => {
		it('should delete all provided secret keys', async () => {
			// Arrange
			const secretKeys = ['key-1', 'key-2', 'key-3'];
			mockSecrets.delete.mockResolvedValue();

			// Act
			await repository.deleteSecrets(secretKeys);

			// Assert
			expect(mockSecrets.delete).toHaveBeenCalledTimes(3);
			expect(mockSecrets.delete).toHaveBeenCalledWith('key-1');
			expect(mockSecrets.delete).toHaveBeenCalledWith('key-2');
			expect(mockSecrets.delete).toHaveBeenCalledWith('key-3');
			expect(mockLogger.debug).toHaveBeenCalledWith('Deleting secrets from storage', { count: 3 });
		});

		it('should handle empty array without errors', async () => {
			// Arrange & Act
			await repository.deleteSecrets([]);

			// Assert
			expect(mockSecrets.delete).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Deleting secrets from storage', { count: 0 });
		});
	});
});
