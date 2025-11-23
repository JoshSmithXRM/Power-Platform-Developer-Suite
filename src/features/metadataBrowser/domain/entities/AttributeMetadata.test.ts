import { AttributeMetadata } from './AttributeMetadata';
import { LogicalName } from './../valueObjects/LogicalName';
import { SchemaName } from './../valueObjects/SchemaName';
import { AttributeType } from './../valueObjects/AttributeType';
import { OptionMetadata, OptionSetMetadata } from './../valueObjects/OptionSetMetadata';

describe('AttributeMetadata', () => {
    const createValidAttribute = (overrides?: Partial<Parameters<typeof AttributeMetadata.create>[0]>): AttributeMetadata => {
        return AttributeMetadata.create({
            metadataId: 'attr-12345',
            logicalName: LogicalName.create('name'),
            schemaName: SchemaName.create('Name'),
            displayName: 'Name',
            description: 'The name of the record',
            attributeType: AttributeType.create('StringType'),
            isCustomAttribute: false,
            isManaged: true,
            isPrimaryId: false,
            isPrimaryName: true,
            requiredLevel: 'ApplicationRequired',
            ...overrides
        });
    };

    describe('create', () => {
        it('should create attribute with required fields', () => {
            const attr = createValidAttribute();

            expect(attr.metadataId).toBe('attr-12345');
            expect(attr.logicalName.getValue()).toBe('name');
            expect(attr.schemaName.getValue()).toBe('Name');
            expect(attr.displayName).toBe('Name');
            expect(attr.description).toBe('The name of the record');
            expect(attr.attributeType.getValue()).toBe('StringType');
            expect(attr.isCustomAttribute).toBe(false);
            expect(attr.isManaged).toBe(true);
            expect(attr.isPrimaryId).toBe(false);
            expect(attr.isPrimaryName).toBe(true);
            expect(attr.requiredLevel).toBe('ApplicationRequired');
        });

        it('should set optional fields to null by default', () => {
            const attr = createValidAttribute();

            expect(attr.maxLength).toBeNull();
            expect(attr.targets).toBeNull();
            expect(attr.precision).toBeNull();
            expect(attr.minValue).toBeNull();
            expect(attr.maxValue).toBeNull();
            expect(attr.format).toBeNull();
            expect(attr.optionSet).toBeNull();
        });

        it('should set validation flags to true by default', () => {
            const attr = createValidAttribute();

            expect(attr.isValidForCreate).toBe(true);
            expect(attr.isValidForUpdate).toBe(true);
            expect(attr.isValidForRead).toBe(true);
            expect(attr.isValidForForm).toBe(true);
            expect(attr.isValidForGrid).toBe(true);
        });

        it('should set security flags to false by default', () => {
            const attr = createValidAttribute();

            expect(attr.isSecured).toBe(false);
            expect(attr.canBeSecuredForRead).toBe(false);
            expect(attr.canBeSecuredForCreate).toBe(false);
            expect(attr.canBeSecuredForUpdate).toBe(false);
        });

        it('should set behavior flags with defaults', () => {
            const attr = createValidAttribute();

            expect(attr.isFilterable).toBe(false);
            expect(attr.isSearchable).toBe(false);
            expect(attr.isRetrievable).toBe(true);
        });

        it('should create string attribute with max length', () => {
            const attr = createValidAttribute({
                maxLength: 100
            });

            expect(attr.maxLength).toBe(100);
        });

        it('should create lookup attribute with targets', () => {
            const attr = createValidAttribute({
                attributeType: AttributeType.create('LookupType'),
                targets: ['account', 'contact']
            });

            expect(attr.targets).toEqual(['account', 'contact']);
        });

        it('should create decimal attribute with precision', () => {
            const attr = createValidAttribute({
                attributeType: AttributeType.create('DecimalType'),
                precision: 2,
                minValue: 0,
                maxValue: 1000000
            });

            expect(attr.precision).toBe(2);
            expect(attr.minValue).toBe(0);
            expect(attr.maxValue).toBe(1000000);
        });

        it('should create choice attribute with option set', () => {
            const optionSet = OptionSetMetadata.create({
                name: 'statuscode',
                isGlobal: true,
                options: [
                    OptionMetadata.create({ value: 1, label: 'Active' }),
                    OptionMetadata.create({ value: 2, label: 'Inactive' })
                ]
            });

            const attr = createValidAttribute({
                attributeType: AttributeType.create('PicklistType'),
                optionSet
            });

            expect(attr.optionSet).toBe(optionSet);
        });

        it('should throw error when metadataId is empty', () => {
            expect(() => createValidAttribute({ metadataId: '' })).toThrow('Invalid AttributeMetadata: metadataId cannot be empty');
        });

        it('should throw error when metadataId is whitespace', () => {
            expect(() => createValidAttribute({ metadataId: '   ' })).toThrow('Invalid AttributeMetadata: metadataId cannot be empty');
        });

        it('should throw error when displayName is empty', () => {
            expect(() => createValidAttribute({ displayName: '' })).toThrow('Invalid AttributeMetadata: displayName cannot be empty');
        });

        it('should throw error when displayName is whitespace', () => {
            expect(() => createValidAttribute({ displayName: '   ' })).toThrow('Invalid AttributeMetadata: displayName cannot be empty');
        });

        it('should throw error when maxLength is negative', () => {
            expect(() => createValidAttribute({ maxLength: -1 })).toThrow('Invalid AttributeMetadata: maxLength cannot be negative');
        });

        it('should allow maxLength of zero', () => {
            const attr = createValidAttribute({ maxLength: 0 });
            expect(attr.maxLength).toBe(0);
        });
    });

    describe('isRequired', () => {
        it('should return true when requiredLevel is SystemRequired', () => {
            const attr = createValidAttribute({ requiredLevel: 'SystemRequired' });
            expect(attr.isRequired()).toBe(true);
        });

        it('should return true when requiredLevel is ApplicationRequired', () => {
            const attr = createValidAttribute({ requiredLevel: 'ApplicationRequired' });
            expect(attr.isRequired()).toBe(true);
        });

        it('should return false when requiredLevel is None', () => {
            const attr = createValidAttribute({ requiredLevel: 'None' });
            expect(attr.isRequired()).toBe(false);
        });

        it('should return false when requiredLevel is Recommended', () => {
            const attr = createValidAttribute({ requiredLevel: 'Recommended' });
            expect(attr.isRequired()).toBe(false);
        });
    });

    describe('isSystemAttribute', () => {
        it('should return true when isCustomAttribute is false', () => {
            const attr = createValidAttribute({ isCustomAttribute: false });
            expect(attr.isSystemAttribute()).toBe(true);
        });

        it('should return false when isCustomAttribute is true', () => {
            const attr = createValidAttribute({ isCustomAttribute: true });
            expect(attr.isSystemAttribute()).toBe(false);
        });
    });

    describe('isLookup', () => {
        it('should return true for Lookup type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('Lookup') });
            expect(attr.isLookup()).toBe(true);
        });

        it('should return true for LookupType', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('LookupType') });
            expect(attr.isLookup()).toBe(true);
        });

        it('should return true for Customer type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('Customer') });
            expect(attr.isLookup()).toBe(true);
        });

        it('should return true for Owner type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('Owner') });
            expect(attr.isLookup()).toBe(true);
        });

        it('should return false for String type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('String') });
            expect(attr.isLookup()).toBe(false);
        });
    });

    describe('isChoice', () => {
        it('should return true for Picklist type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('Picklist') });
            expect(attr.isChoice()).toBe(true);
        });

        it('should return true for State type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('State') });
            expect(attr.isChoice()).toBe(true);
        });

        it('should return true for Status type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('Status') });
            expect(attr.isChoice()).toBe(true);
        });

        it('should return false for String type', () => {
            const attr = createValidAttribute({ attributeType: AttributeType.create('String') });
            expect(attr.isChoice()).toBe(false);
        });
    });

    describe('hasMaxLength', () => {
        it('should return true when maxLength is set', () => {
            const attr = createValidAttribute({ maxLength: 100 });
            expect(attr.hasMaxLength()).toBe(true);
        });

        it('should return false when maxLength is null', () => {
            const attr = createValidAttribute({ maxLength: null });
            expect(attr.hasMaxLength()).toBe(false);
        });

        it('should return true when maxLength is zero', () => {
            const attr = createValidAttribute({ maxLength: 0 });
            expect(attr.hasMaxLength()).toBe(true);
        });
    });

    describe('isPrimaryField', () => {
        it('should return true when isPrimaryId is true', () => {
            const attr = createValidAttribute({ isPrimaryId: true, isPrimaryName: false });
            expect(attr.isPrimaryField()).toBe(true);
        });

        it('should return true when isPrimaryName is true', () => {
            const attr = createValidAttribute({ isPrimaryId: false, isPrimaryName: true });
            expect(attr.isPrimaryField()).toBe(true);
        });

        it('should return true when both are true', () => {
            const attr = createValidAttribute({ isPrimaryId: true, isPrimaryName: true });
            expect(attr.isPrimaryField()).toBe(true);
        });

        it('should return false when both are false', () => {
            const attr = createValidAttribute({ isPrimaryId: false, isPrimaryName: false });
            expect(attr.isPrimaryField()).toBe(false);
        });
    });

    describe('hasTargets', () => {
        it('should return true when targets array has items', () => {
            const attr = createValidAttribute({ targets: ['account', 'contact'] });
            expect(attr.hasTargets()).toBe(true);
        });

        it('should return false when targets is null', () => {
            const attr = createValidAttribute({ targets: null });
            expect(attr.hasTargets()).toBe(false);
        });

        it('should return false when targets is empty array', () => {
            const attr = createValidAttribute({ targets: [] });
            expect(attr.hasTargets()).toBe(false);
        });
    });

    describe('getTargetCount', () => {
        it('should return count of targets', () => {
            const attr = createValidAttribute({ targets: ['account', 'contact', 'lead'] });
            expect(attr.getTargetCount()).toBe(3);
        });

        it('should return 0 when targets is null', () => {
            const attr = createValidAttribute({ targets: null });
            expect(attr.getTargetCount()).toBe(0);
        });

        it('should return 0 when targets is empty array', () => {
            const attr = createValidAttribute({ targets: [] });
            expect(attr.getTargetCount()).toBe(0);
        });

        it('should return 1 for single target', () => {
            const attr = createValidAttribute({ targets: ['account'] });
            expect(attr.getTargetCount()).toBe(1);
        });
    });

    describe('hasOptionSet', () => {
        it('should return true when optionSet is set', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });
            const attr = createValidAttribute({ optionSet });
            expect(attr.hasOptionSet()).toBe(true);
        });

        it('should return false when optionSet is null', () => {
            const attr = createValidAttribute({ optionSet: null });
            expect(attr.hasOptionSet()).toBe(false);
        });
    });

    describe('isReadOnly', () => {
        it('should return true when both create and update are false', () => {
            const attr = createValidAttribute({
                isValidForCreate: false,
                isValidForUpdate: false
            });
            expect(attr.isReadOnly()).toBe(true);
        });

        it('should return false when create is true', () => {
            const attr = createValidAttribute({
                isValidForCreate: true,
                isValidForUpdate: false
            });
            expect(attr.isReadOnly()).toBe(false);
        });

        it('should return false when update is true', () => {
            const attr = createValidAttribute({
                isValidForCreate: false,
                isValidForUpdate: true
            });
            expect(attr.isReadOnly()).toBe(false);
        });

        it('should return false when both are true', () => {
            const attr = createValidAttribute({
                isValidForCreate: true,
                isValidForUpdate: true
            });
            expect(attr.isReadOnly()).toBe(false);
        });
    });

    describe('canBeUsedInForms', () => {
        it('should return true when isValidForForm is true', () => {
            const attr = createValidAttribute({ isValidForForm: true });
            expect(attr.canBeUsedInForms()).toBe(true);
        });

        it('should return false when isValidForForm is false', () => {
            const attr = createValidAttribute({ isValidForForm: false });
            expect(attr.canBeUsedInForms()).toBe(false);
        });
    });

    describe('hasNumericConstraints', () => {
        it('should return true when minValue is set', () => {
            const attr = createValidAttribute({ minValue: 0 });
            expect(attr.hasNumericConstraints()).toBe(true);
        });

        it('should return true when maxValue is set', () => {
            const attr = createValidAttribute({ maxValue: 100 });
            expect(attr.hasNumericConstraints()).toBe(true);
        });

        it('should return true when precision is set', () => {
            const attr = createValidAttribute({ precision: 2 });
            expect(attr.hasNumericConstraints()).toBe(true);
        });

        it('should return true when all numeric constraints are set', () => {
            const attr = createValidAttribute({
                minValue: 0,
                maxValue: 100,
                precision: 2
            });
            expect(attr.hasNumericConstraints()).toBe(true);
        });

        it('should return false when no numeric constraints are set', () => {
            const attr = createValidAttribute({
                minValue: null,
                maxValue: null,
                precision: null
            });
            expect(attr.hasNumericConstraints()).toBe(false);
        });
    });
});
