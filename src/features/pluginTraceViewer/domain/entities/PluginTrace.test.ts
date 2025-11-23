import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { CorrelationId } from '../valueObjects/CorrelationId';
import { TraceStatus } from '../valueObjects/TraceStatus';
import { createTestPluginTrace } from '../../../../shared/testing';

describe('PluginTrace', () => {
	// Use shared test factory
	const createValidTrace = createTestPluginTrace;

	describe('create', () => {
		it('should create trace with all required fields', () => {
			const trace = createValidTrace();

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.entityName).toBe('account');
			expect(trace.messageName).toBe('Create');
		});

		it('should use default stage 0 when not provided', () => {
			const trace = createValidTrace();
			expect(trace.stage).toBe(0);
		});

		it('should use default depth 1 when not provided', () => {
			const trace = createValidTrace();
			expect(trace.depth).toBe(1);
		});

		it('should accept custom stage', () => {
			const trace = createValidTrace({ stage: 20 });
			expect(trace.stage).toBe(20);
		});

		it('should accept custom depth', () => {
			const trace = createValidTrace({ depth: 3 });
			expect(trace.depth).toBe(3);
		});

		it('should throw error for empty id', () => {
			expect(() => createValidTrace({ id: '' })).toThrow('id is required');
		});

		it('should throw error for whitespace-only id', () => {
			expect(() => createValidTrace({ id: '   ' })).toThrow('id is required');
		});

		it('should throw error for empty pluginName', () => {
			expect(() => createValidTrace({ pluginName: '' })).toThrow('pluginName is required');
		});

		it('should throw error for empty messageName', () => {
			expect(() => createValidTrace({ messageName: '' })).toThrow('messageName is required');
		});

		it('should accept null entityName', () => {
			const trace = createValidTrace({ entityName: null });
			expect(trace.entityName).toBeNull();
		});

		it('should accept null exceptionDetails', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.exceptionDetails).toBeNull();
		});

		it('should accept null correlation ID', () => {
			const trace = createValidTrace({ correlationId: null });
			expect(trace.correlationId).toBeNull();
		});
	});

	describe('hasException', () => {
		it('should return false when exceptionDetails is null', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.hasException()).toBe(false);
		});

		it('should return false when exceptionDetails is empty string', () => {
			const trace = createValidTrace({ exceptionDetails: '' });
			expect(trace.hasException()).toBe(false);
		});

		it('should return false when exceptionDetails is whitespace', () => {
			const trace = createValidTrace({ exceptionDetails: '   ' });
			expect(trace.hasException()).toBe(false);
		});

		it('should return true when exceptionDetails has content', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error: Something went wrong' });
			expect(trace.hasException()).toBe(true);
		});
	});

	describe('isSuccessful', () => {
		it('should return true when no exception', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.isSuccessful()).toBe(true);
		});

		it('should return false when has exception', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error occurred' });
			expect(trace.isSuccessful()).toBe(false);
		});
	});

	describe('getStatus', () => {
		it('should return Success status when no exception', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.getStatus()).toBe(TraceStatus.Success);
		});

		it('should return Exception status when has exception', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error occurred' });
			expect(trace.getStatus()).toBe(TraceStatus.Exception);
		});
	});

	describe('isRelatedTo', () => {
		it('should return true when correlation IDs match', () => {
			const correlationId = CorrelationId.create('corr-123');
			const trace1 = createValidTrace({ correlationId });
			const trace2 = createValidTrace({ correlationId });

			expect(trace1.isRelatedTo(trace2)).toBe(true);
		});

		it('should return false when correlation IDs differ', () => {
			const trace1 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			const trace2 = createValidTrace({ correlationId: CorrelationId.create('corr-456') });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when first trace has no correlation ID', () => {
			const trace1 = createValidTrace({ correlationId: null });
			const trace2 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when second trace has no correlation ID', () => {
			const trace1 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			const trace2 = createValidTrace({ correlationId: null });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when both traces have no correlation ID', () => {
			const trace1 = createValidTrace({ correlationId: null });
			const trace2 = createValidTrace({ correlationId: null });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});
	});

	describe('isNested', () => {
		it('should return false for depth 1', () => {
			const trace = createValidTrace({ depth: 1 });
			expect(trace.isNested()).toBe(false);
		});

		it('should return true for depth 2', () => {
			const trace = createValidTrace({ depth: 2 });
			expect(trace.isNested()).toBe(true);
		});

		it('should return true for depth greater than 2', () => {
			const trace = createValidTrace({ depth: 5 });
			expect(trace.isNested()).toBe(true);
		});
	});

	describe('isSynchronous', () => {
		it('should return true for Synchronous mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Synchronous });
			expect(trace.isSynchronous()).toBe(true);
		});

		it('should return false for Asynchronous mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Asynchronous });
			expect(trace.isSynchronous()).toBe(false);
		});
	});

	describe('isAsynchronous', () => {
		it('should return false for Synchronous mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Synchronous });
			expect(trace.isAsynchronous()).toBe(false);
		});

		it('should return true for Asynchronous mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Asynchronous });
			expect(trace.isAsynchronous()).toBe(true);
		});
	});

	describe('hasCorrelationId', () => {
		it('should return true when has correlation ID', () => {
			const trace = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should return false when correlation ID is null', () => {
			const trace = createValidTrace({ correlationId: null });
			expect(trace.hasCorrelationId()).toBe(false);
		});
	});
});
