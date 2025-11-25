import { RelationshipRowMapper } from './RelationshipRowMapper';
import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import { CascadeConfiguration } from '../../domain/valueObjects/CascadeConfiguration';

describe('RelationshipRowMapper', () => {
	let mapper: RelationshipRowMapper;

	beforeEach(() => {
		mapper = new RelationshipRowMapper();
	});

	// Test data factories
	function createCascadeConfig(): CascadeConfiguration {
		return CascadeConfiguration.create({
			assign: 'NoCascade',
			delete: 'NoCascade',
			merge: 'NoCascade',
			reparent: 'NoCascade',
			share: 'NoCascade',
			unshare: 'NoCascade'
		});
	}

	function createOneToManyRelationship(
		schemaName: string,
		options: Partial<Parameters<typeof OneToManyRelationship.create>[0]> = {}
	): OneToManyRelationship {
		return OneToManyRelationship.create({
			metadataId: `rel-${schemaName}`,
			schemaName,
			referencedEntity: 'account',
			referencedAttribute: 'accountid',
			referencingEntity: 'contact',
			referencingAttribute: 'parentcustomerid',
			isCustomRelationship: false,
			isManaged: true,
			relationshipType: 'OneToManyRelationship',
			cascadeConfiguration: createCascadeConfig(),
			...options
		});
	}

	function createManyToManyRelationship(
		schemaName: string,
		options: Partial<Parameters<typeof ManyToManyRelationship.create>[0]> = {}
	): ManyToManyRelationship {
		return ManyToManyRelationship.create({
			metadataId: `rel-${schemaName}`,
			schemaName,
			entity1LogicalName: 'contact',
			entity1IntersectAttribute: 'contactid',
			entity2LogicalName: 'account',
			entity2IntersectAttribute: 'accountid',
			intersectEntityName: 'contactaccount',
			isCustomRelationship: false,
			isManaged: true,
			...options
		});
	}

	describe('toOneToManyViewModel - 1:N mapping', () => {
		it('should map id from schemaName', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.id).toBe('account_contact');
		});

		it('should map name from schemaName', () => {
			// Arrange
			const relationship = createOneToManyRelationship('cr_custom_rel');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.name).toBe('cr_custom_rel');
		});

		it('should set type to "1:N"', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.type).toBe('1:N');
		});

		it('should map relatedEntity to referencingEntity', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact', {
				referencingEntity: 'opportunity'
			});

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.relatedEntity).toBe('opportunity');
		});

		it('should map referencingAttribute', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact', {
				referencingAttribute: 'parentaccountid'
			});

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.referencingAttribute).toBe('parentaccountid');
		});

		it('should set navigationType to "entity"', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.navigationType).toBe('entity');
		});

		it('should set navigationTarget to referencingEntity', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact', {
				referencingEntity: 'lead'
			});

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.navigationTarget).toBe('lead');
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const relationship = createOneToManyRelationship('account_contact');

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(result.metadata).toBe(relationship);
		});
	});

	describe('toManyToOneViewModel - N:1 mapping', () => {
		it('should map id from schemaName', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.id).toBe('contact_account');
		});

		it('should map name from schemaName', () => {
			// Arrange
			const relationship = createOneToManyRelationship('opportunity_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.name).toBe('opportunity_account');
		});

		it('should set type to "N:1"', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.type).toBe('N:1');
		});

		it('should map relatedEntity to referencedEntity', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account', {
				referencedEntity: 'organization'
			});

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.relatedEntity).toBe('organization');
		});

		it('should map referencingAttribute', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account', {
				referencingAttribute: 'parentcustomerid'
			});

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.referencingAttribute).toBe('parentcustomerid');
		});

		it('should set navigationType to "entity"', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.navigationType).toBe('entity');
		});

		it('should set navigationTarget to referencedEntity', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account', {
				referencedEntity: 'systemuser'
			});

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.navigationTarget).toBe('systemuser');
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const relationship = createOneToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(result.metadata).toBe(relationship);
		});
	});

	describe('toManyToManyViewModel - N:N mapping', () => {
		it('should map id from schemaName', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.id).toBe('contact_account');
		});

		it('should map name from schemaName', () => {
			// Arrange
			const relationship = createManyToManyRelationship('cr_custom_nn');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.name).toBe('cr_custom_nn');
		});

		it('should set type to "N:N"', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.type).toBe('N:N');
		});

		it('should format relatedEntity as "entity1 ↔ entity2"', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account', {
				entity1LogicalName: 'lead',
				entity2LogicalName: 'opportunity'
			});

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.relatedEntity).toBe('lead ↔ opportunity');
		});

		it('should map referencingAttribute to intersectEntityName', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account', {
				intersectEntityName: 'cr_custom_intersect'
			});

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.referencingAttribute).toBe('cr_custom_intersect');
		});

		it('should set navigationType to "quickPick"', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.navigationType).toBe('quickPick');
		});

		it('should set navigationTarget to array of entities', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account', {
				entity1LogicalName: 'systemuser',
				entity2LogicalName: 'team'
			});

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.navigationTarget).toEqual(['systemuser', 'team']);
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const relationship = createManyToManyRelationship('contact_account');

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.metadata).toBe(relationship);
		});
	});

	describe('edge cases', () => {
		it('should handle custom relationships', () => {
			// Arrange
			const oneToMany = createOneToManyRelationship('cr_custom_1n', {
				isCustomRelationship: true,
				isManaged: false
			});

			// Act
			const result = mapper.toOneToManyViewModel(oneToMany);

			// Assert
			expect(result.name).toBe('cr_custom_1n');
			expect(result.metadata.isCustomRelationship).toBe(true);
		});

		it('should handle special characters in entity names', () => {
			// Arrange
			const relationship = createManyToManyRelationship('test_rel', {
				entity1LogicalName: 'cr_entity_1',
				entity2LogicalName: 'new_entity_2'
			});

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(result.relatedEntity).toBe('cr_entity_1 ↔ new_entity_2');
		});

		it('should preserve navigation target array for N:N', () => {
			// Arrange
			const relationship = createManyToManyRelationship('test', {
				entity1LogicalName: 'first',
				entity2LogicalName: 'second'
			});

			// Act
			const result = mapper.toManyToManyViewModel(relationship);

			// Assert
			expect(Array.isArray(result.navigationTarget)).toBe(true);
			expect(result.navigationTarget).toHaveLength(2);
		});

		it('should preserve navigation target string for 1:N', () => {
			// Arrange
			const relationship = createOneToManyRelationship('test', {
				referencingEntity: 'target'
			});

			// Act
			const result = mapper.toOneToManyViewModel(relationship);

			// Assert
			expect(typeof result.navigationTarget).toBe('string');
			expect(result.navigationTarget).toBe('target');
		});

		it('should preserve navigation target string for N:1', () => {
			// Arrange
			const relationship = createOneToManyRelationship('test', {
				referencedEntity: 'parent'
			});

			// Act
			const result = mapper.toManyToOneViewModel(relationship);

			// Assert
			expect(typeof result.navigationTarget).toBe('string');
			expect(result.navigationTarget).toBe('parent');
		});
	});
});
