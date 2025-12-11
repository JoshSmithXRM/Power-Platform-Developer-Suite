import { OneToManyRelationship } from './OneToManyRelationship';
import { CascadeConfiguration } from './../valueObjects/CascadeConfiguration';

describe('OneToManyRelationship', () => {
    const createCascadeConfig = (deleteAction: 'NoCascade' | 'Cascade' = 'NoCascade'): CascadeConfiguration => {
        return CascadeConfiguration.create({
            assign: 'NoCascade',
            delete: deleteAction,
            merge: 'NoCascade',
            reparent: 'NoCascade',
            share: 'NoCascade',
            unshare: 'NoCascade'
        });
    };

    const createValidRelationship = (overrides?: Partial<{
        metadataId: string;
        schemaName: string;
        referencedEntity: string;
        referencedAttribute: string;
        referencingEntity: string;
        referencingAttribute: string;
        isCustomRelationship: boolean;
        isManaged: boolean;
        relationshipType: string;
        cascadeConfiguration: CascadeConfiguration;
        referencedEntityNavigationPropertyName: string | null;
        referencingEntityNavigationPropertyName: string | null;
        isHierarchical: boolean;
        securityTypes: string | null;
    }>): OneToManyRelationship => {
        return OneToManyRelationship.create({
            metadataId: 'rel-12345',
            schemaName: 'account_contact',
            referencedEntity: 'account',
            referencedAttribute: 'accountid',
            referencingEntity: 'contact',
            referencingAttribute: 'parentcustomerid',
            isCustomRelationship: true,
            isManaged: false,
            relationshipType: 'OneToManyRelationship',
            cascadeConfiguration: createCascadeConfig(),
            ...overrides
        });
    };

    describe('create', () => {
        it('should create relationship with all required fields', () => {
            const rel = createValidRelationship();

            expect(rel.metadataId).toBe('rel-12345');
            expect(rel.schemaName).toBe('account_contact');
            expect(rel.referencedEntity).toBe('account');
            expect(rel.referencedAttribute).toBe('accountid');
            expect(rel.referencingEntity).toBe('contact');
            expect(rel.referencingAttribute).toBe('parentcustomerid');
            expect(rel.isCustomRelationship).toBe(true);
            expect(rel.isManaged).toBe(false);
            expect(rel.relationshipType).toBe('OneToManyRelationship');
        });

        it('should set optional navigation properties to null when not provided', () => {
            const rel = createValidRelationship();

            expect(rel.referencedEntityNavigationPropertyName).toBeNull();
            expect(rel.referencingEntityNavigationPropertyName).toBeNull();
        });

        it('should set isHierarchical to false when not provided', () => {
            const rel = createValidRelationship();

            expect(rel.isHierarchical).toBe(false);
        });

        it('should set securityTypes to null when not provided', () => {
            const rel = createValidRelationship();

            expect(rel.securityTypes).toBeNull();
        });

        it('should create relationship with navigation properties', () => {
            const rel = createValidRelationship({
                referencedEntityNavigationPropertyName: 'contact_parent_account',
                referencingEntityNavigationPropertyName: 'account_primary_contact'
            });

            expect(rel.referencedEntityNavigationPropertyName).toBe('contact_parent_account');
            expect(rel.referencingEntityNavigationPropertyName).toBe('account_primary_contact');
        });

        it('should create hierarchical relationship', () => {
            const rel = createValidRelationship({
                isHierarchical: true,
                referencedEntity: 'account',
                referencingEntity: 'account'
            });

            expect(rel.isHierarchical).toBe(true);
        });

        it('should create relationship with security types', () => {
            const rel = createValidRelationship({
                securityTypes: 'Append,AppendTo'
            });

            expect(rel.securityTypes).toBe('Append,AppendTo');
        });

        it('should throw error when metadataId is empty string', () => {
            expect(() => createValidRelationship({ metadataId: '' })).toThrow('Invalid OneToManyRelationship: metadataId cannot be empty');
        });

        it('should throw error when metadataId is whitespace', () => {
            expect(() => createValidRelationship({ metadataId: '   ' })).toThrow('Invalid OneToManyRelationship: metadataId cannot be empty');
        });

        it('should throw error when schemaName is empty string', () => {
            expect(() => createValidRelationship({ schemaName: '' })).toThrow('Invalid OneToManyRelationship: schemaName cannot be empty');
        });

        it('should throw error when schemaName is whitespace', () => {
            expect(() => createValidRelationship({ schemaName: '   ' })).toThrow('Invalid OneToManyRelationship: schemaName cannot be empty');
        });
    });

    describe('isSystemRelationship', () => {
        it('should return true when isCustomRelationship is false', () => {
            const rel = createValidRelationship({
                isCustomRelationship: false
            });

            expect(rel.isSystemRelationship()).toBe(true);
        });

        it('should return false when isCustomRelationship is true', () => {
            const rel = createValidRelationship({
                isCustomRelationship: true
            });

            expect(rel.isSystemRelationship()).toBe(false);
        });
    });

    describe('willCascadeDelete', () => {
        it('should return true when cascade configuration has Cascade delete', () => {
            const cascadeConfig = createCascadeConfig('Cascade');
            const rel = createValidRelationship({
                cascadeConfiguration: cascadeConfig
            });

            expect(rel.willCascadeDelete()).toBe(true);
        });

        it('should return false when cascade configuration has NoCascade delete', () => {
            const cascadeConfig = createCascadeConfig('NoCascade');
            const rel = createValidRelationship({
                cascadeConfiguration: cascadeConfig
            });

            expect(rel.willCascadeDelete()).toBe(false);
        });

        it('should delegate to cascade configuration', () => {
            const cascadeConfig = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });
            const rel = createValidRelationship({
                cascadeConfiguration: cascadeConfig
            });

            expect(rel.willCascadeDelete()).toBe(cascadeConfig.willCascadeDelete());
        });
    });

    describe('isSelfReferencing', () => {
        it('should return true when referenced and referencing entities are same', () => {
            const rel = createValidRelationship({
                referencedEntity: 'account',
                referencingEntity: 'account'
            });

            expect(rel.isSelfReferencing()).toBe(true);
        });

        it('should return false when referenced and referencing entities are different', () => {
            const rel = createValidRelationship({
                referencedEntity: 'account',
                referencingEntity: 'contact'
            });

            expect(rel.isSelfReferencing()).toBe(false);
        });

        it('should return true for hierarchical account relationship', () => {
            const rel = createValidRelationship({
                referencedEntity: 'account',
                referencingEntity: 'account',
                referencedAttribute: 'accountid',
                referencingAttribute: 'parentaccountid',
                isHierarchical: true
            });

            expect(rel.isSelfReferencing()).toBe(true);
            expect(rel.isHierarchical).toBe(true);
        });

        it('should be case sensitive', () => {
            const rel = createValidRelationship({
                referencedEntity: 'account',
                referencingEntity: 'Account'
            });

            expect(rel.isSelfReferencing()).toBe(false);
        });
    });

    describe('raw DTO methods', () => {
        it('should initially have null raw DTO', () => {
            const rel = createValidRelationship();
            expect(rel.getRawDto()).toBeNull();
        });

        it('should store and retrieve raw DTO', () => {
            const rel = createValidRelationship();
            const rawDto = { SchemaName: 'account_contact', MetadataId: '12345' };

            rel.setRawDto(rawDto);

            expect(rel.getRawDto()).toBe(rawDto);
        });

        it('should allow overwriting raw DTO', () => {
            const rel = createValidRelationship();
            const firstDto = { SchemaName: 'rel1' };
            const secondDto = { SchemaName: 'rel2' };

            rel.setRawDto(firstDto);
            rel.setRawDto(secondDto);

            expect(rel.getRawDto()).toBe(secondDto);
        });

        it('should return false for hasRawDto when no DTO is set', () => {
            const rel = createValidRelationship();
            expect(rel.hasRawDto()).toBe(false);
        });

        it('should return true for hasRawDto after setting DTO', () => {
            const rel = createValidRelationship();
            rel.setRawDto({ SchemaName: 'account_contact' });
            expect(rel.hasRawDto()).toBe(true);
        });
    });
});
