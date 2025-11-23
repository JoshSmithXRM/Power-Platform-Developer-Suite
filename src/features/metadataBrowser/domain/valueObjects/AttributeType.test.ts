import { AttributeType } from './AttributeType';

describe('AttributeType', () => {
    // ========== Creation & Validation ==========

    describe('create', () => {
        it('should create AttributeType with StringType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('StringType');

            // Assert
            expect(attributeType).toBeInstanceOf(AttributeType);
            expect(attributeType.getValue()).toBe('StringType');
        });

        it('should create AttributeType with legacy String type', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('String');

            // Assert
            expect(attributeType).toBeInstanceOf(AttributeType);
            expect(attributeType.getValue()).toBe('String');
        });

        it('should create AttributeType with MemoType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('MemoType');

            // Assert
            expect(attributeType.getValue()).toBe('MemoType');
        });

        it('should create AttributeType with IntegerType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('IntegerType');

            // Assert
            expect(attributeType.getValue()).toBe('IntegerType');
        });

        it('should create AttributeType with BigIntType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('BigIntType');

            // Assert
            expect(attributeType.getValue()).toBe('BigIntType');
        });

        it('should create AttributeType with DoubleType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('DoubleType');

            // Assert
            expect(attributeType.getValue()).toBe('DoubleType');
        });

        it('should create AttributeType with DecimalType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('DecimalType');

            // Assert
            expect(attributeType.getValue()).toBe('DecimalType');
        });

        it('should create AttributeType with MoneyType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('MoneyType');

            // Assert
            expect(attributeType.getValue()).toBe('MoneyType');
        });

        it('should create AttributeType with BooleanType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('BooleanType');

            // Assert
            expect(attributeType.getValue()).toBe('BooleanType');
        });

        it('should create AttributeType with DateTimeType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('DateTimeType');

            // Assert
            expect(attributeType.getValue()).toBe('DateTimeType');
        });

        it('should create AttributeType with LookupType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('LookupType');

            // Assert
            expect(attributeType.getValue()).toBe('LookupType');
        });

        it('should create AttributeType with CustomerType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('CustomerType');

            // Assert
            expect(attributeType.getValue()).toBe('CustomerType');
        });

        it('should create AttributeType with OwnerType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('OwnerType');

            // Assert
            expect(attributeType.getValue()).toBe('OwnerType');
        });

        it('should create AttributeType with PicklistType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('PicklistType');

            // Assert
            expect(attributeType.getValue()).toBe('PicklistType');
        });

        it('should create AttributeType with StateType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('StateType');

            // Assert
            expect(attributeType.getValue()).toBe('StateType');
        });

        it('should create AttributeType with StatusType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('StatusType');

            // Assert
            expect(attributeType.getValue()).toBe('StatusType');
        });

        it('should create AttributeType with MultiSelectPicklistType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('MultiSelectPicklistType');

            // Assert
            expect(attributeType.getValue()).toBe('MultiSelectPicklistType');
        });

        it('should create AttributeType with UniqueidentifierType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('UniqueidentifierType');

            // Assert
            expect(attributeType.getValue()).toBe('UniqueidentifierType');
        });

        it('should create AttributeType with FileType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('FileType');

            // Assert
            expect(attributeType.getValue()).toBe('FileType');
        });

        it('should create AttributeType with ImageType', () => {
            // Arrange & Act
            const attributeType = AttributeType.create('ImageType');

            // Assert
            expect(attributeType.getValue()).toBe('ImageType');
        });

        it('should throw error for empty string', () => {
            // Arrange, Act & Assert
            expect(() => AttributeType.create('')).toThrow('Invalid AttributeType: cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            // Arrange, Act & Assert
            expect(() => AttributeType.create('   ')).toThrow('Invalid AttributeType: cannot be empty');
        });

        it('should throw error for null/undefined', () => {
            // Arrange, Act & Assert
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null input validation
            expect(() => AttributeType.create(null as any)).toThrow('Invalid AttributeType: cannot be empty');
        });

        it('should throw error for unknown attribute type', () => {
            // Arrange, Act & Assert
            expect(() => AttributeType.create('UnknownType')).toThrow('Invalid AttributeType: unknown type "UnknownType"');
        });

        it('should throw error for invalid type with mixed case', () => {
            // Arrange, Act & Assert
            expect(() => AttributeType.create('stringtype')).toThrow('Invalid AttributeType: unknown type "stringtype"');
        });
    });

    // ========== Lookup Type Detection ==========

    describe('isLookup', () => {
        it('should return true for Lookup type', () => {
            // Arrange
            const attributeType = AttributeType.create('Lookup');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for LookupType', () => {
            // Arrange
            const attributeType = AttributeType.create('LookupType');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for Customer type', () => {
            // Arrange
            const attributeType = AttributeType.create('Customer');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for CustomerType', () => {
            // Arrange
            const attributeType = AttributeType.create('CustomerType');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for Owner type', () => {
            // Arrange
            const attributeType = AttributeType.create('Owner');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for OwnerType', () => {
            // Arrange
            const attributeType = AttributeType.create('OwnerType');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for String type', () => {
            // Arrange
            const attributeType = AttributeType.create('String');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for Picklist type', () => {
            // Arrange
            const attributeType = AttributeType.create('Picklist');

            // Act
            const result = attributeType.isLookup();

            // Assert
            expect(result).toBe(false);
        });
    });

    // ========== Choice Type Detection ==========

    describe('isChoice', () => {
        it('should return true for Picklist type', () => {
            // Arrange
            const attributeType = AttributeType.create('Picklist');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for PicklistType', () => {
            // Arrange
            const attributeType = AttributeType.create('PicklistType');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for State type', () => {
            // Arrange
            const attributeType = AttributeType.create('State');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for StateType', () => {
            // Arrange
            const attributeType = AttributeType.create('StateType');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for Status type', () => {
            // Arrange
            const attributeType = AttributeType.create('Status');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for StatusType', () => {
            // Arrange
            const attributeType = AttributeType.create('StatusType');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for MultiSelectPicklist type', () => {
            // Arrange
            const attributeType = AttributeType.create('MultiSelectPicklist');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for MultiSelectPicklistType', () => {
            // Arrange
            const attributeType = AttributeType.create('MultiSelectPicklistType');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for String type', () => {
            // Arrange
            const attributeType = AttributeType.create('String');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for Lookup type', () => {
            // Arrange
            const attributeType = AttributeType.create('Lookup');

            // Act
            const result = attributeType.isChoice();

            // Assert
            expect(result).toBe(false);
        });
    });

    // ========== Equality & String Representation ==========

    describe('equals', () => {
        it('should return true when comparing identical types', () => {
            // Arrange
            const attributeType1 = AttributeType.create('String');
            const attributeType2 = AttributeType.create('String');

            // Act
            const result = attributeType1.equals(attributeType2);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when comparing different types', () => {
            // Arrange
            const attributeType1 = AttributeType.create('String');
            const attributeType2 = AttributeType.create('Integer');

            // Act
            const result = attributeType1.equals(attributeType2);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when comparing legacy and API versions', () => {
            // Arrange
            const attributeType1 = AttributeType.create('String');
            const attributeType2 = AttributeType.create('StringType');

            // Act
            const result = attributeType1.equals(attributeType2);

            // Assert
            expect(result).toBe(false);
        });

        it('should return true for same Lookup variants', () => {
            // Arrange
            const attributeType1 = AttributeType.create('LookupType');
            const attributeType2 = AttributeType.create('LookupType');

            // Act
            const result = attributeType1.equals(attributeType2);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the attribute type value', () => {
            // Arrange
            const attributeType = AttributeType.create('String');

            // Act
            const result = attributeType.toString();

            // Assert
            expect(result).toBe('String');
        });

        it('should return type suffix variant', () => {
            // Arrange
            const attributeType = AttributeType.create('StringType');

            // Act
            const result = attributeType.toString();

            // Assert
            expect(result).toBe('StringType');
        });
    });

    // ========== getValue ==========

    describe('getValue', () => {
        it('should return the stored attribute type value', () => {
            // Arrange
            const attributeType = AttributeType.create('Boolean');

            // Act
            const result = attributeType.getValue();

            // Assert
            expect(result).toBe('Boolean');
        });
    });

    // ========== Integration Tests ==========

    describe('integration', () => {
        it('should support all numeric types', () => {
            // Arrange
            const numericTypes = ['Integer', 'IntegerType', 'BigInt', 'BigIntType', 'Double', 'DoubleType', 'Decimal', 'DecimalType', 'Money', 'MoneyType'];

            // Act & Assert
            numericTypes.forEach(type => {
                expect(() => AttributeType.create(type)).not.toThrow();
            });
        });

        it('should support all text types', () => {
            // Arrange
            const textTypes = ['String', 'StringType', 'Memo', 'MemoType'];

            // Act & Assert
            textTypes.forEach(type => {
                expect(() => AttributeType.create(type)).not.toThrow();
            });
        });

        it('should support all lookup variants', () => {
            // Arrange
            const lookupVariants = ['Lookup', 'LookupType', 'Customer', 'CustomerType', 'Owner', 'OwnerType'];

            // Act & Assert
            lookupVariants.forEach(type => {
                const attributeType = AttributeType.create(type);
                expect(attributeType.isLookup()).toBe(true);
            });
        });

        it('should support all choice variants', () => {
            // Arrange
            const choiceVariants = ['Picklist', 'PicklistType', 'State', 'StateType', 'Status', 'StatusType', 'MultiSelectPicklist', 'MultiSelectPicklistType'];

            // Act & Assert
            choiceVariants.forEach(type => {
                const attributeType = AttributeType.create(type);
                expect(attributeType.isChoice()).toBe(true);
            });
        });

        it('should support special attribute types', () => {
            // Arrange
            const specialTypes = ['File', 'FileType', 'Image', 'ImageType', 'Virtual', 'VirtualType', 'EntityName', 'EntityNameType', 'ManagedProperty', 'ManagedPropertyType', 'CalendarRules', 'CalendarRulesType', 'PartyList', 'PartyListType', 'Uniqueidentifier', 'UniqueidentifierType'];

            // Act & Assert
            specialTypes.forEach(type => {
                expect(() => AttributeType.create(type)).not.toThrow();
            });
        });

        it('should identify only lookup types as lookups', () => {
            // Arrange
            const allTypes = [
                'String', 'Memo', 'Integer', 'BigInt', 'Double', 'Decimal', 'Money',
                'Boolean', 'DateTime', 'Lookup', 'Customer', 'Owner',
                'Picklist', 'State', 'Status', 'MultiSelectPicklist',
                'Uniqueidentifier', 'Virtual', 'EntityName', 'ManagedProperty',
                'CalendarRules', 'PartyList', 'File', 'Image'
            ];
            const expectedLookups = ['Lookup', 'Customer', 'Owner'];

            // Act & Assert
            allTypes.forEach(type => {
                const attributeType = AttributeType.create(type);
                if (expectedLookups.includes(type)) {
                    expect(attributeType.isLookup()).toBe(true);
                } else {
                    expect(attributeType.isLookup()).toBe(false);
                }
            });
        });

        it('should identify only choice types as choices', () => {
            // Arrange
            const allTypes = [
                'String', 'Memo', 'Integer', 'BigInt', 'Double', 'Decimal', 'Money',
                'Boolean', 'DateTime', 'Lookup', 'Customer', 'Owner',
                'Picklist', 'State', 'Status', 'MultiSelectPicklist',
                'Uniqueidentifier', 'Virtual', 'EntityName', 'ManagedProperty',
                'CalendarRules', 'PartyList', 'File', 'Image'
            ];
            const expectedChoices = ['Picklist', 'State', 'Status', 'MultiSelectPicklist'];

            // Act & Assert
            allTypes.forEach(type => {
                const attributeType = AttributeType.create(type);
                if (expectedChoices.includes(type)) {
                    expect(attributeType.isChoice()).toBe(true);
                } else {
                    expect(attributeType.isChoice()).toBe(false);
                }
            });
        });
    });
});
