import { FlowConnectionRelationshipViewModelMapper } from './FlowConnectionRelationshipViewModelMapper';
import { FlowConnectionRelationship, RelationshipType } from '../../domain/valueObjects/FlowConnectionRelationship';

describe('FlowConnectionRelationshipViewModelMapper', () => {
	let mapper: FlowConnectionRelationshipViewModelMapper;

	beforeEach(() => {
		mapper = new FlowConnectionRelationshipViewModelMapper();
	});

	// Test data factory
	function createRelationship(
		flowName: string,
		crLogicalName: string,
		relationshipType: RelationshipType,
		options: {
			flowId?: string | null;
			crId?: string | null;
			crDisplayName?: string;
			flowIsManaged?: boolean | null;
			crIsManaged?: boolean | null;
			flowModifiedOn?: Date | null;
			crModifiedOn?: Date | null;
		} = {}
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
			options.flowId !== undefined ? options.flowId : `flow-${flowName}`,
			flowName,
			options.crId !== undefined ? options.crId : `cr-${crLogicalName}`,
			crLogicalName,
			options.crDisplayName ?? crLogicalName,
			relationshipType,
			options.flowIsManaged !== undefined ? options.flowIsManaged : false,
			options.crIsManaged !== undefined ? options.crIsManaged : false,
			options.flowModifiedOn !== undefined ? options.flowModifiedOn : new Date('2024-01-15T10:00:00Z'),
			options.crModifiedOn !== undefined ? options.crModifiedOn : new Date('2024-01-15T10:00:00Z')
		);
	}

	describe('toViewModel - single relationship mapping', () => {
		it('should map flowId when present', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				flowId: 'flow-123'
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowId).toBe('flow-123');
		});

		it('should map flowId to empty string when null', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'orphaned-cr', {
				flowId: null
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowId).toBe('');
		});

		it('should map flowName', () => {
			// Arrange
			const relationship = createRelationship('My Test Flow', 'cr_test', 'flow-to-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowName).toBe('My Test Flow');
		});

		it('should map connectionReferenceId when present', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crId: 'cr-456'
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceId).toBe('cr-456');
		});

		it('should map connectionReferenceId to empty string when null', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'orphaned-flow', {
				crId: null
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceId).toBe('');
		});

		it('should map connectionReferenceLogicalName', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_sharepoint', 'flow-to-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceLogicalName).toBe('cr_sharepoint');
		});

		it('should map connectionReferenceDisplayName', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crDisplayName: 'SharePoint Connection'
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceDisplayName).toBe('SharePoint Connection');
		});
	});

	describe('relationship type mapping', () => {
		it('should map "flow-to-cr" to "Valid"', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.relationshipType).toBe('Valid');
		});

		it('should map "orphaned-flow" to "Missing CR"', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'orphaned-flow');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.relationshipType).toBe('Missing CR');
		});

		it('should map "orphaned-cr" to "Unused CR"', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'orphaned-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.relationshipType).toBe('Unused CR');
		});

		it('should handle flow-to-cr type correctly', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.relationshipType).toBe('Valid');
		});

		it('should map unknown relationship type to "Unknown"', () => {
			// Arrange
			// Test the default case by passing an invalid type (defensive programming test)
			const relationship = createRelationship('Test Flow', 'cr_test', 'invalid-type' as unknown as RelationshipType);

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.relationshipType).toBe('Unknown');
		});
	});

	describe('managed flags mapping', () => {
		it('should map flowIsManaged to "Managed" when true', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				flowIsManaged: true
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowIsManaged).toBe('Managed');
		});

		it('should map flowIsManaged to "Unmanaged" when false', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				flowIsManaged: false
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowIsManaged).toBe('Unmanaged');
		});

		it('should map flowIsManaged to empty string when null', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				flowIsManaged: null
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowIsManaged).toBe('');
		});

		it('should map connectionReferenceIsManaged to "Managed" when true', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crIsManaged: true
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceIsManaged).toBe('Managed');
		});

		it('should map connectionReferenceIsManaged to "Unmanaged" when false', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crIsManaged: false
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceIsManaged).toBe('Unmanaged');
		});

		it('should map connectionReferenceIsManaged to empty string when null', () => {
			// Arrange
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crIsManaged: null
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceIsManaged).toBe('');
		});
	});

	describe('date formatting', () => {
		it('should format flowModifiedOn using DateFormatter', () => {
			// Arrange
			const modifiedOn = new Date('2024-01-15T10:30:00Z');
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				flowModifiedOn: modifiedOn
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowModifiedOn).toBeDefined();
			expect(typeof result.flowModifiedOn).toBe('string');
		});

		it('should format connectionReferenceModifiedOn using DateFormatter', () => {
			// Arrange
			const modifiedOn = new Date('2024-01-15T10:30:00Z');
			const relationship = createRelationship('Test Flow', 'cr_test', 'flow-to-cr', {
				crModifiedOn: modifiedOn
			});

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.connectionReferenceModifiedOn).toBeDefined();
			expect(typeof result.connectionReferenceModifiedOn).toBe('string');
		});
	});

	describe('toViewModels - collection mapping', () => {
		it('should map multiple relationships', () => {
			// Arrange
			const relationships = [
				createRelationship('Flow1', 'cr1', 'flow-to-cr'),
				createRelationship('Flow2', 'cr2', 'orphaned-flow'),
				createRelationship('Flow3', 'cr3', 'orphaned-cr')
			];

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.flowName).toBe('Flow1');
			expect(result[1]?.flowName).toBe('Flow2');
			expect(result[2]?.flowName).toBe('Flow3');
		});

		it('should handle empty array', () => {
			// Arrange
			const relationships: FlowConnectionRelationship[] = [];

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should handle single relationship', () => {
			// Arrange
			const relationships = [createRelationship('Single Flow', 'cr_single', 'flow-to-cr')];

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.flowName).toBe('Single Flow');
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in names', () => {
			// Arrange
			const relationship = createRelationship(
				'Test & Flow <2024>',
				'cr_test',
				'flow-to-cr',
				{
					crDisplayName: 'Connection "Special" & Reference'
				}
			);

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowName).toBe('Test & Flow <2024>');
			expect(result.connectionReferenceDisplayName).toBe('Connection "Special" & Reference');
		});

		it('should handle very long names', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const relationship = createRelationship(longName, 'cr_test', 'flow-to-cr');

			// Act
			const result = mapper.toViewModel(relationship);

			// Assert
			expect(result.flowName).toBe(longName);
		});

		it('should handle all relationship types in collection', () => {
			// Arrange
			const relationships = [
				createRelationship('Flow1', 'cr1', 'flow-to-cr'),
				createRelationship('Flow2', 'cr2', 'orphaned-flow'),
				createRelationship('Flow3', 'cr3', 'orphaned-cr')
			];

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result[0]?.relationshipType).toBe('Valid');
			expect(result[1]?.relationshipType).toBe('Missing CR');
			expect(result[2]?.relationshipType).toBe('Unused CR');
		});

		it('should handle mixed managed states', () => {
			// Arrange
			const relationships = [
				createRelationship('Flow1', 'cr1', 'flow-to-cr', {
					flowIsManaged: true,
					crIsManaged: true
				}),
				createRelationship('Flow2', 'cr2', 'flow-to-cr', {
					flowIsManaged: false,
					crIsManaged: false
				}),
				createRelationship('Flow3', 'cr3', 'flow-to-cr', {
					flowIsManaged: null,
					crIsManaged: null
				})
			];

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result[0]?.flowIsManaged).toBe('Managed');
			expect(result[0]?.connectionReferenceIsManaged).toBe('Managed');
			expect(result[1]?.flowIsManaged).toBe('Unmanaged');
			expect(result[1]?.connectionReferenceIsManaged).toBe('Unmanaged');
			expect(result[2]?.flowIsManaged).toBe('');
			expect(result[2]?.connectionReferenceIsManaged).toBe('');
		});

		it('should handle large collection', () => {
			// Arrange
			const relationships = Array.from({ length: 50 }, (_, i) =>
				createRelationship(`Flow${i}`, `cr${i}`, 'flow-to-cr')
			);

			// Act
			const result = mapper.toViewModels(relationships);

			// Assert
			expect(result).toHaveLength(50);
			expect(result[0]?.flowName).toBe('Flow0');
			expect(result[49]?.flowName).toBe('Flow49');
		});
	});
});
