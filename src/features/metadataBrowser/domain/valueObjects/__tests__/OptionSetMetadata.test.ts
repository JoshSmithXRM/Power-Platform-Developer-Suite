import { OptionMetadata, OptionSetMetadata } from '../OptionSetMetadata';

describe('OptionMetadata', () => {
    describe('create', () => {
        it('should create option with all fields', () => {
            const option = OptionMetadata.create({
                value: 1,
                label: 'Active',
                description: 'Active status',
                color: '#00FF00'
            });

            expect(option.value).toBe(1);
            expect(option.label).toBe('Active');
            expect(option.description).toBe('Active status');
            expect(option.color).toBe('#00FF00');
        });

        it('should create option without optional description', () => {
            const option = OptionMetadata.create({
                value: 1,
                label: 'Active'
            });

            expect(option.value).toBe(1);
            expect(option.label).toBe('Active');
            expect(option.description).toBeNull();
            expect(option.color).toBeNull();
        });

        it('should create option without optional color', () => {
            const option = OptionMetadata.create({
                value: 1,
                label: 'Active',
                description: 'Active status'
            });

            expect(option.value).toBe(1);
            expect(option.label).toBe('Active');
            expect(option.description).toBe('Active status');
            expect(option.color).toBeNull();
        });

        it('should set description to null when explicitly null', () => {
            const option = OptionMetadata.create({
                value: 1,
                label: 'Active',
                description: null
            });

            expect(option.description).toBeNull();
        });

        it('should set color to null when explicitly null', () => {
            const option = OptionMetadata.create({
                value: 1,
                label: 'Active',
                color: null
            });

            expect(option.color).toBeNull();
        });
    });
});

describe('OptionSetMetadata', () => {
    const createTestOption = (value: number, label: string): OptionMetadata => {
        return OptionMetadata.create({ value, label });
    };

    describe('create', () => {
        it('should create global option set with name and options', () => {
            const options = [
                createTestOption(1, 'Active'),
                createTestOption(2, 'Inactive')
            ];

            const optionSet = OptionSetMetadata.create({
                name: 'statuscode',
                isGlobal: true,
                options
            });

            expect(optionSet.name).toBe('statuscode');
            expect(optionSet.isGlobal).toBe(true);
            expect(optionSet.options).toHaveLength(2);
        });

        it('should create local option set without name', () => {
            const options = [createTestOption(1, 'Option 1')];

            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options
            });

            expect(optionSet.name).toBeNull();
            expect(optionSet.isGlobal).toBe(false);
            expect(optionSet.options).toHaveLength(1);
        });

        it('should create option set with empty options array', () => {
            const optionSet = OptionSetMetadata.create({
                name: 'empty',
                isGlobal: true,
                options: []
            });

            expect(optionSet.options).toHaveLength(0);
        });

        it('should set name to null when not provided', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });

            expect(optionSet.name).toBeNull();
        });

        it('should set name to null when explicitly null', () => {
            const optionSet = OptionSetMetadata.create({
                name: null,
                isGlobal: false,
                options: []
            });

            expect(optionSet.name).toBeNull();
        });
    });

    describe('hasOptions', () => {
        it('should return true when options exist', () => {
            const options = [createTestOption(1, 'Active')];
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options
            });

            expect(optionSet.hasOptions()).toBe(true);
        });

        it('should return false when options array is empty', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });

            expect(optionSet.hasOptions()).toBe(false);
        });

        it('should return true when multiple options exist', () => {
            const options = [
                createTestOption(1, 'Option 1'),
                createTestOption(2, 'Option 2'),
                createTestOption(3, 'Option 3')
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            expect(optionSet.hasOptions()).toBe(true);
        });
    });

    describe('getOptionCount', () => {
        it('should return 0 for empty options', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });

            expect(optionSet.getOptionCount()).toBe(0);
        });

        it('should return 1 for single option', () => {
            const options = [createTestOption(1, 'Active')];
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options
            });

            expect(optionSet.getOptionCount()).toBe(1);
        });

        it('should return correct count for multiple options', () => {
            const options = [
                createTestOption(1, 'Option 1'),
                createTestOption(2, 'Option 2'),
                createTestOption(3, 'Option 3'),
                createTestOption(4, 'Option 4')
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            expect(optionSet.getOptionCount()).toBe(4);
        });
    });

    describe('findOptionByValue', () => {
        const options = [
            createTestOption(1, 'Active'),
            createTestOption(2, 'Inactive'),
            createTestOption(100, 'Archived')
        ];

        it('should find option by value', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const option = optionSet.findOptionByValue(2);
            expect(option).not.toBeNull();
            expect(option?.value).toBe(2);
            expect(option?.label).toBe('Inactive');
        });

        it('should return null when option not found', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const option = optionSet.findOptionByValue(999);
            expect(option).toBeNull();
        });

        it('should find first option', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const option = optionSet.findOptionByValue(1);
            expect(option).not.toBeNull();
            expect(option?.label).toBe('Active');
        });

        it('should find last option', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const option = optionSet.findOptionByValue(100);
            expect(option).not.toBeNull();
            expect(option?.label).toBe('Archived');
        });

        it('should return null when options array is empty', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });

            const option = optionSet.findOptionByValue(1);
            expect(option).toBeNull();
        });
    });

    describe('getOptionValues', () => {
        it('should return empty array when no options', () => {
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options: []
            });

            const values = optionSet.getOptionValues();
            expect(values).toEqual([]);
        });

        it('should return all option values', () => {
            const options = [
                createTestOption(1, 'Active'),
                createTestOption(2, 'Inactive'),
                createTestOption(100, 'Archived')
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const values = optionSet.getOptionValues();
            expect(values).toEqual([1, 2, 100]);
        });

        it('should return values in same order as options', () => {
            const options = [
                createTestOption(100, 'Z'),
                createTestOption(1, 'A'),
                createTestOption(50, 'M')
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options
            });

            const values = optionSet.getOptionValues();
            expect(values).toEqual([100, 1, 50]);
        });

        it('should handle negative option values', () => {
            const options = [
                createTestOption(-1, 'Negative'),
                createTestOption(0, 'Zero'),
                createTestOption(1, 'Positive')
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: false,
                options
            });

            const values = optionSet.getOptionValues();
            expect(values).toEqual([-1, 0, 1]);
        });
    });
});
