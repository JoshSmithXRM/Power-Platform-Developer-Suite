import { OptionMetadata, OptionSetMetadata } from './OptionSetMetadata';

describe('OptionMetadata', () => {
    describe('create', () => {
        it('should create an option with all properties', () => {
            // Arrange
            const props = {
                value: 1,
                label: 'Active',
                description: 'Record is active',
                color: '#FF0000',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.value).toBe(1);
            expect(option.label).toBe('Active');
            expect(option.description).toBe('Record is active');
            expect(option.color).toBe('#FF0000');
        });

        it('should create an option with minimal properties', () => {
            // Arrange
            const props = {
                value: 0,
                label: 'Inactive',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.value).toBe(0);
            expect(option.label).toBe('Inactive');
            expect(option.description).toBeNull();
            expect(option.color).toBeNull();
        });

        it('should handle empty string description', () => {
            // Arrange
            const props = {
                value: 2,
                label: 'Pending',
                description: '',
                color: '#00FF00',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.description).toBe('');
        });

        it('should handle empty string color', () => {
            // Arrange
            const props = {
                value: 3,
                label: 'Completed',
                description: 'Task completed',
                color: '',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.color).toBe('');
        });

        it('should preserve null description explicitly set', () => {
            // Arrange
            const props = {
                value: 4,
                label: 'Cancelled',
                description: null,
                color: '#0000FF',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.description).toBeNull();
        });

        it('should preserve null color explicitly set', () => {
            // Arrange
            const props = {
                value: 5,
                label: 'OnHold',
                description: 'On hold status',
                color: null,
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.color).toBeNull();
        });

        it('should create option with empty label', () => {
            // Arrange
            const props = {
                value: 6,
                label: '',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.label).toBe('');
        });

        it('should create option with negative value', () => {
            // Arrange
            const props = {
                value: -1,
                label: 'Unknown',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.value).toBe(-1);
        });

        it('should create option with large value', () => {
            // Arrange
            const props = {
                value: 2147483647,
                label: 'MaxInt',
            };

            // Act
            const option = OptionMetadata.create(props);

            // Assert
            expect(option.value).toBe(2147483647);
        });
    });

    describe('factory pattern', () => {
        it('should create options only through factory method', () => {
            // Arrange & Act
            const option = OptionMetadata.create({ value: 1, label: 'Test' });

            // Assert
            expect(option).toBeDefined();
            expect(option.value).toBe(1);
            expect(option.label).toBe('Test');
        });

        it('should have properties accessible as readonly', () => {
            // Arrange
            const option = OptionMetadata.create({ value: 5, label: 'ReadOnly' });

            // Act & Assert
            expect(option.value).toBe(5);
            expect(option.label).toBe('ReadOnly');
            expect(option.description).toBeNull();
            expect(option.color).toBeNull();
        });
    });
});

