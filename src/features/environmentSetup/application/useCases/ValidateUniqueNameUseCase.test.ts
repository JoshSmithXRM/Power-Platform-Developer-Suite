import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

import { ValidateUniqueNameUseCase, ValidateUniqueNameRequest } from './ValidateUniqueNameUseCase';

describe('ValidateUniqueNameUseCase', () => {
	let useCase: ValidateUniqueNameUseCase;
	let mockRepository: jest.Mocked<IEnvironmentRepository>;

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

		useCase = new ValidateUniqueNameUseCase(
			mockRepository,
			new NullLogger()
		);
	});

	function createRequest(overrides?: Partial<ValidateUniqueNameRequest>): ValidateUniqueNameRequest {
		return {
			name: 'Development',
			...overrides
		};
	}

	describe('unique name validation', () => {
		it('should return isUnique=true when name is unique', async () => {
			// Arrange
			const request = createRequest({ name: 'UniqueEnvironment' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(result.message).toBeUndefined();
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('UniqueEnvironment', undefined);
		});

		it('should return isUnique=false when name is not unique', async () => {
			// Arrange
			const request = createRequest({ name: 'ExistingEnvironment' });
			mockRepository.isNameUnique.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(false);
			expect(result.message).toBe('Environment name must be unique');
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('ExistingEnvironment', undefined);
		});

		it('should return isUnique=true for empty name check', async () => {
			// Arrange
			const request = createRequest({ name: '' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('', undefined);
		});

		it('should return isUnique=false for whitespace-only name', async () => {
			// Arrange
			const request = createRequest({ name: '   ' });
			mockRepository.isNameUnique.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(false);
			expect(result.message).toBe('Environment name must be unique');
		});
	});

	describe('case-insensitive matching', () => {
		it('should pass lowercase name to repository for case-insensitive check', async () => {
			// Arrange
			const request = createRequest({ name: 'DEVELOPMENT' });
			mockRepository.isNameUnique.mockResolvedValue(false);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('DEVELOPMENT', undefined);
		});

		it('should pass mixed case name to repository', async () => {
			// Arrange
			const request = createRequest({ name: 'DeVeLoPmEnT' });
			mockRepository.isNameUnique.mockResolvedValue(false);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('DeVeLoPmEnT', undefined);
		});
	});

	describe('edit vs create scenarios', () => {
		it('should exclude current environment when validating during edit', async () => {
			// Arrange
			const request = createRequest({
				name: 'Development',
				excludeEnvironmentId: 'env-123'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith(
				'Development',
				expect.objectContaining({
					getValue: expect.any(Function)
				})
			);

			const [, excludeIdArg] = mockRepository.isNameUnique.mock.calls[0]! as [string, EnvironmentId];
			expect(excludeIdArg.getValue()).toBe('env-123');
		});

		it('should allow same name when editing own environment', async () => {
			// Arrange
			const request = createRequest({
				name: 'MyEnvironment',
				excludeEnvironmentId: 'env-456'
			});
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(result.message).toBeUndefined();
		});

		it('should reject duplicate name even when editing if another environment has same name', async () => {
			// Arrange
			const request = createRequest({
				name: 'Production',
				excludeEnvironmentId: 'env-789'
			});
			mockRepository.isNameUnique.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(false);
			expect(result.message).toBe('Environment name must be unique');
		});

		it('should not exclude any environment when creating new environment', async () => {
			// Arrange
			const request = createRequest({ name: 'NewEnvironment' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('NewEnvironment', undefined);
		});
	});

	describe('special characters and edge cases', () => {
		it('should handle names with special characters', async () => {
			// Arrange
			const request = createRequest({ name: 'Dev-Environment_2024' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('Dev-Environment_2024', undefined);
		});

		it('should handle names with unicode characters', async () => {
			// Arrange
			const request = createRequest({ name: 'Développement-环境' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('Développement-环境', undefined);
		});

		it('should handle very long environment names', async () => {
			// Arrange
			const longName = 'A'.repeat(500);
			const request = createRequest({ name: longName });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			const result = await useCase.execute(request);

			// Assert
			expect(result.isUnique).toBe(true);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith(longName, undefined);
		});
	});

	describe('repository integration', () => {
		it('should call repository with exact name provided', async () => {
			// Arrange
			const request = createRequest({ name: 'Staging Environment' });
			mockRepository.isNameUnique.mockResolvedValue(true);

			// Act
			await useCase.execute(request);

			// Assert
			expect(mockRepository.isNameUnique).toHaveBeenCalledTimes(1);
			expect(mockRepository.isNameUnique).toHaveBeenCalledWith('Staging Environment', undefined);
		});

		it('should propagate repository errors', async () => {
			// Arrange
			const request = createRequest({ name: 'ErrorEnvironment' });
			const repositoryError = new Error('Database connection failed');
			mockRepository.isNameUnique.mockRejectedValue(repositoryError);

			// Act & Assert
			await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
		});
	});
});
