import { FlowConnectionRelationship, RelationshipType } from './FlowConnectionRelationship';

describe('FlowConnectionRelationship', () => {
	describe('constructor', () => {
		it('should create flow-to-cr relationship with all properties', () => {
			// Arrange
			const flowId = 'flow-123';
			const flowName = 'My Flow';
			const connectionReferenceId = 'cr-456';
			const connectionReferenceLogicalName = 'cr_sharepoint';
			const connectionReferenceDisplayName = 'SharePoint Connection';
			const relationshipType: RelationshipType = 'flow-to-cr';
			const flowIsManaged = true;
			const connectionReferenceIsManaged = false;
			const flowModifiedOn = new Date('2024-01-15');
			const connectionReferenceModifiedOn = new Date('2024-01-10');

			// Act
			const relationship = new FlowConnectionRelationship(
				flowId,
				flowName,
				connectionReferenceId,
				connectionReferenceLogicalName,
				connectionReferenceDisplayName,
				relationshipType,
				flowIsManaged,
				connectionReferenceIsManaged,
				flowModifiedOn,
				connectionReferenceModifiedOn
			);

			// Assert
			expect(relationship.flowId).toBe(flowId);
			expect(relationship.flowName).toBe(flowName);
			expect(relationship.connectionReferenceId).toBe(connectionReferenceId);
			expect(relationship.connectionReferenceLogicalName).toBe(connectionReferenceLogicalName);
			expect(relationship.connectionReferenceDisplayName).toBe(connectionReferenceDisplayName);
			expect(relationship.relationshipType).toBe(relationshipType);
			expect(relationship.flowIsManaged).toBe(flowIsManaged);
			expect(relationship.connectionReferenceIsManaged).toBe(connectionReferenceIsManaged);
			expect(relationship.flowModifiedOn).toBe(flowModifiedOn);
			expect(relationship.connectionReferenceModifiedOn).toBe(connectionReferenceModifiedOn);
		});

		it('should create orphaned-flow relationship with null connection reference values', () => {
			// Arrange
			const relationshipType: RelationshipType = 'orphaned-flow';
			const connectionReferenceId = null;
			const connectionReferenceIsManaged = null;
			const connectionReferenceModifiedOn = null;

			// Act
			const relationship = createRelationship({
				relationshipType,
				connectionReferenceId,
				connectionReferenceIsManaged,
				connectionReferenceModifiedOn
			});

			// Assert
			expect(relationship.connectionReferenceId).toBeNull();
			expect(relationship.connectionReferenceIsManaged).toBeNull();
			expect(relationship.connectionReferenceModifiedOn).toBeNull();
		});

		it('should create orphaned-cr relationship with null flow values', () => {
			// Arrange
			const relationshipType: RelationshipType = 'orphaned-cr';
			const flowId = null;
			const flowIsManaged = null;
			const flowModifiedOn = null;

			// Act
			const relationship = createRelationship({
				relationshipType,
				flowId,
				flowIsManaged,
				flowModifiedOn
			});

			// Assert
			expect(relationship.flowId).toBeNull();
			expect(relationship.flowIsManaged).toBeNull();
			expect(relationship.flowModifiedOn).toBeNull();
		});
	});

	describe('isValidRelationship', () => {
		it('should return true for flow-to-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'flow-to-cr' });

			// Act
			const result = relationship.isValidRelationship();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for orphaned-flow relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-flow' });

			// Act
			const result = relationship.isValidRelationship();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for orphaned-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-cr' });

			// Act
			const result = relationship.isValidRelationship();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isOrphanedFlow', () => {
		it('should return true for orphaned-flow relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-flow' });

			// Act
			const result = relationship.isOrphanedFlow();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for flow-to-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'flow-to-cr' });

			// Act
			const result = relationship.isOrphanedFlow();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for orphaned-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-cr' });

			// Act
			const result = relationship.isOrphanedFlow();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isOrphanedConnectionReference', () => {
		it('should return true for orphaned-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-cr' });

			// Act
			const result = relationship.isOrphanedConnectionReference();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for flow-to-cr relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'flow-to-cr' });

			// Act
			const result = relationship.isOrphanedConnectionReference();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for orphaned-flow relationship type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-flow' });

			// Act
			const result = relationship.isOrphanedConnectionReference();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('relationship type scenarios', () => {
		it('should have exactly one method return true for flow-to-cr type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'flow-to-cr' });

			// Act & Assert
			expect(relationship.isValidRelationship()).toBe(true);
			expect(relationship.isOrphanedFlow()).toBe(false);
			expect(relationship.isOrphanedConnectionReference()).toBe(false);
		});

		it('should have exactly one method return true for orphaned-flow type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-flow' });

			// Act & Assert
			expect(relationship.isValidRelationship()).toBe(false);
			expect(relationship.isOrphanedFlow()).toBe(true);
			expect(relationship.isOrphanedConnectionReference()).toBe(false);
		});

		it('should have exactly one method return true for orphaned-cr type', () => {
			// Arrange
			const relationship = createRelationship({ relationshipType: 'orphaned-cr' });

			// Act & Assert
			expect(relationship.isValidRelationship()).toBe(false);
			expect(relationship.isOrphanedFlow()).toBe(false);
			expect(relationship.isOrphanedConnectionReference()).toBe(true);
		});
	});
});

// Test Data Factory
function createRelationship(overrides: Partial<{
	flowId: string | null;
	flowName: string;
	connectionReferenceId: string | null;
	connectionReferenceLogicalName: string;
	connectionReferenceDisplayName: string;
	relationshipType: RelationshipType;
	flowIsManaged: boolean | null;
	connectionReferenceIsManaged: boolean | null;
	flowModifiedOn: Date | null;
	connectionReferenceModifiedOn: Date | null;
}> = {}): FlowConnectionRelationship {
	return new FlowConnectionRelationship(
		'flowId' in overrides ? overrides.flowId : 'flow-guid-default',
		'flowName' in overrides ? overrides.flowName! : 'Default Flow',
		'connectionReferenceId' in overrides ? overrides.connectionReferenceId : 'cr-guid-default',
		'connectionReferenceLogicalName' in overrides ? overrides.connectionReferenceLogicalName! : 'cr_default',
		'connectionReferenceDisplayName' in overrides ? overrides.connectionReferenceDisplayName! : 'Default CR',
		'relationshipType' in overrides ? overrides.relationshipType! : 'flow-to-cr',
		'flowIsManaged' in overrides ? overrides.flowIsManaged : false,
		'connectionReferenceIsManaged' in overrides ? overrides.connectionReferenceIsManaged : false,
		'flowModifiedOn' in overrides ? overrides.flowModifiedOn : new Date('2024-01-01'),
		'connectionReferenceModifiedOn' in overrides ? overrides.connectionReferenceModifiedOn : new Date('2024-01-01')
	);
}
