import { EnvironmentVariableViewModelMapper } from './EnvironmentVariableViewModelMapper';
import { EnvironmentVariable, EnvironmentVariableType } from '../../domain/entities/EnvironmentVariable';
import { EnvironmentVariableCollectionService } from '../../domain/services/EnvironmentVariableCollectionService';

describe('EnvironmentVariableViewModelMapper', () => {
	let mapper: EnvironmentVariableViewModelMapper;
	let mockCollectionService: jest.Mocked<EnvironmentVariableCollectionService>;

	beforeEach(() => {
		mockCollectionService = {
			sort: jest.fn((vars) => vars)
		} as unknown as jest.Mocked<EnvironmentVariableCollectionService>;

		mapper = new EnvironmentVariableViewModelMapper(mockCollectionService);
	});

	// Test data factory
	function createEnvironmentVariable(
		schemaName: string,
		options: {
			displayName?: string;
			type?: EnvironmentVariableType;
			currentValue?: string | null;
			defaultValue?: string | null;
			isManaged?: boolean;
			description?: string;
			modifiedOn?: Date;
			valueId?: string | null;
		} = {}
	): EnvironmentVariable {
		return new EnvironmentVariable(
			`def-${schemaName}`,
			schemaName,
			options.displayName ?? schemaName,
			options.type ?? EnvironmentVariableType.String,
			options.defaultValue ?? null,
			options.currentValue ?? null,
			options.isManaged ?? false,
			options.description ?? '',
			options.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
			options.valueId ?? null
		);
	}

	describe('toViewModel - single entity mapping', () => {
		it('should map definitionId', () => {
			// Arrange
			const envVar = createEnvironmentVariable('test_var');

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.definitionId).toBe('def-test_var');
		});

		it('should map schemaName', () => {
			// Arrange
			const envVar = createEnvironmentVariable('my_variable');

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.schemaName).toBe('my_variable');
		});

		it('should map displayName', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				displayName: 'My Variable'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.displayName).toBe('My Variable');
		});

		it('should format type using EnvironmentVariableTypeFormatter', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				type: EnvironmentVariableType.String
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
			expect(typeof result.type).toBe('string');
		});

		it('should map currentValue when present', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: 'current-value'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('current-value');
		});

		it('should map currentValue to empty string when null', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: null
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('');
		});

		it('should map defaultValue when present', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				defaultValue: 'default-value'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.defaultValue).toBe('default-value');
		});

		it('should map defaultValue to empty string when null', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				defaultValue: null
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.defaultValue).toBe('');
		});

		it('should map isManaged to "Managed" when true', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				isManaged: true
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.isManaged).toBe('Managed');
		});

		it('should map isManaged to "Unmanaged" when false', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				isManaged: false
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.isManaged).toBe('Unmanaged');
		});

		it('should map description', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				description: 'Test description'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.description).toBe('Test description');
		});

		it('should format modifiedOn using DateFormatter', () => {
			// Arrange
			const modifiedOn = new Date('2024-01-15T10:30:00Z');
			const envVar = createEnvironmentVariable('var1', { modifiedOn });

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.modifiedOn).toBeDefined();
			expect(typeof result.modifiedOn).toBe('string');
		});
	});

	describe('toViewModels - collection mapping', () => {
		it('should map multiple environment variables', () => {
			// Arrange
			const vars = [
				createEnvironmentVariable('var1'),
				createEnvironmentVariable('var2'),
				createEnvironmentVariable('var3')
			];

			// Act
			const result = mapper.toViewModels(vars);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.schemaName).toBe('var1');
			expect(result[1]?.schemaName).toBe('var2');
			expect(result[2]?.schemaName).toBe('var3');
		});

		it('should handle empty array', () => {
			// Arrange
			const vars: EnvironmentVariable[] = [];

			// Act
			const result = mapper.toViewModels(vars);

			// Assert
			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should handle single variable', () => {
			// Arrange
			const vars = [createEnvironmentVariable('single')];

			// Act
			const result = mapper.toViewModels(vars);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.schemaName).toBe('single');
		});

		it('should not call collection service sort when shouldSort is false', () => {
			// Arrange
			const vars = [
				createEnvironmentVariable('var1'),
				createEnvironmentVariable('var2')
			];

			// Act
			mapper.toViewModels(vars, false);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});

		it('should call collection service sort when shouldSort is true', () => {
			// Arrange
			const vars = [
				createEnvironmentVariable('var1'),
				createEnvironmentVariable('var2')
			];
			mockCollectionService.sort.mockReturnValue([vars[1]!, vars[0]!]);

			// Act
			const result = mapper.toViewModels(vars, true);

			// Assert
			expect(mockCollectionService.sort).toHaveBeenCalledTimes(1);
			expect(mockCollectionService.sort).toHaveBeenCalledWith(vars);
			expect(result[0]?.schemaName).toBe('var2');
			expect(result[1]?.schemaName).toBe('var1');
		});

		it('should default shouldSort to false', () => {
			// Arrange
			const vars = [createEnvironmentVariable('var1')];

			// Act
			mapper.toViewModels(vars);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});
	});

	describe('handles different variable types', () => {
		it('should handle String type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('string_var', {
				type: EnvironmentVariableType.String
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});

		it('should handle Number type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('number_var', {
				type: EnvironmentVariableType.Number
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});

		it('should handle Boolean type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('bool_var', {
				type: EnvironmentVariableType.Boolean
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});

		it('should handle JSON type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('json_var', {
				type: EnvironmentVariableType.JSON
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});

		it('should handle Secret type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('secret_var', {
				type: EnvironmentVariableType.Secret
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});

		it('should handle DataSource type', () => {
			// Arrange
			const envVar = createEnvironmentVariable('ds_var', {
				type: EnvironmentVariableType.DataSource
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.type).toBeDefined();
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in values', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: '<script>alert("xss")</script>',
				defaultValue: 'Value & More'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('<script>alert("xss")</script>');
			expect(result.defaultValue).toBe('Value & More');
		});

		it('should handle empty string values', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: '',
				defaultValue: ''
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('');
			expect(result.defaultValue).toBe('');
		});

		it('should handle very long values', () => {
			// Arrange
			const longValue = 'A'.repeat(1000);
			const envVar = createEnvironmentVariable('var1', {
				currentValue: longValue
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe(longValue);
		});

		it('should handle variables with both currentValue and defaultValue', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: 'current',
				defaultValue: 'default'
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('current');
			expect(result.defaultValue).toBe('default');
		});

		it('should handle variables with neither currentValue nor defaultValue', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				currentValue: null,
				defaultValue: null
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.currentValue).toBe('');
			expect(result.defaultValue).toBe('');
		});

		it('should handle empty description', () => {
			// Arrange
			const envVar = createEnvironmentVariable('var1', {
				description: ''
			});

			// Act
			const result = mapper.toViewModel(envVar);

			// Assert
			expect(result.description).toBe('');
		});

		it('should handle large collection', () => {
			// Arrange
			const vars = Array.from({ length: 100 }, (_, i) =>
				createEnvironmentVariable(`var${i}`)
			);

			// Act
			const result = mapper.toViewModels(vars);

			// Assert
			expect(result).toHaveLength(100);
			expect(result[0]?.schemaName).toBe('var0');
			expect(result[99]?.schemaName).toBe('var99');
		});
	});
});
