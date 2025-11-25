import { ExportConnectionReferencesToDeploymentSettingsUseCase } from './ExportConnectionReferencesToDeploymentSettingsUseCase';
import { ConnectionReferenceToDeploymentSettingsMapper } from '../mappers/ConnectionReferenceToDeploymentSettingsMapper';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { DeploymentSettings, ConnectionReferenceEntry } from '../../../../shared/domain/entities/DeploymentSettings';

describe('ExportConnectionReferencesToDeploymentSettingsUseCase', () => {
	let useCase: ExportConnectionReferencesToDeploymentSettingsUseCase;
	let mockRepository: jest.Mocked<IDeploymentSettingsRepository>;
	let mapper: ConnectionReferenceToDeploymentSettingsMapper;

	beforeEach(() => {
		mockRepository = {
			read: jest.fn(),
			write: jest.fn(),
			exists: jest.fn(),
			promptForFilePath: jest.fn()
		};

		mapper = new ConnectionReferenceToDeploymentSettingsMapper();

		useCase = new ExportConnectionReferencesToDeploymentSettingsUseCase(
			mockRepository,
			mapper,
			new NullLogger()
		);
	});

	function createTestConnectionReference(
		logicalName: string,
		connectionId: string | null = 'conn-123',
		connectorId: string | null = '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'
	): ConnectionReference {
		return new ConnectionReference(
			`id-${logicalName}`,
			logicalName,
			`Display ${logicalName}`,
			connectorId,
			connectionId,
			false,
			new Date('2025-11-01')
		);
	}

	describe('successful export - new file', () => {
		it('should create new deployment settings file with connection references', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-sp-123', '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'),
				createTestConnectionReference('cr_dataverse', 'conn-dv-456', '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs, 'Solution.deploymentsettings.json');

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
			expect(writtenSettings.connectionReferences).toHaveLength(2);
			expect(writtenSettings.connectionReferences[0]).toEqual({
				LogicalName: 'cr_dataverse',
				ConnectionId: 'conn-dv-456',
				ConnectorId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
			});
			expect(writtenSettings.connectionReferences[1]).toEqual({
				LogicalName: 'cr_sharepoint',
				ConnectionId: 'conn-sp-123',
				ConnectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'
			});
		});

		it('should use empty string when connection ID is null', async () => {
			// Arrange
			const connRef = createTestConnectionReference('cr_sharepoint', null);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([connRef]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences[0]!.ConnectionId).toBe('');
		});

		it('should use empty string when connector ID is null', async () => {
			// Arrange
			const connRef = createTestConnectionReference('cr_custom', 'conn-123', null);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([connRef]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences[0]!.ConnectorId).toBe('');
		});
	});

	describe('successful export - existing file', () => {
		it('should sync connection references section in existing file', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-sp-new', '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'),
				createTestConnectionReference('cr_sql', 'conn-sql-123', '/providers/Microsoft.PowerApps/apis/shared_sql')
			];

			const existingEntries: ConnectionReferenceEntry[] = [
				{ LogicalName: 'cr_sharepoint', ConnectionId: 'conn-sp-old', ConnectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline' },
				{ LogicalName: 'cr_removed', ConnectionId: 'conn-old', ConnectorId: '/providers/Microsoft.PowerApps/apis/shared_other' }
			];
			const existingSettings = new DeploymentSettings([], existingEntries);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(true);
			mockRepository.read.mockResolvedValue(existingSettings);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(1); // cr_sql
			expect(result?.removed).toBe(1); // cr_removed
			expect(result?.preserved).toBe(1); // cr_sharepoint (preserved value)

			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(2);
			// Sync preserves existing values for entries that remain
			expect(writtenSettings.connectionReferences.find(e => e.LogicalName === 'cr_sharepoint')?.ConnectionId).toBe('conn-sp-old');
			expect(writtenSettings.connectionReferences.find(e => e.LogicalName === 'cr_sql')).toBeDefined();
			expect(writtenSettings.connectionReferences.find(e => e.LogicalName === 'cr_removed')).toBeUndefined();
		});

		it('should preserve environment variables when syncing connection references', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-sp-123')
			];

			const existingSettings = new DeploymentSettings(
				[{ SchemaName: 'cr_apiUrl', Value: 'https://api.contoso.com' }],
				[]
			);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(true);
			mockRepository.read.mockResolvedValue(existingSettings);

			// Act
			await useCase.execute(connRefs);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.environmentVariables).toHaveLength(1);
			expect(writtenSettings.environmentVariables[0]!.SchemaName).toBe('cr_apiUrl');
		});
	});

	describe('user cancels export', () => {
		it('should return null when user cancels file selection', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-123')
			];

			mockRepository.promptForFilePath.mockResolvedValue(undefined);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).toBeNull();
			expect(mockRepository.exists).not.toHaveBeenCalled();
			expect(mockRepository.read).not.toHaveBeenCalled();
			expect(mockRepository.write).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle empty connection references array', async () => {
			// Arrange
			const connRefs: ConnectionReference[] = [];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(0);
			expect(result?.removed).toBe(0);
			expect(result?.preserved).toBe(0);

			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(0);
		});

		it('should handle connection references without suggested filename', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-123')
			];

			const filePath = 'C:\\deployments\\custom.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute(connRefs);

			// Assert
			expect(mockRepository.promptForFilePath).toHaveBeenCalledWith(undefined);
		});

		it('should handle special characters in logical names and IDs', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_special_chars_123', 'conn-with-special!@#', '/providers/path/with?query=value'),
				createTestConnectionReference('cr_unicode_日本語', 'conn-unicode-データ', '/providers/unicode/français')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).not.toBeNull();
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			// Results are sorted alphabetically by LogicalName
			expect(writtenSettings.connectionReferences[0]!.LogicalName).toBe('cr_special_chars_123');
			expect(writtenSettings.connectionReferences[1]!.LogicalName).toBe('cr_unicode_日本語');
		});

		it('should handle very long connector paths', async () => {
			// Arrange
			const longPath = '/providers/' + 'x'.repeat(1000);
			const connRef = createTestConnectionReference('cr_long', 'conn-123', longPath);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			await useCase.execute([connRef]);

			// Assert
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences[0]!.ConnectorId).toBe(longPath);
		});

		it('should handle common connector scenarios', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-sp', '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'),
				createTestConnectionReference('cr_dataverse', 'conn-dv', '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'),
				createTestConnectionReference('cr_sql', 'conn-sql', '/providers/Microsoft.PowerApps/apis/shared_sql'),
				createTestConnectionReference('cr_office365', 'conn-o365', '/providers/Microsoft.PowerApps/apis/shared_office365')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).not.toBeNull();
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(4);
		});
	});

	describe('orchestration and logging', () => {
		it('should call repository methods in correct order for new file', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-123')
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
			await useCase.execute(connRefs);

			// Assert
			expect(callOrder).toEqual(['promptForFilePath', 'exists', 'write']);
		});

		it('should call repository methods in correct order for existing file', async () => {
			// Arrange
			const connRefs = [
				createTestConnectionReference('cr_sharepoint', 'conn-123')
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
			await useCase.execute(connRefs);

			// Assert
			expect(callOrder).toEqual(['promptForFilePath', 'exists', 'read', 'write']);
		});
	});

	describe('large datasets', () => {
		it('should handle large number of connection references', async () => {
			// Arrange
			const connRefs = Array.from({ length: 50 }, (_, i) =>
				createTestConnectionReference(`cr_connector_${i}`, `conn_${i}`, `/providers/connector_${i}`)
			);

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.added).toBe(50);
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(50);
		});
	});

	describe('intentional export behavior', () => {
		it('should export connection references even if they lack connections', async () => {
			// Arrange - Connection references without connections (data quality issue in solution)
			const connRefs = [
				createTestConnectionReference('cr_disconnected1', null, null),
				createTestConnectionReference('cr_disconnected2', null, '/providers/connector'),
				createTestConnectionReference('cr_connected', 'conn-123', '/providers/connector')
			];

			const filePath = 'C:\\deployments\\Solution.deploymentsettings.json';
			mockRepository.promptForFilePath.mockResolvedValue(filePath);
			mockRepository.exists.mockResolvedValue(false);

			// Act
			const result = await useCase.execute(connRefs);

			// Assert - All 3 connection references should be exported (faithfully represents solution state)
			expect(result?.added).toBe(3);
			const [, writtenSettings] = mockRepository.write.mock.calls[0]!;
			expect(writtenSettings.connectionReferences).toHaveLength(3);
			// Results are sorted alphabetically by LogicalName
			expect(writtenSettings.connectionReferences[0]!.ConnectionId).toBe('conn-123');
			expect(writtenSettings.connectionReferences[1]!.ConnectionId).toBe('');
			expect(writtenSettings.connectionReferences[2]!.ConnectionId).toBe('');
		});
	});
});
