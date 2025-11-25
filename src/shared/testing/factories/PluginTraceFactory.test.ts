import {
	createTestPluginTrace,
	createTestFailedPluginTrace,
	createTestAsyncPluginTrace,
	createTestRelatedPluginTrace,
	createTestNestedPluginTrace
} from './PluginTraceFactory';
import { ExecutionMode } from '../../../features/pluginTraceViewer/domain/valueObjects/ExecutionMode';
import { TraceStatus } from '../../../features/pluginTraceViewer/domain/valueObjects/TraceStatus';
import { CorrelationId } from '../../../features/pluginTraceViewer/domain/valueObjects/CorrelationId';

describe('PluginTraceFactory', () => {
	describe('createTestPluginTrace', () => {
		it('should create a synchronous plugin trace with default values', () => {
			const trace = createTestPluginTrace();

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.entityName).toBe('account');
			expect(trace.messageName).toBe('Create');
			expect(trace.mode).toEqual(ExecutionMode.Synchronous);
			expect(trace.stage).toBe(0);
			expect(trace.depth).toBe(1);
			expect(trace.exceptionDetails).toBeNull();
			expect(trace.correlationId).toBeNull();
			expect(trace.isSynchronous()).toBe(true);
			expect(trace.isAsynchronous()).toBe(false);
		});

		it('should allow overriding default values', () => {
			const trace = createTestPluginTrace({
				id: 'custom-trace-id',
				pluginName: 'CustomPlugin',
				messageName: 'Update'
			});

			expect(trace.id).toBe('custom-trace-id');
			expect(trace.pluginName).toBe('CustomPlugin');
			expect(trace.messageName).toBe('Update');
			expect(trace.mode).toEqual(ExecutionMode.Synchronous);
		});

		it('should have a successful status when no exception details', () => {
			const trace = createTestPluginTrace();

			expect(trace.hasException()).toBe(false);
			expect(trace.isSuccessful()).toBe(true);
			expect(trace.getStatus()).toEqual(TraceStatus.Success);
		});

		it('should not be nested by default (depth = 1)', () => {
			const trace = createTestPluginTrace();

			expect(trace.depth).toBe(1);
			expect(trace.isNested()).toBe(false);
		});

		it('should not have correlation ID by default', () => {
			const trace = createTestPluginTrace();

			expect(trace.correlationId).toBeNull();
			expect(trace.hasCorrelationId()).toBe(false);
		});
	});

	describe('createTestFailedPluginTrace', () => {
		it('should create a trace with exception details', () => {
			const trace = createTestFailedPluginTrace();

			expect(trace.exceptionDetails).toBe('System.Exception: Test exception occurred');
			expect(trace.exceptionDetails).not.toBeNull();
		});

		it('should mark the trace as having an exception', () => {
			const trace = createTestFailedPluginTrace();

			expect(trace.hasException()).toBe(true);
			expect(trace.isSuccessful()).toBe(false);
		});

		it('should have exception status', () => {
			const trace = createTestFailedPluginTrace();

			expect(trace.getStatus()).toEqual(TraceStatus.Exception);
		});

		it('should inherit synchronous mode from base factory', () => {
			const trace = createTestFailedPluginTrace();

			expect(trace.mode).toEqual(ExecutionMode.Synchronous);
			expect(trace.isSynchronous()).toBe(true);
		});

		it('should allow overriding exception details', () => {
			const customException = 'System.InvalidOperationException: Custom error';
			const trace = createTestFailedPluginTrace({
				exceptionDetails: customException
			});

			expect(trace.exceptionDetails).toBe(customException);
			expect(trace.hasException()).toBe(true);
		});

		it('should allow overriding other properties while maintaining exception', () => {
			const trace = createTestFailedPluginTrace({
				pluginName: 'FailingPlugin',
				messageName: 'Delete'
			});

			expect(trace.exceptionDetails).toBe('System.Exception: Test exception occurred');
			expect(trace.pluginName).toBe('FailingPlugin');
			expect(trace.messageName).toBe('Delete');
			expect(trace.hasException()).toBe(true);
		});

		it('should be distinguishable from successful traces', () => {
			const successful = createTestPluginTrace();
			const failed = createTestFailedPluginTrace();

			expect(successful.getStatus()).toEqual(TraceStatus.Success);
			expect(failed.getStatus()).toEqual(TraceStatus.Exception);
			expect(successful.isSuccessful()).toBe(true);
			expect(failed.isSuccessful()).toBe(false);
		});
	});

	describe('createTestAsyncPluginTrace', () => {
		it('should create a trace with asynchronous execution mode', () => {
			const trace = createTestAsyncPluginTrace();

			expect(trace.mode).toEqual(ExecutionMode.Asynchronous);
		});

		it('should mark the trace as asynchronous', () => {
			const trace = createTestAsyncPluginTrace();

			expect(trace.isAsynchronous()).toBe(true);
			expect(trace.isSynchronous()).toBe(false);
		});

		it('should have asynchronous mode value of 1', () => {
			const trace = createTestAsyncPluginTrace();

			expect(trace.mode.value).toBe(1);
		});

		it('should not have exception by default', () => {
			const trace = createTestAsyncPluginTrace();

			expect(trace.exceptionDetails).toBeNull();
			expect(trace.hasException()).toBe(false);
		});

		it('should inherit other default properties from base factory', () => {
			const trace = createTestAsyncPluginTrace();

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.messageName).toBe('Create');
			expect(trace.stage).toBe(0);
			expect(trace.depth).toBe(1);
		});

		it('should allow overriding async mode with other properties', () => {
			const trace = createTestAsyncPluginTrace({
				pluginName: 'AsyncPlugin',
				entityName: 'contact'
			});

			expect(trace.mode).toEqual(ExecutionMode.Asynchronous);
			expect(trace.pluginName).toBe('AsyncPlugin');
			expect(trace.entityName).toBe('contact');
		});

		it('should be distinguishable from synchronous traces', () => {
			const sync = createTestPluginTrace();
			const async = createTestAsyncPluginTrace();

			expect(sync.isSynchronous()).toBe(true);
			expect(async.isSynchronous()).toBe(false);
			expect(sync.mode.value).toBe(0);
			expect(async.mode.value).toBe(1);
		});

		it('should work with failed async traces', () => {
			const trace = createTestAsyncPluginTrace({
				exceptionDetails: 'Async exception'
			});

			expect(trace.isAsynchronous()).toBe(true);
			expect(trace.hasException()).toBe(true);
		});
	});

	describe('createTestRelatedPluginTrace', () => {
		it('should create a trace with specified correlation ID', () => {
			const correlationId = 'test-correlation-123';
			const trace = createTestRelatedPluginTrace(correlationId);

			expect(trace.correlationId).not.toBeNull();
			expect(trace.correlationId?.getValue()).toBe(correlationId);
		});

		it('should mark trace as having correlation ID', () => {
			const trace = createTestRelatedPluginTrace('test-id');

			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should allow two related traces to be identified as related', () => {
			const sharedCorrelationId = 'shared-correlation-456';
			const trace1 = createTestRelatedPluginTrace(sharedCorrelationId);
			const trace2 = createTestRelatedPluginTrace(sharedCorrelationId);

			expect(trace1.isRelatedTo(trace2)).toBe(true);
			expect(trace2.isRelatedTo(trace1)).toBe(true);
		});

		it('should identify unrelated traces when correlation IDs differ', () => {
			const trace1 = createTestRelatedPluginTrace('correlation-1');
			const trace2 = createTestRelatedPluginTrace('correlation-2');

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should not be related to traces without correlation ID', () => {
			const relatedTrace = createTestRelatedPluginTrace('has-correlation');
			const unrelatedTrace = createTestPluginTrace();

			expect(relatedTrace.isRelatedTo(unrelatedTrace)).toBe(false);
			expect(unrelatedTrace.isRelatedTo(relatedTrace)).toBe(false);
		});

		it('should inherit other default properties', () => {
			const trace = createTestRelatedPluginTrace('correlation-id');

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.exceptionDetails).toBeNull();
			expect(trace.isSynchronous()).toBe(true);
		});

		it('should allow overriding correlation ID along with other properties', () => {
			const customId = 'custom-correlation-789';
			const trace = createTestRelatedPluginTrace(customId, {
				pluginName: 'RelatedPlugin',
				messageName: 'Update'
			});

			expect(trace.correlationId?.getValue()).toBe(customId);
			expect(trace.pluginName).toBe('RelatedPlugin');
			expect(trace.messageName).toBe('Update');
			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should support chaining multiple related traces', () => {
			const correlationId = 'chain-correlation';
			const trace1 = createTestRelatedPluginTrace(correlationId);
			const trace2 = createTestRelatedPluginTrace(correlationId);
			const trace3 = createTestRelatedPluginTrace(correlationId);

			expect(trace1.isRelatedTo(trace2)).toBe(true);
			expect(trace2.isRelatedTo(trace3)).toBe(true);
			expect(trace1.isRelatedTo(trace3)).toBe(true);
		});

		it('should work with async execution mode', () => {
			const trace = createTestRelatedPluginTrace('correlation-id', {
				mode: ExecutionMode.Asynchronous
			});

			expect(trace.correlationId?.getValue()).toBe('correlation-id');
			expect(trace.isAsynchronous()).toBe(true);
			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should work with failed traces', () => {
			const trace = createTestRelatedPluginTrace('correlation-id', {
				exceptionDetails: 'Failed related trace'
			});

			expect(trace.correlationId?.getValue()).toBe('correlation-id');
			expect(trace.hasException()).toBe(true);
			expect(trace.hasCorrelationId()).toBe(true);
		});
	});

	describe('createTestNestedPluginTrace', () => {
		it('should create a trace with specified depth', () => {
			const trace = createTestNestedPluginTrace(3);

			expect(trace.depth).toBe(3);
		});

		it('should mark trace as nested when depth > 1', () => {
			const trace = createTestNestedPluginTrace(2);

			expect(trace.depth).toBe(2);
			expect(trace.isNested()).toBe(true);
		});

		it('should support various depth levels', () => {
			const depth2 = createTestNestedPluginTrace(2);
			const depth5 = createTestNestedPluginTrace(5);
			const depth10 = createTestNestedPluginTrace(10);

			expect(depth2.isNested()).toBe(true);
			expect(depth5.isNested()).toBe(true);
			expect(depth10.isNested()).toBe(true);
			expect(depth2.depth).toBe(2);
			expect(depth5.depth).toBe(5);
			expect(depth10.depth).toBe(10);
		});

		it('should not be nested when depth = 1', () => {
			const trace = createTestNestedPluginTrace(1);

			expect(trace.depth).toBe(1);
			expect(trace.isNested()).toBe(false);
		});

		it('should create non-nested with depth = 0', () => {
			const trace = createTestNestedPluginTrace(0);

			expect(trace.depth).toBe(0);
			expect(trace.isNested()).toBe(false);
		});

		it('should inherit other default properties', () => {
			const trace = createTestNestedPluginTrace(4);

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.messageName).toBe('Create');
			expect(trace.exceptionDetails).toBeNull();
			expect(trace.isSynchronous()).toBe(true);
		});

		it('should allow overriding depth with other properties', () => {
			const trace = createTestNestedPluginTrace(3, {
				pluginName: 'NestedPlugin',
				messageName: 'Update'
			});

			expect(trace.depth).toBe(3);
			expect(trace.pluginName).toBe('NestedPlugin');
			expect(trace.messageName).toBe('Update');
			expect(trace.isNested()).toBe(true);
		});

		it('should work with async execution mode', () => {
			const trace = createTestNestedPluginTrace(3, {
				mode: ExecutionMode.Asynchronous
			});

			expect(trace.depth).toBe(3);
			expect(trace.isNested()).toBe(true);
			expect(trace.isAsynchronous()).toBe(true);
		});

		it('should work with failed traces', () => {
			const trace = createTestNestedPluginTrace(2, {
				exceptionDetails: 'Nested plugin failed'
			});

			expect(trace.depth).toBe(2);
			expect(trace.isNested()).toBe(true);
			expect(trace.hasException()).toBe(true);
		});

		it('should work with correlation ID', () => {
			const trace = createTestNestedPluginTrace(3, {
				correlationId: CorrelationId.create('nested-correlation')
			});

			expect(trace.depth).toBe(3);
			expect(trace.isNested()).toBe(true);
			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should represent plugin call hierarchy with increasing depth', () => {
			const topLevel = createTestNestedPluginTrace(1);
			const firstNested = createTestNestedPluginTrace(2);
			const deeplyNested = createTestNestedPluginTrace(5);

			expect(topLevel.isNested()).toBe(false);
			expect(firstNested.isNested()).toBe(true);
			expect(deeplyNested.isNested()).toBe(true);
			expect(deeplyNested.depth).toBeGreaterThan(firstNested.depth);
		});
	});

	describe('Factory interaction tests', () => {
		it('should create distinct instances with different characteristics', () => {
			const basic = createTestPluginTrace();
			const failed = createTestFailedPluginTrace();
			const async = createTestAsyncPluginTrace();
			const related = createTestRelatedPluginTrace('correlation-id');
			const nested = createTestNestedPluginTrace(3);

			// Verify they are different instances
			expect(basic).not.toBe(failed);
			expect(basic).not.toBe(async);
			expect(basic).not.toBe(related);
			expect(basic).not.toBe(nested);

			// Verify key differences
			expect(basic.hasException()).toBe(false);
			expect(failed.hasException()).toBe(true);
			expect(basic.isSynchronous()).toBe(true);
			expect(async.isAsynchronous()).toBe(true);
			expect(basic.hasCorrelationId()).toBe(false);
			expect(related.hasCorrelationId()).toBe(true);
			expect(basic.isNested()).toBe(false);
			expect(nested.isNested()).toBe(true);
		});

		it('should support combining multiple factory specializations', () => {
			const complexTrace = createTestNestedPluginTrace(2, {
				exceptionDetails: 'Nested async exception',
				mode: ExecutionMode.Asynchronous,
				correlationId: CorrelationId.create('complex-correlation')
			});

			expect(complexTrace.isNested()).toBe(true);
			expect(complexTrace.hasException()).toBe(true);
			expect(complexTrace.isAsynchronous()).toBe(true);
			expect(complexTrace.hasCorrelationId()).toBe(true);
		});

		it('should support complex tracing scenarios with related nested traces', () => {
			const correlationIdValue = 'transaction-123';
			const parentTrace = createTestNestedPluginTrace(1, {
				correlationId: CorrelationId.create(correlationIdValue)
			});

			const childTrace = createTestNestedPluginTrace(2, {
				correlationId: CorrelationId.create(correlationIdValue)
			});

			const grandchildTrace = createTestNestedPluginTrace(3, {
				correlationId: CorrelationId.create(correlationIdValue)
			});

			// All traces are related due to shared correlation ID
			expect(parentTrace.isRelatedTo(childTrace)).toBe(true);
			expect(childTrace.isRelatedTo(grandchildTrace)).toBe(true);
			expect(parentTrace.isRelatedTo(grandchildTrace)).toBe(true);

			// Depth increases down the hierarchy
			expect(parentTrace.depth).toBe(1);
			expect(childTrace.depth).toBe(2);
			expect(grandchildTrace.depth).toBe(3);

			// Only nested traces after root
			expect(parentTrace.isNested()).toBe(false);
			expect(childTrace.isNested()).toBe(true);
			expect(grandchildTrace.isNested()).toBe(true);
		});
	});
});
