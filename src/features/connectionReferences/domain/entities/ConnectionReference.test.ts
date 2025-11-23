import { createTestConnectionReference } from '../../../../shared/testing';
import { ConnectionReference } from './ConnectionReference';

describe('ConnectionReference', () => {
	// Use shared test factory
	const createConnectionReference = createTestConnectionReference;

	describe('constructor', () => {
		describe('successful creation', () => {
			it('should create connection reference with all required fields', () => {
				const cr = createConnectionReference();

				expect(cr.id).toBe('cr-00000000-0000-0000-0000-000000000001');
				expect(cr.connectionReferenceLogicalName).toBe('cr_test_connection');
				expect(cr.displayName).toBe('Test Connection Reference');
				expect(cr.connectorId).toBe('connector-00000000-0000-0000-0000-000000000001');
				expect(cr.connectionId).toBe('connection-00000000-0000-0000-0000-000000000001');
				expect(cr.isManaged).toBe(false);
				expect(cr.modifiedOn).toEqual(new Date('2024-01-01T10:00:00Z'));
			});

			test.each<{ isManaged: boolean; description: string }>([
				{ isManaged: true, description: 'managed connection reference' },
				{ isManaged: false, description: 'unmanaged connection reference' }
			])('should create $description', ({ isManaged }) => {
				const cr = createConnectionReference({ isManaged });

				expect(cr.isManaged).toBe(isManaged);
			});

			test.each<{ connectorId: string | null; connectionId: string | null; scenario: string }>([
				{ connectorId: null, connectionId: 'connection-123', scenario: 'null connector ID' },
				{ connectorId: 'connector-123', connectionId: null, scenario: 'null connection ID' },
				{ connectorId: null, connectionId: null, scenario: 'both null connector and connection IDs' }
			])('should accept $scenario', ({ connectorId, connectionId }) => {
				const cr = createConnectionReference({
					connectorId,
					connectionId
				});

				expect(cr.connectorId).toBe(connectorId);
				expect(cr.connectionId).toBe(connectionId);
			});

			it('should preserve exact date provided', () => {
				const specificDate = new Date('2024-06-15T14:30:45.123Z');
				const cr = createConnectionReference({ modifiedOn: specificDate });

				expect(cr.modifiedOn).toEqual(specificDate);
			});

			test.each<{ logicalName: string; displayName: string; connectorId: string; description: string }>([
				{
					logicalName: 'cr_sharepoint_main',
					displayName: 'SharePoint Main Site',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
					description: 'SharePoint connector'
				},
				{
					logicalName: 'cr_dataverse_primary',
					displayName: 'Dataverse Primary',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
					description: 'Dataverse connector'
				},
				{
					logicalName: 'cr_sql_database',
					displayName: 'SQL Database',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_sql',
					description: 'SQL connector'
				}
			])('should create with $description', ({ logicalName, displayName, connectorId }) => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: logicalName,
					displayName,
					connectorId
				});

				expect(cr.connectionReferenceLogicalName).toBe(logicalName);
				expect(cr.connectorId).toContain(connectorId.split('/').pop()!.replace('shared_', ''));
			});
		});

		describe('property immutability', () => {
			it('should have readonly properties', () => {
				const cr = createConnectionReference();

				// TypeScript enforces readonly at compile time
				// Runtime verification that properties exist and are accessible
				expect(cr.id).toBeDefined();
				expect(cr.connectionReferenceLogicalName).toBeDefined();
				expect(cr.displayName).toBeDefined();
			});
		});
	});

	describe('hasConnection', () => {
		describe('when connection ID exists', () => {
			test.each<{ connectionId: string; description: string }>([
				{ connectionId: 'connection-00000000-0000-0000-0000-000000000001', description: 'valid connection ID' },
				{ connectionId: 'custom-connection-id-123', description: 'non-GUID connection ID' },
				{ connectionId: 'x'.repeat(500), description: 'very long connection ID' },
				{ connectionId: 'connection-id-with-dashes-and_underscores', description: 'connection ID with special characters' }
			])('should return true for $description', ({ connectionId }) => {
				const cr = createConnectionReference({
					connectionId
				});

				expect(cr.hasConnection()).toBe(true);
			});

			it('should return true even if connector ID is null', () => {
				const cr = createConnectionReference({
					connectorId: null,
					connectionId: 'connection-exists'
				});

				expect(cr.hasConnection()).toBe(true);
			});
		});

		describe('when connection ID is null', () => {
			test.each<{ connectorId: string | null; isManaged: boolean; description: string }>([
				{ connectorId: 'connector-123', isManaged: false, description: 'null connection ID even if connector ID exists' },
				{ connectorId: null, isManaged: true, description: 'unconnected managed reference' },
				{ connectorId: null, isManaged: false, description: 'unconnected unmanaged reference' }
			])('should return false for $description', ({ connectorId, isManaged }) => {
				const cr = createConnectionReference({
					connectorId,
					connectionId: null,
					isManaged
				});

				expect(cr.hasConnection()).toBe(false);
			});
		});

		describe('business scenarios', () => {
			it('should identify connected SharePoint reference', () => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sharepoint',
					connectorId: 'sharepoint-connector',
					connectionId: 'sharepoint-connection-123'
				});

				expect(cr.hasConnection()).toBe(true);
			});

			it('should identify disconnected reference awaiting configuration', () => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_new_sql',
					displayName: 'New SQL Connection (Not Configured)',
					connectorId: 'sql-connector',
					connectionId: null
				});

				expect(cr.hasConnection()).toBe(false);
			});

			it('should verify connection exists before flow can use it', () => {
				const connectedCR = createConnectionReference({ connectionId: 'conn-123' });
				const disconnectedCR = createConnectionReference({ connectionId: null });

				// Flow can only use connected references
				expect(connectedCR.hasConnection()).toBe(true);
				expect(disconnectedCR.hasConnection()).toBe(false);
			});
		});
	});

	describe('isInSolution', () => {
		describe('when reference is in solution', () => {
			test.each<{ id: string; solutionComponents: Set<string>; description: string }>([
				{
					id: 'cr-id-123',
					solutionComponents: new Set(['cr-id-123', 'other-id-456']),
					description: 'ID is in solution set'
				},
				{
					id: 'cr-id-123',
					solutionComponents: new Set(['cr-id-123']),
					description: 'ID is only item in solution'
				},
				{
					id: 'target-cr',
					solutionComponents: new Set(['component-1', 'component-2', 'target-cr', 'component-3', 'component-4']),
					description: 'ID among many components'
				},
				{
					id: '12345678-1234-1234-1234-123456789012',
					solutionComponents: new Set(['12345678-1234-1234-1234-123456789012', 'other-component']),
					description: 'GUID format IDs'
				}
			])('should return true when $description', ({ id, solutionComponents }) => {
				const cr = createConnectionReference({
					id
				});

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});
		});

		describe('when reference is not in solution', () => {
			test.each<{ id: string; solutionComponents: Set<string>; description: string }>([
				{
					id: 'cr-id-123',
					solutionComponents: new Set(['other-id-456', 'another-id-789']),
					description: 'ID is not in solution set'
				},
				{
					id: 'cr-id-123',
					solutionComponents: new Set<string>(),
					description: 'empty solution set'
				},
				{
					id: 'cr-id-123',
					solutionComponents: new Set(['CR-ID-123', 'Cr-Id-123']),
					description: 'case-sensitive mismatch'
				},
				{
					id: 'cr-id-123',
					solutionComponents: new Set(['cr-id', 'id-123', 'cr-id-1234']),
					description: 'partial IDs'
				}
			])('should return false when $description', ({ id, solutionComponents }) => {
				const cr = createConnectionReference({
					id
				});

				expect(cr.isInSolution(solutionComponents)).toBe(false);
			});
		});

		describe('multiple solution checks', () => {
			it('should handle checking against multiple different solutions', () => {
				const cr = createConnectionReference({
					id: 'cr-shared'
				});
				const solution1 = new Set(['cr-shared', 'comp-1']);
				const solution2 = new Set(['comp-2', 'comp-3']);
				const solution3 = new Set(['cr-shared', 'comp-4', 'comp-5']);

				expect(cr.isInSolution(solution1)).toBe(true);
				expect(cr.isInSolution(solution2)).toBe(false);
				expect(cr.isInSolution(solution3)).toBe(true);
			});

			it('should handle large solution component sets', () => {
				const cr = createConnectionReference({
					id: 'target-cr'
				});
				const largeSet = new Set(
					Array.from({ length: 10000 }, (_, i) =>
						i === 5000 ? 'target-cr' : `component-${i}`
					)
				);

				expect(cr.isInSolution(largeSet)).toBe(true);
			});
		});

		describe('business scenarios', () => {
			test.each<{ isManaged: boolean; description: string }>([
				{ isManaged: true, description: 'managed solution membership' },
				{ isManaged: false, description: 'unmanaged solution membership' }
			])('should identify $description', ({ isManaged }) => {
				const cr = createConnectionReference({
					id: `${isManaged ? 'managed' : 'unmanaged'}-cr-123`,
					isManaged
				});
				const solutionComponents = new Set([`${isManaged ? 'managed' : 'unmanaged'}-cr-123`, 'other-component']);

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});

			it('should verify reference is in target solution for export', () => {
				const cr = createConnectionReference({
					id: 'cr-to-export',
					connectionReferenceLogicalName: 'cr_sharepoint_main'
				});
				const targetSolution = new Set(['cr-to-export', 'flow-1', 'flow-2']);
				const otherSolution = new Set(['different-cr', 'flow-3']);

				// Only export if in target solution
				expect(cr.isInSolution(targetSolution)).toBe(true);
				expect(cr.isInSolution(otherSolution)).toBe(false);
			});

			it('should check if connection reference belongs to Default solution', () => {
				const cr = createConnectionReference({
					id: 'default-solution-cr'
				});
				const defaultSolutionComponents = new Set([
					'default-solution-cr',
					'many-other-components'
				]);

				expect(cr.isInSolution(defaultSolutionComponents)).toBe(true);
			});
		});
	});

	describe('edge cases', () => {
		test.each<{ field: string; value: string; getLength: (cr: ConnectionReference) => number }>([
			{
				field: 'very long logical names',
				value: 'cr_' + 'x'.repeat(500),
				getLength: (cr) => cr.connectionReferenceLogicalName.length
			},
			{
				field: 'very long display names',
				value: 'Display Name ' + 'y'.repeat(1000),
				getLength: (cr) => cr.displayName.length
			}
		])('should handle $field', ({ field, value, getLength }) => {
			const cr = createConnectionReference(
				field.includes('logical') ? { connectionReferenceLogicalName: value } : { displayName: value }
			);

			expect(getLength(cr)).toBeGreaterThan(100);
		});

		it('should handle special characters in logical name', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_test-connection_ref.v2'
			});

			expect(cr.connectionReferenceLogicalName).toBe('cr_test-connection_ref.v2');
		});

		it('should handle Unicode characters in display name', () => {
			const cr = createConnectionReference({
				displayName: 'Connection 中文 référence ñoño'
			});

			expect(cr.displayName).toBe('Connection 中文 référence ñoño');
		});

		test.each<{ year: number; description: string }>([
			{ year: 1950, description: 'very old modification dates' },
			{ year: 2099, description: 'future modification dates' }
		])('should handle $description', ({ year }) => {
			const date = new Date(year === 1950 ? '1950-01-01T12:00:00.000Z' : '2099-12-31T23:59:59Z');
			const cr = createConnectionReference({
				modifiedOn: date
			});

			expect(cr.modifiedOn.getFullYear()).toBe(year);
		});

		test.each<{ displayName: string; description: string }>([
			{ displayName: '', description: 'empty string display name' },
			{ displayName: '   Spaced Out   ', description: 'whitespace in display name' }
		])('should handle $description', ({ displayName }) => {
			const cr = createConnectionReference({
				displayName
			});

			expect(cr.displayName).toBe(displayName);
		});
	});

	describe('common connector scenarios', () => {
		test.each<{
			logicalName: string;
			displayName: string;
			connectorId: string;
			isManaged: boolean;
			description: string;
		}>([
			{
				logicalName: 'cr_sharepoint_docs',
				displayName: 'SharePoint - Document Library',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
				isManaged: false,
				description: 'SharePoint connection reference'
			},
			{
				logicalName: 'cr_dataverse_env',
				displayName: 'Dataverse (current environment)',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
				isManaged: true,
				description: 'Dataverse connection reference'
			},
			{
				logicalName: 'cr_sql_customers',
				displayName: 'SQL - Customer Database',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_sql',
				isManaged: false,
				description: 'SQL Server connection reference'
			},
			{
				logicalName: 'cr_office365_outlook',
				displayName: 'Office 365 Outlook',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_office365',
				isManaged: false,
				description: 'Office 365 Outlook connection reference'
			}
		])('should represent $description', ({ logicalName, displayName, connectorId, isManaged }) => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: logicalName,
				displayName,
				connectorId,
				connectionId: isManaged ? 'some-connection-id' : 'another-connection-guid',
				isManaged
			});

			expect(cr.connectionReferenceLogicalName).toBe(logicalName);
			expect(cr.hasConnection()).toBe(true);
			if (isManaged !== undefined) {
				expect(cr.isManaged).toBe(isManaged);
			}
		});

		it('should represent unconfigured connection reference', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_new_api',
				displayName: 'New API Connection (Not Yet Configured)',
				connectorId: 'custom-api-connector',
				connectionId: null
			});

			expect(cr.hasConnection()).toBe(false);
		});
	});
});
