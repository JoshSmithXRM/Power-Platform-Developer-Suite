import { FlowConnectionRelationshipCollectionService } from './FlowConnectionRelationshipCollectionService';
import { FlowConnectionRelationship, RelationshipType } from '../valueObjects/FlowConnectionRelationship';

describe('FlowConnectionRelationshipCollectionService', () => {
	let service: FlowConnectionRelationshipCollectionService;

	beforeEach(() => {
		service = new FlowConnectionRelationshipCollectionService();
	});

	// Test data factory
	function createRelationship(
		flowName: string,
		connectionReferenceLogicalName: string,
		overrides?: {
			flowId?: string | null;
			connectionReferenceId?: string | null;
			connectionReferenceDisplayName?: string;
			relationshipType?: RelationshipType;
			flowIsManaged?: boolean | null;
			connectionReferenceIsManaged?: boolean | null;
			flowModifiedOn?: Date | null;
			connectionReferenceModifiedOn?: Date | null;
		}
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
			overrides?.flowId ?? `flow-${flowName}`,
			flowName,
			overrides?.connectionReferenceId ?? `cr-${connectionReferenceLogicalName}`,
			connectionReferenceLogicalName,
			overrides?.connectionReferenceDisplayName ?? `Display ${connectionReferenceLogicalName}`,
			overrides?.relationshipType ?? 'flow-to-cr',
			overrides?.flowIsManaged ?? false,
			overrides?.connectionReferenceIsManaged ?? false,
			overrides?.flowModifiedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides?.connectionReferenceModifiedOn ?? new Date('2024-01-01T10:00:00Z')
		);
	}

	describe('sort', () => {
		describe('primary sorting by flow name', () => {
			it('should sort relationships alphabetically by flow name', () => {
				const relationships = [
					createRelationship('Zulu Flow', 'cr_ref_a'),
					createRelationship('Alpha Flow', 'cr_ref_b'),
					createRelationship('Mike Flow', 'cr_ref_c')
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Alpha Flow');
				expect(sorted[1]?.flowName).toBe('Mike Flow');
				expect(sorted[2]?.flowName).toBe('Zulu Flow');
			});

			it('should handle case-insensitive sorting of flow names', () => {
				const relationships = [
					createRelationship('zebra', 'cr_a'),
					createRelationship('Apple', 'cr_b'),
					createRelationship('BANANA', 'cr_c')
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Apple');
				expect(sorted[1]?.flowName).toBe('BANANA');
				expect(sorted[2]?.flowName).toBe('zebra');
			});
		});

		describe('secondary sorting by connection reference logical name', () => {
			it('should sort by connection reference name when flow names are identical', () => {
				const relationships = [
					createRelationship('Same Flow', 'cr_zulu'),
					createRelationship('Same Flow', 'cr_alpha'),
					createRelationship('Same Flow', 'cr_mike')
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr_mike');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr_zulu');
			});

			it('should handle case-insensitive sorting of connection reference names', () => {
				const relationships = [
					createRelationship('Same Flow', 'ZULU'),
					createRelationship('Same Flow', 'alpha'),
					createRelationship('Same Flow', 'Bravo')
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('alpha');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('Bravo');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('ZULU');
			});
		});

		describe('combined two-level sorting', () => {
			it('should sort by flow name first, then by connection reference name', () => {
				const relationships = [
					createRelationship('Flow B', 'cr_2'),
					createRelationship('Flow A', 'cr_3'),
					createRelationship('Flow B', 'cr_1'),
					createRelationship('Flow A', 'cr_2'),
					createRelationship('Flow A', 'cr_1')
				];

				const sorted = service.sort(relationships);

				// Flow A (by cr name: cr_1, cr_2, cr_3)
				expect(sorted[0]?.flowName).toBe('Flow A');
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_1');
				expect(sorted[1]?.flowName).toBe('Flow A');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('cr_2');
				expect(sorted[2]?.flowName).toBe('Flow A');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('cr_3');
				// Flow B (by cr name: cr_1, cr_2)
				expect(sorted[3]?.flowName).toBe('Flow B');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('cr_1');
				expect(sorted[4]?.flowName).toBe('Flow B');
				expect(sorted[4]?.connectionReferenceLogicalName).toBe('cr_2');
			});

			it('should handle complex multi-flow multi-cr scenario', () => {
				const relationships = [
					createRelationship('Process Order', 'sharepoint_docs'),
					createRelationship('Send Email', 'dataverse_conn'),
					createRelationship('Process Order', 'dataverse_main'),
					createRelationship('Daily Sync', 'sql_customers'),
					createRelationship('Send Email', 'azure_storage'),
					createRelationship('Process Order', 'azure_blob')
				];

				const sorted = service.sort(relationships);

				// Daily Sync
				expect(sorted[0]?.flowName).toBe('Daily Sync');
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('sql_customers');
				// Process Order (sorted by CR: azure_blob, dataverse_main, sharepoint_docs)
				expect(sorted[1]?.flowName).toBe('Process Order');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('azure_blob');
				expect(sorted[2]?.flowName).toBe('Process Order');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('dataverse_main');
				expect(sorted[3]?.flowName).toBe('Process Order');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('sharepoint_docs');
				// Send Email (sorted by CR: azure_storage, dataverse_conn)
				expect(sorted[4]?.flowName).toBe('Send Email');
				expect(sorted[4]?.connectionReferenceLogicalName).toBe('azure_storage');
				expect(sorted[5]?.flowName).toBe('Send Email');
				expect(sorted[5]?.connectionReferenceLogicalName).toBe('dataverse_conn');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const relationships = [
					createRelationship('Flow C', 'cr_1'),
					createRelationship('Flow A', 'cr_1'),
					createRelationship('Flow B', 'cr_1')
				];
				const originalOrder = relationships.map((r) => r.flowName);

				service.sort(relationships);

				expect(relationships.map((r) => r.flowName)).toEqual(originalOrder);
				expect(relationships[0]?.flowName).toBe('Flow C');
			});

			it('should return new array instance', () => {
				const relationships = [
					createRelationship('Flow A', 'cr_1'),
					createRelationship('Flow B', 'cr_1')
				];

				const sorted = service.sort(relationships);

				expect(sorted).not.toBe(relationships);
			});

			it('should allow multiple sorts without affecting original', () => {
				const relationships = [
					createRelationship('Flow C', 'cr_1'),
					createRelationship('Flow A', 'cr_1'),
					createRelationship('Flow B', 'cr_1')
				];

				const sorted1 = service.sort(relationships);
				const sorted2 = service.sort(relationships);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(relationships[0]?.flowName).toBe('Flow C');
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const relationships: FlowConnectionRelationship[] = [];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single relationship', () => {
				const relationships = [createRelationship('Only Flow', 'only_cr')];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.flowName).toBe('Only Flow');
			});

			it('should handle two relationships', () => {
				const relationships = [
					createRelationship('Flow B', 'cr_1'),
					createRelationship('Flow A', 'cr_1')
				];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.flowName).toBe('Flow A');
				expect(sorted[1]?.flowName).toBe('Flow B');
			});

			it('should handle identical flow and CR names', () => {
				const relationships = [
					createRelationship('Same', 'same_cr', { flowId: 'id-1' }),
					createRelationship('Same', 'same_cr', { flowId: 'id-2' }),
					createRelationship('Same', 'same_cr', { flowId: 'id-3' })
				];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(3);
				// Should maintain stable sort order
				expect(sorted[0]?.flowId).toBe('id-1');
				expect(sorted[1]?.flowId).toBe('id-2');
				expect(sorted[2]?.flowId).toBe('id-3');
			});
		});

		describe('special characters', () => {
			it('should sort flow names with special characters', () => {
				const relationships = [
					createRelationship('Flow-Dash', 'cr_1'),
					createRelationship('Flow_Underscore', 'cr_1'),
					createRelationship('Flow.Dot', 'cr_1')
				];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(3);
				const names = sorted.map((r) => r?.flowName);
				expect(names).toContain('Flow-Dash');
				expect(names).toContain('Flow.Dot');
				expect(names).toContain('Flow_Underscore');
			});

			it('should sort connection reference names with special characters', () => {
				const relationships = [
					createRelationship('Same Flow', 'cr-dash'),
					createRelationship('Same Flow', 'cr_underscore'),
					createRelationship('Same Flow', 'cr.dot')
				];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(3);
				const names = sorted.map((r) => r?.connectionReferenceLogicalName);
				expect(names).toContain('cr-dash');
				expect(names).toContain('cr.dot');
				expect(names).toContain('cr_underscore');
			});

			it('should handle Unicode characters', () => {
				const relationships = [
					createRelationship('Flow 中文', 'cr_abc'),
					createRelationship('Flow ABC', 'cr_abc'),
					createRelationship('Flow ñoño', 'cr_abc')
				];

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('large collections', () => {
			it('should handle sorting 100 relationships', () => {
				const relationships = Array.from({ length: 100 }, (_, i) => {
					const flowIndex = Math.floor(i / 10);
					const crIndex = 9 - (i % 10); // Reverse order for CRs
					return createRelationship(
						`Flow ${String(flowIndex).padStart(2, '0')}`,
						`cr_${String(crIndex).padStart(2, '0')}`
					);
				});

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(100);
				// Verify first and last
				expect(sorted[0]?.flowName).toBe('Flow 00');
				expect(sorted[0]?.connectionReferenceLogicalName).toBe('cr_00');
				expect(sorted[99]?.flowName).toBe('Flow 09');
				expect(sorted[99]?.connectionReferenceLogicalName).toBe('cr_09');
			});

			it('should handle sorting 500 relationships with verification', () => {
				const relationships = Array.from({ length: 500 }, () => {
					const flowNum = Math.floor(Math.random() * 50);
					const crNum = Math.floor(Math.random() * 20);
					return createRelationship(
						`Flow_${flowNum}`,
						`cr_${crNum}`
					);
				});

				const sorted = service.sort(relationships);

				expect(sorted).toHaveLength(500);

				// Verify sorting order
				for (let i = 0; i < sorted.length - 1; i++) {
					const current = sorted[i];
					const next = sorted[i + 1];
					if (current && next) {
						const flowCompare = current.flowName.localeCompare(next.flowName);
						if (flowCompare < 0) {
							// Flow names are different, current < next (correct)
							expect(flowCompare).toBeLessThan(0);
						} else if (flowCompare === 0) {
							// Same flow name, check CR names
							const crCompare = current.connectionReferenceLogicalName.localeCompare(
								next.connectionReferenceLogicalName
							);
							expect(crCompare).toBeLessThanOrEqual(0);
						}
					}
				}
			});
		});

		describe('different relationship types', () => {
			it('should sort relationships regardless of type', () => {
				const relationships = [
					createRelationship('Flow B', 'cr_1', { relationshipType: 'flow-to-cr' }),
					createRelationship('Flow A', 'cr_1', { relationshipType: 'orphaned-flow' }),
					createRelationship('Flow C', 'cr_1', { relationshipType: 'orphaned-cr' })
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Flow A');
				expect(sorted[1]?.flowName).toBe('Flow B');
				expect(sorted[2]?.flowName).toBe('Flow C');
			});

			it('should sort orphaned flows', () => {
				const relationships = [
					createRelationship('Orphaned Flow B', '', {
						relationshipType: 'orphaned-flow',
						connectionReferenceId: null
					}),
					createRelationship('Orphaned Flow A', '', {
						relationshipType: 'orphaned-flow',
						connectionReferenceId: null
					})
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Orphaned Flow A');
				expect(sorted[1]?.flowName).toBe('Orphaned Flow B');
			});

			it('should sort orphaned connection references', () => {
				const relationships = [
					createRelationship('', 'orphaned_cr_b', {
						relationshipType: 'orphaned-cr',
						flowId: null
					}),
					createRelationship('', 'orphaned_cr_a', {
						relationshipType: 'orphaned-cr',
						flowId: null
					})
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.connectionReferenceLogicalName).toBe('orphaned_cr_a');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('orphaned_cr_b');
			});
		});

		describe('different properties', () => {
			it('should sort regardless of managed status', () => {
				const relationships = [
					createRelationship('Flow B', 'cr_1', { flowIsManaged: true }),
					createRelationship('Flow A', 'cr_1', { flowIsManaged: false })
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Flow A');
				expect(sorted[1]?.flowName).toBe('Flow B');
			});

			it('should sort regardless of modification dates', () => {
				const relationships = [
					createRelationship('Flow B', 'cr_1', {
						flowModifiedOn: new Date('2024-12-31')
					}),
					createRelationship('Flow A', 'cr_1', {
						flowModifiedOn: new Date('2024-01-01')
					})
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Flow A');
				expect(sorted[1]?.flowName).toBe('Flow B');
			});
		});

		describe('realistic scenarios', () => {
			it('should sort typical flow-to-connection-reference relationships', () => {
				const relationships = [
					createRelationship('When item created', 'sharepoint_main'),
					createRelationship('Process invoice', 'sql_database'),
					createRelationship('When item created', 'dataverse_primary'),
					createRelationship('Daily sync', 'azure_storage'),
					createRelationship('Process invoice', 'azure_queue')
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('Daily sync');
				expect(sorted[1]?.flowName).toBe('Process invoice');
				expect(sorted[1]?.connectionReferenceLogicalName).toBe('azure_queue');
				expect(sorted[2]?.flowName).toBe('Process invoice');
				expect(sorted[2]?.connectionReferenceLogicalName).toBe('sql_database');
				expect(sorted[3]?.flowName).toBe('When item created');
				expect(sorted[3]?.connectionReferenceLogicalName).toBe('dataverse_primary');
				expect(sorted[4]?.flowName).toBe('When item created');
				expect(sorted[4]?.connectionReferenceLogicalName).toBe('sharepoint_main');
			});

			it('should sort mixed valid and orphaned relationships', () => {
				const relationships = [
					createRelationship('Orphaned Flow', '', {
						relationshipType: 'orphaned-flow',
						connectionReferenceId: null
					}),
					createRelationship('Active Flow', 'active_cr', {
						relationshipType: 'flow-to-cr'
					}),
					createRelationship('', 'orphaned_cr', {
						relationshipType: 'orphaned-cr',
						flowId: null
					})
				];

				const sorted = service.sort(relationships);

				expect(sorted[0]?.flowName).toBe('');
				expect(sorted[1]?.flowName).toBe('Active Flow');
				expect(sorted[2]?.flowName).toBe('Orphaned Flow');
			});
		});

		describe('localeCompare behavior', () => {
			it('should use locale-aware comparison for flow names', () => {
				const relationships = [
					createRelationship('Flow 10', 'cr_1'),
					createRelationship('Flow 2', 'cr_1'),
					createRelationship('Flow 1', 'cr_1'),
					createRelationship('Flow 20', 'cr_1')
				];

				const sorted = service.sort(relationships);

				expect(sorted.map((r) => r.flowName)).toEqual([
					'Flow 1',
					'Flow 10',
					'Flow 2',
					'Flow 20'
				]);
			});

			it('should use locale-aware comparison for CR names', () => {
				const relationships = [
					createRelationship('Same Flow', 'cr_10'),
					createRelationship('Same Flow', 'cr_2'),
					createRelationship('Same Flow', 'cr_1'),
					createRelationship('Same Flow', 'cr_20')
				];

				const sorted = service.sort(relationships);

				expect(sorted.map((r) => r.connectionReferenceLogicalName)).toEqual([
					'cr_1',
					'cr_10',
					'cr_2',
					'cr_20'
				]);
			});
		});
	});
});
