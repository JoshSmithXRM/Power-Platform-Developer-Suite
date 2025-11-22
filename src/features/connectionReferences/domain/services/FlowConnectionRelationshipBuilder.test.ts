import { FlowConnectionRelationshipBuilder } from './FlowConnectionRelationshipBuilder';
import { CloudFlow } from '../entities/CloudFlow';
import { ConnectionReference } from '../entities/ConnectionReference';

describe('FlowConnectionRelationshipBuilder', () => {
	let builder: FlowConnectionRelationshipBuilder;

	beforeEach(() => {
		builder = new FlowConnectionRelationshipBuilder();
	});

	describe('buildRelationships', () => {
		describe('happy path - flow-to-cr relationships', () => {
			it('should create flow-to-cr relationship when flow references existing connection reference', () => {
				// Arrange
				const cr = createConnectionReference({
					id: 'cr-123',
					connectionReferenceLogicalName: 'cr_sharepoint'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_sharepoint']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});

			it('should create multiple relationships when flow references multiple connection references', () => {
				// Arrange
				const cr1 = createConnectionReference({
					id: 'cr-123',
					connectionReferenceLogicalName: 'cr_sharepoint'
				});
				const cr2 = createConnectionReference({
					id: 'cr-456',
					connectionReferenceLogicalName: 'cr_dataverse'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_sharepoint', 'cr_dataverse']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr1, cr2]);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.every(r => r.relationshipType === 'flow-to-cr')).toBe(true);
			});

			it('should create relationships for multiple flows', () => {
				// Arrange
				const cr = createConnectionReference({
					id: 'cr-123',
					connectionReferenceLogicalName: 'cr_sharepoint'
				});
				const flow1 = createCloudFlowWithConnectionReferences(['cr_sharepoint']);
				const flow2 = createCloudFlowWithConnectionReferences(['cr_sharepoint']);

				// Act
				const relationships = builder.buildRelationships([flow1, flow2], [cr]);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.every(r => r.relationshipType === 'flow-to-cr')).toBe(true);
			});

			it('should populate all flow properties in relationship', () => {
				// Arrange
				const flowId = 'flow-123';
				const flowName = 'Test Flow';
				const flowModifiedOn = new Date('2024-01-15');
				const flowIsManaged = true;
				const flow = createCloudFlowWithConnectionReferences(['cr_sharepoint'], {
					id: flowId,
					name: flowName,
					modifiedOn: flowModifiedOn,
					isManaged: flowIsManaged
				});
				const cr = createConnectionReference({ connectionReferenceLogicalName: 'cr_sharepoint' });

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				const relationship = relationships[0]!;
				expect(relationship.flowId).toBe(flowId);
				expect(relationship.flowName).toBe(flowName);
				expect(relationship.flowModifiedOn).toBe(flowModifiedOn);
				expect(relationship.flowIsManaged).toBe(flowIsManaged);
			});

			it('should populate all connection reference properties in relationship', () => {
				// Arrange
				const crId = 'cr-123';
				const crLogicalName = 'cr_sharepoint';
				const crDisplayName = 'SharePoint Connection';
				const crModifiedOn = new Date('2024-01-10');
				const crIsManaged = true;
				const cr = createConnectionReference({
					id: crId,
					connectionReferenceLogicalName: crLogicalName,
					displayName: crDisplayName,
					modifiedOn: crModifiedOn,
					isManaged: crIsManaged
				});
				const flow = createCloudFlowWithConnectionReferences([crLogicalName]);

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				const relationship = relationships[0]!;
				expect(relationship.connectionReferenceId).toBe(crId);
				expect(relationship.connectionReferenceLogicalName).toBe(crLogicalName);
				expect(relationship.connectionReferenceDisplayName).toBe(crDisplayName);
				expect(relationship.connectionReferenceModifiedOn).toBe(crModifiedOn);
				expect(relationship.connectionReferenceIsManaged).toBe(crIsManaged);
			});
		});

		describe('case-insensitive matching', () => {
			it('should match connection reference with lowercase logical name', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'CR_SharePoint' // uppercase
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_sharepoint']); // lowercase

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});

			it('should match connection reference with uppercase logical name', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sharepoint' // lowercase
				});
				const flow = createCloudFlowWithConnectionReferences(['CR_SHAREPOINT']); // uppercase

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});

			it('should match connection reference with mixed case logical name', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'Cr_SharePoint' // mixed case
				});
				const flow = createCloudFlowWithConnectionReferences(['cR_sHAREpOINT']); // different mixed case

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});
		});

		describe('orphaned flows', () => {
			it('should create orphaned-flow relationship when flow references non-existent connection reference', () => {
				// Arrange
				const flow = createCloudFlowWithConnectionReferences(['cr_missing']);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('orphaned-flow');
			});

			it('should set connection reference id to null for orphaned flow', () => {
				// Arrange
				const flow = createCloudFlowWithConnectionReferences(['cr_missing']);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships[0]!.connectionReferenceId).toBeNull();
			});

			it('should set connection reference display name to missing message for orphaned flow', () => {
				// Arrange
				const missingCrName = 'cr_missing';
				const flow = createCloudFlowWithConnectionReferences([missingCrName]);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships[0]!.connectionReferenceDisplayName).toBe(`(Missing: ${missingCrName})`);
			});

			it('should preserve connection reference logical name for orphaned flow', () => {
				// Arrange
				const missingCrName = 'cr_missing';
				const flow = createCloudFlowWithConnectionReferences([missingCrName]);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships[0]!.connectionReferenceLogicalName).toBe(missingCrName);
			});

			it('should set connection reference properties to null for orphaned flow', () => {
				// Arrange
				const flow = createCloudFlowWithConnectionReferences(['cr_missing']);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships[0]!.connectionReferenceIsManaged).toBeNull();
				expect(relationships[0]!.connectionReferenceModifiedOn).toBeNull();
			});

			it('should preserve flow properties for orphaned flow', () => {
				// Arrange
				const flowId = 'flow-123';
				const flowName = 'Test Flow';
				const flowModifiedOn = new Date('2024-01-15');
				const flowIsManaged = true;
				const flow = createCloudFlowWithConnectionReferences(['cr_missing'], {
					id: flowId,
					name: flowName,
					modifiedOn: flowModifiedOn,
					isManaged: flowIsManaged
				});

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				const relationship = relationships[0]!;
				expect(relationship.flowId).toBe(flowId);
				expect(relationship.flowName).toBe(flowName);
				expect(relationship.flowModifiedOn).toBe(flowModifiedOn);
				expect(relationship.flowIsManaged).toBe(flowIsManaged);
			});

			it('should create multiple orphaned-flow relationships when flow references multiple missing CRs', () => {
				// Arrange
				const flow = createCloudFlowWithConnectionReferences(['cr_missing1', 'cr_missing2']);

				// Act
				const relationships = builder.buildRelationships([flow], []);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.every(r => r.relationshipType === 'orphaned-flow')).toBe(true);
			});

			it('should create mixed relationships when flow references both existing and missing CRs', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_existing'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_existing', 'cr_missing']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.filter(r => r.relationshipType === 'flow-to-cr')).toHaveLength(1);
				expect(relationships.filter(r => r.relationshipType === 'orphaned-flow')).toHaveLength(1);
			});
		});

		describe('orphaned connection references', () => {
			it('should create orphaned-cr relationship when connection reference is not used by any flow', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('orphaned-cr');
			});

			it('should set flow id to null for orphaned connection reference', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([], [cr]);

				// Assert
				expect(relationships[0]!.flowId).toBeNull();
			});

			it('should set flow name to no flow message for orphaned connection reference', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([], [cr]);

				// Assert
				expect(relationships[0]!.flowName).toBe('(No flow uses this)');
			});

			it('should set flow properties to null for orphaned connection reference', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([], [cr]);

				// Assert
				expect(relationships[0]!.flowIsManaged).toBeNull();
				expect(relationships[0]!.flowModifiedOn).toBeNull();
			});

			it('should preserve connection reference properties for orphaned CR', () => {
				// Arrange
				const crId = 'cr-123';
				const crLogicalName = 'cr_unused';
				const crDisplayName = 'Unused CR';
				const crModifiedOn = new Date('2024-01-10');
				const crIsManaged = true;
				const cr = createConnectionReference({
					id: crId,
					connectionReferenceLogicalName: crLogicalName,
					displayName: crDisplayName,
					modifiedOn: crModifiedOn,
					isManaged: crIsManaged
				});

				// Act
				const relationships = builder.buildRelationships([], [cr]);

				// Assert
				const relationship = relationships[0]!;
				expect(relationship.connectionReferenceId).toBe(crId);
				expect(relationship.connectionReferenceLogicalName).toBe(crLogicalName);
				expect(relationship.connectionReferenceDisplayName).toBe(crDisplayName);
				expect(relationship.connectionReferenceModifiedOn).toBe(crModifiedOn);
				expect(relationship.connectionReferenceIsManaged).toBe(crIsManaged);
			});

			it('should create multiple orphaned-cr relationships for multiple unused CRs', () => {
				// Arrange
				const cr1 = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused1'
				});
				const cr2 = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused2'
				});

				// Act
				const relationships = builder.buildRelationships([], [cr1, cr2]);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.every(r => r.relationshipType === 'orphaned-cr')).toBe(true);
			});

			it('should not create orphaned-cr relationship when connection reference is used by flow', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_used'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_used']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});

			it('should create mixed relationships with used and unused connection references', () => {
				// Arrange
				const crUsed = createConnectionReference({
					connectionReferenceLogicalName: 'cr_used'
				});
				const crUnused = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_used']);

				// Act
				const relationships = builder.buildRelationships([flow], [crUsed, crUnused]);

				// Assert
				expect(relationships).toHaveLength(2);
				expect(relationships.filter(r => r.relationshipType === 'flow-to-cr')).toHaveLength(1);
				expect(relationships.filter(r => r.relationshipType === 'orphaned-cr')).toHaveLength(1);
			});

			it('should handle case-insensitive matching for orphaned CR detection', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'CR_Used' // uppercase
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_used']); // lowercase

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
			});
		});

		describe('edge cases', () => {
			it('should return empty array when both flows and connection references are empty', () => {
				// Arrange
				const flows: CloudFlow[] = [];
				const crs: ConnectionReference[] = [];

				// Act
				const relationships = builder.buildRelationships(flows, crs);

				// Assert
				expect(relationships).toEqual([]);
			});

			it('should return empty array when flows is empty and no orphaned CRs exist', () => {
				// Arrange
				const flows: CloudFlow[] = [];
				const crs: ConnectionReference[] = [];

				// Act
				const relationships = builder.buildRelationships(flows, crs);

				// Assert
				expect(relationships).toEqual([]);
			});

			it('should skip flows without connection references', () => {
				// Arrange
				const flowWithoutCrs = createCloudFlowWithConnectionReferences([]);
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([flowWithoutCrs], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('orphaned-cr');
			});

			it('should skip flows with null client data', () => {
				// Arrange
				const flow = createCloudFlow({ clientData: null });
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('orphaned-cr');
			});

			it('should skip flows with empty client data', () => {
				// Arrange
				const flow = createCloudFlow({ clientData: '' });
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				expect(relationships).toHaveLength(1);
				expect(relationships[0]!.relationshipType).toBe('orphaned-cr');
			});

			it('should handle duplicate connection reference logical names by using first match', () => {
				// Arrange
				const cr1 = createConnectionReference({
					id: 'cr-first',
					connectionReferenceLogicalName: 'cr_duplicate'
				});
				const cr2 = createConnectionReference({
					id: 'cr-second',
					connectionReferenceLogicalName: 'cr_duplicate'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_duplicate']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr1, cr2]);

				// Assert
				const flowToCrRelationships = relationships.filter(r => r.relationshipType === 'flow-to-cr');
				expect(flowToCrRelationships).toHaveLength(1);
				// Should match the last one in the map (Map overwrites duplicates with last value)
				expect(flowToCrRelationships[0]!.connectionReferenceId).toBe('cr-second');
			});

			it('should handle flow referencing same connection reference multiple times', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sharepoint'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_sharepoint', 'cr_sharepoint']);

				// Act
				const relationships = builder.buildRelationships([flow], [cr]);

				// Assert
				// Should create 2 relationships (one for each reference in the flow)
				expect(relationships).toHaveLength(2);
				expect(relationships.every(r => r.relationshipType === 'flow-to-cr')).toBe(true);
			});

			it('should handle complex scenario with all three relationship types', () => {
				// Arrange
				const crUsed = createConnectionReference({
					connectionReferenceLogicalName: 'cr_used'
				});
				const crUnused = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});
				const flowWithValidCr = createCloudFlowWithConnectionReferences(['cr_used']);
				const flowWithMissingCr = createCloudFlowWithConnectionReferences(['cr_missing']);

				// Act
				const relationships = builder.buildRelationships(
					[flowWithValidCr, flowWithMissingCr],
					[crUsed, crUnused]
				);

				// Assert
				expect(relationships).toHaveLength(3);
				expect(relationships.filter(r => r.relationshipType === 'flow-to-cr')).toHaveLength(1);
				expect(relationships.filter(r => r.relationshipType === 'orphaned-flow')).toHaveLength(1);
				expect(relationships.filter(r => r.relationshipType === 'orphaned-cr')).toHaveLength(1);
			});

			it('should handle large number of flows and connection references', () => {
				// Arrange
				const crs = Array.from({ length: 100 }, (_, i) =>
					createConnectionReference({
						id: `cr-${i}`,
						connectionReferenceLogicalName: `cr_${i}`
					})
				);
				const flows = Array.from({ length: 100 }, (_, i) =>
					createCloudFlowWithConnectionReferences([`cr_${i}`], { id: `flow-${i}` })
				);

				// Act
				const relationships = builder.buildRelationships(flows, crs);

				// Assert
				expect(relationships).toHaveLength(100);
				expect(relationships.every(r => r.relationshipType === 'flow-to-cr')).toBe(true);
			});
		});

		describe('relationship ordering', () => {
			it('should return flow relationships before orphaned CR relationships', () => {
				// Arrange
				const crUsed = createConnectionReference({
					connectionReferenceLogicalName: 'cr_used'
				});
				const crUnused = createConnectionReference({
					connectionReferenceLogicalName: 'cr_unused'
				});
				const flow = createCloudFlowWithConnectionReferences(['cr_used']);

				// Act
				const relationships = builder.buildRelationships([flow], [crUsed, crUnused]);

				// Assert
				expect(relationships[0]!.relationshipType).toBe('flow-to-cr');
				expect(relationships[1]!.relationshipType).toBe('orphaned-cr');
			});

			it('should preserve order of flows in flow relationships', () => {
				// Arrange
				const cr = createConnectionReference({
					connectionReferenceLogicalName: 'cr_sharepoint'
				});
				const flow1 = createCloudFlowWithConnectionReferences(['cr_sharepoint'], { id: 'flow-1' });
				const flow2 = createCloudFlowWithConnectionReferences(['cr_sharepoint'], { id: 'flow-2' });
				const flow3 = createCloudFlowWithConnectionReferences(['cr_sharepoint'], { id: 'flow-3' });

				// Act
				const relationships = builder.buildRelationships([flow1, flow2, flow3], [cr]);

				// Assert
				expect(relationships[0]!.flowId).toBe('flow-1');
				expect(relationships[1]!.flowId).toBe('flow-2');
				expect(relationships[2]!.flowId).toBe('flow-3');
			});
		});
	});
});

