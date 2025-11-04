import { PluginTraceFilterService, type FilterOperator } from './PluginTraceFilterService';
import { PluginTrace } from '../entities/PluginTrace';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { OperationType } from '../valueObjects/OperationType';
import { Duration } from '../valueObjects/Duration';
import { CorrelationId } from '../valueObjects/CorrelationId';

describe('PluginTraceFilterService', () => {
	describe('buildODataFilter', () => {
		it('should return empty string for empty conditions', () => {
			const filter = PluginTraceFilterService.buildODataFilter([]);
			expect(filter).toBe('');
		});

		it('should build contains filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'contains', value: 'MyPlugin' }
			]);
			expect(filter).toBe("contains(typename, 'MyPlugin')");
		});

		it('should build eq filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'messagename', operator: 'eq', value: 'Create' }
			]);
			expect(filter).toBe("messagename eq 'Create'");
		});

		it('should build startswith filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'startswith', value: 'My' }
			]);
			expect(filter).toBe("startswith(typename, 'My')");
		});

		it('should build endswith filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'endswith', value: 'Plugin' }
			]);
			expect(filter).toBe("endswith(typename, 'Plugin')");
		});

		it('should build gt filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'duration', operator: 'gt', value: 1000 }
			]);
			expect(filter).toBe('duration gt 1000');
		});

		it('should build lt filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'duration', operator: 'lt', value: 1000 }
			]);
			expect(filter).toBe('duration lt 1000');
		});

		it('should build ge filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'duration', operator: 'ge', value: 500 }
			]);
			expect(filter).toBe('duration ge 500');
		});

		it('should build le filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'duration', operator: 'le', value: 500 }
			]);
			expect(filter).toBe('duration le 500');
		});

		it('should build isNull filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'primaryentityname', operator: 'isNull', value: '' }
			]);
			expect(filter).toBe('primaryentityname eq null');
		});

		it('should build isNotNull filter', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'primaryentityname', operator: 'isNotNull', value: '' }
			]);
			expect(filter).toBe('primaryentityname ne null');
		});

		it('should combine multiple conditions with AND', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'contains', value: 'MyPlugin' },
				{ field: 'mode', operator: 'eq', value: '0' }
			]);
			expect(filter).toBe("contains(typename, 'MyPlugin') and mode eq '0'");
		});

		it('should escape single quotes in values', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'contains', value: "O'Brien" }
			]);
			expect(filter).toBe("contains(typename, 'O''Brien')");
		});

		it('should handle multiple single quotes', () => {
			const filter = PluginTraceFilterService.buildODataFilter([
				{ field: 'typename', operator: 'eq', value: "It's John's plugin" }
			]);
			expect(filter).toBe("typename eq 'It''s John''s plugin'");
		});

		it('should throw error for unsupported operator', () => {
			const invalidOperator = 'invalid' as FilterOperator;
			expect(() => {
				PluginTraceFilterService.buildODataFilter([
					{ field: 'typename', operator: invalidOperator, value: 'test' }
				]);
			}).toThrow('Unsupported operator:');
		});
	});

	describe('applyClientSideSearch', () => {
		const createTrace = (overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace => {
			return PluginTrace.create({
				id: 'trace-123',
				createdOn: new Date('2024-01-01T10:00:00Z'),
				pluginName: 'MyPlugin',
				entityName: 'account',
				messageName: 'Create',
				operationType: OperationType.Plugin,
				mode: ExecutionMode.Synchronous,
				duration: Duration.fromMilliseconds(125),
				constructorDuration: Duration.fromMilliseconds(50),
				...overrides
			});
		};

		it('should return all traces when search term is empty', () => {
			const traces = [createTrace(), createTrace({ id: 'trace-456' })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, '');
			expect(result).toEqual(traces);
		});

		it('should return all traces when search term is whitespace', () => {
			const traces = [createTrace(), createTrace({ id: 'trace-456' })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, '   ');
			expect(result).toEqual(traces);
		});

		it('should filter by plugin name', () => {
			const traces = [
				createTrace({ pluginName: 'MyPlugin' }),
				createTrace({ id: 'trace-456', pluginName: 'OtherPlugin' })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'MyPlugin');
			expect(result).toHaveLength(1);
			expect(result[0]?.pluginName).toBe('MyPlugin');
		});

		it('should filter by entity name', () => {
			const traces = [
				createTrace({ entityName: 'account' }),
				createTrace({ id: 'trace-456', entityName: 'contact' })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'contact');
			expect(result).toHaveLength(1);
			expect(result[0]?.entityName).toBe('contact');
		});

		it('should filter by message name', () => {
			const traces = [
				createTrace({ messageName: 'Create' }),
				createTrace({ id: 'trace-456', messageName: 'Update' })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'Update');
			expect(result).toHaveLength(1);
			expect(result[0]?.messageName).toBe('Update');
		});

		it('should filter by exception details', () => {
			const traces = [
				createTrace({ exceptionDetails: 'Error: Something went wrong' }),
				createTrace({ id: 'trace-456', exceptionDetails: 'Error: Database connection failed' })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'Database');
			expect(result).toHaveLength(1);
			expect(result[0]?.exceptionDetails).toContain('Database');
		});

		it('should filter by correlation ID', () => {
			const traces = [
				createTrace({ correlationId: CorrelationId.create('abc-123') }),
				createTrace({ id: 'trace-456', correlationId: CorrelationId.create('xyz-789') })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'xyz');
			expect(result).toHaveLength(1);
			expect(result[0]?.correlationId?.toString()).toBe('xyz-789');
		});

		it('should be case insensitive', () => {
			const traces = [createTrace({ pluginName: 'MyPlugin' })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'myplugin');
			expect(result).toHaveLength(1);
		});

		it('should handle null entity name', () => {
			const traces = [createTrace({ entityName: null })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'account');
			expect(result).toHaveLength(0);
		});

		it('should handle null exception details', () => {
			const traces = [createTrace({ exceptionDetails: null })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'error');
			expect(result).toHaveLength(0);
		});

		it('should handle null correlation ID', () => {
			const traces = [createTrace({ correlationId: null })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'abc');
			expect(result).toHaveLength(0);
		});

		it('should match partial strings', () => {
			const traces = [createTrace({ pluginName: 'MyCustomPlugin' })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'Custom');
			expect(result).toHaveLength(1);
		});

		it('should return empty array when no matches', () => {
			const traces = [createTrace({ pluginName: 'MyPlugin' })];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'NonExistent');
			expect(result).toHaveLength(0);
		});

		it('should match across multiple fields', () => {
			const traces = [
				createTrace({ pluginName: 'Plugin1', entityName: 'account' }),
				createTrace({ id: 'trace-456', pluginName: 'Plugin2', entityName: 'contact' }),
				createTrace({ id: 'trace-789', pluginName: 'Plugin3', entityName: 'account' })
			];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'account');
			expect(result).toHaveLength(2);
		});

		it('should preserve array as readonly', () => {
			const traces: readonly PluginTrace[] = [createTrace()];
			const result = PluginTraceFilterService.applyClientSideSearch(traces, 'MyPlugin');
			expect(Array.isArray(result)).toBe(true);
		});
	});
});
