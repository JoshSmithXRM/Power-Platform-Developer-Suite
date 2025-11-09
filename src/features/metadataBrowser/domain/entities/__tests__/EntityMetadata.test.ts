import { EntityMetadata } from '../EntityMetadata';
import { AttributeMetadata } from '../AttributeMetadata';
import { OneToManyRelationship } from '../OneToManyRelationship';
import { ManyToManyRelationship } from '../ManyToManyRelationship';
import { EntityKey } from '../EntityKey';
import { LogicalName } from '../../valueObjects/LogicalName';
import { SchemaName } from '../../valueObjects/SchemaName';
import { AttributeType } from '../../valueObjects/AttributeType';
import { CascadeConfiguration } from '../../valueObjects/CascadeConfiguration';

describe('EntityMetadata', () => {
    const createAttribute = (logicalName: string, overrides?: Partial<Parameters<typeof AttributeMetadata.create>[0]>): AttributeMetadata => {
        return AttributeMetadata.create({
            metadataId: `attr-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
            displayName: logicalName,
            description: null,
            attributeType: AttributeType.create('StringType'),
            isCustomAttribute: false,
            isManaged: true,
            isPrimaryId: false,
            isPrimaryName: false,
            requiredLevel: 'None',
            ...overrides
        });
    };

    const createValidEntity = (overrides?: Partial<Parameters<typeof EntityMetadata.create>[0]>): EntityMetadata => {
        return EntityMetadata.create({
            metadataId: 'entity-12345',
            logicalName: LogicalName.create('account'),
            schemaName: SchemaName.create('Account'),
            displayName: 'Account',
            pluralName: 'Accounts',
            description: 'Business account',
            isCustomEntity: false,
            isManaged: true,
            ownershipType: 'UserOwned',
            attributes: [],
            ...overrides
        });
    };

    describe('create', () => {
        it('should create entity with required fields', () => {
            const entity = createValidEntity();

            expect(entity.metadataId).toBe('entity-12345');
            expect(entity.logicalName.getValue()).toBe('account');
            expect(entity.schemaName.getValue()).toBe('Account');
            expect(entity.displayName).toBe('Account');
            expect(entity.pluralName).toBe('Accounts');
            expect(entity.description).toBe('Business account');
            expect(entity.isCustomEntity).toBe(false);
            expect(entity.isManaged).toBe(true);
            expect(entity.ownershipType).toBe('UserOwned');
        });

        it('should set optional fields to defaults', () => {
            const entity = createValidEntity();

            expect(entity.primaryIdAttribute).toBeNull();
            expect(entity.primaryNameAttribute).toBeNull();
            expect(entity.primaryImageAttribute).toBeNull();
            expect(entity.entitySetName).toBeNull();
            expect(entity.objectTypeCode).toBeNull();
            expect(entity.isActivity).toBe(false);
            expect(entity.hasNotes).toBe(false);
            expect(entity.hasActivities).toBe(false);
            expect(entity.isValidForAdvancedFind).toBe(true);
            expect(entity.isAuditEnabled).toBe(false);
            expect(entity.isValidForQueue).toBe(false);
        });

        it('should set relationship arrays to empty by default', () => {
            const entity = createValidEntity();

            expect(entity.oneToManyRelationships).toEqual([]);
            expect(entity.manyToOneRelationships).toEqual([]);
            expect(entity.manyToManyRelationships).toEqual([]);
            expect(entity.keys).toEqual([]);
        });

        it('should throw error when metadataId is empty', () => {
            expect(() => createValidEntity({ metadataId: '' })).toThrow('Entity metadata ID cannot be empty');
        });

        it('should throw error when displayName is empty', () => {
            expect(() => createValidEntity({ displayName: '' })).toThrow('Entity display name cannot be empty');
        });

        it('should throw error when pluralName is empty', () => {
            expect(() => createValidEntity({ pluralName: '' })).toThrow('Entity plural name cannot be empty');
        });
    });

    describe('isSystemEntity', () => {
        it('should return true when isCustomEntity is false', () => {
            const entity = createValidEntity({ isCustomEntity: false });
            expect(entity.isSystemEntity()).toBe(true);
        });

        it('should return false when isCustomEntity is true', () => {
            const entity = createValidEntity({ isCustomEntity: true });
            expect(entity.isSystemEntity()).toBe(false);
        });
    });

    describe('hasAttributes', () => {
        it('should return true when attributes array has items', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name')]
            });
            expect(entity.hasAttributes()).toBe(true);
        });

        it('should return false when attributes array is empty', () => {
            const entity = createValidEntity({ attributes: [] });
            expect(entity.hasAttributes()).toBe(false);
        });
    });

    describe('getAttributeCount', () => {
        it('should return 0 for no attributes', () => {
            const entity = createValidEntity({ attributes: [] });
            expect(entity.getAttributeCount()).toBe(0);
        });

        it('should return correct count', () => {
            const entity = createValidEntity({
                attributes: [
                    createAttribute('name'),
                    createAttribute('email'),
                    createAttribute('phone')
                ]
            });
            expect(entity.getAttributeCount()).toBe(3);
        });
    });

    describe('findAttributeByLogicalName', () => {
        it('should find attribute by logical name', () => {
            const nameAttr = createAttribute('name');
            const entity = createValidEntity({
                attributes: [nameAttr, createAttribute('email')]
            });

            const found = entity.findAttributeByLogicalName(LogicalName.create('name'));
            expect(found).toBe(nameAttr);
        });

        it('should return null when attribute not found', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name')]
            });

            const found = entity.findAttributeByLogicalName(LogicalName.create('phone'));
            expect(found).toBeNull();
        });

        it('should return null for empty attributes', () => {
            const entity = createValidEntity({ attributes: [] });
            const found = entity.findAttributeByLogicalName(LogicalName.create('name'));
            expect(found).toBeNull();
        });
    });

    describe('getAttributesByType', () => {
        it('should return attributes of specific type', () => {
            const entity = createValidEntity({
                attributes: [
                    createAttribute('name', { attributeType: AttributeType.create('StringType') }),
                    createAttribute('age', { attributeType: AttributeType.create('IntegerType') }),
                    createAttribute('email', { attributeType: AttributeType.create('StringType') })
                ]
            });

            const stringAttrs = entity.getAttributesByType('StringType');
            expect(stringAttrs).toHaveLength(2);
            expect(stringAttrs[0]!.logicalName.getValue()).toBe('name');
            expect(stringAttrs[1]!.logicalName.getValue()).toBe('email');
        });

        it('should return empty array when no matches', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name', { attributeType: AttributeType.create('StringType') })]
            });

            const lookupAttrs = entity.getAttributesByType('LookupType');
            expect(lookupAttrs).toEqual([]);
        });
    });

    describe('getRequiredAttributes', () => {
        it('should return only required attributes', () => {
            const entity = createValidEntity({
                attributes: [
                    createAttribute('name', { requiredLevel: 'SystemRequired' }),
                    createAttribute('email', { requiredLevel: 'None' }),
                    createAttribute('phone', { requiredLevel: 'ApplicationRequired' })
                ]
            });

            const required = entity.getRequiredAttributes();
            expect(required).toHaveLength(2);
            expect(required[0]!.logicalName.getValue()).toBe('name');
            expect(required[1]!.logicalName.getValue()).toBe('phone');
        });

        it('should return empty array when no required attributes', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name', { requiredLevel: 'None' })]
            });

            expect(entity.getRequiredAttributes()).toEqual([]);
        });
    });

    describe('getLookupAttributes', () => {
        it('should return only lookup attributes', () => {
            const entity = createValidEntity({
                attributes: [
                    createAttribute('name', { attributeType: AttributeType.create('StringType') }),
                    createAttribute('owner', { attributeType: AttributeType.create('LookupType') }),
                    createAttribute('customer', { attributeType: AttributeType.create('CustomerType') })
                ]
            });

            const lookups = entity.getLookupAttributes();
            expect(lookups).toHaveLength(2);
        });

        it('should return empty array when no lookup attributes', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name', { attributeType: AttributeType.create('StringType') })]
            });

            expect(entity.getLookupAttributes()).toEqual([]);
        });
    });

    describe('getCustomAttributes', () => {
        it('should return only custom attributes', () => {
            const entity = createValidEntity({
                attributes: [
                    createAttribute('name', { isCustomAttribute: false }),
                    createAttribute('custom1', { isCustomAttribute: true }),
                    createAttribute('custom2', { isCustomAttribute: true })
                ]
            });

            const custom = entity.getCustomAttributes();
            expect(custom).toHaveLength(2);
            expect(custom[0]!.logicalName.getValue()).toBe('custom1');
            expect(custom[1]!.logicalName.getValue()).toBe('custom2');
        });

        it('should return empty array when no custom attributes', () => {
            const entity = createValidEntity({
                attributes: [createAttribute('name', { isCustomAttribute: false })]
            });

            expect(entity.getCustomAttributes()).toEqual([]);
        });
    });

    describe('hasRelationships', () => {
        it('should return true when has oneToMany relationships', () => {
            const rel = OneToManyRelationship.create({
                metadataId: 'rel-1',
                schemaName: 'test_rel',
                referencedEntity: 'account',
                referencedAttribute: 'accountid',
                referencingEntity: 'contact',
                referencingAttribute: 'parentcustomerid',
                isCustomRelationship: false,
                isManaged: true,
                relationshipType: 'OneToManyRelationship',
                cascadeConfiguration: CascadeConfiguration.create({
                    assign: 'NoCascade',
                    delete: 'NoCascade',
                    merge: 'NoCascade',
                    reparent: 'NoCascade',
                    share: 'NoCascade',
                    unshare: 'NoCascade'
                })
            });

            const entity = createValidEntity({ oneToManyRelationships: [rel] });
            expect(entity.hasRelationships()).toBe(true);
        });

        it('should return false when no relationships', () => {
            const entity = createValidEntity();
            expect(entity.hasRelationships()).toBe(false);
        });
    });

    describe('getRelationshipCount', () => {
        it('should return total count of all relationships', () => {
            const oneToMany = OneToManyRelationship.create({
                metadataId: 'rel-1',
                schemaName: 'test_1tom',
                referencedEntity: 'account',
                referencedAttribute: 'accountid',
                referencingEntity: 'contact',
                referencingAttribute: 'parentcustomerid',
                isCustomRelationship: false,
                isManaged: true,
                relationshipType: 'OneToManyRelationship',
                cascadeConfiguration: CascadeConfiguration.create({
                    assign: 'NoCascade',
                    delete: 'NoCascade',
                    merge: 'NoCascade',
                    reparent: 'NoCascade',
                    share: 'NoCascade',
                    unshare: 'NoCascade'
                })
            });

            const manyToMany = ManyToManyRelationship.create({
                metadataId: 'rel-2',
                schemaName: 'test_mtom',
                entity1LogicalName: 'account',
                entity1IntersectAttribute: 'accountid',
                entity2LogicalName: 'contact',
                entity2IntersectAttribute: 'contactid',
                intersectEntityName: 'accountcontact',
                isCustomRelationship: false,
                isManaged: true
            });

            const entity = createValidEntity({
                oneToManyRelationships: [oneToMany],
                manyToOneRelationships: [oneToMany],
                manyToManyRelationships: [manyToMany]
            });

            expect(entity.getRelationshipCount()).toBe(3);
        });

        it('should return 0 when no relationships', () => {
            const entity = createValidEntity();
            expect(entity.getRelationshipCount()).toBe(0);
        });
    });

    describe('hasKeys', () => {
        it('should return true when keys exist', () => {
            const key = EntityKey.create({
                metadataId: 'key-1',
                logicalName: LogicalName.create('key_name'),
                schemaName: SchemaName.create('KeyName'),
                displayName: 'Name Key',
                entityLogicalName: 'account',
                keyAttributes: ['name'],
                isManaged: false
            });

            const entity = createValidEntity({ keys: [key] });
            expect(entity.hasKeys()).toBe(true);
        });

        it('should return false when no keys', () => {
            const entity = createValidEntity();
            expect(entity.hasKeys()).toBe(false);
        });
    });

    describe('getPrimaryIdAttributeMetadata', () => {
        it('should return primary ID attribute metadata', () => {
            const idAttr = createAttribute('accountid', { isPrimaryId: true });
            const entity = createValidEntity({
                attributes: [idAttr],
                primaryIdAttribute: 'accountid'
            });

            const found = entity.getPrimaryIdAttributeMetadata();
            expect(found).toBe(idAttr);
        });

        it('should return null when primaryIdAttribute is null', () => {
            const entity = createValidEntity({ primaryIdAttribute: null });
            expect(entity.getPrimaryIdAttributeMetadata()).toBeNull();
        });

        it('should return null when attribute not found', () => {
            const entity = createValidEntity({
                attributes: [],
                primaryIdAttribute: 'accountid'
            });

            expect(entity.getPrimaryIdAttributeMetadata()).toBeNull();
        });
    });

    describe('getPrimaryNameAttributeMetadata', () => {
        it('should return primary name attribute metadata', () => {
            const nameAttr = createAttribute('name', { isPrimaryName: true });
            const entity = createValidEntity({
                attributes: [nameAttr],
                primaryNameAttribute: 'name'
            });

            const found = entity.getPrimaryNameAttributeMetadata();
            expect(found).toBe(nameAttr);
        });

        it('should return null when primaryNameAttribute is null', () => {
            const entity = createValidEntity({ primaryNameAttribute: null });
            expect(entity.getPrimaryNameAttributeMetadata()).toBeNull();
        });
    });

    describe('supportsNotes', () => {
        it('should return true when hasNotes is true', () => {
            const entity = createValidEntity({ hasNotes: true });
            expect(entity.supportsNotes()).toBe(true);
        });

        it('should return false when hasNotes is false', () => {
            const entity = createValidEntity({ hasNotes: false });
            expect(entity.supportsNotes()).toBe(false);
        });
    });

    describe('supportsActivities', () => {
        it('should return true when hasActivities is true', () => {
            const entity = createValidEntity({ hasActivities: true });
            expect(entity.supportsActivities()).toBe(true);
        });

        it('should return false when hasActivities is false', () => {
            const entity = createValidEntity({ hasActivities: false });
            expect(entity.supportsActivities()).toBe(false);
        });
    });

    describe('getCustomRelationships', () => {
        it('should return only custom relationships', () => {
            const customRel = OneToManyRelationship.create({
                metadataId: 'rel-1',
                schemaName: 'custom_rel',
                referencedEntity: 'account',
                referencedAttribute: 'accountid',
                referencingEntity: 'contact',
                referencingAttribute: 'custom_field',
                isCustomRelationship: true,
                isManaged: false,
                relationshipType: 'OneToManyRelationship',
                cascadeConfiguration: CascadeConfiguration.create({
                    assign: 'NoCascade',
                    delete: 'NoCascade',
                    merge: 'NoCascade',
                    reparent: 'NoCascade',
                    share: 'NoCascade',
                    unshare: 'NoCascade'
                })
            });

            const systemRel = OneToManyRelationship.create({
                metadataId: 'rel-2',
                schemaName: 'system_rel',
                referencedEntity: 'account',
                referencedAttribute: 'accountid',
                referencingEntity: 'contact',
                referencingAttribute: 'parentcustomerid',
                isCustomRelationship: false,
                isManaged: true,
                relationshipType: 'OneToManyRelationship',
                cascadeConfiguration: CascadeConfiguration.create({
                    assign: 'NoCascade',
                    delete: 'NoCascade',
                    merge: 'NoCascade',
                    reparent: 'NoCascade',
                    share: 'NoCascade',
                    unshare: 'NoCascade'
                })
            });

            const entity = createValidEntity({
                oneToManyRelationships: [customRel, systemRel]
            });

            const custom = entity.getCustomRelationships();
            expect(custom.oneToMany).toHaveLength(1);
            expect(custom.oneToMany[0]).toBe(customRel);
        });

        it('should return empty arrays when no custom relationships', () => {
            const entity = createValidEntity();
            const custom = entity.getCustomRelationships();

            expect(custom.oneToMany).toEqual([]);
            expect(custom.manyToOne).toEqual([]);
            expect(custom.manyToMany).toEqual([]);
        });
    });

    describe('getActiveKeys', () => {
        it('should return only active keys', () => {
            const activeKey = EntityKey.create({
                metadataId: 'key-1',
                logicalName: LogicalName.create('key_active'),
                schemaName: SchemaName.create('ActiveKey'),
                displayName: 'Active Key',
                entityLogicalName: 'account',
                keyAttributes: ['name'],
                isManaged: false,
                entityKeyIndexStatus: 'Active'
            });

            const pendingKey = EntityKey.create({
                metadataId: 'key-2',
                logicalName: LogicalName.create('key_pending'),
                schemaName: SchemaName.create('PendingKey'),
                displayName: 'Pending Key',
                entityLogicalName: 'account',
                keyAttributes: ['email'],
                isManaged: false,
                entityKeyIndexStatus: 'Pending'
            });

            const entity = createValidEntity({ keys: [activeKey, pendingKey] });
            const active = entity.getActiveKeys();

            expect(active).toHaveLength(1);
            expect(active[0]).toBe(activeKey);
        });

        it('should return empty array when no active keys', () => {
            const entity = createValidEntity();
            expect(entity.getActiveKeys()).toEqual([]);
        });
    });
});
