import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { CorrelationId } from '../valueObjects/CorrelationId';
import { TraceStatus } from '../valueObjects/TraceStatus';
import { createTestPluginTrace } from '../../../../shared/testing';

describe('PluginTrace', () => {
	// Use shared test factory
	const createValidTrace = createTestPluginTrace;

	describe('create', () => {
		it('should create trace with all required fields populated correctly', () => {
			const trace = createValidTrace();

			expect(trace.id).toBe('trace-123');
			expect(trace.pluginName).toBe('MyPlugin');
			expect(trace.entityName).toBe('account');
			expect(trace.messageName).toBe('Create');
		});

		it('should use default pipeline stage 0 when stage parameter not provided', () => {
			const trace = createValidTrace();
			expect(trace.stage).toBe(0);
		});

		it('should use default execution depth 1 when depth parameter not provided', () => {
			const trace = createValidTrace();
			expect(trace.depth).toBe(1);
		});

		it('should accept custom pipeline stage value when explicitly provided', () => {
			const trace = createValidTrace({ stage: 20 });
			expect(trace.stage).toBe(20);
		});

		it('should accept custom execution depth value when explicitly provided', () => {
			const trace = createValidTrace({ depth: 3 });
			expect(trace.depth).toBe(3);
		});

		it('should throw DomainError when id is empty string', () => {
			expect(() => createValidTrace({ id: '' })).toThrow('id is required');
		});

		it('should throw DomainError when id contains only whitespace characters', () => {
			expect(() => createValidTrace({ id: '   ' })).toThrow('id is required');
		});

		it('should throw DomainError when pluginName is empty string', () => {
			expect(() => createValidTrace({ pluginName: '' })).toThrow('pluginName is required');
		});

		it('should throw DomainError when messageName is empty string', () => {
			expect(() => createValidTrace({ messageName: '' })).toThrow('messageName is required');
		});

		it('should accept null entityName for traces without associated entity', () => {
			const trace = createValidTrace({ entityName: null });
			expect(trace.entityName).toBeNull();
		});

		it('should accept null exceptionDetails when trace executed without errors', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.exceptionDetails).toBeNull();
		});

		it('should accept null correlation ID when trace has no parent execution context', () => {
			const trace = createValidTrace({ correlationId: null });
			expect(trace.correlationId).toBeNull();
		});
	});

	describe('hasException', () => {
		it('should return false when exceptionDetails is null indicating successful execution', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.hasException()).toBe(false);
		});

		it('should return false when exceptionDetails is empty string', () => {
			const trace = createValidTrace({ exceptionDetails: '' });
			expect(trace.hasException()).toBe(false);
		});

		it('should return false when exceptionDetails contains only whitespace characters', () => {
			const trace = createValidTrace({ exceptionDetails: '   ' });
			expect(trace.hasException()).toBe(false);
		});

		it('should return true when exceptionDetails contains error message text', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error: Something went wrong' });
			expect(trace.hasException()).toBe(true);
		});
	});

	describe('isSuccessful', () => {
		it('should return true when trace completed without exception', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.isSuccessful()).toBe(true);
		});

		it('should return false when trace contains exception details', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error occurred' });
			expect(trace.isSuccessful()).toBe(false);
		});
	});

	describe('getStatus', () => {
		it('should return Success status when trace executed without exceptions', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			expect(trace.getStatus()).toBe(TraceStatus.Success);
		});

		it('should return Exception status when trace contains error details', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error occurred' });
			expect(trace.getStatus()).toBe(TraceStatus.Exception);
		});
	});

	describe('isRelatedTo', () => {
		it('should return true when both traces share identical correlation ID', () => {
			const correlationId = CorrelationId.create('corr-123');
			const trace1 = createValidTrace({ correlationId });
			const trace2 = createValidTrace({ correlationId });

			expect(trace1.isRelatedTo(trace2)).toBe(true);
		});

		it('should return false when traces have different correlation IDs', () => {
			const trace1 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			const trace2 = createValidTrace({ correlationId: CorrelationId.create('corr-456') });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when current trace has null correlation ID', () => {
			const trace1 = createValidTrace({ correlationId: null });
			const trace2 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when compared trace has null correlation ID', () => {
			const trace1 = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			const trace2 = createValidTrace({ correlationId: null });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});

		it('should return false when both traces have null correlation IDs', () => {
			const trace1 = createValidTrace({ correlationId: null });
			const trace2 = createValidTrace({ correlationId: null });

			expect(trace1.isRelatedTo(trace2)).toBe(false);
		});
	});

	describe('isNested', () => {
		it('should return false when execution depth is 1 indicating top-level execution', () => {
			const trace = createValidTrace({ depth: 1 });
			expect(trace.isNested()).toBe(false);
		});

		it('should return true when execution depth is 2 indicating nested plugin call', () => {
			const trace = createValidTrace({ depth: 2 });
			expect(trace.isNested()).toBe(true);
		});

		it('should return true when execution depth exceeds 2 indicating deeply nested calls', () => {
			const trace = createValidTrace({ depth: 5 });
			expect(trace.isNested()).toBe(true);
		});
	});

	describe('isSynchronous', () => {
		it('should return true when plugin executed in Synchronous execution mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Synchronous });
			expect(trace.isSynchronous()).toBe(true);
		});

		it('should return false when plugin executed in Asynchronous execution mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Asynchronous });
			expect(trace.isSynchronous()).toBe(false);
		});
	});

	describe('isAsynchronous', () => {
		it('should return false when plugin executed in Synchronous execution mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Synchronous });
			expect(trace.isAsynchronous()).toBe(false);
		});

		it('should return true when plugin executed in Asynchronous execution mode', () => {
			const trace = createValidTrace({ mode: ExecutionMode.Asynchronous });
			expect(trace.isAsynchronous()).toBe(true);
		});
	});

	describe('hasCorrelationId', () => {
		it('should return true when trace has associated correlation ID for execution context', () => {
			const trace = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
			expect(trace.hasCorrelationId()).toBe(true);
		});

		it('should return false when trace has null correlation ID', () => {
			const trace = createValidTrace({ correlationId: null });
			expect(trace.hasCorrelationId()).toBe(false);
		});
	});

	describe('edge cases', () => {
		describe('unicode and special characters', () => {
			it('should handle unicode characters in plugin name', () => {
				const trace = createValidTrace({ pluginName: '插件测试 🔌 プラグイン' });
				expect(trace.pluginName).toBe('插件测试 🔌 プラグイン');
			});

			it('should handle special characters in entity name', () => {
				const trace = createValidTrace({ entityName: 'custom_entity$name@test' });
				expect(trace.entityName).toBe('custom_entity$name@test');
			});

			it('should handle emoji in exception details', () => {
				const exceptionDetails = 'Error: ❌ Failed to process 🔥 Critical issue';
				const trace = createValidTrace({ exceptionDetails });
				expect(trace.exceptionDetails).toBe(exceptionDetails);
				expect(trace.hasException()).toBe(true);
			});

			it('should handle unicode in message block', () => {
				const messageBlock = '{"data": "测试数据", "status": "成功"}';
				const trace = createValidTrace({ messageBlock });
				expect(trace.messageBlock).toBe(messageBlock);
			});
		});

		describe('very long strings', () => {
			it('should handle very long plugin name (1000+ chars)', () => {
				const longName = 'Plugin'.repeat(200);
				const trace = createValidTrace({ pluginName: longName });
				expect(trace.pluginName).toBe(longName);
				expect(trace.pluginName.length).toBeGreaterThan(1000);
			});

			it('should handle very long exception details (5000+ chars)', () => {
				const longException = 'Error: '.repeat(1000) + 'Stack trace line\n'.repeat(100);
				const trace = createValidTrace({ exceptionDetails: longException });
				expect(trace.exceptionDetails).toBe(longException);
				expect(trace.exceptionDetails!.length).toBeGreaterThan(5000);
				expect(trace.hasException()).toBe(true);
			});

			it('should handle very long message block (10000+ chars)', () => {
				const largePayload = JSON.stringify({ data: 'x'.repeat(10000) });
				const trace = createValidTrace({ messageBlock: largePayload });
				expect(trace.messageBlock).toBe(largePayload);
				expect(trace.messageBlock!.length).toBeGreaterThan(10000);
			});

			it('should handle very long configuration string', () => {
				const longConfig = JSON.stringify({ settings: 'x'.repeat(2000) });
				const trace = createValidTrace({ configuration: longConfig });
				expect(trace.configuration).toBe(longConfig);
			});
		});

		describe('boundary values', () => {
			it('should handle maximum depth value', () => {
				const trace = createValidTrace({ depth: Number.MAX_SAFE_INTEGER });
				expect(trace.depth).toBe(Number.MAX_SAFE_INTEGER);
				expect(trace.isNested()).toBe(true);
			});

			it('should handle zero depth', () => {
				const trace = createValidTrace({ depth: 0 });
				expect(trace.depth).toBe(0);
				expect(trace.isNested()).toBe(false);
			});

			it('should handle negative stage', () => {
				const trace = createValidTrace({ stage: -10 });
				expect(trace.stage).toBe(-10);
			});

			it('should handle large stage value', () => {
				const trace = createValidTrace({ stage: 999999 });
				expect(trace.stage).toBe(999999);
			});
		});

		describe('null and undefined handling', () => {
			it('should handle all nullable fields as null', () => {
				const trace = createValidTrace({
					entityName: null,
					executionStartTime: null,
					constructorStartTime: null,
					exceptionDetails: null,
					messageBlock: null,
					configuration: null,
					secureConfiguration: null,
					correlationId: null,
					requestId: null,
					pluginStepId: null,
					persistenceKey: null,
					organizationId: null,
					profile: null,
					isSystemCreated: null,
					createdBy: null,
					createdOnBehalfBy: null
				});

				expect(trace.entityName).toBeNull();
				expect(trace.executionStartTime).toBeNull();
				expect(trace.constructorStartTime).toBeNull();
				expect(trace.exceptionDetails).toBeNull();
				expect(trace.messageBlock).toBeNull();
				expect(trace.configuration).toBeNull();
				expect(trace.secureConfiguration).toBeNull();
				expect(trace.correlationId).toBeNull();
				expect(trace.requestId).toBeNull();
				expect(trace.pluginStepId).toBeNull();
				expect(trace.persistenceKey).toBeNull();
				expect(trace.organizationId).toBeNull();
				expect(trace.profile).toBeNull();
				expect(trace.isSystemCreated).toBeNull();
				expect(trace.createdBy).toBeNull();
				expect(trace.createdOnBehalfBy).toBeNull();
			});

			it('should treat empty string exception as no exception', () => {
				const trace = createValidTrace({ exceptionDetails: '' });
				expect(trace.hasException()).toBe(false);
				expect(trace.isSuccessful()).toBe(true);
			});

			it('should handle whitespace-only exception details', () => {
				const trace = createValidTrace({ exceptionDetails: '    \n\t   ' });
				expect(trace.hasException()).toBe(false);
			});
		});

		describe('immutability', () => {
			it('should maintain immutability of id', () => {
				const trace = createValidTrace({ id: 'immutable-123' });
				const id1 = trace.id;
				const id2 = trace.id;
				expect(id1).toBe(id2);
				expect(id1).toBe('immutable-123');
			});

			it('should maintain immutability of correlation ID', () => {
				const corrId = CorrelationId.create('corr-123');
				const trace = createValidTrace({ correlationId: corrId });
				expect(trace.correlationId).toBe(corrId);
			});

			it('should maintain immutability of dates', () => {
				const createdOn = new Date('2024-01-01T10:00:00Z');
				const execStartTime = new Date('2024-01-01T10:00:01Z');
				const trace = createValidTrace({
					createdOn,
					executionStartTime: execStartTime
				});

				expect(trace.createdOn).toBe(createdOn);
				expect(trace.executionStartTime).toBe(execStartTime);
			});
		});

		describe('related traces edge cases', () => {
			it('should handle comparison with same trace instance', () => {
				const trace = createValidTrace({ correlationId: CorrelationId.create('corr-123') });
				expect(trace.isRelatedTo(trace)).toBe(true);
			});

			it('should handle null correlation ID comparison', () => {
				const trace1 = createValidTrace({ correlationId: null });
				const trace2 = createValidTrace({ correlationId: null });
				expect(trace1.isRelatedTo(trace2)).toBe(false);
				expect(trace1.hasCorrelationId()).toBe(false);
				expect(trace2.hasCorrelationId()).toBe(false);
			});

			it('should handle very long correlation IDs', () => {
				const longCorrId = 'corr-' + 'x'.repeat(1000);
				const corrId = CorrelationId.create(longCorrId);
				const trace1 = createValidTrace({ correlationId: corrId });
				const trace2 = createValidTrace({ correlationId: corrId });
				expect(trace1.isRelatedTo(trace2)).toBe(true);
			});
		});
	});
});