// Test Data Factories
function createConnectionReference(overrides: Partial<{
	id: string;
	connectionReferenceLogicalName: string;
	displayName: string;
	connectorId: string | null;
	connectionId: string | null;
	isManaged: boolean;
	modifiedOn: Date;
}> = {}): ConnectionReference {
	return new ConnectionReference(
		overrides.id ?? 'cr-guid-default',
		overrides.connectionReferenceLogicalName ?? 'cr_default',
		overrides.displayName ?? 'Default CR',
		overrides.connectorId ?? 'connector-default',
		overrides.connectionId ?? 'connection-default',
		overrides.isManaged ?? false,
		overrides.modifiedOn ?? new Date('2024-01-01')
	);
}

function createCloudFlow(overrides: Partial<{
	id: string;
	name: string;
	modifiedOn: Date;
	isManaged: boolean;
	createdBy: string;
	clientData: string | null;
}> = {}): CloudFlow {
	return new CloudFlow(
		overrides.id ?? 'flow-guid-default',
		overrides.name ?? 'Default Flow',
		overrides.modifiedOn ?? new Date('2024-01-01'),
		overrides.isManaged ?? false,
		overrides.createdBy ?? 'user@example.com',
		overrides.clientData ?? '{"properties":{}}'
	);
}

function createCloudFlowWithConnectionReferences(
	connectionReferenceNames: string[],
	flowOverrides: Partial<{
		id: string;
		name: string;
		modifiedOn: Date;
		isManaged: boolean;
		createdBy: string;
	}> = {}
): CloudFlow {
	const connectionReferences: Record<string, unknown> = {};

	connectionReferenceNames.forEach((name, index) => {
		connectionReferences[`ref_${index}`] = {
			connection: {
				connectionReferenceLogicalName: name
			}
		};
	});

	const clientData = JSON.stringify({
		properties: {
			connectionReferences
		}
	});

	return new CloudFlow(
		flowOverrides.id ?? 'flow-guid-default',
		flowOverrides.name ?? 'Default Flow',
		flowOverrides.modifiedOn ?? new Date('2024-01-01'),
		flowOverrides.isManaged ?? false,
		flowOverrides.createdBy ?? 'user@example.com',
		clientData
	);
}
