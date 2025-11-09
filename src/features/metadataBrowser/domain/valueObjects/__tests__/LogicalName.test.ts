import { LogicalName } from '../LogicalName';

describe('LogicalName', () => {
    describe('create', () => {
        it('should create a valid logical name', () => {
            const logicalName = LogicalName.create('account');
            expect(logicalName.getValue()).toBe('account');
        });

        it('should create logical name with underscores', () => {
            const logicalName = LogicalName.create('custom_entity');
            expect(logicalName.getValue()).toBe('custom_entity');
        });

        it('should create logical name with numbers', () => {
            const logicalName = LogicalName.create('entity123');
            expect(logicalName.getValue()).toBe('entity123');
        });

        it('should create logical name with underscore and numbers', () => {
            const logicalName = LogicalName.create('custom_entity_123');
            expect(logicalName.getValue()).toBe('custom_entity_123');
        });

        it('should throw error when value is empty string', () => {
            expect(() => LogicalName.create('')).toThrow('Logical name cannot be empty');
        });

        it('should throw error when value is whitespace only', () => {
            expect(() => LogicalName.create('   ')).toThrow('Logical name cannot be empty');
        });

        it('should throw error when value starts with uppercase letter', () => {
            expect(() => LogicalName.create('Account')).toThrow(
                'Invalid logical name format: "Account". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value starts with number', () => {
            expect(() => LogicalName.create('123entity')).toThrow(
                'Invalid logical name format: "123entity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value starts with underscore', () => {
            expect(() => LogicalName.create('_entity')).toThrow(
                'Invalid logical name format: "_entity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains uppercase letters', () => {
            expect(() => LogicalName.create('customEntity')).toThrow(
                'Invalid logical name format: "customEntity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains spaces', () => {
            expect(() => LogicalName.create('custom entity')).toThrow(
                'Invalid logical name format: "custom entity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains special characters', () => {
            expect(() => LogicalName.create('custom-entity')).toThrow(
                'Invalid logical name format: "custom-entity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains dots', () => {
            expect(() => LogicalName.create('custom.entity')).toThrow(
                'Invalid logical name format: "custom.entity". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });
    });

    describe('getValue', () => {
        it('should return the logical name value', () => {
            const logicalName = LogicalName.create('contact');
            expect(logicalName.getValue()).toBe('contact');
        });
    });

    describe('equals', () => {
        it('should return true when logical names are equal', () => {
            const name1 = LogicalName.create('account');
            const name2 = LogicalName.create('account');
            expect(name1.equals(name2)).toBe(true);
        });

        it('should return false when logical names are different', () => {
            const name1 = LogicalName.create('account');
            const name2 = LogicalName.create('contact');
            expect(name1.equals(name2)).toBe(false);
        });

        it('should return true when comparing same instance', () => {
            const name = LogicalName.create('account');
            expect(name.equals(name)).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the logical name value as string', () => {
            const logicalName = LogicalName.create('opportunity');
            expect(logicalName.toString()).toBe('opportunity');
        });
    });
});
