import { SchemaName } from '../SchemaName';

describe('SchemaName', () => {
    describe('create', () => {
        it('should create a valid PascalCase schema name', () => {
            const schemaName = SchemaName.create('Account');
            expect(schemaName.getValue()).toBe('Account');
        });

        it('should create schema name with underscores', () => {
            const schemaName = SchemaName.create('Custom_Entity');
            expect(schemaName.getValue()).toBe('Custom_Entity');
        });

        it('should create schema name with numbers', () => {
            const schemaName = SchemaName.create('Entity123');
            expect(schemaName.getValue()).toBe('Entity123');
        });

        it('should create schema name starting with lowercase', () => {
            const schemaName = SchemaName.create('customEntity');
            expect(schemaName.getValue()).toBe('customEntity');
        });

        it('should create schema name with mixed case', () => {
            const schemaName = SchemaName.create('CustomEntityName');
            expect(schemaName.getValue()).toBe('CustomEntityName');
        });

        it('should throw error when value is empty string', () => {
            expect(() => SchemaName.create('')).toThrow('Schema name cannot be empty');
        });

        it('should throw error when value is whitespace only', () => {
            expect(() => SchemaName.create('   ')).toThrow('Schema name cannot be empty');
        });

        it('should throw error when value starts with number', () => {
            expect(() => SchemaName.create('123Entity')).toThrow(
                'Invalid schema name format: "123Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error when value starts with underscore', () => {
            expect(() => SchemaName.create('_Entity')).toThrow(
                'Invalid schema name format: "_Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains spaces', () => {
            expect(() => SchemaName.create('Custom Entity')).toThrow(
                'Invalid schema name format: "Custom Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains hyphens', () => {
            expect(() => SchemaName.create('Custom-Entity')).toThrow(
                'Invalid schema name format: "Custom-Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains dots', () => {
            expect(() => SchemaName.create('Custom.Entity')).toThrow(
                'Invalid schema name format: "Custom.Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error when value contains special characters', () => {
            expect(() => SchemaName.create('Custom@Entity')).toThrow(
                'Invalid schema name format: "Custom@Entity". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });
    });

    describe('getValue', () => {
        it('should return the schema name value', () => {
            const schemaName = SchemaName.create('Contact');
            expect(schemaName.getValue()).toBe('Contact');
        });
    });

    describe('equals', () => {
        it('should return true when schema names are equal', () => {
            const name1 = SchemaName.create('Account');
            const name2 = SchemaName.create('Account');
            expect(name1.equals(name2)).toBe(true);
        });

        it('should return false when schema names are different', () => {
            const name1 = SchemaName.create('Account');
            const name2 = SchemaName.create('Contact');
            expect(name1.equals(name2)).toBe(false);
        });

        it('should return false when case differs', () => {
            const name1 = SchemaName.create('Account');
            const name2 = SchemaName.create('account');
            expect(name1.equals(name2)).toBe(false);
        });

        it('should return true when comparing same instance', () => {
            const name = SchemaName.create('Account');
            expect(name.equals(name)).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the schema name value as string', () => {
            const schemaName = SchemaName.create('Opportunity');
            expect(schemaName.toString()).toBe('Opportunity');
        });
    });
});
