import { RelationshipMetadataMapper } from './RelationshipMetadataMapper';
import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import type {
	OneToManyRelationshipDto,
	ManyToManyRelationshipDto
} from '../dtos/EntityMetadataDto';

describe('RelationshipMetadataMapper', () => {
	let mapper: RelationshipMetadataMapper;

	beforeEach(() => {
		mapper = new RelationshipMetadataMapper();
	});

	describe('mapOneToManyDtoToEntity', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from DTO to domain entity', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact_parentcustomerid',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					},
					ReferencedEntityNavigationPropertyName: 'contact_parent_account',
					ReferencingEntityNavigationPropertyName: 'parentaccountid_account',
					IsHierarchical: false,
					SecurityTypes: 'Append'
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result).toBeInstanceOf(OneToManyRelationship);
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.schemaName).toBe('account_contact_parentcustomerid');
				expect(result.referencedEntity).toBe('account');
				expect(result.referencedAttribute).toBe('accountid');
				expect(result.referencingEntity).toBe('contact');
				expect(result.referencingAttribute).toBe('parentcustomerid');
				expect(result.isCustomRelationship).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.relationshipType).toBe('OneToManyRelationship');
				expect(result.referencedEntityNavigationPropertyName).toBe('contact_parent_account');
				expect(result.referencingEntityNavigationPropertyName).toBe('parentaccountid_account');
				expect(result.isHierarchical).toBe(false);
				expect(result.securityTypes).toBe('Append');
			});

			it('should handle missing optional navigation properties as null', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.referencedEntityNavigationPropertyName).toBeNull();
				expect(result.referencingEntityNavigationPropertyName).toBeNull();
			});

			it('should default IsHierarchical to false when not provided', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.isHierarchical).toBe(false);
			});

			it('should handle missing SecurityTypes as null', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.securityTypes).toBeNull();
			});
		});

		describe('custom vs managed relationships', () => {
			it('should identify custom relationships', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'new_account_new_customentity',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'new_customentity',
					ReferencingAttribute: 'new_accountid',
					IsCustomRelationship: true,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.isCustomRelationship).toBe(true);
			});

			it('should identify managed relationships', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: true,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.isManaged).toBe(true);
			});
		});

		describe('hierarchical relationships', () => {
			it('should map hierarchical (self-referencing) relationships', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_parent_account',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'account',
					ReferencingAttribute: 'parentaccountid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					IsHierarchical: true,
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.isHierarchical).toBe(true);
				expect(result.referencedEntity).toBe('account');
				expect(result.referencingEntity).toBe('account');
			});
		});

		describe('cascade configuration mapping', () => {
			it('should map cascade configuration with all NoCascade', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'NoCascade',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.assign).toBe('NoCascade');
				expect(result.cascadeConfiguration.deleteAction).toBe('NoCascade');
				expect(result.cascadeConfiguration.merge).toBe('NoCascade');
				expect(result.cascadeConfiguration.reparent).toBe('NoCascade');
				expect(result.cascadeConfiguration.share).toBe('NoCascade');
				expect(result.cascadeConfiguration.unshare).toBe('NoCascade');
			});

			it('should map cascade configuration with Cascade delete', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'Cascade',
						Delete: 'Cascade',
						Merge: 'Cascade',
						Reparent: 'Cascade',
						Share: 'Cascade',
						Unshare: 'Cascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.deleteAction).toBe('Cascade');
				expect(result.cascadeConfiguration.assign).toBe('Cascade');
			});

			it('should map cascade configuration with RemoveLink', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'RemoveLink',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.deleteAction).toBe('RemoveLink');
			});

			it('should map cascade configuration with Restrict', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'Restrict',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.deleteAction).toBe('Restrict');
			});

			it('should handle missing Archive and RollupView as null', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'NoCascade',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.archive).toBeNull();
				expect(result.cascadeConfiguration.rollupView).toBeNull();
			});

			it('should map Archive and RollupView when provided', () => {
				// Arrange
				const dto: OneToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'account_contact',
					ReferencedEntity: 'account',
					ReferencedAttribute: 'accountid',
					ReferencingEntity: 'contact',
					ReferencingAttribute: 'parentcustomerid',
					IsCustomRelationship: false,
					IsManaged: false,
					RelationshipType: 'OneToManyRelationship',
					CascadeConfiguration: {
						Assign: 'NoCascade',
						Delete: 'NoCascade',
						Merge: 'NoCascade',
						Reparent: 'NoCascade',
						Share: 'NoCascade',
						Unshare: 'NoCascade',
						Archive: 'NoCascade',
						RollupView: 'NoCascade'
					}
				};

				// Act
				const result = mapper.mapOneToManyDtoToEntity(dto);

				// Assert
				expect(result.cascadeConfiguration.archive).toBe('NoCascade');
				expect(result.cascadeConfiguration.rollupView).toBe('NoCascade');
			});
		});
	});

	describe('mapManyToManyDtoToEntity', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from DTO to domain entity', () => {
				// Arrange
				const dto: ManyToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'accountleads',
					Entity1LogicalName: 'account',
					Entity1IntersectAttribute: 'accountid',
					Entity2LogicalName: 'lead',
					Entity2IntersectAttribute: 'leadid',
					IntersectEntityName: 'accountleads',
					IsCustomRelationship: false,
					IsManaged: false,
					Entity1NavigationPropertyName: 'accountleads_association',
					Entity2NavigationPropertyName: 'leadaccounts_association'
				};

				// Act
				const result = mapper.mapManyToManyDtoToEntity(dto);

				// Assert
				expect(result).toBeInstanceOf(ManyToManyRelationship);
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.schemaName).toBe('accountleads');
				expect(result.entity1LogicalName).toBe('account');
				expect(result.entity1IntersectAttribute).toBe('accountid');
				expect(result.entity2LogicalName).toBe('lead');
				expect(result.entity2IntersectAttribute).toBe('leadid');
				expect(result.intersectEntityName).toBe('accountleads');
				expect(result.isCustomRelationship).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.entity1NavigationPropertyName).toBe('accountleads_association');
				expect(result.entity2NavigationPropertyName).toBe('leadaccounts_association');
			});

			it('should handle missing navigation properties as null', () => {
				// Arrange
				const dto: ManyToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'accountleads',
					Entity1LogicalName: 'account',
					Entity1IntersectAttribute: 'accountid',
					Entity2LogicalName: 'lead',
					Entity2IntersectAttribute: 'leadid',
					IntersectEntityName: 'accountleads',
					IsCustomRelationship: false,
					IsManaged: false
				};

				// Act
				const result = mapper.mapManyToManyDtoToEntity(dto);

				// Assert
				expect(result.entity1NavigationPropertyName).toBeNull();
				expect(result.entity2NavigationPropertyName).toBeNull();
			});
		});

		describe('custom vs managed relationships', () => {
			it('should identify custom many-to-many relationships', () => {
				// Arrange
				const dto: ManyToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'new_account_new_customentity',
					Entity1LogicalName: 'account',
					Entity1IntersectAttribute: 'accountid',
					Entity2LogicalName: 'new_customentity',
					Entity2IntersectAttribute: 'new_customentityid',
					IntersectEntityName: 'new_account_new_customentity',
					IsCustomRelationship: true,
					IsManaged: false
				};

				// Act
				const result = mapper.mapManyToManyDtoToEntity(dto);

				// Assert
				expect(result.isCustomRelationship).toBe(true);
			});

			it('should identify managed many-to-many relationships', () => {
				// Arrange
				const dto: ManyToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'accountleads',
					Entity1LogicalName: 'account',
					Entity1IntersectAttribute: 'accountid',
					Entity2LogicalName: 'lead',
					Entity2IntersectAttribute: 'leadid',
					IntersectEntityName: 'accountleads',
					IsCustomRelationship: false,
					IsManaged: true
				};

				// Act
				const result = mapper.mapManyToManyDtoToEntity(dto);

				// Assert
				expect(result.isManaged).toBe(true);
			});
		});

		describe('self-referencing relationships', () => {
			it('should map self-referencing many-to-many relationships', () => {
				// Arrange
				const dto: ManyToManyRelationshipDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					SchemaName: 'contact_parent_contact',
					Entity1LogicalName: 'contact',
					Entity1IntersectAttribute: 'contactid',
					Entity2LogicalName: 'contact',
					Entity2IntersectAttribute: 'parentcontactid',
					IntersectEntityName: 'contact_parent_contact',
					IsCustomRelationship: false,
					IsManaged: false
				};

				// Act
				const result = mapper.mapManyToManyDtoToEntity(dto);

				// Assert
				expect(result.entity1LogicalName).toBe('contact');
				expect(result.entity2LogicalName).toBe('contact');
			});
		});
	});
});
