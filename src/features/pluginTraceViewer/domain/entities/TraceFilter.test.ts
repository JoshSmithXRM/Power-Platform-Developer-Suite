import { TraceFilter } from './TraceFilter';
import { FilterCondition } from './FilterCondition';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { TraceStatus } from '../valueObjects/TraceStatus';
import { FilterField } from '../valueObjects/FilterField';
import { FilterOperator } from '../valueObjects/FilterOperator';
import { OperationType } from '../valueObjects/OperationType';
import { CorrelationId } from '../valueObjects/CorrelationId';

describe('TraceFilter', () => {
	describe('default', () => {
		it('should create filter with top 100', () => {
			const filter = TraceFilter.default();
			expect(filter.top).toBe(100);
		});

		it('should create filter with createdon desc order', () => {
			const filter = TraceFilter.default();
			expect(filter.orderBy).toBe('createdon desc');
		});

		it('should have no active filters', () => {
			const filter = TraceFilter.default();
			expect(filter.hasActiveFilters()).toBe(false);
			expect(filter.getActiveFilterCount()).toBe(0);
		});

		it('should generate no OData filter', () => {
			const filter = TraceFilter.default();
			expect(filter.buildFilterExpression()).toBeUndefined();
		});
	});

	describe('create', () => {
		it('should use default top when not provided', () => {
			const filter = TraceFilter.create({});
			expect(filter.top).toBe(100);
		});

		it('should use default orderBy when not provided', () => {
			const filter = TraceFilter.create({});
			expect(filter.orderBy).toBe('createdon desc');
		});

		it('should accept custom top', () => {
			const filter = TraceFilter.create({ top: 50 });
			expect(filter.top).toBe(50);
		});

		it('should accept custom orderBy', () => {
			const filter = TraceFilter.create({ orderBy: 'duration desc' });
			expect(filter.orderBy).toBe('duration desc');
		});

		it('should accept pluginNameFilter', () => {
			const filter = TraceFilter.create({ pluginNameFilter: 'MyPlugin' });
			expect(filter.pluginNameFilter).toBe('MyPlugin');
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should accept entityNameFilter', () => {
			const filter = TraceFilter.create({ entityNameFilter: 'account' });
			expect(filter.entityNameFilter).toBe('account');
		});

		it('should accept messageNameFilter', () => {
			const filter = TraceFilter.create({ messageNameFilter: 'Update' });
			expect(filter.messageNameFilter).toBe('Update');
		});

		it('should accept modeFilter', () => {
			const filter = TraceFilter.create({ modeFilter: ExecutionMode.Asynchronous });
			expect(filter.modeFilter).toBe(ExecutionMode.Asynchronous);
		});

		it('should accept statusFilter', () => {
			const filter = TraceFilter.create({ statusFilter: TraceStatus.Exception });
			expect(filter.statusFilter).toBe(TraceStatus.Exception);
		});
	});

	describe('buildFilterExpression', () => {
		it('should build OData filter for plugin name (contains)', () => {
			const filter = TraceFilter.create({ pluginNameFilter: 'MyPlugin' });
			const odata = filter.buildFilterExpression();
			expect(odata).toContain('typename');
			expect(odata).toContain('MyPlugin');
			expect(odata).toContain('contains');
		});

		it('should build OData filter for entity name (contains)', () => {
			const filter = TraceFilter.create({ entityNameFilter: 'account' });
			const odata = filter.buildFilterExpression();
			expect(odata).toContain('primaryentity');
			expect(odata).toContain('account');
			expect(odata).toContain('contains');
		});

		it('should build OData filter for mode', () => {
			const filter = TraceFilter.create({ modeFilter: ExecutionMode.Synchronous });
			const odata = filter.buildFilterExpression();
			expect(odata).toContain('mode eq 0');
		});

		it('should combine multiple filters with AND', () => {
			const filter = TraceFilter.create({
				pluginNameFilter: 'MyPlugin',
				modeFilter: ExecutionMode.Asynchronous
			});
			const odata = filter.buildFilterExpression();
			expect(odata).toContain(' and ');
			expect(odata).toContain('typename');
			expect(odata).toContain('mode eq 1');
		});

		it('should escape single quotes in filter values', () => {
			const filter = TraceFilter.create({ pluginNameFilter: "It's Plugin" });
			const odata = filter.buildFilterExpression();
			expect(odata).toContain("It''s Plugin");
		});

		it('should return undefined for empty filter', () => {
			const filter = TraceFilter.default();
			expect(filter.buildFilterExpression()).toBeUndefined();
		});
	});

	describe('builder pattern - withPluginName', () => {
		it('should return new filter with plugin name', () => {
			const original = TraceFilter.default();
			const updated = original.withPluginName('MyPlugin');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should preserve top and orderBy', () => {
			const original = TraceFilter.create({ top: 50, orderBy: 'duration desc' });
			const updated = original.withPluginName('MyPlugin');
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withPluginName('MyPlugin');
			expect(updated).not.toBe(original);
			expect(original.pluginNameFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withTop', () => {
		it('should return new filter with updated top', () => {
			const original = TraceFilter.default();
			const updated = original.withTop(200);
			expect(updated.top).toBe(200);
		});

		it('should preserve other filters', () => {
			const original = TraceFilter.create({
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withTop(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withTop(50);
			expect(updated).not.toBe(original);
			expect(original.top).toBe(100);
		});
	});

	describe('builder pattern - withEntityName', () => {
		it('should return new filter with entity name', () => {
			const original = TraceFilter.default();
			const updated = original.withEntityName('account');
			expect(updated.entityNameFilter).toBe('account');
		});

		it('should preserve top and orderBy', () => {
			const original = TraceFilter.create({ top: 50, orderBy: 'duration desc' });
			const updated = original.withEntityName('account');
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withEntityName('account');
			expect(updated).not.toBe(original);
			expect(original.entityNameFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withMessageName', () => {
		it('should return new filter with message name', () => {
			const original = TraceFilter.default();
			const updated = original.withMessageName('Update');
			expect(updated.messageNameFilter).toBe('Update');
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withMessageName('Update');
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withMessageName('Update');
			expect(updated).not.toBe(original);
			expect(original.messageNameFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withOperationType', () => {
		it('should return new filter with operation type', () => {
			const original = TraceFilter.default();
			const updated = original.withOperationType(OperationType.Plugin);
			expect(updated.operationTypeFilter).toBe(OperationType.Plugin);
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withOperationType(OperationType.Workflow);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withOperationType(OperationType.Plugin);
			expect(updated).not.toBe(original);
			expect(original.operationTypeFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withMode', () => {
		it('should return new filter with mode', () => {
			const original = TraceFilter.default();
			const updated = original.withMode(ExecutionMode.Synchronous);
			expect(updated.modeFilter).toBe(ExecutionMode.Synchronous);
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withMode(ExecutionMode.Asynchronous);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withMode(ExecutionMode.Synchronous);
			expect(updated).not.toBe(original);
			expect(original.modeFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withStatus', () => {
		it('should return new filter with status', () => {
			const original = TraceFilter.default();
			const updated = original.withStatus(TraceStatus.Success);
			expect(updated.statusFilter).toBe(TraceStatus.Success);
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withStatus(TraceStatus.Exception);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withStatus(TraceStatus.Success);
			expect(updated).not.toBe(original);
			expect(original.statusFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withDateRange', () => {
		it('should return new filter with date range', () => {
			const from = new Date('2024-01-01');
			const to = new Date('2024-01-31');
			const original = TraceFilter.default();
			const updated = original.withDateRange(from, to);
			expect(updated.createdOnFrom).toBe(from);
			expect(updated.createdOnTo).toBe(to);
		});

		it('should preserve other properties', () => {
			const from = new Date('2024-01-01');
			const to = new Date('2024-01-31');
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withDateRange(from, to);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const from = new Date('2024-01-01');
			const to = new Date('2024-01-31');
			const original = TraceFilter.default();
			const updated = original.withDateRange(from, to);
			expect(updated).not.toBe(original);
			expect(original.createdOnFrom).toBeUndefined();
		});

		it('should accept undefined values', () => {
			const original = TraceFilter.default();
			const updated = original.withDateRange(undefined, undefined);
			expect(updated.createdOnFrom).toBeUndefined();
			expect(updated.createdOnTo).toBeUndefined();
		});
	});

	describe('builder pattern - withDurationRange', () => {
		it('should return new filter with duration range', () => {
			const original = TraceFilter.default();
			const updated = original.withDurationRange(100, 1000);
			expect(updated.durationMin).toBe(100);
			expect(updated.durationMax).toBe(1000);
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withDurationRange(100, 1000);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withDurationRange(100, 1000);
			expect(updated).not.toBe(original);
			expect(original.durationMin).toBeUndefined();
		});

		it('should accept undefined values', () => {
			const original = TraceFilter.default();
			const updated = original.withDurationRange(undefined, undefined);
			expect(updated.durationMin).toBeUndefined();
			expect(updated.durationMax).toBeUndefined();
		});
	});

	describe('builder pattern - withHasException', () => {
		it('should return new filter with hasException flag', () => {
			const original = TraceFilter.default();
			const updated = original.withHasException(true);
			expect(updated.hasExceptionFilter).toBe(true);
		});

		it('should preserve other properties', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withHasException(true);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withHasException(true);
			expect(updated).not.toBe(original);
			expect(original.hasExceptionFilter).toBeUndefined();
		});

		it('should accept undefined value', () => {
			const original = TraceFilter.default();
			const updated = original.withHasException(undefined);
			expect(updated.hasExceptionFilter).toBeUndefined();
		});
	});

	describe('builder pattern - withCorrelationId', () => {
		it('should return new filter with correlation ID', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const original = TraceFilter.default();
			const updated = original.withCorrelationId(correlationId);
			expect(updated.correlationIdFilter).toBe(correlationId);
		});

		it('should preserve other properties', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin'
			});
			const updated = original.withCorrelationId(correlationId);
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.pluginNameFilter).toBe('MyPlugin');
		});

		it('should return new instance (immutability)', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const original = TraceFilter.default();
			const updated = original.withCorrelationId(correlationId);
			expect(updated).not.toBe(original);
			expect(original.correlationIdFilter).toBeUndefined();
		});

		it('should accept undefined value', () => {
			const original = TraceFilter.default();
			const updated = original.withCorrelationId(undefined);
			expect(updated.correlationIdFilter).toBeUndefined();
		});
	});

	describe('builder pattern - clearFilters', () => {
		it('should clear all filters but preserve top/orderBy', () => {
			const original = TraceFilter.create({
				top: 50,
				orderBy: 'duration desc',
				pluginNameFilter: 'MyPlugin',
				modeFilter: ExecutionMode.Asynchronous
			});
			const cleared = original.clearFilters();
			expect(cleared.top).toBe(50);
			expect(cleared.orderBy).toBe('duration desc');
			expect(cleared.pluginNameFilter).toBeUndefined();
			expect(cleared.modeFilter).toBeUndefined();
			expect(cleared.hasActiveFilters()).toBe(false);
		});
	});

	describe('builder pattern chaining', () => {
		it('should support chaining multiple withX methods', () => {
			const filter = TraceFilter.default()
				.withPluginName('MyPlugin')
				.withMode(ExecutionMode.Asynchronous)
				.withTop(50);

			expect(filter.top).toBe(50);
			expect(filter.pluginNameFilter).toBe('MyPlugin');
			expect(filter.modeFilter).toBe(ExecutionMode.Asynchronous);
			expect(filter.orderBy).toBe('createdon desc');
		});
	});

	describe('hasActiveFilters', () => {
		it('should return false for default filter', () => {
			const filter = TraceFilter.default();
			expect(filter.hasActiveFilters()).toBe(false);
		});

		it('should return true when plugin name filter set', () => {
			const filter = TraceFilter.create({ pluginNameFilter: 'MyPlugin' });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when mode filter set', () => {
			const filter = TraceFilter.create({ modeFilter: ExecutionMode.Synchronous });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when correlationIdFilter is set and not empty', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const filter = TraceFilter.create({ correlationIdFilter: correlationId });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when operationTypeFilter set', () => {
			const filter = TraceFilter.create({ operationTypeFilter: OperationType.Plugin });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when statusFilter set', () => {
			const filter = TraceFilter.create({ statusFilter: TraceStatus.Success });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when createdOnFrom set', () => {
			const filter = TraceFilter.create({ createdOnFrom: new Date('2024-01-01') });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when createdOnTo set', () => {
			const filter = TraceFilter.create({ createdOnTo: new Date('2024-01-01') });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when durationMin set', () => {
			const filter = TraceFilter.create({ durationMin: 100 });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when durationMax set', () => {
			const filter = TraceFilter.create({ durationMax: 1000 });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when hasExceptionFilter set', () => {
			const filter = TraceFilter.create({ hasExceptionFilter: true });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when entityNameFilter set', () => {
			const filter = TraceFilter.create({ entityNameFilter: 'account' });
			expect(filter.hasActiveFilters()).toBe(true);
		});

		it('should return true when messageNameFilter set', () => {
			const filter = TraceFilter.create({ messageNameFilter: 'Update' });
			expect(filter.hasActiveFilters()).toBe(true);
		});
	});

	describe('getActiveFilterCount', () => {
		it('should return 0 for default filter', () => {
			const filter = TraceFilter.default();
			expect(filter.getActiveFilterCount()).toBe(0);
		});

		it('should count single filter', () => {
			const filter = TraceFilter.create({ pluginNameFilter: 'MyPlugin' });
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count multiple filters', () => {
			const filter = TraceFilter.create({
				pluginNameFilter: 'MyPlugin',
				entityNameFilter: 'account',
				modeFilter: ExecutionMode.Asynchronous
			});
			expect(filter.getActiveFilterCount()).toBe(3);
		});

		it('should count date range as 1 filter when both set', () => {
			const filter = TraceFilter.create({
				createdOnFrom: new Date('2024-01-01'),
				createdOnTo: new Date('2024-01-31')
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count date range as 1 filter when only from set', () => {
			const filter = TraceFilter.create({
				createdOnFrom: new Date('2024-01-01')
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count date range as 1 filter when only to set', () => {
			const filter = TraceFilter.create({
				createdOnTo: new Date('2024-01-31')
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count duration range as 1 filter when both set', () => {
			const filter = TraceFilter.create({
				durationMin: 100,
				durationMax: 1000
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count duration range as 1 filter when only min set', () => {
			const filter = TraceFilter.create({
				durationMin: 100
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count duration range as 1 filter when only max set', () => {
			const filter = TraceFilter.create({
				durationMax: 1000
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count hasExceptionFilter', () => {
			const filter = TraceFilter.create({
				hasExceptionFilter: true
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count correlationIdFilter when set and not empty', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const filter = TraceFilter.create({
				correlationIdFilter: correlationId
			});
			expect(filter.getActiveFilterCount()).toBe(1);
		});

		it('should count all filter types correctly', () => {
			const correlationId = CorrelationId.create('123e4567-e89b-12d3-a456-426614174000');
			const filter = TraceFilter.create({
				pluginNameFilter: 'MyPlugin',
				entityNameFilter: 'account',
				messageNameFilter: 'Update',
				operationTypeFilter: OperationType.Plugin,
				modeFilter: ExecutionMode.Synchronous,
				statusFilter: TraceStatus.Success,
				createdOnFrom: new Date('2024-01-01'),
				createdOnTo: new Date('2024-01-31'),
				durationMin: 100,
				durationMax: 1000,
				hasExceptionFilter: true,
				correlationIdFilter: correlationId
			});
			expect(filter.getActiveFilterCount()).toBe(10);
		});
	});

	describe('validation', () => {
		it('should throw error if top is <= 0', () => {
			expect(() => TraceFilter.create({ top: 0 })).toThrow('Top must be greater than zero');
			expect(() => TraceFilter.create({ top: -1 })).toThrow('Top must be greater than zero');
		});

		it('should throw error if date range is invalid', () => {
			const from = new Date('2024-01-02');
			const to = new Date('2024-01-01');
			expect(() => TraceFilter.create({ createdOnFrom: from, createdOnTo: to }))
				.toThrow('Date range "from" must be before or equal to "to"');
		});

		it('should throw error if duration range is invalid', () => {
			expect(() => TraceFilter.create({ durationMin: 100, durationMax: 50 }))
				.toThrow('Duration min must be less than or equal to max');
		});

		it('should throw error if duration min is negative', () => {
			expect(() => TraceFilter.create({ durationMin: -1 }))
				.toThrow('Duration min must be non-negative');
		});
	});

	describe('Query builder with conditions', () => {
		it('should build OData filter from single enabled condition', () => {
			const condition = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition],
			});

			expect(filter.buildFilterExpression()).toBe("(contains(typename, 'MyPlugin'))");
		});

		it('should build OData filter from multiple conditions with AND', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.Equals,
				value: 'account',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBe(
				"(contains(typename, 'MyPlugin')) and (primaryentity eq 'account')"
			);
		});

		it('should build OData filter from multiple conditions with OR', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'Plugin1',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'Plugin2',
				enabled: true,
				logicalOperator: 'or'
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBe(
				"(contains(typename, 'Plugin1')) or (contains(typename, 'Plugin2'))"
			);
		});

		it('should exclude disabled conditions from query', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.Equals,
				value: 'account',
				enabled: false
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBe("(contains(typename, 'MyPlugin'))");
		});

		it('should build query with mix of enabled and disabled conditions', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'Plugin1',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.Equals,
				value: 'account',
				enabled: false
			});

			const condition3 = FilterCondition.create({
				field: FilterField.MessageName,
				operator: FilterOperator.StartsWith,
				value: 'Create',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2, condition3],
			});

			expect(filter.buildFilterExpression()).toBe(
				"(contains(typename, 'Plugin1')) and (startswith(messagename, 'Create'))"
			);
		});

		it('should return undefined when all conditions are disabled', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: false
			});

			const condition2 = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.Equals,
				value: 'account',
				enabled: false
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBeUndefined();
		});

		it('should return undefined when conditions array is empty', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [],
			});

			expect(filter.buildFilterExpression()).toBeUndefined();
		});

		it('should wrap each condition in parentheses', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.Duration,
				operator: FilterOperator.GreaterThan,
				value: '1000',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.Duration,
				operator: FilterOperator.LessThan,
				value: '5000',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBe(
				'(performanceexecutionduration gt 1000) and (performanceexecutionduration lt 5000)'
			);
		});

		it('should use OR operator correctly between conditions', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.OperationType,
				operator: FilterOperator.Equals,
				value: 'Plugin',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.OperationType,
				operator: FilterOperator.Equals,
				value: 'Workflow',
				enabled: true,
				logicalOperator: 'or'
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2],
			});

			expect(filter.buildFilterExpression()).toBe(
				"(operationtype eq 'Plugin') or (operationtype eq 'Workflow')"
			);
		});

		it('should support conditions with different field types', () => {
			const textCondition = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: true
			});

			const enumCondition = FilterCondition.create({
				field: FilterField.OperationType,
				operator: FilterOperator.Equals,
				value: 'Plugin',
				enabled: true
			});

			const numberCondition = FilterCondition.create({
				field: FilterField.Duration,
				operator: FilterOperator.GreaterThan,
				value: '1000',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [textCondition, enumCondition, numberCondition],
			});

			expect(filter.buildFilterExpression()).toBe(
				"(contains(typename, 'MyPlugin')) and (operationtype eq 'Plugin') and (performanceexecutionduration gt 1000)"
			);
		});

		it('should get active filter count from conditions', () => {
			const condition1 = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'MyPlugin',
				enabled: true
			});

			const condition2 = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.Equals,
				value: 'account',
				enabled: false
			});

			const condition3 = FilterCondition.create({
				field: FilterField.MessageName,
				operator: FilterOperator.StartsWith,
				value: 'Create',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition1, condition2, condition3],
			});

			expect(filter.getActiveFilterCount()).toBe(2);
		});

		it('should prioritize conditions over legacy filters', () => {
			const condition = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'NewPlugin',
				enabled: true
			});

			const filter = TraceFilter.create({
				top: 100,
				conditions: [condition],
				pluginNameFilter: 'OldPlugin' // Legacy filter
			});

			// Should use conditions, not legacy filter
			expect(filter.buildFilterExpression()).toBe("(contains(typename, 'NewPlugin'))");
		});

		it('should fall back to legacy filters when no conditions', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [],
				pluginNameFilter: 'MyPlugin'
			});

			// Should use legacy filter
			expect(filter.buildFilterExpression()).toBe("contains(typename, 'MyPlugin')");
		});
	});
});