describe('OptionSetMetadata', () => {
    describe('create', () => {
        it('should create an option set with all properties', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
            ];
            const props = {
                name: 'statecode',
                displayName: 'Status',
                isGlobal: false,
                isCustom: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.name).toBe('statecode');
            expect(optionSet.displayName).toBe('Status');
            expect(optionSet.isGlobal).toBe(false);
            expect(optionSet.isCustom).toBe(true);
            expect(optionSet.options).toEqual(options);
        });

        it('should create an option set with minimal properties', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Option1' }),
            ];
            const props = {
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.name).toBeNull();
            expect(optionSet.displayName).toBeNull();
            expect(optionSet.isGlobal).toBe(true);
            expect(optionSet.isCustom).toBe(false);
            expect(optionSet.options).toEqual(options);
        });

        it('should handle empty string name', () => {
            // Arrange
            const options: OptionMetadata[] = [];
            const props = {
                name: '',
                displayName: 'Test',
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.name).toBe('');
        });

        it('should handle empty string displayName', () => {
            // Arrange
            const options: OptionMetadata[] = [];
            const props = {
                name: 'test',
                displayName: '',
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.displayName).toBe('');
        });

        it('should preserve null name explicitly set', () => {
            // Arrange
            const options: OptionMetadata[] = [];
            const props = {
                name: null,
                displayName: 'Test',
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.name).toBeNull();
        });

        it('should preserve null displayName explicitly set', () => {
            // Arrange
            const options: OptionMetadata[] = [];
            const props = {
                name: 'test',
                displayName: null,
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.displayName).toBeNull();
        });

        it('should default isCustom to false when not provided', () => {
            // Arrange
            const options: OptionMetadata[] = [];
            const props = {
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.isCustom).toBe(false);
        });

        it('should create option set with empty options array', () => {
            // Arrange
            const props = {
                name: 'empty',
                displayName: 'Empty Set',
                isGlobal: false,
                options: [] as OptionMetadata[],
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.options).toEqual([]);
            expect(optionSet.options.length).toBe(0);
        });

        it('should create option set with many options', () => {
            // Arrange
            const options = Array.from({ length: 100 }, (_, i) =>
                OptionMetadata.create({ value: i, label: `Option${i}` })
            );
            const props = {
                name: 'large',
                displayName: 'Large Set',
                isGlobal: true,
                options,
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet.options.length).toBe(100);
        });
    });

    describe('hasOptions', () => {
        it('should return true when option set has options', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const result = optionSet.hasOptions();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when option set has no options', () => {
            // Arrange
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options: [],
            });

            // Act
            const result = optionSet.hasOptions();

            // Assert
            expect(result).toBe(false);
        });

        it('should return true for option set with multiple options', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
                OptionMetadata.create({ value: 2, label: 'Pending' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const result = optionSet.hasOptions();

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('getOptionCount', () => {
        it('should return 0 for empty option set', () => {
            // Arrange
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options: [],
            });

            // Act
            const count = optionSet.getOptionCount();

            // Assert
            expect(count).toBe(0);
        });

        it('should return correct count for single option', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const count = optionSet.getOptionCount();

            // Assert
            expect(count).toBe(1);
        });

        it('should return correct count for multiple options', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
                OptionMetadata.create({ value: 2, label: 'Pending' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const count = optionSet.getOptionCount();

            // Assert
            expect(count).toBe(3);
        });

        it('should return correct count for large option set', () => {
            // Arrange
            const options = Array.from({ length: 50 }, (_, i) =>
                OptionMetadata.create({ value: i, label: `Option${i}` })
            );
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const count = optionSet.getOptionCount();

            // Assert
            expect(count).toBe(50);
        });
    });

    describe('findOptionByValue', () => {
        it('should find option by exact value match', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(1);

            // Assert
            expect(found).not.toBeNull();
            expect(found?.label).toBe('Active');
            expect(found?.value).toBe(1);
        });

        it('should return null when option not found', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(999);

            // Assert
            expect(found).toBeNull();
        });

        it('should find option with value 0', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 0, label: 'Zero' }),
                OptionMetadata.create({ value: 1, label: 'One' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(0);

            // Assert
            expect(found).not.toBeNull();
            expect(found?.label).toBe('Zero');
        });

        it('should find option with negative value', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: -1, label: 'Negative' }),
                OptionMetadata.create({ value: 1, label: 'Positive' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(-1);

            // Assert
            expect(found).not.toBeNull();
            expect(found?.label).toBe('Negative');
        });

        it('should find option with large value', () => {
            // Arrange
            const largeValue = 2147483647;
            const options = [
                OptionMetadata.create({ value: 1, label: 'Regular' }),
                OptionMetadata.create({ value: largeValue, label: 'Large' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(largeValue);

            // Assert
            expect(found).not.toBeNull();
            expect(found?.label).toBe('Large');
        });

        it('should return null for empty option set', () => {
            // Arrange
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options: [],
            });

            // Act
            const found = optionSet.findOptionByValue(1);

            // Assert
            expect(found).toBeNull();
        });

        it('should find first matching option when duplicates exist', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'First' }),
                OptionMetadata.create({ value: 1, label: 'Second' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const found = optionSet.findOptionByValue(1);

            // Assert
            expect(found).not.toBeNull();
            expect(found?.label).toBe('First');
        });
    });

    describe('getOptionValues', () => {
        it('should return empty array for empty option set', () => {
            // Arrange
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options: [],
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values).toEqual([]);
        });

        it('should return all option values in order', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
                OptionMetadata.create({ value: 2, label: 'Pending' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values).toEqual([1, 0, 2]);
        });

        it('should include zero value in result', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 0, label: 'Zero' }),
                OptionMetadata.create({ value: 1, label: 'One' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values).toContain(0);
            expect(values).toEqual([0, 1]);
        });

        it('should include negative values in result', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: -1, label: 'Negative' }),
                OptionMetadata.create({ value: 1, label: 'Positive' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values).toContain(-1);
            expect(values).toEqual([-1, 1]);
        });

        it('should return values for large option set', () => {
            // Arrange
            const options = Array.from({ length: 50 }, (_, i) =>
                OptionMetadata.create({ value: i * 10, label: `Option${i}` })
            );
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values.length).toBe(50);
            expect(values[0]).toBe(0);
            expect(values[49]).toBe(490);
        });

        it('should return values including duplicates', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'First' }),
                OptionMetadata.create({ value: 1, label: 'Second' }),
                OptionMetadata.create({ value: 2, label: 'Third' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values = optionSet.getOptionValues();

            // Assert
            expect(values).toEqual([1, 1, 2]);
        });

        it('should not modify returned array', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
                OptionMetadata.create({ value: 0, label: 'Inactive' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act
            const values1 = optionSet.getOptionValues();
            values1.push(999);
            const values2 = optionSet.getOptionValues();

            // Assert
            expect(values2).toEqual([1, 0]);
            expect(values2).not.toContain(999);
        });
    });

    describe('factory pattern', () => {
        it('should create option sets only through factory method', () => {
            // Arrange
            const props = {
                name: 'test',
                isGlobal: true,
                options: [],
            };

            // Act
            const optionSet = OptionSetMetadata.create(props);

            // Assert
            expect(optionSet).toBeDefined();
            expect(optionSet.name).toBe('test');
            expect(optionSet.isGlobal).toBe(true);
        });

        it('should have all properties accessible as readonly', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Active' }),
            ];
            const optionSet = OptionSetMetadata.create({
                name: 'statusCode',
                displayName: 'Status',
                isGlobal: false,
                isCustom: true,
                options,
            });

            // Act & Assert
            expect(optionSet.name).toBe('statusCode');
            expect(optionSet.displayName).toBe('Status');
            expect(optionSet.isGlobal).toBe(false);
            expect(optionSet.isCustom).toBe(true);
            expect(optionSet.options).toHaveLength(1);
        });
    });

    describe('edge cases', () => {
        it('should handle option set with only one option', () => {
            // Arrange
            const options = [
                OptionMetadata.create({ value: 1, label: 'Only' }),
            ];
            const optionSet = OptionSetMetadata.create({
                isGlobal: true,
                options,
            });

            // Act & Assert
            expect(optionSet.hasOptions()).toBe(true);
            expect(optionSet.getOptionCount()).toBe(1);
            expect(optionSet.findOptionByValue(1)).not.toBeNull();
            expect(optionSet.getOptionValues()).toEqual([1]);
        });

        it('should handle global vs local option set correctly', () => {
            // Arrange
            const globalSet = OptionSetMetadata.create({
                name: 'GlobalSet',
                isGlobal: true,
                options: [OptionMetadata.create({ value: 1, label: 'Global' })],
            });
            const localSet = OptionSetMetadata.create({
                displayName: 'LocalSet',
                isGlobal: false,
                options: [OptionMetadata.create({ value: 1, label: 'Local' })],
            });

            // Act & Assert
            expect(globalSet.isGlobal).toBe(true);
            expect(localSet.isGlobal).toBe(false);
        });

        it('should handle custom vs system option set correctly', () => {
            // Arrange
            const customSet = OptionSetMetadata.create({
                isGlobal: true,
                isCustom: true,
                options: [OptionMetadata.create({ value: 1, label: 'Custom' })],
            });
            const systemSet = OptionSetMetadata.create({
                isGlobal: true,
                isCustom: false,
                options: [OptionMetadata.create({ value: 1, label: 'System' })],
            });

            // Act & Assert
            expect(customSet.isCustom).toBe(true);
            expect(systemSet.isCustom).toBe(false);
        });
    });
});
