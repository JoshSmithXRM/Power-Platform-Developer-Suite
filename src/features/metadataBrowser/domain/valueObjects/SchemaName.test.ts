import { SchemaName } from './SchemaName';

describe('SchemaName', () => {
    describe('create - Valid names', () => {
        it('should create schema name with PascalCase', () => {
            // Arrange
            const value = 'Account';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account');
        });

        it('should create schema name with multiple PascalCase words', () => {
            // Arrange
            const value = 'AccountOwner';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('AccountOwner');
        });

        it('should create schema name starting with lowercase letter', () => {
            // Arrange
            const value = 'account';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('account');
        });

        it('should create schema name with numbers', () => {
            // Arrange
            const value = 'Account2FA';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account2FA');
        });

        it('should create schema name with underscores', () => {
            // Arrange
            const value = 'Account_Owner';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account_Owner');
        });

        it('should create schema name with multiple underscores', () => {
            // Arrange
            const value = 'Account__Owner__Info';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account__Owner__Info');
        });

        it('should create schema name with underscores and numbers', () => {
            // Arrange
            const value = 'Account_2FA_Info';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account_2FA_Info');
        });

        it('should create schema name with prefix convention', () => {
            // Arrange
            const value = 'new_Account';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('new_Account');
        });

        it('should create single character schema name', () => {
            // Arrange
            const value = 'A';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('A');
        });

        it('should create schema name with trailing underscore', () => {
            // Arrange
            const value = 'Account_';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName).toBeDefined();
            expect(schemaName.getValue()).toBe('Account_');
        });
    });

    describe('create - Invalid names', () => {
        it('should throw error for empty string', () => {
            // Arrange
            const value = '';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow('Schema name cannot be empty');
        });

        it('should throw error for whitespace only string', () => {
            // Arrange
            const value = '   ';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow('Schema name cannot be empty');
        });

        it('should throw error for string starting with number', () => {
            // Arrange
            const value = '2Account';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "2Account". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string starting with underscore', () => {
            // Arrange
            const value = '_Account';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "_Account". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string with space', () => {
            // Arrange
            const value = 'Account Owner';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "Account Owner". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string with hyphen', () => {
            // Arrange
            const value = 'Account-Owner';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "Account-Owner". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string with special characters', () => {
            // Arrange
            const value = 'Account@Owner';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "Account@Owner". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string with dot', () => {
            // Arrange
            const value = 'Account.Owner';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "Account.Owner". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for string with parentheses', () => {
            // Arrange
            const value = 'Account(Owner)';

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow(
                'Invalid schema name format: "Account(Owner)". Must start with a letter and contain only letters, numbers, and underscores.'
            );
        });

        it('should throw error for null value', () => {
            // Arrange
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = null as any;

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow('Schema name cannot be empty');
        });

        it('should throw error for undefined value', () => {
            // Arrange
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = undefined as any;

            // Act & Assert
            expect(() => SchemaName.create(value)).toThrow('Schema name cannot be empty');
        });
    });

    describe('getValue', () => {
        it('should return the original value', () => {
            // Arrange
            const value = 'TestSchema';
            const schemaName = SchemaName.create(value);

            // Act
            const result = schemaName.getValue();

            // Assert
            expect(result).toBe('TestSchema');
        });

        it('should return value with underscores preserved', () => {
            // Arrange
            const value = 'Test_Schema_Name';
            const schemaName = SchemaName.create(value);

            // Act
            const result = schemaName.getValue();

            // Assert
            expect(result).toBe('Test_Schema_Name');
        });
    });

    describe('equals', () => {
        it('should return true for identical schema names', () => {
            // Arrange
            const schemaName1 = SchemaName.create('Account');
            const schemaName2 = SchemaName.create('Account');

            // Act
            const result = schemaName1.equals(schemaName2);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for different schema names', () => {
            // Arrange
            const schemaName1 = SchemaName.create('Account');
            const schemaName2 = SchemaName.create('Contact');

            // Act
            const result = schemaName1.equals(schemaName2);

            // Assert
            expect(result).toBe(false);
        });

        it('should be case-sensitive', () => {
            // Arrange
            const schemaName1 = SchemaName.create('Account');
            const schemaName2 = SchemaName.create('account');

            // Act
            const result = schemaName1.equals(schemaName2);

            // Assert
            expect(result).toBe(false);
        });

        it('should return true for names with underscores', () => {
            // Arrange
            const schemaName1 = SchemaName.create('Account_Owner');
            const schemaName2 = SchemaName.create('Account_Owner');

            // Act
            const result = schemaName1.equals(schemaName2);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the schema name value', () => {
            // Arrange
            const value = 'TestSchema';
            const schemaName = SchemaName.create(value);

            // Act
            const result = schemaName.toString();

            // Assert
            expect(result).toBe('TestSchema');
        });

        it('should work in string concatenation', () => {
            // Arrange
            const schemaName = SchemaName.create('Account');

            // Act
            const result = `Schema: ${schemaName}`;

            // Assert
            expect(result).toBe('Schema: Account');
        });
    });

    describe('edge cases', () => {
        it('should handle very long schema names', () => {
            // Arrange
            const value = 'A' + 'b'.repeat(1000);

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName.getValue()).toBe(value);
        });

        it('should handle names with many underscores', () => {
            // Arrange
            const value = 'A_B_C_D_E_F_G_H';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName.getValue()).toBe('A_B_C_D_E_F_G_H');
        });

        it('should handle names with alternating letters and numbers', () => {
            // Arrange
            const value = 'A1B2C3D4E5';

            // Act
            const schemaName = SchemaName.create(value);

            // Assert
            expect(schemaName.getValue()).toBe('A1B2C3D4E5');
        });
    });
});
