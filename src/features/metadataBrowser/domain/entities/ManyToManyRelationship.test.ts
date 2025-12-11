import { ManyToManyRelationship } from './ManyToManyRelationship';

describe('ManyToManyRelationship', () => {
    const createValidRelationship = (overrides?: Partial<{
        metadataId: string;
        schemaName: string;
        entity1LogicalName: string;
        entity1IntersectAttribute: string;
        entity2LogicalName: string;
        entity2IntersectAttribute: string;
        intersectEntityName: string;
        isCustomRelationship: boolean;
        isManaged: boolean;
        entity1NavigationPropertyName: string | null;
        entity2NavigationPropertyName: string | null;
    }>): ManyToManyRelationship => {
        return ManyToManyRelationship.create({
            metadataId: 'rel-12345',
            schemaName: 'contact_account',
            entity1LogicalName: 'contact',
            entity1IntersectAttribute: 'contactid',
            entity2LogicalName: 'account',
            entity2IntersectAttribute: 'accountid',
            intersectEntityName: 'contactaccount',
            isCustomRelationship: true,
            isManaged: false,
            ...overrides
        });
    };

    describe('create', () => {
        it('should create relationship with all required fields', () => {
            const rel = createValidRelationship();

            expect(rel.metadataId).toBe('rel-12345');
            expect(rel.schemaName).toBe('contact_account');
            expect(rel.entity1LogicalName).toBe('contact');
            expect(rel.entity1IntersectAttribute).toBe('contactid');
            expect(rel.entity2LogicalName).toBe('account');
            expect(rel.entity2IntersectAttribute).toBe('accountid');
            expect(rel.intersectEntityName).toBe('contactaccount');
            expect(rel.isCustomRelationship).toBe(true);
            expect(rel.isManaged).toBe(false);
        });

        it('should set navigation properties to null when not provided', () => {
            const rel = createValidRelationship();

            expect(rel.entity1NavigationPropertyName).toBeNull();
            expect(rel.entity2NavigationPropertyName).toBeNull();
        });

        it('should create relationship with navigation properties', () => {
            const rel = createValidRelationship({
                entity1NavigationPropertyName: 'contact_accounts',
                entity2NavigationPropertyName: 'account_contacts'
            });

            expect(rel.entity1NavigationPropertyName).toBe('contact_accounts');
            expect(rel.entity2NavigationPropertyName).toBe('account_contacts');
        });

        it('should create system relationship', () => {
            const rel = createValidRelationship({
                isCustomRelationship: false,
                isManaged: true
            });

            expect(rel.isCustomRelationship).toBe(false);
            expect(rel.isManaged).toBe(true);
        });

        it('should throw error when metadataId is empty string', () => {
            expect(() => createValidRelationship({ metadataId: '' })).toThrow('Invalid ManyToManyRelationship: metadataId cannot be empty');
        });

        it('should throw error when metadataId is whitespace', () => {
            expect(() => createValidRelationship({ metadataId: '   ' })).toThrow('Invalid ManyToManyRelationship: metadataId cannot be empty');
        });

        it('should throw error when schemaName is empty string', () => {
            expect(() => createValidRelationship({ schemaName: '' })).toThrow('Invalid ManyToManyRelationship: schemaName cannot be empty');
        });

        it('should throw error when schemaName is whitespace', () => {
            expect(() => createValidRelationship({ schemaName: '   ' })).toThrow('Invalid ManyToManyRelationship: schemaName cannot be empty');
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

    describe('isSelfReferencing', () => {
        it('should return true when both entities are the same', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'account',
                entity2LogicalName: 'account'
            });

            expect(rel.isSelfReferencing()).toBe(true);
        });

        it('should return false when entities are different', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'contact',
                entity2LogicalName: 'account'
            });

            expect(rel.isSelfReferencing()).toBe(false);
        });

        it('should return true for user-user relationship', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'systemuser',
                entity2LogicalName: 'systemuser',
                intersectEntityName: 'systemuser_systemuser'
            });

            expect(rel.isSelfReferencing()).toBe(true);
        });

        it('should be case sensitive', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'account',
                entity2LogicalName: 'Account'
            });

            expect(rel.isSelfReferencing()).toBe(false);
        });
    });

    describe('getOtherEntity', () => {
        it('should return entity2 when current entity is entity1', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'contact',
                entity2LogicalName: 'account'
            });

            expect(rel.getOtherEntity('contact')).toBe('account');
        });

        it('should return entity1 when current entity is entity2', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'contact',
                entity2LogicalName: 'account'
            });

            expect(rel.getOtherEntity('account')).toBe('contact');
        });

        it('should return null when current entity is neither entity1 nor entity2', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'contact',
                entity2LogicalName: 'account'
            });

            expect(rel.getOtherEntity('lead')).toBeNull();
        });

        it('should return same entity for self-referencing relationship when querying entity1', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'account',
                entity2LogicalName: 'account'
            });

            expect(rel.getOtherEntity('account')).toBe('account');
        });

        it('should be case sensitive', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'contact',
                entity2LogicalName: 'account'
            });

            expect(rel.getOtherEntity('Contact')).toBeNull();
            expect(rel.getOtherEntity('Account')).toBeNull();
        });

        it('should handle complex entity names', () => {
            const rel = createValidRelationship({
                entity1LogicalName: 'cr9a7_custom_entity_1',
                entity2LogicalName: 'cr9a7_custom_entity_2'
            });

            expect(rel.getOtherEntity('cr9a7_custom_entity_1')).toBe('cr9a7_custom_entity_2');
            expect(rel.getOtherEntity('cr9a7_custom_entity_2')).toBe('cr9a7_custom_entity_1');
        });
    });

    describe('raw DTO methods', () => {
        it('should initially have null raw DTO', () => {
            const rel = createValidRelationship();
            expect(rel.getRawDto()).toBeNull();
        });

        it('should store and retrieve raw DTO', () => {
            const rel = createValidRelationship();
            const rawDto = { SchemaName: 'contact_account', MetadataId: '12345' };

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
            rel.setRawDto({ SchemaName: 'contact_account' });
            expect(rel.hasRawDto()).toBe(true);
        });
    });
});
