/**
 * Value object representing a Dataverse attribute type.
 * Encapsulates the type system and provides display formatting.
 */
export class AttributeType {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    /**
     * Creates an AttributeType from a string value.
     * @throws Error if the value is not a recognized attribute type
     */
    public static create(value: string): AttributeType {
        if (!value || value.trim().length === 0) {
            throw new Error('Attribute type cannot be empty');
        }

        const validTypes = [
            // API types (with "Type" suffix from AttributeTypeName.Value)
            'StringType',
            'MemoType',
            'IntegerType',
            'BigIntType',
            'DoubleType',
            'DecimalType',
            'MoneyType',
            'BooleanType',
            'DateTimeType',
            'LookupType',
            'CustomerType',
            'OwnerType',
            'PicklistType',
            'StateType',
            'StatusType',
            'MultiSelectPicklistType',
            'UniqueidentifierType',
            'VirtualType',
            'EntityNameType',
            'ManagedPropertyType',
            'CalendarRulesType',
            'PartyListType',
            'FileType',
            'ImageType',
            // Legacy types (without suffix for backward compatibility)
            'String',
            'Memo',
            'Integer',
            'BigInt',
            'Double',
            'Decimal',
            'Money',
            'Boolean',
            'DateTime',
            'Lookup',
            'Customer',
            'Owner',
            'Picklist',
            'State',
            'Status',
            'MultiSelectPicklist',
            'Uniqueidentifier',
            'Virtual',
            'EntityName',
            'ManagedProperty',
            'CalendarRules',
            'PartyList',
            'File',
            'Image'
        ];

        if (!validTypes.includes(value)) {
            throw new Error(`Unknown attribute type: "${value}"`);
        }

        return new AttributeType(value);
    }

    public getValue(): string {
        return this.value;
    }

    /**
     * Checks if this is a lookup-type attribute.
     */
    public isLookup(): boolean {
        return this.value === 'Lookup' || this.value === 'LookupType' ||
               this.value === 'Customer' || this.value === 'CustomerType' ||
               this.value === 'Owner' || this.value === 'OwnerType';
    }

    /**
     * Checks if this is a choice-type attribute.
     */
    public isChoice(): boolean {
        return this.value === 'Picklist' || this.value === 'PicklistType' ||
               this.value === 'State' || this.value === 'StateType' ||
               this.value === 'Status' || this.value === 'StatusType' ||
               this.value === 'MultiSelectPicklist' || this.value === 'MultiSelectPicklistType';
    }

    public equals(other: AttributeType): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
