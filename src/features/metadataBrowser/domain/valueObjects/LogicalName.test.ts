import { LogicalName } from './LogicalName';

describe('LogicalName', () => {
    describe('create - Valid logical names', () => {
        it('should create a LogicalName with a valid lowercase name', () => {
            // Arrange
            const validName = 'account';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('account');
        });

        it('should create a LogicalName with lowercase letters and numbers', () => {
            // Arrange
            const validName = 'account123';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('account123');
        });

        it('should create a LogicalName with underscores', () => {
            // Arrange
            const validName = 'custom_account';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('custom_account');
        });

        it('should create a LogicalName with multiple underscores', () => {
            // Arrange
            const validName = 'custom_account_entity';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('custom_account_entity');
        });

        it('should create a LogicalName starting with a lowercase letter followed by numbers and underscores', () => {
            // Arrange
            const validName = 'a1_2_3';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('a1_2_3');
        });

        it('should create a LogicalName with single character', () => {
            // Arrange
            const validName = 'a';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('a');
        });

        it('should create a LogicalName with long valid name', () => {
            // Arrange
            const validName = 'very_long_logical_name_with_many_underscores_123';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('very_long_logical_name_with_many_underscores_123');
        });
    });

    describe('create - Invalid logical names', () => {
        it('should throw error for empty string', () => {
            // Arrange
            const invalidName = '';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow('Logical name cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            // Arrange
            const invalidName = '   ';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow('Logical name cannot be empty');
        });

        it('should throw error for name starting with uppercase letter', () => {
            // Arrange
            const invalidName = 'Account';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "Account". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name starting with number', () => {
            // Arrange
            const invalidName = '1account';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "1account". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name starting with underscore', () => {
            // Arrange
            const invalidName = '_account';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "_account". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name containing spaces', () => {
            // Arrange
            const invalidName = 'account name';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "account name". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name containing hyphens', () => {
            // Arrange
            const invalidName = 'account-name';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "account-name". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name containing special characters', () => {
            // Arrange
            const invalidName = 'account@name';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "account@name". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name containing dots', () => {
            // Arrange
            const invalidName = 'account.name';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "account.name". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name containing uppercase letters in the middle', () => {
            // Arrange
            const invalidName = 'accountName';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "accountName". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name with trailing spaces', () => {
            // Arrange
            const invalidName = 'account ';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: "account ". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });

        it('should throw error for name with leading spaces', () => {
            // Arrange
            const invalidName = ' account';

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow(
                'Invalid logical name format: " account". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.'
            );
        });
    });

    describe('getValue', () => {
        it('should return the exact value stored in the LogicalName', () => {
            // Arrange
            const logicalName = LogicalName.create('contact');

            // Act
            const result = logicalName.getValue();

            // Assert
            expect(result).toBe('contact');
        });

        it('should return the same value for multiple calls', () => {
            // Arrange
            const logicalName = LogicalName.create('account_contact');

            // Act
            const firstCall = logicalName.getValue();
            const secondCall = logicalName.getValue();

            // Assert
            expect(firstCall).toBe(secondCall);
            expect(firstCall).toBe('account_contact');
        });
    });

    describe('equals', () => {
        it('should return true for LogicalNames with identical values', () => {
            // Arrange
            const logicalName1 = LogicalName.create('account');
            const logicalName2 = LogicalName.create('account');

            // Act
            const result = logicalName1.equals(logicalName2);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for LogicalNames with different values', () => {
            // Arrange
            const logicalName1 = LogicalName.create('account');
            const logicalName2 = LogicalName.create('contact');

            // Act
            const result = logicalName1.equals(logicalName2);

            // Assert
            expect(result).toBe(false);
        });

        it('should return true for same instance', () => {
            // Arrange
            const logicalName = LogicalName.create('account');

            // Act
            const result = logicalName.equals(logicalName);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the logical name value as string', () => {
            // Arrange
            const logicalName = LogicalName.create('account');

            // Act
            const result = logicalName.toString();

            // Assert
            expect(result).toBe('account');
        });

        it('should return correct string representation with underscores', () => {
            // Arrange
            const logicalName = LogicalName.create('custom_entity_name');

            // Act
            const result = logicalName.toString();

            // Assert
            expect(result).toBe('custom_entity_name');
        });

        it('should allow string concatenation with toString result', () => {
            // Arrange
            const logicalName = LogicalName.create('contact');

            // Act
            const result = 'Entity: ' + logicalName.toString();

            // Assert
            expect(result).toBe('Entity: contact');
        });
    });

    describe('Edge cases', () => {
        it('should handle logical name with consecutive numbers', () => {
            // Arrange
            const validName = 'account123456';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('account123456');
        });

        it('should handle logical name ending with underscore followed by number', () => {
            // Arrange
            const validName = 'account_1';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('account_1');
        });

        it('should handle logical name with alternating underscores and numbers', () => {
            // Arrange
            const validName = 'a_1_b_2_c_3';

            // Act
            const result = LogicalName.create(validName);

            // Assert
            expect(result.getValue()).toBe('a_1_b_2_c_3');
        });

        it('should handle null input by treating as falsy', () => {
            // Arrange
            const invalidName = null as unknown as string;

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow('Logical name cannot be empty');
        });

        it('should handle undefined input by treating as falsy', () => {
            // Arrange
            const invalidName = undefined as unknown as string;

            // Act & Assert
            expect(() => LogicalName.create(invalidName)).toThrow('Logical name cannot be empty');
        });
    });
});
