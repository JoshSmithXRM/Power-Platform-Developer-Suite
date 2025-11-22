import { ConnectionReferenceToDeploymentSettingsMapper } from './ConnectionReferenceToDeploymentSettingsMapper';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';

describe('ConnectionReferenceToDeploymentSettingsMapper', () => {
	let mapper: ConnectionReferenceToDeploymentSettingsMapper;

	beforeEach(() => {
		mapper = new ConnectionReferenceToDeploymentSettingsMapper();
	});

	// Test data factory
	function createConnectionReference(
		logicalName: string,
		connectionId: string | null,
		connectorId: string | null
	): ConnectionReference {
		return new ConnectionReference(
			`id-${logicalName}`,
			logicalName,
			`Display ${logicalName}`,
			connectorId,
			connectionId,
			false,
			new Date()
		);
	}

	describe('toDeploymentSettingsEntry', () => {
		describe('maps all properties correctly', () => {
			it('should map logicalName to LogicalName', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					'conn-123',
					'connector-456'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe('my_connection');
			});

			it('should map connectionId to ConnectionId', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					'conn-123',
					'connector-456'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe('conn-123');
			});

			it('should map connectorId to ConnectorId', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					'conn-123',
					'connector-456'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectorId).toBe('connector-456');
			});
		});

		describe('handles null/undefined values', () => {
			it('should convert null connectionId to empty string', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					null,
					'connector-456'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe('');
			});

			it('should convert null connectorId to empty string', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					'conn-123',
					null
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectorId).toBe('');
			});

			it('should convert both null values to empty strings', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'my_connection',
					null,
					null
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe('');
				expect(result.ConnectorId).toBe('');
			});
		});

		describe('edge cases', () => {
			it('should handle empty logicalName', () => {
				// Arrange
				const connectionRef = createConnectionReference('', 'conn-123', 'connector-456');

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe('');
			});

			it('should handle very long IDs', () => {
				// Arrange
				const longId = 'id-' + 'A'.repeat(1000);
				const connectionRef = createConnectionReference('ref', longId, longId);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe(longId);
				expect(result.ConnectorId).toBe(longId);
			});

			it('should handle special characters in logicalName', () => {
				// Arrange
				const specialName = 'my_connection-ref.v2';
				const connectionRef = createConnectionReference(
					specialName,
					'conn-123',
					'connector-456'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe(specialName);
			});

			it('should handle GUIDs as IDs', () => {
				// Arrange
				const connectionId = '12345678-1234-1234-1234-123456789abc';
				const connectorId = '87654321-4321-4321-4321-cba987654321';
				const connectionRef = createConnectionReference('ref', connectionId, connectorId);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe(connectionId);
				expect(result.ConnectorId).toBe(connectorId);
			});

			it('should handle connector paths as connectorId', () => {
				// Arrange
				const connectorId = '/providers/Microsoft.PowerApps/apis/shared_sharepointonline';
				const connectionRef = createConnectionReference('sharepoint_ref', 'conn-123', connectorId);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectorId).toBe(connectorId);
			});

			it('should handle whitespace in IDs', () => {
				// Arrange
				const connectionRef = createConnectionReference('ref', '  conn-123  ', '  connector-456  ');

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.ConnectionId).toBe('  conn-123  ');
				expect(result.ConnectorId).toBe('  connector-456  ');
			});
		});

		describe('deployment settings structure', () => {
			it('should return object with LogicalName, ConnectionId, and ConnectorId properties', () => {
				// Arrange
				const connectionRef = createConnectionReference('ref', 'conn-123', 'connector-456');

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(Object.keys(result)).toEqual(['LogicalName', 'ConnectionId', 'ConnectorId']);
			});

			it('should return readonly entry structure', () => {
				// Arrange
				const connectionRef = createConnectionReference('ref', 'conn-123', 'connector-456');

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert - TypeScript enforces readonly at compile time
				expect(result.LogicalName).toBeDefined();
				expect(result.ConnectionId).toBeDefined();
				expect(result.ConnectorId).toBeDefined();
			});
		});

		describe('common connector scenarios', () => {
			it('should map SharePoint connector', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'sharepoint_connection',
					'00000000-0000-0000-0000-000000000001',
					'/providers/Microsoft.PowerApps/apis/shared_sharepointonline'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe('sharepoint_connection');
				expect(result.ConnectorId).toContain('sharepointonline');
			});

			it('should map Dataverse connector', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'dataverse_connection',
					'00000000-0000-0000-0000-000000000002',
					'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe('dataverse_connection');
				expect(result.ConnectorId).toContain('commondataserviceforapps');
			});

			it('should map SQL connector', () => {
				// Arrange
				const connectionRef = createConnectionReference(
					'sql_connection',
					'00000000-0000-0000-0000-000000000003',
					'/providers/Microsoft.PowerApps/apis/shared_sql'
				);

				// Act
				const result = mapper.toDeploymentSettingsEntry(connectionRef);

				// Assert
				expect(result.LogicalName).toBe('sql_connection');
				expect(result.ConnectorId).toContain('shared_sql');
			});
		});
	});

	describe('toDeploymentSettingsEntries', () => {
		describe('maps array of connection references', () => {
			it('should map multiple connection references', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('ref1', 'conn-1', 'connector-1'),
					createConnectionReference('ref2', 'conn-2', 'connector-2'),
					createConnectionReference('ref3', 'conn-3', 'connector-3')
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(3);
				expect(result[0]?.LogicalName).toBe('ref1');
				expect(result[0]?.ConnectionId).toBe('conn-1');
				expect(result[1]?.LogicalName).toBe('ref2');
				expect(result[1]?.ConnectionId).toBe('conn-2');
				expect(result[2]?.LogicalName).toBe('ref3');
				expect(result[2]?.ConnectionId).toBe('conn-3');
			});

			it('should preserve array order', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('z_ref', 'conn-z', 'connector-z'),
					createConnectionReference('a_ref', 'conn-a', 'connector-a'),
					createConnectionReference('m_ref', 'conn-m', 'connector-m')
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result[0]?.LogicalName).toBe('z_ref');
				expect(result[1]?.LogicalName).toBe('a_ref');
				expect(result[2]?.LogicalName).toBe('m_ref');
			});

			it('should handle empty array', () => {
				// Arrange
				const connectionRefs: ConnectionReference[] = [];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(0);
				expect(result).toEqual([]);
			});

			it('should handle single-element array', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('single_ref', 'conn-123', 'connector-456')
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(1);
				expect(result[0]?.LogicalName).toBe('single_ref');
			});
		});

		describe('handles mixed scenarios in array', () => {
			it('should map array with some null values', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('ref1', 'conn-1', 'connector-1'),
					createConnectionReference('ref2', null, 'connector-2'),
					createConnectionReference('ref3', 'conn-3', null),
					createConnectionReference('ref4', null, null)
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(4);
				expect(result[0]?.ConnectionId).toBe('conn-1');
				expect(result[1]?.ConnectionId).toBe('');
				expect(result[2]?.ConnectorId).toBe('');
				expect(result[3]?.ConnectionId).toBe('');
				expect(result[3]?.ConnectorId).toBe('');
			});

			it('should map array with different connector types', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('sharepoint', 'conn-1', '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'),
					createConnectionReference('dataverse', 'conn-2', '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'),
					createConnectionReference('sql', 'conn-3', '/providers/Microsoft.PowerApps/apis/shared_sql')
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(3);
				expect(result[0]?.LogicalName).toBe('sharepoint');
				expect(result[1]?.LogicalName).toBe('dataverse');
				expect(result[2]?.LogicalName).toBe('sql');
			});
		});

		describe('handles edge cases in array', () => {
			it('should handle array with all null connection IDs', () => {
				// Arrange
				const connectionRefs = [
					createConnectionReference('ref1', null, 'connector-1'),
					createConnectionReference('ref2', null, 'connector-2'),
					createConnectionReference('ref3', null, 'connector-3')
				];

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(3);
				expect(result.every(entry => entry.ConnectionId === '')).toBe(true);
			});

			it('should handle large array', () => {
				// Arrange
				const connectionRefs = Array.from({ length: 50 }, (_, i) =>
					createConnectionReference(`ref${i}`, `conn-${i}`, `connector-${i}`)
				);

				// Act
				const result = mapper.toDeploymentSettingsEntries(connectionRefs);

				// Assert
				expect(result).toHaveLength(50);
				expect(result[0]?.LogicalName).toBe('ref0');
				expect(result[49]?.LogicalName).toBe('ref49');
			});
		});
	});
});
