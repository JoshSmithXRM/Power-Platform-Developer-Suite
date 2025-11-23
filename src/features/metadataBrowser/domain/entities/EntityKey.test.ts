import { EntityKey } from './EntityKey';
import { LogicalName } from './../valueObjects/LogicalName';
import { SchemaName } from './../valueObjects/SchemaName';

describe('EntityKey', () => {
    const createValidEntityKey = (overrides?: Partial<{
        metadataId: string;
        logicalName: LogicalName;
        schemaName: SchemaName;
        displayName: string;
        entityLogicalName: string;
        keyAttributes: string[];
        isManaged: boolean;
        entityKeyIndexStatus: string | null;
    }>): EntityKey => {
        return EntityKey.create({
            metadataId: '12345-abcde',
            logicalName: LogicalName.create('key_account_name'),
            schemaName: SchemaName.create('AccountNameKey'),
            displayName: 'Account Name Key',
            entityLogicalName: 'account',
            keyAttributes: ['name'],
            isManaged: false,
            entityKeyIndexStatus: 'Active',
            ...overrides
        });
    };

    describe('create', () => {
        it('should create entity key with all required fields', () => {
            const key = createValidEntityKey();

            expect(key.metadataId).toBe('12345-abcde');
            expect(key.logicalName.getValue()).toBe('key_account_name');
            expect(key.schemaName.getValue()).toBe('AccountNameKey');
            expect(key.displayName).toBe('Account Name Key');
            expect(key.entityLogicalName).toBe('account');
            expect(key.keyAttributes).toEqual(['name']);
            expect(key.isManaged).toBe(false);
            expect(key.entityKeyIndexStatus).toBe('Active');
        });

        it('should create entity key with composite key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname', 'emailaddress']
            });

            expect(key.keyAttributes).toEqual(['firstname', 'lastname', 'emailaddress']);
        });

        it('should set entityKeyIndexStatus to null when not provided', () => {
            const key = EntityKey.create({
                metadataId: '12345',
                logicalName: LogicalName.create('key_test'),
                schemaName: SchemaName.create('TestKey'),
                displayName: 'Test Key',
                entityLogicalName: 'test',
                keyAttributes: ['id'],
                isManaged: false
            });

            expect(key.entityKeyIndexStatus).toBeNull();
        });

        it('should throw error when metadataId is empty string', () => {
            expect(() => createValidEntityKey({ metadataId: '' })).toThrow('Entity key metadata ID cannot be empty');
        });

        it('should throw error when metadataId is whitespace', () => {
            expect(() => createValidEntityKey({ metadataId: '   ' })).toThrow('Entity key metadata ID cannot be empty');
        });

        it('should throw error when displayName is empty string', () => {
            expect(() => createValidEntityKey({ displayName: '' })).toThrow('Entity key display name cannot be empty');
        });

        it('should throw error when displayName is whitespace', () => {
            expect(() => createValidEntityKey({ displayName: '   ' })).toThrow('Entity key display name cannot be empty');
        });

        it('should throw error when keyAttributes array is empty', () => {
            expect(() => createValidEntityKey({ keyAttributes: [] })).toThrow('Entity key must have at least one attribute');
        });
    });

    describe('isCompositeKey', () => {
        it('should return false for single attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['name']
            });

            expect(key.isCompositeKey()).toBe(false);
        });

        it('should return true for two attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname']
            });

            expect(key.isCompositeKey()).toBe(true);
        });

        it('should return true for multiple attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname', 'emailaddress', 'company']
            });

            expect(key.isCompositeKey()).toBe(true);
        });
    });

    describe('isActive', () => {
        it('should return true when entityKeyIndexStatus is Active', () => {
            const key = createValidEntityKey({
                entityKeyIndexStatus: 'Active'
            });

            expect(key.isActive()).toBe(true);
        });

        it('should return false when entityKeyIndexStatus is Pending', () => {
            const key = createValidEntityKey({
                entityKeyIndexStatus: 'Pending'
            });

            expect(key.isActive()).toBe(false);
        });

        it('should return false when entityKeyIndexStatus is Failed', () => {
            const key = createValidEntityKey({
                entityKeyIndexStatus: 'Failed'
            });

            expect(key.isActive()).toBe(false);
        });

        it('should return false when entityKeyIndexStatus is null', () => {
            const key = createValidEntityKey({
                entityKeyIndexStatus: null
            });

            expect(key.isActive()).toBe(false);
        });

        it('should return false when entityKeyIndexStatus is InProgress', () => {
            const key = createValidEntityKey({
                entityKeyIndexStatus: 'InProgress'
            });

            expect(key.isActive()).toBe(false);
        });
    });

    describe('getAttributeCount', () => {
        it('should return 1 for single attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['name']
            });

            expect(key.getAttributeCount()).toBe(1);
        });

        it('should return 2 for two attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname']
            });

            expect(key.getAttributeCount()).toBe(2);
        });

        it('should return correct count for multiple attributes', () => {
            const key = createValidEntityKey({
                keyAttributes: ['attr1', 'attr2', 'attr3', 'attr4', 'attr5']
            });

            expect(key.getAttributeCount()).toBe(5);
        });
    });

    describe('includesAttribute', () => {
        it('should return true when attribute is in key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname', 'emailaddress']
            });

            expect(key.includesAttribute('lastname')).toBe(true);
        });

        it('should return false when attribute is not in key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['firstname', 'lastname']
            });

            expect(key.includesAttribute('emailaddress')).toBe(false);
        });

        it('should return true for first attribute', () => {
            const key = createValidEntityKey({
                keyAttributes: ['name', 'code']
            });

            expect(key.includesAttribute('name')).toBe(true);
        });

        it('should return true for last attribute', () => {
            const key = createValidEntityKey({
                keyAttributes: ['name', 'code']
            });

            expect(key.includesAttribute('code')).toBe(true);
        });

        it('should be case sensitive', () => {
            const key = createValidEntityKey({
                keyAttributes: ['name']
            });

            expect(key.includesAttribute('Name')).toBe(false);
            expect(key.includesAttribute('NAME')).toBe(false);
        });

        it('should return true for single attribute key', () => {
            const key = createValidEntityKey({
                keyAttributes: ['id']
            });

            expect(key.includesAttribute('id')).toBe(true);
        });
    });
});
