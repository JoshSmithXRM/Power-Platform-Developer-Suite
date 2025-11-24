import { DeploymentSettings, EnvironmentVariableEntry, ConnectionReferenceEntry } from './DeploymentSettings';

describe('DeploymentSettings', () => {
	// Test data factories
	function createEnvironmentVariable(schemaName: string, value: string): EnvironmentVariableEntry {
		return { SchemaName: schemaName, Value: value };
	}

	function createConnectionReference(logicalName: string, connectionId: string, connectorId: string): ConnectionReferenceEntry {
		return { LogicalName: logicalName, ConnectionId: connectionId, ConnectorId: connectorId };
	}

	describe('syncEnvironmentVariables', () => {
		describe('adding new entries', () => {
			it('should add new environment variables when they do not exist in file', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Existing', 'existing-value')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Existing', 'new-value'),
					createEnvironmentVariable('var_New1', 'new-value-1'),
					createEnvironmentVariable('var_New2', 'new-value-2')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(3);
				expect(syncResult.added).toBe(2);
			});

			it('should add entries with values from environment when adding new variables', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Name', 'environment-value')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				const addedVar = updated.environmentVariables.find(v => v.SchemaName === 'var_Name');
				expect(addedVar?.Value).toBe('environment-value');
			});
		});

		describe('removing old entries', () => {
			it('should remove environment variables that are not in new data', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Keep', 'keep-value'),
					createEnvironmentVariable('var_Remove1', 'remove-value-1'),
					createEnvironmentVariable('var_Remove2', 'remove-value-2')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Keep', 'new-value')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(1);
				expect(syncResult.removed).toBe(2);
			});

			it('should report correct removed count when all entries are removed', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Old1', 'value1'),
					createEnvironmentVariable('var_Old2', 'value2')
				];
				const newEntries: EnvironmentVariableEntry[] = [];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(0);
				expect(syncResult.removed).toBe(2);
				expect(syncResult.added).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('preserving existing values', () => {
			it('should preserve existing values when entries exist in both old and new data', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Name', 'original-value')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Name', 'environment-value')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				const preservedVar = updated.environmentVariables.find(v => v.SchemaName === 'var_Name');
				expect(preservedVar?.Value).toBe('original-value');
				expect(syncResult.preserved).toBe(1);
			});

			it('should not overwrite existing values with environment values', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Config', 'dev-database-url'),
					createEnvironmentVariable('var_ApiKey', 'dev-api-key')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Config', 'prod-database-url'),
					createEnvironmentVariable('var_ApiKey', 'prod-api-key')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables[0]?.Value).toBe('dev-api-key');
				expect(updated.environmentVariables[1]?.Value).toBe('dev-database-url');
			});
		});

		describe('alphabetical sorting', () => {
			it('should sort environment variables alphabetically by SchemaName', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Zebra', 'z'),
					createEnvironmentVariable('var_Alpha', 'a'),
					createEnvironmentVariable('var_Mike', 'm')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables[0]?.SchemaName).toBe('var_Alpha');
				expect(updated.environmentVariables[1]?.SchemaName).toBe('var_Mike');
				expect(updated.environmentVariables[2]?.SchemaName).toBe('var_Zebra');
			});

			it('should maintain alphabetical order when adding and preserving entries', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Mike', 'existing-m')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Zebra', 'new-z'),
					createEnvironmentVariable('var_Mike', 'env-m'),
					createEnvironmentVariable('var_Alpha', 'new-a')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables[0]?.SchemaName).toBe('var_Alpha');
				expect(updated.environmentVariables[1]?.SchemaName).toBe('var_Mike');
				expect(updated.environmentVariables[2]?.SchemaName).toBe('var_Zebra');
			});
		});

		describe('empty arrays', () => {
			it('should handle empty existing array', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_New', 'new-value')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(1);
				expect(syncResult.added).toBe(1);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});

			it('should handle empty new entries array', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Existing', 'existing-value')
				];
				const newEntries: EnvironmentVariableEntry[] = [];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(0);
				expect(syncResult.added).toBe(0);
				expect(syncResult.removed).toBe(1);
				expect(syncResult.preserved).toBe(0);
			});

			it('should handle both arrays empty', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [];
				const newEntries: EnvironmentVariableEntry[] = [];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.environmentVariables).toHaveLength(0);
				expect(syncResult.added).toBe(0);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('sync result counts', () => {
			it('should return correct counts for mixed add, remove, preserve operations', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Preserve1', 'p1'),
					createEnvironmentVariable('var_Preserve2', 'p2'),
					createEnvironmentVariable('var_Remove1', 'r1'),
					createEnvironmentVariable('var_Remove2', 'r2')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Preserve1', 'new-p1'),
					createEnvironmentVariable('var_Preserve2', 'new-p2'),
					createEnvironmentVariable('var_Add1', 'a1'),
					createEnvironmentVariable('var_Add2', 'a2'),
					createEnvironmentVariable('var_Add3', 'a3')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(syncResult.added).toBe(3);
				expect(syncResult.removed).toBe(2);
				expect(syncResult.preserved).toBe(2);
			});

			it('should return result with only added count when starting with empty file', () => {
				// Arrange
				const existing: EnvironmentVariableEntry[] = [];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_New1', 'n1'),
					createEnvironmentVariable('var_New2', 'n2')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(syncResult.added).toBe(2);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('connection references immutability', () => {
			it('should not modify connection references when syncing environment variables', () => {
				// Arrange
				const connRefs: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Existing', 'conn-123', 'connector-456')
				];
				const existing: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Existing', 'existing-value')
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_New', 'new-value')
				];
				const settings = new DeploymentSettings(existing, connRefs);

				// Act
				const { settings: updated } = settings.syncEnvironmentVariables(newEntries);

				// Assert
				expect(updated.connectionReferences).toBe(connRefs);
				expect(updated.connectionReferences).toHaveLength(1);
			});
		});

		describe('edge cases', () => {
			it('should handle entries with empty string values', () => {
				// Arrange - Test that empty strings are preserved (not treated as undefined)
				const existing: EnvironmentVariableEntry[] = [
					{ SchemaName: 'var_WithValue', Value: 'actual-value' },
					{ SchemaName: 'var_EmptyString', Value: '' }
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_WithValue', 'new-value'),
					createEnvironmentVariable('var_EmptyString', 'new-value-2')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert - Both entries should be preserved with their original values (including empty string)
				expect(updated.environmentVariables).toHaveLength(2);
				expect(syncResult.preserved).toBe(2);
				const withValue = updated.environmentVariables.find(v => v.SchemaName === 'var_WithValue');
				const emptyString = updated.environmentVariables.find(v => v.SchemaName === 'var_EmptyString');
				expect(withValue?.Value).toBe('actual-value');
				expect(emptyString?.Value).toBe('');
			});

			it('should skip entries when value extractor returns undefined', () => {
				// Arrange - This tests the defensive undefined check in syncEntries (line 171)
				// Create a scenario where an entry exists in the map but the value is undefined
				// This can theoretically happen if there's a type safety violation or malformed data
				const existing: EnvironmentVariableEntry[] = [
					// Using type assertion to create an entry with undefined value for testing
					{ SchemaName: 'var_Undefined', Value: undefined as unknown as string },
					{ SchemaName: 'var_Normal', Value: 'normal-value' }
				];
				const newEntries: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Undefined', 'new-value'),
					createEnvironmentVariable('var_Normal', 'new-value-2')
				];
				const settings = new DeploymentSettings(existing, []);

				// Act
				const { settings: updated, syncResult } = settings.syncEnvironmentVariables(newEntries);

				// Assert - Entry with undefined value should be skipped entirely (defensive check)
				// Only var_Normal should be in the result (preserved with original value)
				expect(updated.environmentVariables).toHaveLength(1);
				expect(syncResult.preserved).toBe(1);
				expect(syncResult.added).toBe(0);
				// var_Undefined was skipped because its preserved value was undefined
				// var_Normal should be preserved
				const normalVar = updated.environmentVariables.find(v => v.SchemaName === 'var_Normal');
				expect(normalVar?.Value).toBe('normal-value');
			});
		});
	});

	describe('syncConnectionReferences', () => {
		describe('adding new entries', () => {
			it('should add new connection references when they do not exist in file', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Existing', 'conn-1', 'connector-1')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Existing', 'conn-env', 'connector-env'),
					createConnectionReference('cr_New1', 'conn-2', 'connector-2'),
					createConnectionReference('cr_New2', 'conn-3', 'connector-3')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(3);
				expect(syncResult.added).toBe(2);
			});

			it('should add entries with values from environment when adding new references', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_SharePoint', 'conn-sp-123', 'connector-sp-456')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated } = settings.syncConnectionReferences(newEntries);

				// Assert
				const addedRef = updated.connectionReferences.find(r => r.LogicalName === 'cr_SharePoint');
				expect(addedRef?.ConnectionId).toBe('conn-sp-123');
				expect(addedRef?.ConnectorId).toBe('connector-sp-456');
			});
		});

		describe('removing old entries', () => {
			it('should remove connection references that are not in new data', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Keep', 'conn-keep', 'connector-keep'),
					createConnectionReference('cr_Remove1', 'conn-r1', 'connector-r1'),
					createConnectionReference('cr_Remove2', 'conn-r2', 'connector-r2')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Keep', 'conn-new', 'connector-new')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(1);
				expect(syncResult.removed).toBe(2);
			});

			it('should report correct removed count when all entries are removed', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Old1', 'conn-1', 'connector-1'),
					createConnectionReference('cr_Old2', 'conn-2', 'connector-2')
				];
				const newEntries: ConnectionReferenceEntry[] = [];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(0);
				expect(syncResult.removed).toBe(2);
				expect(syncResult.added).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('preserving existing values', () => {
			it('should preserve existing ConnectionId and ConnectorId when entries exist in both old and new data', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_SharePoint', 'conn-dev-123', 'connector-dev-456')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_SharePoint', 'conn-env-789', 'connector-env-012')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				const preservedRef = updated.connectionReferences.find(r => r.LogicalName === 'cr_SharePoint');
				expect(preservedRef?.ConnectionId).toBe('conn-dev-123');
				expect(preservedRef?.ConnectorId).toBe('connector-dev-456');
				expect(syncResult.preserved).toBe(1);
			});

			it('should not overwrite existing connection IDs with environment values', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_SQL', 'conn-dev-sql', 'connector-dev-sql'),
					createConnectionReference('cr_SharePoint', 'conn-dev-sp', 'connector-dev-sp')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_SQL', 'conn-prod-sql', 'connector-prod-sql'),
					createConnectionReference('cr_SharePoint', 'conn-prod-sp', 'connector-prod-sp')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences[0]?.ConnectionId).toBe('conn-dev-sp');
				expect(updated.connectionReferences[0]?.ConnectorId).toBe('connector-dev-sp');
				expect(updated.connectionReferences[1]?.ConnectionId).toBe('conn-dev-sql');
				expect(updated.connectionReferences[1]?.ConnectorId).toBe('connector-dev-sql');
			});
		});

		describe('alphabetical sorting', () => {
			it('should sort connection references alphabetically by LogicalName', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Zebra', 'conn-z', 'connector-z'),
					createConnectionReference('cr_Alpha', 'conn-a', 'connector-a'),
					createConnectionReference('cr_Mike', 'conn-m', 'connector-m')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences[0]?.LogicalName).toBe('cr_Alpha');
				expect(updated.connectionReferences[1]?.LogicalName).toBe('cr_Mike');
				expect(updated.connectionReferences[2]?.LogicalName).toBe('cr_Zebra');
			});

			it('should maintain alphabetical order when adding and preserving entries', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Mike', 'conn-existing-m', 'connector-existing-m')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Zebra', 'conn-new-z', 'connector-new-z'),
					createConnectionReference('cr_Mike', 'conn-env-m', 'connector-env-m'),
					createConnectionReference('cr_Alpha', 'conn-new-a', 'connector-new-a')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences[0]?.LogicalName).toBe('cr_Alpha');
				expect(updated.connectionReferences[1]?.LogicalName).toBe('cr_Mike');
				expect(updated.connectionReferences[2]?.LogicalName).toBe('cr_Zebra');
			});
		});

		describe('empty arrays', () => {
			it('should handle empty existing array', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_New', 'conn-new', 'connector-new')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(1);
				expect(syncResult.added).toBe(1);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});

			it('should handle empty new entries array', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Existing', 'conn-existing', 'connector-existing')
				];
				const newEntries: ConnectionReferenceEntry[] = [];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(0);
				expect(syncResult.added).toBe(0);
				expect(syncResult.removed).toBe(1);
				expect(syncResult.preserved).toBe(0);
			});

			it('should handle both arrays empty', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [];
				const newEntries: ConnectionReferenceEntry[] = [];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { settings: updated, syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.connectionReferences).toHaveLength(0);
				expect(syncResult.added).toBe(0);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('sync result counts', () => {
			it('should return correct counts for mixed add, remove, preserve operations', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Preserve1', 'conn-p1', 'connector-p1'),
					createConnectionReference('cr_Preserve2', 'conn-p2', 'connector-p2'),
					createConnectionReference('cr_Remove1', 'conn-r1', 'connector-r1'),
					createConnectionReference('cr_Remove2', 'conn-r2', 'connector-r2')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Preserve1', 'conn-new-p1', 'connector-new-p1'),
					createConnectionReference('cr_Preserve2', 'conn-new-p2', 'connector-new-p2'),
					createConnectionReference('cr_Add1', 'conn-a1', 'connector-a1'),
					createConnectionReference('cr_Add2', 'conn-a2', 'connector-a2'),
					createConnectionReference('cr_Add3', 'conn-a3', 'connector-a3')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(syncResult.added).toBe(3);
				expect(syncResult.removed).toBe(2);
				expect(syncResult.preserved).toBe(2);
			});

			it('should return result with only added count when starting with empty file', () => {
				// Arrange
				const existing: ConnectionReferenceEntry[] = [];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_New1', 'conn-n1', 'connector-n1'),
					createConnectionReference('cr_New2', 'conn-n2', 'connector-n2')
				];
				const settings = new DeploymentSettings([], existing);

				// Act
				const { syncResult } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(syncResult.added).toBe(2);
				expect(syncResult.removed).toBe(0);
				expect(syncResult.preserved).toBe(0);
			});
		});

		describe('environment variables immutability', () => {
			it('should not modify environment variables when syncing connection references', () => {
				// Arrange
				const envVars: EnvironmentVariableEntry[] = [
					createEnvironmentVariable('var_Existing', 'existing-value')
				];
				const existing: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_Existing', 'conn-existing', 'connector-existing')
				];
				const newEntries: ConnectionReferenceEntry[] = [
					createConnectionReference('cr_New', 'conn-new', 'connector-new')
				];
				const settings = new DeploymentSettings(envVars, existing);

				// Act
				const { settings: updated } = settings.syncConnectionReferences(newEntries);

				// Assert
				expect(updated.environmentVariables).toBe(envVars);
				expect(updated.environmentVariables).toHaveLength(1);
			});
		});
	});
});
