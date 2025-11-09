import { AttributeType } from '../AttributeType';

describe('AttributeType', () => {
    describe('create', () => {
        describe('valid API types with Type suffix', () => {
            it('should create StringType', () => {
                const type = AttributeType.create('StringType');
                expect(type.getValue()).toBe('StringType');
            });

            it('should create LookupType', () => {
                const type = AttributeType.create('LookupType');
                expect(type.getValue()).toBe('LookupType');
            });

            it('should create PicklistType', () => {
                const type = AttributeType.create('PicklistType');
                expect(type.getValue()).toBe('PicklistType');
            });

            it('should create IntegerType', () => {
                const type = AttributeType.create('IntegerType');
                expect(type.getValue()).toBe('IntegerType');
            });

            it('should create DateTimeType', () => {
                const type = AttributeType.create('DateTimeType');
                expect(type.getValue()).toBe('DateTimeType');
            });

            it('should create BooleanType', () => {
                const type = AttributeType.create('BooleanType');
                expect(type.getValue()).toBe('BooleanType');
            });
        });

        describe('valid legacy types without suffix', () => {
            it('should create String', () => {
                const type = AttributeType.create('String');
                expect(type.getValue()).toBe('String');
            });

            it('should create Lookup', () => {
                const type = AttributeType.create('Lookup');
                expect(type.getValue()).toBe('Lookup');
            });

            it('should create Picklist', () => {
                const type = AttributeType.create('Picklist');
                expect(type.getValue()).toBe('Picklist');
            });

            it('should create Integer', () => {
                const type = AttributeType.create('Integer');
                expect(type.getValue()).toBe('Integer');
            });
        });

        describe('error cases', () => {
            it('should throw error when value is empty string', () => {
                expect(() => AttributeType.create('')).toThrow('Attribute type cannot be empty');
            });

            it('should throw error when value is whitespace only', () => {
                expect(() => AttributeType.create('   ')).toThrow('Attribute type cannot be empty');
            });

            it('should throw error for unknown type', () => {
                expect(() => AttributeType.create('InvalidType')).toThrow('Unknown attribute type: "InvalidType"');
            });

            it('should throw error for lowercase type name', () => {
                expect(() => AttributeType.create('string')).toThrow('Unknown attribute type: "string"');
            });
        });
    });

    describe('getValue', () => {
        it('should return the attribute type value', () => {
            const type = AttributeType.create('StringType');
            expect(type.getValue()).toBe('StringType');
        });
    });

    describe('isLookup', () => {
        it('should return true for Lookup type', () => {
            const type = AttributeType.create('Lookup');
            expect(type.isLookup()).toBe(true);
        });

        it('should return true for LookupType', () => {
            const type = AttributeType.create('LookupType');
            expect(type.isLookup()).toBe(true);
        });

        it('should return true for Customer type', () => {
            const type = AttributeType.create('Customer');
            expect(type.isLookup()).toBe(true);
        });

        it('should return true for CustomerType', () => {
            const type = AttributeType.create('CustomerType');
            expect(type.isLookup()).toBe(true);
        });

        it('should return true for Owner type', () => {
            const type = AttributeType.create('Owner');
            expect(type.isLookup()).toBe(true);
        });

        it('should return true for OwnerType', () => {
            const type = AttributeType.create('OwnerType');
            expect(type.isLookup()).toBe(true);
        });

        it('should return false for String type', () => {
            const type = AttributeType.create('String');
            expect(type.isLookup()).toBe(false);
        });

        it('should return false for Picklist type', () => {
            const type = AttributeType.create('Picklist');
            expect(type.isLookup()).toBe(false);
        });
    });

    describe('isChoice', () => {
        it('should return true for Picklist type', () => {
            const type = AttributeType.create('Picklist');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for PicklistType', () => {
            const type = AttributeType.create('PicklistType');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for State type', () => {
            const type = AttributeType.create('State');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for StateType', () => {
            const type = AttributeType.create('StateType');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for Status type', () => {
            const type = AttributeType.create('Status');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for StatusType', () => {
            const type = AttributeType.create('StatusType');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for MultiSelectPicklist type', () => {
            const type = AttributeType.create('MultiSelectPicklist');
            expect(type.isChoice()).toBe(true);
        });

        it('should return true for MultiSelectPicklistType', () => {
            const type = AttributeType.create('MultiSelectPicklistType');
            expect(type.isChoice()).toBe(true);
        });

        it('should return false for String type', () => {
            const type = AttributeType.create('String');
            expect(type.isChoice()).toBe(false);
        });

        it('should return false for Lookup type', () => {
            const type = AttributeType.create('Lookup');
            expect(type.isChoice()).toBe(false);
        });
    });

    describe('equals', () => {
        it('should return true when attribute types are equal', () => {
            const type1 = AttributeType.create('StringType');
            const type2 = AttributeType.create('StringType');
            expect(type1.equals(type2)).toBe(true);
        });

        it('should return false when attribute types are different', () => {
            const type1 = AttributeType.create('StringType');
            const type2 = AttributeType.create('IntegerType');
            expect(type1.equals(type2)).toBe(false);
        });

        it('should return false when comparing legacy vs API type', () => {
            const type1 = AttributeType.create('String');
            const type2 = AttributeType.create('StringType');
            expect(type1.equals(type2)).toBe(false);
        });

        it('should return true when comparing same instance', () => {
            const type = AttributeType.create('LookupType');
            expect(type.equals(type)).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return the attribute type value as string', () => {
            const type = AttributeType.create('DateTimeType');
            expect(type.toString()).toBe('DateTimeType');
        });
    });
});
