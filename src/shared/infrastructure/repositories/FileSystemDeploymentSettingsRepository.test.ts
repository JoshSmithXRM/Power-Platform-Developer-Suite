import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { FileSystemDeploymentSettingsRepository } from './FileSystemDeploymentSettingsRepository';
import { DeploymentSettings } from '../../domain/entities/DeploymentSettings';
import { NullLogger } from '../../../infrastructure/logging/NullLogger';

// Mock the fs/promises module
jest.mock('fs/promises');
jest.mock('vscode', () => ({
	window: {
		showSaveDialog: jest.fn()
	},
	Uri: {
		file: jest.fn((path: string) => ({ fsPath: path })),
		joinPath: jest.fn((base, name) => ({ fsPath: `${base.fsPath}/${name}` }))
	},
	workspace: {
		workspaceFolders: []
	}
}), { virtual: true });

describe('FileSystemDeploymentSettingsRepository', () => {
	let repository: FileSystemDeploymentSettingsRepository;
	let logger: NullLogger;
	let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
	let mockWriteFile: jest.MockedFunction<typeof fs.writeFile>;
	let mockAccess: jest.MockedFunction<typeof fs.access>;

	beforeEach(() => {
		logger = new NullLogger();
		repository = new FileSystemDeploymentSettingsRepository(logger);

		mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
		mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
		mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;

		jest.clearAllMocks();
	});

	describe('read', () => {
		describe('successful reading', () => {
			it('should read valid deployment settings with both environment variables and connection references', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [
						{ SchemaName: 'env_var1', Value: 'value1' },
						{ SchemaName: 'env_var2', Value: 'value2' }
					],
					ConnectionReferences: [
						{ LogicalName: 'conn1', ConnectionId: 'id1', ConnectorId: 'connector1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				expect(result).toBeInstanceOf(DeploymentSettings);
				expect(result.environmentVariables).toHaveLength(2);
				expect(result.environmentVariables[0]!.SchemaName).toBe('env_var1');
				expect(result.environmentVariables[0]!.Value).toBe('value1');
				expect(result.connectionReferences).toHaveLength(1);
				expect(result.connectionReferences[0]!.LogicalName).toBe('conn1');
			});

			it('should read deployment settings with only environment variables', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [
						{ SchemaName: 'env_var1', Value: 'value1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				expect(result.environmentVariables).toHaveLength(1);
				expect(result.connectionReferences).toHaveLength(0);
			});

			it('should read deployment settings with only connection references', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					ConnectionReferences: [
						{ LogicalName: 'conn1', ConnectionId: 'id1', ConnectorId: 'connector1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				expect(result.environmentVariables).toHaveLength(0);
				expect(result.connectionReferences).toHaveLength(1);
			});

			it('should read empty deployment settings', async () => {
				// Arrange
				const fileContent = JSON.stringify({});

				mockReadFile.mockResolvedValue(fileContent);

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				expect(result.environmentVariables).toHaveLength(0);
				expect(result.connectionReferences).toHaveLength(0);
			});

			it('should read deployment settings with empty arrays', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [],
					ConnectionReferences: []
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				expect(result.environmentVariables).toHaveLength(0);
				expect(result.connectionReferences).toHaveLength(0);
			});
		});

		describe('error handling', () => {
			it('should throw error when file contains invalid JSON', async () => {
				// Arrange
				mockReadFile.mockResolvedValue('{ invalid json }');

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow();
			});

			it('should accept arrays as empty objects (implementation treats arrays as objects)', async () => {
				// Arrange
				mockReadFile.mockResolvedValue(JSON.stringify([]));

				// Act
				const result = await repository.read('/path/to/file.json');

				// Assert
				// Note: Arrays pass the typeof check (typeof [] === 'object')
				// and accessing properties on arrays returns undefined, which is treated as missing
				expect(result.environmentVariables).toHaveLength(0);
				expect(result.connectionReferences).toHaveLength(0);
			});

			it('should throw error when file root is null', async () => {
				// Arrange
				mockReadFile.mockResolvedValue(JSON.stringify(null));

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: file root must be a JSON object'
				);
			});

			it('should throw error when EnvironmentVariables entry is invalid (missing SchemaName)', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [
						{ Value: 'value1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid EnvironmentVariables entry at index 0, expected object with SchemaName and Value properties'
				);
			});

			it('should throw error when EnvironmentVariables entry is invalid (missing Value)', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [
						{ SchemaName: 'env_var1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid EnvironmentVariables entry at index 0, expected object with SchemaName and Value properties'
				);
			});

			it('should throw error when EnvironmentVariables entry is not an object', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					EnvironmentVariables: [
						'not an object'
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid EnvironmentVariables entry at index 0'
				);
			});

			it('should throw error when ConnectionReferences entry is invalid (missing LogicalName)', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					ConnectionReferences: [
						{ ConnectionId: 'id1', ConnectorId: 'connector1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid ConnectionReferences entry at index 0, expected object with LogicalName, ConnectionId, and ConnectorId properties'
				);
			});

			it('should throw error when ConnectionReferences entry is invalid (missing ConnectionId)', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					ConnectionReferences: [
						{ LogicalName: 'conn1', ConnectorId: 'connector1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid ConnectionReferences entry at index 0, expected object with LogicalName, ConnectionId, and ConnectorId properties'
				);
			});

			it('should throw error when ConnectionReferences entry is invalid (missing ConnectorId)', async () => {
				// Arrange
				const fileContent = JSON.stringify({
					ConnectionReferences: [
						{ LogicalName: 'conn1', ConnectionId: 'id1' }
					]
				});

				mockReadFile.mockResolvedValue(fileContent);

				// Act & Assert
				await expect(repository.read('/path/to/file.json')).rejects.toThrow(
					'Cannot read deployment settings: invalid ConnectionReferences entry at index 0, expected object with LogicalName, ConnectionId, and ConnectorId properties'
				);
			});

			it('should throw error when file read fails', async () => {
				// Arrange
				mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

				// Act & Assert
				await expect(repository.read('/path/to/nonexistent.json')).rejects.toThrow(
					'ENOENT: no such file or directory'
				);
			});
		});
	});

	describe('write', () => {
		describe('successful writing', () => {
			it('should write deployment settings with both environment variables and connection references', async () => {
				// Arrange
				const settings = new DeploymentSettings(
					[
						{ SchemaName: 'env_var1', Value: 'value1' },
						{ SchemaName: 'env_var2', Value: 'value2' }
					],
					[
						{ LogicalName: 'conn1', ConnectionId: 'id1', ConnectorId: 'connector1' }
					]
				);

				mockWriteFile.mockResolvedValue(undefined);

				// Act
				await repository.write('/path/to/file.json', settings);

				// Assert
				expect(mockWriteFile).toHaveBeenCalledTimes(1);
				expect(mockWriteFile).toHaveBeenCalledWith(
					'/path/to/file.json',
					expect.stringContaining('"EnvironmentVariables"'),
					'utf-8'
				);

				// Verify JSON format with 4-space indentation
				const [, writtenContent] = mockWriteFile.mock.calls[0]! as [string, string, string];
				const parsed = JSON.parse(writtenContent);
				expect(parsed.EnvironmentVariables).toHaveLength(2);
				expect(parsed.ConnectionReferences).toHaveLength(1);
				expect(writtenContent).toContain('    '); // 4-space indentation
			});

			it('should write empty deployment settings', async () => {
				// Arrange
				const settings = new DeploymentSettings([], []);
				mockWriteFile.mockResolvedValue(undefined);

				// Act
				await repository.write('/path/to/file.json', settings);

				// Assert
				const [, writtenContent] = mockWriteFile.mock.calls[0]! as [string, string, string];
				const parsed = JSON.parse(writtenContent);
				expect(parsed.EnvironmentVariables).toEqual([]);
				expect(parsed.ConnectionReferences).toEqual([]);
			});

			it('should write deployment settings with only environment variables', async () => {
				// Arrange
				const settings = new DeploymentSettings(
					[{ SchemaName: 'env_var1', Value: 'value1' }],
					[]
				);
				mockWriteFile.mockResolvedValue(undefined);

				// Act
				await repository.write('/path/to/file.json', settings);

				// Assert
				const [, writtenContent] = mockWriteFile.mock.calls[0]! as [string, string, string];
				const parsed = JSON.parse(writtenContent);
				expect(parsed.EnvironmentVariables).toHaveLength(1);
				expect(parsed.ConnectionReferences).toHaveLength(0);
			});
		});

		describe('error handling', () => {
			it('should throw error when file write fails', async () => {
				// Arrange
				const settings = new DeploymentSettings([], []);
				mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'));

				// Act & Assert
				await expect(repository.write('/path/to/file.json', settings)).rejects.toThrow(
					'EACCES: permission denied'
				);
			});
		});
	});

	describe('exists', () => {
		it('should return true when file exists', async () => {
			// Arrange
			mockAccess.mockResolvedValue(undefined);

			// Act
			const result = await repository.exists('/path/to/file.json');

			// Assert
			expect(result).toBe(true);
			expect(mockAccess).toHaveBeenCalledWith('/path/to/file.json');
		});

		it('should return false when file does not exist', async () => {
			// Arrange
			mockAccess.mockRejectedValue(new Error('ENOENT'));

			// Act
			const result = await repository.exists('/path/to/nonexistent.json');

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when access fails for any reason', async () => {
			// Arrange
			mockAccess.mockRejectedValue(new Error('EACCES: permission denied'));

			// Act
			const result = await repository.exists('/path/to/file.json');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('promptForFilePath', () => {
		it('should return file path when user selects file', async () => {
			// Arrange
			const mockUri = { fsPath: '/path/to/selected.json' };
			(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

			// Act
			const result = await repository.promptForFilePath();

			// Assert
			expect(result).toBe('/path/to/selected.json');
			expect(vscode.window.showSaveDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					filters: {
						'Deployment Settings': ['json'],
						'All Files': ['*']
					},
					saveLabel: 'Select Deployment Settings File'
				})
			);
		});

		it('should return undefined when user cancels', async () => {
			// Arrange
			(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(undefined);

			// Act
			const result = await repository.promptForFilePath();

			// Assert
			expect(result).toBeUndefined();
		});

		it('should use suggested name when provided', async () => {
			// Arrange
			const mockUri = { fsPath: '/workspace/deploymentSettings.json' };
			(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];

			// Act
			await repository.promptForFilePath('deploymentSettings.json');

			// Assert
			expect(vscode.window.showSaveDialog).toHaveBeenCalled();
		});

		it('should use default URI when provided', async () => {
			// Arrange
			const mockUri = { fsPath: '/custom/path/file.json' };
			(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);

			// Act
			await repository.promptForFilePath(undefined, '/custom/path');

			// Assert
			expect(vscode.window.showSaveDialog).toHaveBeenCalled();
			expect(vscode.Uri.file).toHaveBeenCalledWith('/custom/path');
		});

		it('should use suggested filename when no workspace is open', async () => {
			// Arrange
			const mockUri = { fsPath: '/home/user/solution.deploymentsettings.json' };
			(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(mockUri);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(vscode.workspace as any).workspaceFolders = undefined; // No workspace open

			// Act
			await repository.promptForFilePath('solution.deploymentsettings.json');

			// Assert
			expect(vscode.window.showSaveDialog).toHaveBeenCalled();
			expect(vscode.Uri.file).toHaveBeenCalledWith('solution.deploymentsettings.json');
		});
	});
});
