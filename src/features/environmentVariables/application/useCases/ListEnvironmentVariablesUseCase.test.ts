import { ListEnvironmentVariablesUseCase } from './ListEnvironmentVariablesUseCase';
import type { IEnvironmentVariableRepository, EnvironmentVariableDefinitionData, EnvironmentVariableValueData } from '../../domain/interfaces/IEnvironmentVariableRepository';
import type { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { EnvironmentVariableFactory } from '../../domain/services/EnvironmentVariableFactory';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { EnvironmentVariable, EnvironmentVariableType } from '../../domain/entities/EnvironmentVariable';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

describe('ListEnvironmentVariablesUseCase', () => {
	let useCase: ListEnvironmentVariablesUseCase;
	let mockEnvVarRepository: jest.Mocked<IEnvironmentVariableRepository>;
	let mockSolutionComponentRepository: jest.Mocked<ISolutionComponentRepository>;
	let factory: EnvironmentVariableFactory;

	beforeEach(() => {
		mockEnvVarRepository = {
			findAllDefinitions: jest.fn(),
			findAllValues: jest.fn()
		};

		mockSolutionComponentRepository = {
			findComponentIdsBySolution: jest.fn(),
			getObjectTypeCode: jest.fn()
		};

		factory = new EnvironmentVariableFactory();

		useCase = new ListEnvironmentVariablesUseCase(
			mockEnvVarRepository,
			mockSolutionComponentRepository,
			factory,
			new NullLogger()
		);
	});

	function createTestDefinition(
		id: string,
		schemaName: string,
		displayName: string = schemaName,
		type: EnvironmentVariableType = EnvironmentVariableType.String,
		defaultValue: string | null = null,
		isManaged: boolean = false
	): EnvironmentVariableDefinitionData {
		return {
			environmentvariabledefinitionid: id,
			schemaname: schemaName,
			displayname: displayName,
			type: type,
			defaultvalue: defaultValue,
			ismanaged: isManaged,
			description: `Description for ${schemaName}`,
			modifiedon: '2025-11-22T10:00:00Z'
		};
	}

	function createTestValue(
		id: string,
		definitionId: string,
		value: string | null
	): EnvironmentVariableValueData {
		return {
			environmentvariablevalueid: id,
			_environmentvariabledefinitionid_value: definitionId,
			value: value
		};
	}

	function createCancellationToken(isCancelled: boolean = false): ICancellationToken {
		return {
			isCancellationRequested: isCancelled,
			onCancellationRequested: jest.fn()
		};
	}

	describe('successful listing - all environment variables', () => {
		it('should list all environment variables when no solution filter is provided', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_apiUrl', 'API URL', EnvironmentVariableType.String, 'https://api.dev.contoso.com'),
				createTestDefinition('def-2', 'cr_maxRetries', 'Max Retries', EnvironmentVariableType.Number, '3')
			];
			const values = [
				createTestValue('val-1', 'def-1', 'https://api.prod.contoso.com')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]!.schemaName).toBe('cr_apiUrl');
			expect(result[0]!.currentValue).toBe('https://api.prod.contoso.com');
			expect(result[1]!.schemaName).toBe('cr_maxRetries');
			expect(result[1]!.currentValue).toBeNull();
			expect(result[1]!.defaultValue).toBe('3');

			expect(mockEnvVarRepository.findAllDefinitions).toHaveBeenCalledWith(environmentId, undefined, undefined);
			expect(mockEnvVarRepository.findAllValues).toHaveBeenCalledWith(environmentId, undefined, undefined);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).not.toHaveBeenCalled();
		});

		it('should handle environment with no environment variables', async () => {
			// Arrange
			const environmentId = 'env-empty';
			mockEnvVarRepository.findAllDefinitions.mockResolvedValue([]);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(0);
			expect(mockEnvVarRepository.findAllDefinitions).toHaveBeenCalledTimes(1);
			expect(mockEnvVarRepository.findAllValues).toHaveBeenCalledTimes(1);
		});

		it('should create environment variables with all value combinations', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_hasCurrentValue', 'Has Current', EnvironmentVariableType.String, 'default1'),
				createTestDefinition('def-2', 'cr_hasDefaultOnly', 'Has Default', EnvironmentVariableType.String, 'default2'),
				createTestDefinition('def-3', 'cr_hasNone', 'Has None', EnvironmentVariableType.String, null)
			];
			const values = [
				createTestValue('val-1', 'def-1', 'current1')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]!.getEffectiveValue()).toBe('current1');
			expect(result[1]!.getEffectiveValue()).toBe('default2');
			expect(result[2]!.getEffectiveValue()).toBeNull();
		});

		it('should handle all environment variable types', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_string', 'String Var', EnvironmentVariableType.String, 'text'),
				createTestDefinition('def-2', 'cr_number', 'Number Var', EnvironmentVariableType.Number, '42'),
				createTestDefinition('def-3', 'cr_boolean', 'Boolean Var', EnvironmentVariableType.Boolean, 'true'),
				createTestDefinition('def-4', 'cr_json', 'JSON Var', EnvironmentVariableType.JSON, '{"key":"value"}'),
				createTestDefinition('def-5', 'cr_secret', 'Secret Var', EnvironmentVariableType.Secret, 'secret'),
				createTestDefinition('def-6', 'cr_datasource', 'DataSource Var', EnvironmentVariableType.DataSource, 'datasource-id')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(6);
			expect(result[0]!.type).toBe(EnvironmentVariableType.String);
			expect(result[1]!.type).toBe(EnvironmentVariableType.Number);
			expect(result[2]!.type).toBe(EnvironmentVariableType.Boolean);
			expect(result[3]!.type).toBe(EnvironmentVariableType.JSON);
			expect(result[4]!.type).toBe(EnvironmentVariableType.Secret);
			expect(result[4]!.isSecret()).toBe(true);
			expect(result[5]!.type).toBe(EnvironmentVariableType.DataSource);
		});
	});

	describe('successful listing - solution filtered', () => {
		it('should filter environment variables by solution', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = [
				createTestDefinition('def-1', 'cr_inSolution', 'In Solution'),
				createTestDefinition('def-2', 'cr_notInSolution', 'Not In Solution'),
				createTestDefinition('def-3', 'cr_alsoInSolution', 'Also In Solution')
			];
			const values: EnvironmentVariableValueData[] = [];
			const componentIds = ['def-1', 'def-3'];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);

			// Act
			const result = await useCase.execute(environmentId, solutionId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]!.schemaName).toBe('cr_inSolution');
			expect(result[1]!.schemaName).toBe('cr_alsoInSolution');

			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				environmentId,
				solutionId,
				'environmentvariabledefinition',
				undefined,
				undefined
			);
		});

		it('should return empty array when solution has no environment variables', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-empty';
			const definitions = [
				createTestDefinition('def-1', 'cr_var1', 'Var 1'),
				createTestDefinition('def-2', 'cr_var2', 'Var 2')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId, solutionId);

			// Assert
			expect(result).toHaveLength(0);
		});

		it('should handle solution filter with all definitions in solution', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = [
				createTestDefinition('def-1', 'cr_var1', 'Var 1'),
				createTestDefinition('def-2', 'cr_var2', 'Var 2')
			];
			const componentIds = ['def-1', 'def-2'];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);

			// Act
			const result = await useCase.execute(environmentId, solutionId);

			// Assert
			expect(result).toHaveLength(2);
		});
	});

	describe('cancellation handling', () => {
		it('should throw OperationCancelledException when cancelled before execution', async () => {
			// Arrange
			const environmentId = 'env-123';
			const cancellationToken = createCancellationToken(true);

			// Act & Assert
			await expect(useCase.execute(environmentId, undefined, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockEnvVarRepository.findAllDefinitions).not.toHaveBeenCalled();
			expect(mockEnvVarRepository.findAllValues).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after fetching data', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const values: EnvironmentVariableValueData[] = [];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			let cancelled = false;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			// Change cancellation state after data fetch
			mockEnvVarRepository.findAllValues.mockImplementation(async () => {
				cancelled = true;
				return values;
			});

			// Act & Assert
			await expect(useCase.execute(environmentId, undefined, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockEnvVarRepository.findAllDefinitions).toHaveBeenCalled();
			expect(mockEnvVarRepository.findAllValues).toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after solution filtering', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const componentIds = ['def-1'];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);

			let cancelled = false;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			// Change cancellation state after solution filtering
			mockSolutionComponentRepository.findComponentIdsBySolution.mockImplementation(async () => {
				cancelled = true;
				return componentIds;
			});

			// Act & Assert
			await expect(useCase.execute(environmentId, solutionId, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);
		});

		it('should complete successfully when not cancelled', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const cancellationToken = createCancellationToken(false);

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId, undefined, cancellationToken);

			// Assert
			expect(result).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('should throw error when repository fails to fetch definitions', async () => {
			// Arrange
			const environmentId = 'env-123';
			const error = new Error('Failed to fetch definitions');
			mockEnvVarRepository.findAllDefinitions.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(environmentId))
				.rejects
				.toThrow('Failed to fetch definitions');
		});

		it('should throw error when repository fails to fetch values', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const error = new Error('Failed to fetch values');

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(environmentId))
				.rejects
				.toThrow('Failed to fetch values');
		});

		it('should throw error when solution component repository fails', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const error = new Error('Failed to fetch solution components');

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(environmentId, solutionId))
				.rejects
				.toThrow('Failed to fetch solution components');
		});

		it('should normalize and rethrow non-Error objects', async () => {
			// Arrange
			const environmentId = 'env-123';
			mockEnvVarRepository.findAllDefinitions.mockRejectedValue('String error');

			// Act & Assert
			await expect(useCase.execute(environmentId))
				.rejects
				.toThrow();
		});
	});

	describe('orchestration and call order', () => {
		it('should fetch definitions and values in parallel without solution filter', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const values: EnvironmentVariableValueData[] = [];
			const callOrder: string[] = [];

			mockEnvVarRepository.findAllDefinitions.mockImplementation(async () => {
				callOrder.push('findAllDefinitions-start');
				await new Promise(resolve => setTimeout(resolve, 10));
				callOrder.push('findAllDefinitions-end');
				return definitions;
			});

			mockEnvVarRepository.findAllValues.mockImplementation(async () => {
				callOrder.push('findAllValues-start');
				await new Promise(resolve => setTimeout(resolve, 5));
				callOrder.push('findAllValues-end');
				return values;
			});

			// Act
			await useCase.execute(environmentId);

			// Assert - Calls should be interleaved (parallel execution)
			expect(callOrder[0]).toBe('findAllDefinitions-start');
			expect(callOrder[1]).toBe('findAllValues-start');
			expect(mockEnvVarRepository.findAllDefinitions).toHaveBeenCalledTimes(1);
			expect(mockEnvVarRepository.findAllValues).toHaveBeenCalledTimes(1);
		});

		it('should call methods in correct order with solution filter', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const componentIds = ['def-1'];
			const callOrder: string[] = [];

			mockEnvVarRepository.findAllDefinitions.mockImplementation(async () => {
				callOrder.push('findAllDefinitions');
				return definitions;
			});

			mockEnvVarRepository.findAllValues.mockImplementation(async () => {
				callOrder.push('findAllValues');
				return [];
			});

			mockSolutionComponentRepository.findComponentIdsBySolution.mockImplementation(async () => {
				callOrder.push('findComponentIdsBySolution');
				return componentIds;
			});

			// Act
			await useCase.execute(environmentId, solutionId);

			// Assert - Solution filtering happens after data fetch
			expect(callOrder).toEqual([
				'findAllDefinitions',
				'findAllValues',
				'findComponentIdsBySolution'
			]);
		});

		it('should pass cancellation token to all repository calls', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const cancellationToken = createCancellationToken(false);
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['def-1']);

			// Act
			await useCase.execute(environmentId, solutionId, cancellationToken);

			// Assert
			expect(mockEnvVarRepository.findAllDefinitions).toHaveBeenCalledWith(
				environmentId,
				undefined,
				cancellationToken
			);
			expect(mockEnvVarRepository.findAllValues).toHaveBeenCalledWith(
				environmentId,
				undefined,
				cancellationToken
			);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				environmentId,
				solutionId,
				'environmentvariabledefinition',
				undefined,
				cancellationToken
			);
		});
	});

	describe('edge cases', () => {
		it('should handle definitions with null description', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definition: EnvironmentVariableDefinitionData = {
				environmentvariabledefinitionid: 'def-1',
				schemaname: 'cr_var1',
				displayname: 'Var 1',
				type: EnvironmentVariableType.String,
				defaultvalue: 'default',
				ismanaged: false,
				description: null,
				modifiedon: '2025-11-22T10:00:00Z'
			};

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue([definition]);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]!.description).toBe('');
		});

		it('should handle managed and unmanaged environment variables', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_managed', 'Managed', EnvironmentVariableType.String, null, true),
				createTestDefinition('def-2', 'cr_unmanaged', 'Unmanaged', EnvironmentVariableType.String, null, false)
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]!.isManaged).toBe(true);
			expect(result[1]!.isManaged).toBe(false);
		});

		it('should handle values with null value field', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1', EnvironmentVariableType.String, 'default')];
			const values = [createTestValue('val-1', 'def-1', null)];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]!.currentValue).toBeNull();
			expect(result[0]!.getEffectiveValue()).toBe('default');
		});

		it('should handle special characters in schema names and values', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_unicode_名前', 'Unicode Name', EnvironmentVariableType.String, 'Test données français 日本語')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]!.schemaName).toBe('cr_unicode_名前');
			expect(result[0]!.defaultValue).toBe('Test données français 日本語');
		});

		it('should handle values that do not match any definition', async () => {
			// Arrange - Orphaned values (definition was deleted but value remains)
			const environmentId = 'env-123';
			const definitions = [createTestDefinition('def-1', 'cr_var1', 'Var 1')];
			const values = [
				createTestValue('val-1', 'def-1', 'value1'),
				createTestValue('val-orphan', 'def-orphaned', 'orphaned-value')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert - Orphaned values are ignored (left join on definitions)
			expect(result).toHaveLength(1);
			expect(result[0]!.schemaName).toBe('cr_var1');
		});
	});

	describe('large datasets', () => {
		it('should handle large number of environment variables', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = Array.from({ length: 500 }, (_, i) =>
				createTestDefinition(`def-${i}`, `cr_var_${i}`, `Var ${i}`)
			);
			const values = Array.from({ length: 250 }, (_, i) =>
				createTestValue(`val-${i}`, `def-${i}`, `value-${i}`)
			);

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(500);
			expect(result.filter(ev => ev.currentValue !== null)).toHaveLength(250);
			expect(result.filter(ev => ev.currentValue === null)).toHaveLength(250);
		});

		it('should handle solution filter with large dataset', async () => {
			// Arrange
			const environmentId = 'env-123';
			const solutionId = 'sol-456';
			const definitions = Array.from({ length: 1000 }, (_, i) =>
				createTestDefinition(`def-${i}`, `cr_var_${i}`, `Var ${i}`)
			);
			const componentIds = Array.from({ length: 100 }, (_, i) => `def-${i}`);

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);

			// Act
			const result = await useCase.execute(environmentId, solutionId);

			// Assert
			expect(result).toHaveLength(100);
		});
	});

	describe('factory integration', () => {
		it('should use factory to create environment variables from definitions and values', async () => {
			// Arrange
			const environmentId = 'env-123';
			const definitions = [
				createTestDefinition('def-1', 'cr_var1', 'Var 1', EnvironmentVariableType.String, 'default1'),
				createTestDefinition('def-2', 'cr_var2', 'Var 2', EnvironmentVariableType.Number, '42')
			];
			const values = [
				createTestValue('val-1', 'def-1', 'current1')
			];

			mockEnvVarRepository.findAllDefinitions.mockResolvedValue(definitions);
			mockEnvVarRepository.findAllValues.mockResolvedValue(values);

			// Act
			const result = await useCase.execute(environmentId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(EnvironmentVariable);
			expect(result[1]).toBeInstanceOf(EnvironmentVariable);
			expect(result[0]!.definitionId).toBe('def-1');
			expect(result[0]!.currentValue).toBe('current1');
			expect(result[0]!.valueId).toBe('val-1');
			expect(result[1]!.definitionId).toBe('def-2');
			expect(result[1]!.currentValue).toBeNull();
			expect(result[1]!.valueId).toBeNull();
		});
	});
});
