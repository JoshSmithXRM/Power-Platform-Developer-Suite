import { ExportEnvironmentVariablesToDeploymentSettingsUseCase } from './ExportEnvironmentVariablesToDeploymentSettingsUseCase';
import { EnvironmentVariableToDeploymentSettingsMapper } from '../mappers/EnvironmentVariableToDeploymentSettingsMapper';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { EnvironmentVariable, EnvironmentVariableType } from '../../domain/entities/EnvironmentVariable';
import { DeploymentSettings, EnvironmentVariableEntry } from '../../../../shared/domain/entities/DeploymentSettings';

describe('ExportEnvironmentVariablesToDeploymentSettingsUseCase', () => {
	let useCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase;
	let mockRepository: jest.Mocked<IDeploymentSettingsRepository>;
	let mapper: EnvironmentVariableToDeploymentSettingsMapper;

	beforeEach(() => {
		mockRepository = {
			read: jest.fn(),
			write: jest.fn(),
			exists: jest.fn(),
			promptForFilePath: jest.fn()
		};

		mapper = new EnvironmentVariableToDeploymentSettingsMapper();

		useCase = new ExportEnvironmentVariablesToDeploymentSettingsUseCase(
			mockRepository,
			mapper,
			new NullLogger()
		);
	});

	function createTestEnvironmentVariable(
		schemaName: string,
		currentValue: string | null = null,
		defaultValue: string | null = null,
		type: EnvironmentVariableType = EnvironmentVariableType.String
	): EnvironmentVariable {
		return new EnvironmentVariable(
			`def-${schemaName}`,
			schemaName,
			schemaName,
			type,
			defaultValue,
			currentValue,
			false,
			'Test description',
			new Date('2025-11-01'),
			currentValue ? `val-${schemaName}` : null
		);
	}

	describe('successful export - new file', () => {
		it('should create new deployment settings file with environment variables', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com', 'https://api.dev.contoso.com'),
				createTestEnvironmentVariable('cr_maxRetries', '5', '3', EnvironmentVariableType.Number)
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars, 'Solution.deploymentsettings.json');

			// Assert
			expect(result).not.toBeNull();
			expect(result?.filePath).toBe(filePath);
			expect(result?.added).toBe(2);
			expect(result?.removed).toBe(0);
			expect(result?.preserved).toBe(0);

			expect(mockRepository.promptForFilePath).toHaveBeenCalledWith('Solution.deploymentsettings.json');
			expect(mockRepository.exists).toHaveBeenCalledWith(filePath);
			expect(mockRepository.write).toHaveBeenCalledTimes(1);

			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(2);
			expect(writtenSettings.environmentVariables[0]).toEqual({
				SchemaName: 'cr_apiUrl',
				Value: 'https://api.contoso.com'
			});
			expect(writtenSettings.environmentVariables[1]).toEqual({
				SchemaName: 'cr_maxRetries',
				Value: '5'
			});
		});

		it('should use default value when current value is null', async () => {
			// Arrange
			const envVar = createTestEnvironmentVariable('cr_apiUrl', null, 'https://api.default.contoso.com');

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([envVar]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!
			expect(writtenSettings.environmentVariables[0]!.Value).toBe('https://api.default.contoso.com');
		});

		it('should use empty string when both current and default values are null', async () => {
			// Arrange
			const envVar = createTestEnvironmentVariable('cr_emptyVar', null, null);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([envVar]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!
			expect(writtenSettings.environmentVariables[0]!.Value).toBe('');
		});
	});

	describe('successful export - existing file', () => {
		it('should sync environment variables section in existing file', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.new.contoso.com'),
				createTestEnvironmentVariable('cr_newVar', 'new value')
			];

			const existingEntries: EnvironmentVariableEntry[] = [
				{ SchemaName: 'cr_apiUrl', Value: 'https://api.old.contoso.com' },
				{ SchemaName: 'cr_removedVar', Value: 'old value' }
			];
			const existingSettings = new DeploymentSettings(existingEntries, []);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(true);
			mockRepository.read.mockResolvedValue(existingSettings);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(1); // cr_newVar
			expect(result?.removed).toBe(1); // cr_removedVar
			expect(result?.preserved).toBe(1); // cr_apiUrl (preserved value)

			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(2);
			// Sync preserves existing values for entries that remain (doesn't overwrite)
			expect(writtenSettings.environmentVariables.find(e => e.SchemaName === 'cr_apiUrl')?.Value).toBe('https://api.old.contoso.com');
			expect(writtenSettings.environmentVariables.find(e => e.SchemaName === 'cr_newVar')).toBeDefined();
			expect(writtenSettings.environmentVariables.find(e => e.SchemaName === 'cr_removedVar')).toBeUndefined();
		});

		it('should preserve connection references when syncing environment variables', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com')
			];

			const existingSettings = new DeploymentSettings(
				[],
				[{ LogicalName: 'cr_sharepoint', ConnectionId: '12345', ConnectorId: '/providers/Microsoft.PowerApps/apis/sharepointonline' }]
			);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(true);
			mockRepository.read.mockResolvedValue(existingSettings);

			// Act
			await useCase.execute(envVars);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(1);
			expect(writtenSettings.connectionReferences[0]!.LogicalName).toBe('cr_sharepoint');
		});
	});

	describe('user cancels export', () => {
		it('should return null when user cancels file selection', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com')
			];

			mockRepository.promptForFilePath.mockResolvedValue(undefined);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).toBeNull();
			expect(mockRepository.exists).not.toHaveBeenCalled();
			expect(mockRepository.read).not.toHaveBeenCalled();
			expect(mockRepository.write).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle empty environment variables array', async () => {
			// Arrange
			const envVars: EnvironmentVariable[] = [];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(0);
			expect(result?.removed).toBe(0);
			expect(result?.preserved).toBe(0);

			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(0);
		});

		it('should handle environment variables without suggested filename', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com')
			];

			const filePath = 'C:\\deployments\\custom.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute(envVars);

			// Assert
			expect(mockRepository.promptForFilePath).toHaveBeenCalledWith(undefined);
		});

		it('should handle all environment variable types', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_stringVar', 'text value', null, EnvironmentVariableType.String),
				createTestEnvironmentVariable('cr_numberVar', '42', null, EnvironmentVariableType.Number),
				createTestEnvironmentVariable('cr_boolVar', 'true', null, EnvironmentVariableType.Boolean),
				createTestEnvironmentVariable('cr_jsonVar', '{"key":"value"}', null, EnvironmentVariableType.JSON),
				createTestEnvironmentVariable('cr_secretVar', 'secret123', null, EnvironmentVariableType.Secret),
				createTestEnvironmentVariable('cr_dataSourceVar', 'datasource-id', null, EnvironmentVariableType.DataSource)
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).not.toBeNull();
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(6);
		});

		it('should handle special characters in schema names and values', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_unicode_value', 'Test données français 日本語'),
				createTestEnvironmentVariable('cr_url_with_query', 'https://api.contoso.com?key=value&param=123')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).not.toBeNull();
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			// Results are sorted alphabetically by SchemaName
			expect(writtenSettings.environmentVariables[0]!.Value).toBe('Test données français 日本語');
			expect(writtenSettings.environmentVariables[1]!.Value).toBe('https://api.contoso.com?key=value&param=123');
		});

		it('should handle very long values', async () => {
			// Arrange
			const longValue = 'x'.repeat(5000);
			const envVar = createTestEnvironmentVariable('cr_longVar', longValue);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([envVar]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!
			expect(writtenSettings.environmentVariables[0]!.Value).toBe(longValue);
		});
	});

	describe('orchestration and logging', () => {
		it('should call repository methods in correct order for new file', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			const callOrder: string[] = [];
			mockRepository.promptForFilePath.mockImplementation(async () => {
				callOrder.push('promptForFilePath');
				return filePath;
			});
			mockRepository.exists.mockImplementation(async () => {
				callOrder.push('exists');
				return false;
			});
			mockRepository.write.mockImplementation(async () => {
				callOrder.push('write');
			});

			// Act
			await useCase.execute(envVars);

			// Assert
			expect(callOrder).toEqual(['promptForFilePath', 'exists', 'write']);
		});

		it('should call repository methods in correct order for existing file', async () => {
			// Arrange
			const envVars = [
				createTestEnvironmentVariable('cr_apiUrl', 'https://api.contoso.com')
			];

			const existingSettings = new DeploymentSettings([], []);
			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(true);
			mockRepository.read.mockResolvedValue(existingSettings);

			const callOrder: string[] = [];
			mockRepository.promptForFilePath.mockImplementation(async () => {
				callOrder.push('promptForFilePath');
				return filePath;
			});
			mockRepository.exists.mockImplementation(async () => {
				callOrder.push('exists');
				return true;
			});
			mockRepository.read.mockImplementation(async () => {
				callOrder.push('read');
				return existingSettings;
			});
			mockRepository.write.mockImplementation(async () => {
				callOrder.push('write');
			});

			// Act
			await useCase.execute(envVars);

			// Assert
			expect(callOrder).toEqual(['promptForFilePath', 'exists', 'read', 'write']);
		});
	});

	describe('large datasets', () => {
		it('should handle large number of environment variables', async () => {
			// Arrange
			const envVars = Array.from({ length: 100 }, (_, i) =>
				createTestEnvironmentVariable(`cr_var_${i}`, `value_${i}`)
			);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(100);
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!
			expect(writtenSettings.environmentVariables).toHaveLength(100);
		});
	});

	describe('intentional export behavior', () => {
		it('should export environment variables even if they lack values', async () => {
			// Arrange - Environment variables with null values (data quality issue in solution)
			const envVars = [
				createTestEnvironmentVariable('cr_hasValue', 'configured'),
				createTestEnvironmentVariable('cr_noValue1', null, null),
				createTestEnvironmentVariable('cr_noValue2', null, null)
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(envVars);

			// Assert - All 3 environment variables should be exported (faithfully represents solution state)
			expect(result?.added).toBe(3);
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(3);
			// Results are sorted alphabetically by SchemaName
			expect(writtenSettings.environmentVariables[0]!.Value).toBe('configured');
			expect(writtenSettings.environmentVariables[1]!.Value).toBe('');
			expect(writtenSettings.environmentVariables[2]!.Value).toBe('');
		});
	});
});
