import { FilterField } from '../FilterField';

describe('FilterField', () => {
	describe('static field definitions', () => {
		it('should have PluginName field with correct properties', () => {
			expect(FilterField.PluginName.displayName).toBe('Plugin Name');
			expect(FilterField.PluginName.odataName).toBe('typename');
			expect(FilterField.PluginName.fieldType).toBe('text');
		});

		it('should have EntityName field with correct properties', () => {
			expect(FilterField.EntityName.displayName).toBe('Entity Name');
			expect(FilterField.EntityName.odataName).toBe('primaryentity');
			expect(FilterField.EntityName.fieldType).toBe('text');
		});

		it('should have MessageName field with correct properties', () => {
			expect(FilterField.MessageName.displayName).toBe('Message Name');
			expect(FilterField.MessageName.odataName).toBe('messagename');
			expect(FilterField.MessageName.fieldType).toBe('text');
		});

		it('should have OperationType field with correct properties', () => {
			expect(FilterField.OperationType.displayName).toBe('Operation Type');
			expect(FilterField.OperationType.odataName).toBe('operationtype');
			expect(FilterField.OperationType.fieldType).toBe('enum');
		});

		it('should have Mode field with correct properties', () => {
			expect(FilterField.Mode.displayName).toBe('Mode');
			expect(FilterField.Mode.odataName).toBe('mode');
			expect(FilterField.Mode.fieldType).toBe('enum');
		});

		it('should have CorrelationId field with correct properties', () => {
			expect(FilterField.CorrelationId.displayName).toBe('Correlation ID');
			expect(FilterField.CorrelationId.odataName).toBe('correlationid');
			expect(FilterField.CorrelationId.fieldType).toBe('text');
		});

		it('should have CreatedOn field with correct properties', () => {
			expect(FilterField.CreatedOn.displayName).toBe('Created On');
			expect(FilterField.CreatedOn.odataName).toBe('createdon');
			expect(FilterField.CreatedOn.fieldType).toBe('date');
		});

		it('should have Duration field with correct properties', () => {
			expect(FilterField.Duration.displayName).toBe('Duration (ms)');
			expect(FilterField.Duration.odataName).toBe('performanceexecutionduration');
			expect(FilterField.Duration.fieldType).toBe('number');
		});
	});

	describe('All array', () => {
		it('should contain all 8 field definitions', () => {
			expect(FilterField.All).toHaveLength(8);
		});

		it('should contain PluginName field', () => {
			expect(FilterField.All).toContain(FilterField.PluginName);
		});

		it('should contain EntityName field', () => {
			expect(FilterField.All).toContain(FilterField.EntityName);
		});

		it('should contain MessageName field', () => {
			expect(FilterField.All).toContain(FilterField.MessageName);
		});

		it('should contain OperationType field', () => {
			expect(FilterField.All).toContain(FilterField.OperationType);
		});

		it('should contain Mode field', () => {
			expect(FilterField.All).toContain(FilterField.Mode);
		});

		it('should contain CorrelationId field', () => {
			expect(FilterField.All).toContain(FilterField.CorrelationId);
		});

		it('should contain CreatedOn field', () => {
			expect(FilterField.All).toContain(FilterField.CreatedOn);
		});

		it('should contain Duration field', () => {
			expect(FilterField.All).toContain(FilterField.Duration);
		});
	});

	describe('fromODataName', () => {
		it('should find field by typename', () => {
			const field = FilterField.fromODataName('typename');

			expect(field).toBe(FilterField.PluginName);
		});

		it('should find field by primaryentity', () => {
			const field = FilterField.fromODataName('primaryentity');

			expect(field).toBe(FilterField.EntityName);
		});

		it('should find field by messagename', () => {
			const field = FilterField.fromODataName('messagename');

			expect(field).toBe(FilterField.MessageName);
		});

		it('should find field by operationtype', () => {
			const field = FilterField.fromODataName('operationtype');

			expect(field).toBe(FilterField.OperationType);
		});

		it('should find field by mode', () => {
			const field = FilterField.fromODataName('mode');

			expect(field).toBe(FilterField.Mode);
		});

		it('should find field by correlationid', () => {
			const field = FilterField.fromODataName('correlationid');

			expect(field).toBe(FilterField.CorrelationId);
		});

		it('should find field by createdon', () => {
			const field = FilterField.fromODataName('createdon');

			expect(field).toBe(FilterField.CreatedOn);
		});

		it('should find field by performanceexecutionduration', () => {
			const field = FilterField.fromODataName('performanceexecutionduration');

			expect(field).toBe(FilterField.Duration);
		});

		it('should return undefined for unknown OData name', () => {
			const field = FilterField.fromODataName('unknown');

			expect(field).toBeUndefined();
		});

		it('should be case-sensitive', () => {
			const field = FilterField.fromODataName('TYPENAME');

			expect(field).toBeUndefined();
		});
	});

	describe('fromDisplayName', () => {
		it('should find field by Plugin Name', () => {
			const field = FilterField.fromDisplayName('Plugin Name');

			expect(field).toBe(FilterField.PluginName);
		});

		it('should find field by Entity Name', () => {
			const field = FilterField.fromDisplayName('Entity Name');

			expect(field).toBe(FilterField.EntityName);
		});

		it('should find field by Message Name', () => {
			const field = FilterField.fromDisplayName('Message Name');

			expect(field).toBe(FilterField.MessageName);
		});

		it('should find field by Operation Type', () => {
			const field = FilterField.fromDisplayName('Operation Type');

			expect(field).toBe(FilterField.OperationType);
		});

		it('should find field by Mode', () => {
			const field = FilterField.fromDisplayName('Mode');

			expect(field).toBe(FilterField.Mode);
		});

		it('should find field by Correlation ID', () => {
			const field = FilterField.fromDisplayName('Correlation ID');

			expect(field).toBe(FilterField.CorrelationId);
		});

		it('should find field by Created On', () => {
			const field = FilterField.fromDisplayName('Created On');

			expect(field).toBe(FilterField.CreatedOn);
		});

		it('should find field by Duration (ms)', () => {
			const field = FilterField.fromDisplayName('Duration (ms)');

			expect(field).toBe(FilterField.Duration);
		});

		it('should return undefined for unknown display name', () => {
			const field = FilterField.fromDisplayName('Unknown Field');

			expect(field).toBeUndefined();
		});

		it('should be case-sensitive', () => {
			const field = FilterField.fromDisplayName('plugin name');

			expect(field).toBeUndefined();
		});
	});

	describe('equals', () => {
		it('should return true for same field', () => {
			expect(FilterField.PluginName.equals(FilterField.PluginName)).toBe(true);
		});

		it('should return false for different fields', () => {
			expect(FilterField.PluginName.equals(FilterField.EntityName)).toBe(false);
		});

		it('should return false for null', () => {
			expect(FilterField.PluginName.equals(null)).toBe(false);
		});

		it('should compare by odataName', () => {
			const field1 = FilterField.PluginName;
			const field2 = FilterField.fromODataName('typename');

			expect(field1.equals(field2 ?? null)).toBe(true);
		});
	});

	describe('field type distribution', () => {
		it('should have 4 text fields', () => {
			const textFields = FilterField.All.filter(f => f.fieldType === 'text');

			expect(textFields).toHaveLength(4);
			expect(textFields).toContain(FilterField.PluginName);
			expect(textFields).toContain(FilterField.EntityName);
			expect(textFields).toContain(FilterField.MessageName);
			expect(textFields).toContain(FilterField.CorrelationId);
		});

		it('should have 2 enum fields', () => {
			const enumFields = FilterField.All.filter(f => f.fieldType === 'enum');

			expect(enumFields).toHaveLength(2);
			expect(enumFields).toContain(FilterField.OperationType);
			expect(enumFields).toContain(FilterField.Mode);
		});

		it('should have 1 date field', () => {
			const dateFields = FilterField.All.filter(f => f.fieldType === 'date');

			expect(dateFields).toHaveLength(1);
			expect(dateFields).toContain(FilterField.CreatedOn);
		});

		it('should have 1 number field', () => {
			const numberFields = FilterField.All.filter(f => f.fieldType === 'number');

			expect(numberFields).toHaveLength(1);
			expect(numberFields).toContain(FilterField.Duration);
		});
	});
});
