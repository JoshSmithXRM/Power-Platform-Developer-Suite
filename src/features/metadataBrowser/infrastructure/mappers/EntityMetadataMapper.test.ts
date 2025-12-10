import { EntityMetadataMapper } from './EntityMetadataMapper';
import { AttributeMetadataMapper } from './AttributeMetadataMapper';
import { RelationshipMetadataMapper } from './RelationshipMetadataMapper';
import { EntityKeyMapper } from './EntityKeyMapper';
import { SecurityPrivilegeMapper } from './SecurityPrivilegeMapper';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import type { EntityMetadataDto, LocalizedLabel, ManagedProperty } from '../dtos/EntityMetadataDto';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import { EntityKey } from '../../domain/entities/EntityKey';
import { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';
import { CascadeConfiguration } from '../../domain/valueObjects/CascadeConfiguration';

// Test helper to create complete LocalizedLabel
function createLocalizedLabel(label: string, languageCode = 1033): LocalizedLabel {
	return {
		Label: label,
		LanguageCode: languageCode,
		IsManaged: false,
		MetadataId: '00000000-0000-0000-0000-000000000000',
		HasChanged: null
	};
}

// Test helper to create ManagedProperty
function createManagedProperty<T>(value: T): ManagedProperty<T> {
	return {
		Value: value,
		CanBeChanged: true,
		ManagedPropertyLogicalName: 'managedpropertylogicalname'
	};
}

describe('EntityMetadataMapper', () => {
	let mapper: EntityMetadataMapper;
	let mockAttributeMapper: jest.Mocked<AttributeMetadataMapper>;
	let mockRelationshipMapper: jest.Mocked<RelationshipMetadataMapper>;
	let mockKeyMapper: jest.Mocked<EntityKeyMapper>;
	let mockPrivilegeMapper: jest.Mocked<SecurityPrivilegeMapper>;

	beforeEach(() => {
		// Mock all sub-mappers
		mockAttributeMapper = {
			mapDtoToEntity: jest.fn()
		} as unknown as jest.Mocked<AttributeMetadataMapper>;

		mockRelationshipMapper = {
			mapOneToManyDtoToEntity: jest.fn(),
			mapManyToManyDtoToEntity: jest.fn()
		} as unknown as jest.Mocked<RelationshipMetadataMapper>;

		mockKeyMapper = {
			mapDtoToEntity: jest.fn()
		} as unknown as jest.Mocked<EntityKeyMapper>;

		mockPrivilegeMapper = {
			mapDtoToEntity: jest.fn()
		} as unknown as jest.Mocked<SecurityPrivilegeMapper>;

		mapper = new EntityMetadataMapper(
			mockAttributeMapper,
			mockRelationshipMapper,
			mockKeyMapper,
			mockPrivilegeMapper
		);
	});

	describe('mapDtoToEntityWithoutAttributes', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from DTO to domain entity', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Account')],
						UserLocalizedLabel: createLocalizedLabel('Account')
					},
					DisplayCollectionName: {
						LocalizedLabels: [createLocalizedLabel('Accounts')],
						UserLocalizedLabel: createLocalizedLabel('Accounts')
					},
					Description: {
						LocalizedLabels: [createLocalizedLabel('Business that represents a customer')],
						UserLocalizedLabel: createLocalizedLabel('Business that represents a customer')
					},
					IsCustomEntity: false,
					IsManaged: false,
					OwnershipType: 'UserOwned',
					PrimaryIdAttribute: 'accountid',
					PrimaryNameAttribute: 'name',
					PrimaryImageAttribute: 'entityimage',
					EntitySetName: 'accounts',
					ObjectTypeCode: 1,
					IsActivity: false,
					HasNotes: true,
					HasActivities: true,
					IsValidForAdvancedFind: createManagedProperty(true),
					IsAuditEnabled: createManagedProperty(true),
					IsValidForQueue: createManagedProperty(false)
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result).toBeInstanceOf(EntityMetadata);
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.logicalName.getValue()).toBe('account');
				expect(result.schemaName.getValue()).toBe('Account');
				expect(result.displayName).toBe('Account');
				expect(result.pluralName).toBe('Accounts');
				expect(result.description).toBe('Business that represents a customer');
				expect(result.isCustomEntity).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.ownershipType).toBe('UserOwned');
				expect(result.primaryIdAttribute).toBe('accountid');
				expect(result.primaryNameAttribute).toBe('name');
				expect(result.primaryImageAttribute).toBe('entityimage');
				expect(result.entitySetName).toBe('accounts');
				expect(result.objectTypeCode).toBe(1);
				expect(result.isActivity).toBe(false);
				expect(result.hasNotes).toBe(true);
				expect(result.hasActivities).toBe(true);
				expect(result.isValidForAdvancedFind).toBe(true);
				expect(result.isAuditEnabled).toBe(true);
				expect(result.isValidForQueue).toBe(false);
			});

			it('should use SchemaName as displayName when DisplayName label missing', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.displayName).toBe('Account');
				expect(result.pluralName).toBe('Account');
			});

			it('should handle missing Description label as null', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.description).toBeNull();
			});
		});

		describe('optional fields', () => {
			it('should default all optional fields when not provided', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.isCustomEntity).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.primaryIdAttribute).toBeNull();
				expect(result.primaryNameAttribute).toBeNull();
				expect(result.primaryImageAttribute).toBeNull();
				expect(result.entitySetName).toBeNull();
				expect(result.objectTypeCode).toBeNull();
				expect(result.isActivity).toBe(false);
				expect(result.hasNotes).toBe(false);
				expect(result.hasActivities).toBe(false);
				expect(result.isValidForAdvancedFind).toBe(true);
				expect(result.isAuditEnabled).toBe(false);
				expect(result.isValidForQueue).toBe(false);
			});
		});

		describe('ownership type mapping', () => {
			it.each([
				['UserOwned', 'UserOwned'],
				['OrganizationOwned', 'OrganizationOwned'],
				['TeamOwned', 'TeamOwned'],
				['None', 'None']
			])('should map OwnershipType %s', (ownershipType, expected) => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					OwnershipType: ownershipType
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.ownershipType).toBe(expected);
			});

			it('should default to None when OwnershipType missing', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.ownershipType).toBe('None');
			});
		});

		describe('empty collections', () => {
			it('should create empty arrays for all collections', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithoutAttributes(dto);

				// Assert
				expect(result.attributes).toEqual([]);
				expect(result.oneToManyRelationships).toEqual([]);
				expect(result.manyToOneRelationships).toEqual([]);
				expect(result.manyToManyRelationships).toEqual([]);
				expect(result.keys).toEqual([]);
				expect(result.privileges).toEqual([]);
			});
		});
	});

	describe('mapDtoToEntityWithAttributes', () => {
		describe('basic field mapping', () => {
			it('should map all basic fields same as mapDtoToEntityWithoutAttributes', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Account')],
						UserLocalizedLabel: createLocalizedLabel('Account')
					},
					DisplayCollectionName: {
						LocalizedLabels: [createLocalizedLabel('Accounts')],
						UserLocalizedLabel: createLocalizedLabel('Accounts')
					},
					IsCustomEntity: false,
					IsManaged: false,
					OwnershipType: 'UserOwned'
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.logicalName.getValue()).toBe('account');
				expect(result.schemaName.getValue()).toBe('Account');
				expect(result.displayName).toBe('Account');
				expect(result.pluralName).toBe('Accounts');
			});
		});

		describe('attribute mapper delegation', () => {
			it('should delegate attribute mapping to AttributeMetadataMapper', () => {
				// Arrange
				const mockAttribute = AttributeMetadata.create({
					metadataId: 'attr-123',
					logicalName: LogicalName.create('accountname'),
					schemaName: SchemaName.create('AccountName'),
					displayName: 'Account Name',
					description: null,
					attributeType: AttributeType.create('StringType'),
					isCustomAttribute: false,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: true,
					requiredLevel: 'ApplicationRequired'
				});

				mockAttributeMapper.mapDtoToEntity.mockReturnValue(mockAttribute);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					Attributes: [
						{
							MetadataId: 'attr-123',
							LogicalName: 'accountname',
							SchemaName: 'AccountName'
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockAttributeMapper.mapDtoToEntity).toHaveBeenCalledTimes(1);
				expect(mockAttributeMapper.mapDtoToEntity).toHaveBeenCalledWith(dto.Attributes![0]);
				expect(result.attributes).toHaveLength(1);
				expect(result.attributes[0]).toBe(mockAttribute);
			});

			it('should map multiple attributes', () => {
				// Arrange
				const mockAttribute1 = AttributeMetadata.create({
					metadataId: 'attr-1',
					logicalName: LogicalName.create('accountid'),
					schemaName: SchemaName.create('AccountId'),
					displayName: 'Account',
					description: null,
					attributeType: AttributeType.create('UniqueidentifierType'),
					isCustomAttribute: false,
					isManaged: false,
					isPrimaryId: true,
					isPrimaryName: false,
					requiredLevel: 'SystemRequired'
				});

				const mockAttribute2 = AttributeMetadata.create({
					metadataId: 'attr-2',
					logicalName: LogicalName.create('accountname'),
					schemaName: SchemaName.create('AccountName'),
					displayName: 'Account Name',
					description: null,
					attributeType: AttributeType.create('StringType'),
					isCustomAttribute: false,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: true,
					requiredLevel: 'ApplicationRequired'
				});

				mockAttributeMapper.mapDtoToEntity
					.mockReturnValueOnce(mockAttribute1)
					.mockReturnValueOnce(mockAttribute2);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					Attributes: [
						{ MetadataId: 'attr-1', LogicalName: 'accountid', SchemaName: 'AccountId' },
						{ MetadataId: 'attr-2', LogicalName: 'accountname', SchemaName: 'AccountName' }
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockAttributeMapper.mapDtoToEntity).toHaveBeenCalledTimes(2);
				expect(result.attributes).toHaveLength(2);
			});

			it('should handle missing Attributes as empty array', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockAttributeMapper.mapDtoToEntity).not.toHaveBeenCalled();
				expect(result.attributes).toEqual([]);
			});
		});

		describe('relationship mapper delegation', () => {
			it('should delegate one-to-many relationship mapping to RelationshipMetadataMapper', () => {
				// Arrange
				const mockRelationship = OneToManyRelationship.create({
					metadataId: 'rel-123',
					schemaName: 'account_contact',
					referencedEntity: 'account',
					referencedAttribute: 'accountid',
					referencingEntity: 'contact',
					referencingAttribute: 'parentcustomerid',
					isCustomRelationship: false,
					isManaged: false,
					relationshipType: 'OneToManyRelationship',
					cascadeConfiguration: CascadeConfiguration.create({
						assign: 'NoCascade',
						delete: 'RemoveLink',
						merge: 'NoCascade',
						reparent: 'NoCascade',
						share: 'NoCascade',
						unshare: 'NoCascade'
					})
				});

				mockRelationshipMapper.mapOneToManyDtoToEntity.mockReturnValue(mockRelationship);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					OneToManyRelationships: [
						{
							MetadataId: 'rel-123',
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
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockRelationshipMapper.mapOneToManyDtoToEntity).toHaveBeenCalledTimes(1);
				expect(result.oneToManyRelationships).toHaveLength(1);
				expect(result.oneToManyRelationships[0]).toBe(mockRelationship);
			});

			it('should delegate many-to-one relationship mapping to RelationshipMetadataMapper', () => {
				// Arrange
				const mockRelationship = OneToManyRelationship.create({
					metadataId: 'rel-456',
					schemaName: 'account_parent_account',
					referencedEntity: 'account',
					referencedAttribute: 'accountid',
					referencingEntity: 'account',
					referencingAttribute: 'parentaccountid',
					isCustomRelationship: false,
					isManaged: false,
					relationshipType: 'OneToManyRelationship',
					cascadeConfiguration: CascadeConfiguration.create({
						assign: 'NoCascade',
						delete: 'RemoveLink',
						merge: 'NoCascade',
						reparent: 'NoCascade',
						share: 'NoCascade',
						unshare: 'NoCascade'
					})
				});

				mockRelationshipMapper.mapOneToManyDtoToEntity.mockReturnValue(mockRelationship);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					ManyToOneRelationships: [
						{
							MetadataId: 'rel-456',
							SchemaName: 'account_parent_account',
							ReferencedEntity: 'account',
							ReferencedAttribute: 'accountid',
							ReferencingEntity: 'account',
							ReferencingAttribute: 'parentaccountid',
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
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockRelationshipMapper.mapOneToManyDtoToEntity).toHaveBeenCalledTimes(1);
				expect(result.manyToOneRelationships).toHaveLength(1);
				expect(result.manyToOneRelationships[0]).toBe(mockRelationship);
			});

			it('should delegate many-to-many relationship mapping to RelationshipMetadataMapper', () => {
				// Arrange
				const mockRelationship = ManyToManyRelationship.create({
					metadataId: 'rel-789',
					schemaName: 'accountleads',
					entity1LogicalName: 'account',
					entity1IntersectAttribute: 'accountid',
					entity2LogicalName: 'lead',
					entity2IntersectAttribute: 'leadid',
					intersectEntityName: 'accountleads',
					isCustomRelationship: false,
					isManaged: false
				});

				mockRelationshipMapper.mapManyToManyDtoToEntity.mockReturnValue(mockRelationship);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					ManyToManyRelationships: [
						{
							MetadataId: 'rel-789',
							SchemaName: 'accountleads',
							Entity1LogicalName: 'account',
							Entity1IntersectAttribute: 'accountid',
							Entity2LogicalName: 'lead',
							Entity2IntersectAttribute: 'leadid',
							IntersectEntityName: 'accountleads',
							IsCustomRelationship: false,
							IsManaged: false
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockRelationshipMapper.mapManyToManyDtoToEntity).toHaveBeenCalledTimes(1);
				expect(result.manyToManyRelationships).toHaveLength(1);
				expect(result.manyToManyRelationships[0]).toBe(mockRelationship);
			});

			it('should handle missing relationships as empty arrays', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(result.oneToManyRelationships).toEqual([]);
				expect(result.manyToOneRelationships).toEqual([]);
				expect(result.manyToManyRelationships).toEqual([]);
			});
		});

		describe('key mapper delegation', () => {
			it('should delegate key mapping to EntityKeyMapper', () => {
				// Arrange
				const mockKey = EntityKey.create({
					metadataId: 'key-123',
					logicalName: LogicalName.create('accountnumber_key'),
					schemaName: SchemaName.create('AccountNumberKey'),
					displayName: 'Account Number Key',
					entityLogicalName: 'account',
					keyAttributes: ['accountnumber'],
					isManaged: false,
					entityKeyIndexStatus: 'Active'
				});

				mockKeyMapper.mapDtoToEntity.mockReturnValue(mockKey);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					Keys: [
						{
							MetadataId: 'key-123',
							LogicalName: 'accountnumber_key',
							SchemaName: 'AccountNumberKey',
							EntityLogicalName: 'account',
							KeyAttributes: ['accountnumber'],
							IsManaged: false,
							EntityKeyIndexStatus: 'Active'
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockKeyMapper.mapDtoToEntity).toHaveBeenCalledTimes(1);
				expect(result.keys).toHaveLength(1);
				expect(result.keys[0]).toBe(mockKey);
			});

			it('should handle missing Keys as empty array', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(result.keys).toEqual([]);
			});
		});

		describe('privilege mapper delegation', () => {
			it('should delegate privilege mapping to SecurityPrivilegeMapper', () => {
				// Arrange
				const mockPrivilege = SecurityPrivilege.create({
					privilegeId: 'priv-123',
					name: 'prvReadAccount',
					privilegeType: 2,
					canBeBasic: true,
					canBeLocal: true,
					canBeDeep: true,
					canBeGlobal: true
				});

				mockPrivilegeMapper.mapDtoToEntity.mockReturnValue(mockPrivilege);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					Privileges: [
						{
							PrivilegeId: 'priv-123',
							Name: 'prvReadAccount',
							PrivilegeType: 1,
							CanBeBasic: true,
							CanBeLocal: true,
							CanBeDeep: true,
							CanBeGlobal: true
						}
					]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(mockPrivilegeMapper.mapDtoToEntity).toHaveBeenCalledTimes(1);
				expect(result.privileges).toHaveLength(1);
				expect(result.privileges[0]).toBe(mockPrivilege);
			});

			it('should handle missing Privileges as empty array', () => {
				// Arrange
				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account'
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(result.privileges).toEqual([]);
			});
		});

		describe('complete entity mapping', () => {
			it('should map entity with all metadata collections', () => {
				// Arrange
				const mockAttribute = AttributeMetadata.create({
					metadataId: 'attr-1',
					logicalName: LogicalName.create('accountname'),
					schemaName: SchemaName.create('AccountName'),
					displayName: 'Account Name',
					description: null,
					attributeType: AttributeType.create('StringType'),
					isCustomAttribute: false,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: true,
					requiredLevel: 'ApplicationRequired'
				});

				const mockOneToManyRel = OneToManyRelationship.create({
					metadataId: 'rel-1',
					schemaName: 'account_contact',
					referencedEntity: 'account',
					referencedAttribute: 'accountid',
					referencingEntity: 'contact',
					referencingAttribute: 'parentcustomerid',
					isCustomRelationship: false,
					isManaged: false,
					relationshipType: 'OneToManyRelationship',
					cascadeConfiguration: CascadeConfiguration.create({
						assign: 'NoCascade',
						delete: 'RemoveLink',
						merge: 'NoCascade',
						reparent: 'NoCascade',
						share: 'NoCascade',
						unshare: 'NoCascade'
					})
				});

				const mockManyToManyRel = ManyToManyRelationship.create({
					metadataId: 'rel-2',
					schemaName: 'accountleads',
					entity1LogicalName: 'account',
					entity1IntersectAttribute: 'accountid',
					entity2LogicalName: 'lead',
					entity2IntersectAttribute: 'leadid',
					intersectEntityName: 'accountleads',
					isCustomRelationship: false,
					isManaged: false
				});

				const mockKey = EntityKey.create({
					metadataId: 'key-1',
					logicalName: LogicalName.create('accountnumber_key'),
					schemaName: SchemaName.create('AccountNumberKey'),
					displayName: 'Account Number Key',
					entityLogicalName: 'account',
					keyAttributes: ['accountnumber'],
					isManaged: false,
					entityKeyIndexStatus: 'Active'
				});

				const mockPrivilege = SecurityPrivilege.create({
					privilegeId: 'priv-1',
					name: 'prvReadAccount',
					privilegeType: 2,
					canBeBasic: true,
					canBeLocal: true,
					canBeDeep: true,
					canBeGlobal: true
				});

				mockAttributeMapper.mapDtoToEntity.mockReturnValue(mockAttribute);
				mockRelationshipMapper.mapOneToManyDtoToEntity.mockReturnValue(mockOneToManyRel);
				mockRelationshipMapper.mapManyToManyDtoToEntity.mockReturnValue(mockManyToManyRel);
				mockKeyMapper.mapDtoToEntity.mockReturnValue(mockKey);
				mockPrivilegeMapper.mapDtoToEntity.mockReturnValue(mockPrivilege);

				const dto: EntityMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'account',
					SchemaName: 'Account',
					Attributes: [{ MetadataId: 'attr-1', LogicalName: 'accountname', SchemaName: 'AccountName' }],
					OneToManyRelationships: [{
						MetadataId: 'rel-1',
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
					}],
					ManyToOneRelationships: [],
					ManyToManyRelationships: [{
						MetadataId: 'rel-2',
						SchemaName: 'accountleads',
						Entity1LogicalName: 'account',
						Entity1IntersectAttribute: 'accountid',
						Entity2LogicalName: 'lead',
						Entity2IntersectAttribute: 'leadid',
						IntersectEntityName: 'accountleads',
						IsCustomRelationship: false,
						IsManaged: false
					}],
					Keys: [{
						MetadataId: 'key-1',
						LogicalName: 'accountnumber_key',
						SchemaName: 'AccountNumberKey',
						EntityLogicalName: 'account',
						KeyAttributes: ['accountnumber'],
						IsManaged: false,
						EntityKeyIndexStatus: 'Active'
					}],
					Privileges: [{
						PrivilegeId: 'priv-1',
						Name: 'prvReadAccount',
						PrivilegeType: 1,
						CanBeBasic: true,
						CanBeLocal: true,
						CanBeDeep: true,
						CanBeGlobal: true
					}]
				};

				// Act
				const result = mapper.mapDtoToEntityWithAttributes(dto);

				// Assert
				expect(result.attributes).toHaveLength(1);
				expect(result.oneToManyRelationships).toHaveLength(1);
				expect(result.manyToManyRelationships).toHaveLength(1);
				expect(result.keys).toHaveLength(1);
				expect(result.privileges).toHaveLength(1);
			});
		});
	});

	describe('comparison between mapping methods', () => {
		it('should produce same basic entity metadata with both methods', () => {
			// Arrange
			const dto: EntityMetadataDto = {
				MetadataId: '12345678-1234-1234-1234-123456789012',
				LogicalName: 'account',
				SchemaName: 'Account',
				DisplayName: {
					LocalizedLabels: [createLocalizedLabel('Account')],
					UserLocalizedLabel: createLocalizedLabel('Account')
				},
				IsCustomEntity: false,
				IsManaged: false,
				OwnershipType: 'UserOwned'
			};

			// Act
			const withoutAttrs = mapper.mapDtoToEntityWithoutAttributes(dto);
			const withAttrs = mapper.mapDtoToEntityWithAttributes(dto);

			// Assert - Compare basic fields
			expect(withoutAttrs.metadataId).toBe(withAttrs.metadataId);
			expect(withoutAttrs.logicalName.getValue()).toBe(withAttrs.logicalName.getValue());
			expect(withoutAttrs.schemaName.getValue()).toBe(withAttrs.schemaName.getValue());
			expect(withoutAttrs.displayName).toBe(withAttrs.displayName);
			expect(withoutAttrs.isCustomEntity).toBe(withAttrs.isCustomEntity);
			expect(withoutAttrs.ownershipType).toBe(withAttrs.ownershipType);
		});

		it('mapDtoToEntityWithoutAttributes should have empty collections', () => {
			// Arrange
			const dto: EntityMetadataDto = {
				MetadataId: '12345678-1234-1234-1234-123456789012',
				LogicalName: 'account',
				SchemaName: 'Account'
			};

			// Act
			const result = mapper.mapDtoToEntityWithoutAttributes(dto);

			// Assert
			expect(result.attributes).toHaveLength(0);
			expect(result.oneToManyRelationships).toHaveLength(0);
			expect(result.manyToOneRelationships).toHaveLength(0);
			expect(result.manyToManyRelationships).toHaveLength(0);
			expect(result.keys).toHaveLength(0);
			expect(result.privileges).toHaveLength(0);
		});
	});
});
