import { createTestConnectionReference } from '../../../../shared/testing';

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

			it('should create managed connection reference', () => {
				const cr = createConnectionReference({ isManaged: true });

				expect(cr.isManaged).toBe(true);
			});

			it('should create unmanaged connection reference', () => {
				const cr = createConnectionReference({ isManaged: false });

				expect(cr.isManaged).toBe(false);
			});

			it('should accept null connector ID', () => {
				const cr = createConnectionReference({ connectorId: null });

				expect(cr.connectorId).toBeNull();
			});

			it('should accept null connection ID', () => {
				const cr = createConnectionReference({ connectionId: null });

				expect(cr.connectionId).toBeNull();
			});

			it('should accept both null connector and connection IDs', () => {
				const cr = createConnectionReference({
					connectorId: null,
					connectionId: null
				});

				expect(cr.connectorId).toBeNull();
				expect(cr.connectionId).toBeNull();
			});

			it('should preserve exact date provided', () => {
				const specificDate = new Date('2024-06-15T14:30:45.123Z');
				const cr = createConnectionReference({ modifiedOn: specificDate });

				expect(cr.modifiedOn).toEqual(specificDate);
			});

			it('should create with SharePoint connector', () => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sharepoint_main',
					displayName: 'SharePoint Main Site',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'
				});

				expect(cr.connectionReferenceLogicalName).toBe('cr_sharepoint_main');
				expect(cr.connectorId).toContain('sharepointonline');
			});

			it('should create with Dataverse connector', () => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_dataverse_primary',
					displayName: 'Dataverse Primary',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
				});

				expect(cr.connectionReferenceLogicalName).toBe('cr_dataverse_primary');
				expect(cr.connectorId).toContain('commondataserviceforapps');
			});

			it('should create with SQL connector', () => {
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sql_database',
					displayName: 'SQL Database',
					connectorId: '/providers/Microsoft.PowerApps/apis/shared_sql'
				});

				expect(cr.connectionReferenceLogicalName).toBe('cr_sql_database');
				expect(cr.connectorId).toContain('sql');
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
			it('should return true for valid connection ID', () => {
				const cr = createConnectionReference({
					connectionId: 'connection-00000000-0000-0000-0000-000000000001'
				});

				expect(cr.hasConnection()).toBe(true);
			});

			it('should return true for non-GUID connection ID', () => {
				const cr = createConnectionReference({
					connectionId: 'custom-connection-id-123'
				});

				expect(cr.hasConnection()).toBe(true);
			});

			it('should return true for very long connection ID', () => {
				const cr = createConnectionReference({
					connectionId: 'x'.repeat(500)
				});

				expect(cr.hasConnection()).toBe(true);
			});

			it('should return true for connection ID with special characters', () => {
				const cr = createConnectionReference({
					connectionId: 'connection-id-with-dashes-and_underscores'
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
			it('should return false for null connection ID', () => {
				const cr = createConnectionReference({
					connectionId: null
				});

				expect(cr.hasConnection()).toBe(false);
			});

			it('should return false even if connector ID exists', () => {
				const cr = createConnectionReference({
					connectorId: 'connector-exists',
					connectionId: null
				});

				expect(cr.hasConnection()).toBe(false);
			});

			it('should return false for unconnected managed reference', () => {
				const cr = createConnectionReference({
					isManaged: true,
					connectionId: null
				});

				expect(cr.hasConnection()).toBe(false);
			});

			it('should return false for unconnected unmanaged reference', () => {
				const cr = createConnectionReference({
					isManaged: false,
					connectionId: null
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
			it('should return true when ID is in solution set', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set(['cr-id-123', 'other-id-456']);

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});

			it('should return true when ID is only item in solution', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set(['cr-id-123']);

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});

			it('should return true among many components', () => {
				const cr = createConnectionReference({
					id: 'target-cr'
				});
				const solutionComponents = new Set([
					'component-1',
					'component-2',
					'target-cr',
					'component-3',
					'component-4'
				]);

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});

			it('should handle GUID format IDs', () => {
				const cr = createConnectionReference({
					id: '12345678-1234-1234-1234-123456789012'
				});
				const solutionComponents = new Set([
					'12345678-1234-1234-1234-123456789012',
					'other-component'
				]);

				expect(cr.isInSolution(solutionComponents)).toBe(true);
			});
		});

		describe('when reference is not in solution', () => {
			it('should return false when ID is not in solution set', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set(['other-id-456', 'another-id-789']);

				expect(cr.isInSolution(solutionComponents)).toBe(false);
			});

			it('should return false for empty solution set', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set<string>();

				expect(cr.isInSolution(solutionComponents)).toBe(false);
			});

			it('should be case-sensitive', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set(['CR-ID-123', 'Cr-Id-123']);

				// Case-sensitive comparison (Set.has is case-sensitive)
				expect(cr.isInSolution(solutionComponents)).toBe(false);
			});

			it('should not match partial IDs', () => {
				const cr = createConnectionReference({
					id: 'cr-id-123'
				});
				const solutionComponents = new Set(['cr-id', 'id-123', 'cr-id-1234']);

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
			it('should identify managed solution membership', () => {
				const managedCR = createConnectionReference({
					id: 'managed-cr-123',
					isManaged: true
				});
				const managedSolution = new Set(['managed-cr-123', 'other-managed']);

				expect(managedCR.isInSolution(managedSolution)).toBe(true);
			});

			it('should identify unmanaged solution membership', () => {
				const unmanagedCR = createConnectionReference({
					id: 'unmanaged-cr-456',
					isManaged: false
				});
				const unmanagedSolution = new Set(['unmanaged-cr-456', 'other-unmanaged']);

				expect(unmanagedCR.isInSolution(unmanagedSolution)).toBe(true);
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
		it('should handle very long logical names', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_' + 'x'.repeat(500)
			});

			expect(cr.connectionReferenceLogicalName).toHaveLength(503);
		});

		it('should handle very long display names', () => {
			const cr = createConnectionReference({
				displayName: 'Display Name ' + 'y'.repeat(1000)
			});

			expect(cr.displayName.length).toBeGreaterThan(1000);
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

		it('should handle very old modification dates', () => {
			const cr = createConnectionReference({
				modifiedOn: new Date('1950-01-01T12:00:00.000Z')
			});

			expect(cr.modifiedOn.getFullYear()).toBe(1950);
		});

		it('should handle future modification dates', () => {
			const cr = createConnectionReference({
				modifiedOn: new Date('2099-12-31T23:59:59Z')
			});

			expect(cr.modifiedOn.getFullYear()).toBe(2099);
		});

		it('should handle empty string display name', () => {
			const cr = createConnectionReference({
				displayName: ''
			});

			expect(cr.displayName).toBe('');
		});

		it('should handle whitespace in display name', () => {
			const cr = createConnectionReference({
				displayName: '   Spaced Out   '
			});

			expect(cr.displayName).toBe('   Spaced Out   ');
		});
	});

	describe('common connector scenarios', () => {
		it('should represent SharePoint connection reference', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_sharepoint_docs',
				displayName: 'SharePoint - Document Library',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
				isManaged: false
			});

			expect(cr.connectionReferenceLogicalName).toBe('cr_sharepoint_docs');
			expect(cr.hasConnection()).toBe(true);
		});

		it('should represent Dataverse connection reference', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_dataverse_env',
				displayName: 'Dataverse (current environment)',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
				isManaged: true
			});

			expect(cr.isManaged).toBe(true);
			expect(cr.hasConnection()).toBe(true);
		});

		it('should represent SQL Server connection reference', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_sql_customers',
				displayName: 'SQL - Customer Database',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_sql',
				connectionId: 'sql-connection-guid'
			});

			expect(cr.hasConnection()).toBe(true);
		});

		it('should represent Office 365 Outlook connection reference', () => {
			const cr = createConnectionReference({
				connectionReferenceLogicalName: 'cr_office365_outlook',
				displayName: 'Office 365 Outlook',
				connectorId: '/providers/Microsoft.PowerApps/apis/shared_office365',
				connectionId: 'outlook-connection-guid'
			});

			expect(cr.hasConnection()).toBe(true);
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
