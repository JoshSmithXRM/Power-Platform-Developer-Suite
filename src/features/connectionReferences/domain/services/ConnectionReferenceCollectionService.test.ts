import { ConnectionReferenceCollectionService } from './ConnectionReferenceCollectionService';
import { ConnectionReference } from '../entities/ConnectionReference';

describe('ConnectionReferenceCollectionService', () => {
	let service: ConnectionReferenceCollectionService;

	beforeEach(() => {
		service = new ConnectionReferenceCollectionService();
	});

	// Test data factory
	function createConnectionReference(
		logicalName: string,
		overrides?: {
			id?: string;
			displayName?: string;
			connectorId?: string | null;
			connectionId?: string | null;
			isManaged?: boolean;
			modifiedOn?: Date;
		}
	): ConnectionReference {
		return new ConnectionReference(
			overrides?.id ?? `id-${logicalName}`,
			logicalName,
			overrides?.displayName ?? `Display ${logicalName}`,
			overrides?.connectorId ?? 'connector-00000000-0000-0000-0000-000000000000',
			overrides?.connectionId ?? 'connection-00000000-0000-0000-0000-000000000000',
			overrides?.isManaged ?? false,
			overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z')
		);
	}

	describe('sort', () => {
		describe('alphabetical sorting', () => {
			it('should sort connection references alphabetically by logical name', () => {
				const refs = [
					createConnectionReference('zulu_connection'),
					createConnectionReference('alpha_connection'),
					createConnectionReference('mike_connection')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha_connection');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('mike_connection');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('zulu_connection');
			});

			it('should sort references with numeric suffixes correctly', () => {
				const refs = [
					createConnectionReference('cr_ref_2'),
					createConnectionReference('cr_ref_10'),
					createConnectionReference('cr_ref_1')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_ref_1');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr_ref_10');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr_ref_2');
			});

			it('should handle case-insensitive sorting', () => {
				const refs = [
					createConnectionReference('Zebra'),
					createConnectionReference('apple'),
					createConnectionReference('BANANA')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('apple');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('BANANA');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('Zebra');
			});

			it('should sort references with underscore prefixes', () => {
				const refs = [
					createConnectionReference('_private_ref'),
					createConnectionReference('public_ref'),
					createConnectionReference('__double_private')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('__double_private');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('_private_ref');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('public_ref');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const refs = [
					createConnectionReference('charlie'),
					createConnectionReference('alpha'),
					createConnectionReference('bravo')
				];
				const originalOrder = refs.map((r) => r.connectionReferenceLogicalName);

				service.sort(refs);

				expect(refs.map((r) => r.connectionReferenceLogicalName)).toEqual(originalOrder);
				expect(refs[0]?.connectionReferenceLogicalName).toBe('charlie');
			});

			it('should return new array instance', () => {
				const refs = [
					createConnectionReference('alpha'),
					createConnectionReference('bravo')
				];

				const sorted = service.sort(refs);

				expect(sorted).not.toBe(refs);
			});

			it('should allow multiple sorts without affecting original', () => {
				const refs = [
					createConnectionReference('charlie'),
					createConnectionReference('alpha'),
					createConnectionReference('bravo')
				];

				const sorted1 = service.sort(refs);
				const sorted2 = service.sort(refs);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(refs[0]?.connectionReferenceLogicalName).toBe('charlie');
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const refs: ConnectionReference[] = [];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single reference', () => {
				const refs = [createConnectionReference('only_one')];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('only_one');
			});

			it('should handle two references', () => {
				const refs = [
					createConnectionReference('bravo'),
					createConnectionReference('alpha')
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('bravo');
			});

			it('should handle identical logical names', () => {
				const refs = [
					createConnectionReference('same_name', { id: 'id-1' }),
					createConnectionReference('same_name', { id: 'id-2' }),
					createConnectionReference('same_name', { id: 'id-3' })
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(3);
				expect(sorted.every((r) => r.connectionReferenceLogicalName === 'same_name')).toBe(true);
			});

			it('should handle references with same prefix', () => {
				const refs = [
					createConnectionReference('cr_sharepoint_c'),
					createConnectionReference('cr_sharepoint_a'),
					createConnectionReference('cr_sharepoint_b')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_sharepoint_a');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr_sharepoint_b');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr_sharepoint_c');
			});
		});

		describe('special characters', () => {
			it('should sort references with special characters', () => {
				const refs = [
					createConnectionReference('ref-dash'),
					createConnectionReference('ref_underscore'),
					createConnectionReference('ref.dot')
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(3);
				const names = sorted.map((r) => r?.connectionReferenceLogicalName);
				expect(names).toContain('ref-dash');
				expect(names).toContain('ref.dot');
				expect(names).toContain('ref_underscore');
			});

			it('should handle Unicode characters', () => {
				const refs = [
					createConnectionReference('ref_中文'),
					createConnectionReference('ref_abc'),
					createConnectionReference('ref_ñoño')
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(3);
			});

			it('should handle whitespace in names', () => {
				const refs = [
					createConnectionReference('ref with spaces'),
					createConnectionReference('ref_normal'),
					createConnectionReference('another ref')
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('large collections', () => {
			it('should handle sorting 100 references', () => {
				const refs = Array.from({ length: 100 }, (_, i) =>
					createConnectionReference(`cr_ref_${String(i).padStart(3, '0')}`)
				);

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(100);
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_ref_000');
				expect(sorted[99]?.connectionReferenceLogicalName).toBe('cr_ref_099');
			});

			it('should handle sorting 500 references', () => {
				const refs = Array.from({ length: 500 }, () =>
					createConnectionReference(`cr_ref_${Math.floor(Math.random() * 10000)}`)
				);

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(500);

				for (let i = 0; i < sorted.length - 1; i++) {
					const current = sorted[i];
					const next = sorted[i + 1];
					if (current && next) {
						expect(
							current.connectionReferenceLogicalName.localeCompare(
								next.connectionReferenceLogicalName
							)
						).toBeLessThanOrEqual(0);
					}
				}
			});
		});

		describe('different reference properties', () => {
			it('should sort managed and unmanaged references together', () => {
				const refs = [
					createConnectionReference('zulu', { isManaged: true }),
					createConnectionReference('alpha', { isManaged: false })
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('zulu');
			});

			it('should sort references with and without connections', () => {
				const refs = [
					createConnectionReference('zulu', { connectionId: null }),
					createConnectionReference('alpha', { connectionId: 'conn-123' })
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('zulu');
			});

			it('should sort references with and without connectors', () => {
				const refs = [
					createConnectionReference('zulu', { connectorId: null }),
					createConnectionReference('alpha', { connectorId: 'connector-123' })
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('zulu');
			});

			it('should sort references with different modification dates', () => {
				const refs = [
					createConnectionReference('zulu', {
						modifiedOn: new Date('2024-01-01')
					}),
					createConnectionReference('alpha', {
						modifiedOn: new Date('2024-12-31')
					})
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('zulu');
			});
		});

		describe('localeCompare behavior', () => {
			it('should use locale-aware comparison', () => {
				const refs = [
					createConnectionReference('cr_10'),
					createConnectionReference('cr_2'),
					createConnectionReference('cr_1'),
					createConnectionReference('cr_20')
				];

				const sorted = service.sort(refs);

				expect(sorted.map((r) => r.connectionReferenceLogicalName)).toEqual([
					'cr_1',
					'cr_10',
					'cr_2',
					'cr_20'
				]);
			});

			it('should handle accented characters', () => {
				const refs = [
					createConnectionReference('café'),
					createConnectionReference('cache'),
					createConnectionReference('caché')
				];

				const sorted = service.sort(refs);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('stability', () => {
			it('should maintain relative order for equal logical names', () => {
				const ref1 = createConnectionReference('same', { id: 'id-1' });
				const ref2 = createConnectionReference('same', { id: 'id-2' });
				const ref3 = createConnectionReference('same', { id: 'id-3' });
				const refs = [ref1, ref2, ref3];

				const sorted = service.sort(refs);

				expect(sorted[0]?.id).toBe('id-1');
				expect(sorted[1]?.id).toBe('id-2');
				expect(sorted[2]?.id).toBe('id-3');
			});
		});

		describe('realistic scenarios', () => {
			it('should sort typical Power Platform connection references', () => {
				const refs = [
					createConnectionReference('cr123_sharepoint_main'),
					createConnectionReference('cr123_dataverse_primary'),
					createConnectionReference('cr123_sql_connection'),
					createConnectionReference('cr123_azure_blob'),
					createConnectionReference('cr123_onedrive')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr123_azure_blob');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr123_dataverse_primary');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr123_onedrive');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('cr123_sharepoint_main');
				expect(sorted[4]?.connectionReferenceLogicalName).toBe('cr123_sql_connection');
			});

			it('should sort references with publisher prefixes', () => {
				const refs = [
					createConnectionReference('pub_connection_c'),
					createConnectionReference('pub_connection_a'),
					createConnectionReference('pub_connection_b'),
					createConnectionReference('cr_custom_ref')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_custom_ref');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('pub_connection_a');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('pub_connection_b');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('pub_connection_c');
			});

			it('should sort references with connector type indicators', () => {
				const refs = [
					createConnectionReference('sharepoint_site_documents'),
					createConnectionReference('dataverse_environment_prod'),
					createConnectionReference('sql_database_customers'),
					createConnectionReference('azure_storage_files')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('azure_storage_files');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('dataverse_environment_prod');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('sharepoint_site_documents');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('sql_database_customers');
			});

			it('should sort references with environment indicators', () => {
				const refs = [
					createConnectionReference('cr_sharepoint_prod'),
					createConnectionReference('cr_sharepoint_dev'),
					createConnectionReference('cr_sharepoint_test'),
					createConnectionReference('cr_sharepoint_uat')
				];

				const sorted = service.sort(refs);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_sharepoint_dev');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr_sharepoint_prod');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr_sharepoint_test');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('cr_sharepoint_uat');
			});
		});
	});
});
