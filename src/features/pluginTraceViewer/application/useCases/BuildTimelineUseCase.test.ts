import { BuildTimelineUseCase } from './BuildTimelineUseCase';
import { PluginTrace } from './../../domain/entities/PluginTrace';
import { ExecutionMode } from './../../domain/valueObjects/ExecutionMode';
import { OperationType } from './../../domain/valueObjects/OperationType';
import { Duration } from './../../domain/valueObjects/Duration';
import { CorrelationId } from './../../domain/valueObjects/CorrelationId';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';

describe('BuildTimelineUseCase', () => {
	let useCase: BuildTimelineUseCase;
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
		useCase = new BuildTimelineUseCase(logger);
	});

	// Test data factory
	function createTrace(overrides: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
		return PluginTrace.create({
			id: 'trace-123',
			createdOn: new Date('2024-01-01T10:00:00Z'),
			pluginName: 'MyPlugin',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(100),
			constructorDuration: Duration.fromMilliseconds(50),
			depth: 1,
			...overrides
		});
	}

	describe('execute', () => {
		it('should return empty array for empty trace list', () => {
			const result = useCase.execute([], null);
			expect(result).toEqual([]);
		});

		it('should return all traces when correlationId is null', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				correlationId: CorrelationId.create('bbbb0000-1111-2222-3333-444444444444')
			});

			const result = useCase.execute([trace1, trace2], null);

			expect(result).toHaveLength(2);
			expect(result[0]?.trace).toBe(trace1);
			expect(result[1]?.trace).toBe(trace2);
		});

		it('should return all traces when correlationId is undefined', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				correlationId: CorrelationId.create('bbbb0000-1111-2222-3333-444444444444')
			});

			const result = useCase.execute([trace1, trace2], undefined);

			expect(result).toHaveLength(2);
			expect(result[0]?.trace).toBe(trace1);
			expect(result[1]?.trace).toBe(trace2);
		});

		it('should filter traces by correlation ID when provided', () => {
			const targetId = 'aaaa0000-1111-2222-3333-444444444444';
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create(targetId)
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				correlationId: CorrelationId.create('bbbb0000-1111-2222-3333-444444444444')
			});
			const trace3 = createTrace({
				id: 'trace3',
				depth: 1,
				correlationId: CorrelationId.create(targetId)
			});

			const result = useCase.execute([trace1, trace2, trace3], targetId);

			expect(result).toHaveLength(1); // trace1 root with trace3 as child
			expect(result[0]?.trace).toBe(trace1);
			expect(result[0]?.children).toHaveLength(1);
			expect(result[0]?.children[0]?.trace).toBe(trace3);
		});

		it('should return empty array when no traces match correlation ID', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				correlationId: CorrelationId.create('bbbb0000-1111-2222-3333-444444444444')
			});

			const result = useCase.execute([trace1, trace2], 'cccc0000-1111-2222-3333-444444444444');

			expect(result).toEqual([]);
		});

		it('should exclude traces without correlation ID when filtering', () => {
			const targetId = 'aaaa0000-1111-2222-3333-444444444444';
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create(targetId)
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				correlationId: null // No correlation ID
			});

			const result = useCase.execute([trace1, trace2], targetId);

			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(trace1);
		});

		it('should build hierarchy using TimelineHierarchyService', () => {
			const parent = createTrace({
				id: 'parent',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(200),
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});
			const child = createTrace({
				id: 'child',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.050Z'),
				duration: Duration.fromMilliseconds(100),
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});

			const result = useCase.execute([parent, child], 'aaaa0000-1111-2222-3333-444444444444');

			// Should create parent-child hierarchy
			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(parent);
			expect(result[0]?.children).toHaveLength(1);
			expect(result[0]?.children[0]?.trace).toBe(child);
		});

		it('should calculate positioning for timeline nodes', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(100),
				correlationId: null
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.200Z'),
				duration: Duration.fromMilliseconds(100),
				correlationId: null
			});

			const result = useCase.execute([trace1, trace2], null);

			// Nodes should have calculated positioning
			expect(result[0]?.offsetPercent).toBeGreaterThanOrEqual(0);
			expect(result[0]?.widthPercent).toBeGreaterThan(0);
			expect(result[1]?.offsetPercent).toBeGreaterThanOrEqual(0);
			expect(result[1]?.widthPercent).toBeGreaterThan(0);
		});

		it('should handle multiple correlation ID groups', () => {
			const idA = 'aaaa0000-1111-2222-3333-444444444444';
			const idB = 'bbbb0000-1111-2222-3333-444444444444';

			const traceA1 = createTrace({
				id: 'a1',
				depth: 0,
				correlationId: CorrelationId.create(idA)
			});
			const traceA2 = createTrace({
				id: 'a2',
				depth: 1,
				correlationId: CorrelationId.create(idA)
			});
			const traceB1 = createTrace({
				id: 'b1',
				depth: 0,
				correlationId: CorrelationId.create(idB)
			});
			const traceB2 = createTrace({
				id: 'b2',
				depth: 1,
				correlationId: CorrelationId.create(idB)
			});

			const resultA = useCase.execute([traceA1, traceA2, traceB1, traceB2], idA);
			const resultB = useCase.execute([traceA1, traceA2, traceB1, traceB2], idB);

			// Group A: traceA1 root with traceA2 child
			expect(resultA).toHaveLength(1);
			expect(resultA[0]?.trace).toBe(traceA1);
			expect(resultA[0]?.children[0]?.trace).toBe(traceA2);

			// Group B: traceB1 root with traceB2 child
			expect(resultB).toHaveLength(1);
			expect(resultB[0]?.trace).toBe(traceB1);
			expect(resultB[0]?.children[0]?.trace).toBe(traceB2);
		});

		it('should log debug information at use case boundaries', () => {
			const loggerSpy = jest.spyOn(logger, 'debug');
			const trace = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});

			useCase.execute([trace], 'aaaa0000-1111-2222-3333-444444444444');

			// Should log at start and completion
			expect(loggerSpy).toHaveBeenCalledWith(
				'Building timeline hierarchy',
				expect.objectContaining({
					totalTraces: 1,
					correlationId: 'aaaa0000-1111-2222-3333-444444444444'
				})
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				'Timeline hierarchy built',
				expect.objectContaining({
					correlationId: 'aaaa0000-1111-2222-3333-444444444444',
					roots: 1,
					totalNodes: 1
				})
			);
		});

		it('should log "all" when correlationId is null', () => {
			const loggerSpy = jest.spyOn(logger, 'debug');
			const trace = createTrace({ id: 'trace1', depth: 0 });

			useCase.execute([trace], null);

			expect(loggerSpy).toHaveBeenCalledWith(
				'Building timeline hierarchy',
				expect.objectContaining({
					correlationId: 'all'
				})
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				'Timeline hierarchy built',
				expect.objectContaining({
					correlationId: 'all'
				})
			);
		});

		it('should log when no traces found for correlation ID', () => {
			const loggerSpy = jest.spyOn(logger, 'debug');
			const trace = createTrace({
				id: 'trace1',
				depth: 0,
				correlationId: CorrelationId.create('aaaa0000-1111-2222-3333-444444444444')
			});

			useCase.execute([trace], 'bbbb0000-1111-2222-3333-444444444444');

			expect(loggerSpy).toHaveBeenCalledWith(
				'No traces found for timeline',
				expect.objectContaining({
					correlationId: 'bbbb0000-1111-2222-3333-444444444444'
				})
			);
		});

		it('should include total duration in completion log', () => {
			const loggerSpy = jest.spyOn(logger, 'debug');
			const trace = createTrace({
				id: 'trace1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(150)
			});

			useCase.execute([trace], null);

			expect(loggerSpy).toHaveBeenCalledWith(
				'Timeline hierarchy built',
				expect.objectContaining({
					totalDuration: '150ms'
				})
			);
		});

		it('should not mutate input traces array', () => {
			const trace1 = createTrace({ id: 'trace1', depth: 0 });
			const trace2 = createTrace({ id: 'trace2', depth: 0 });
			const traces = [trace1, trace2];

			useCase.execute(traces, null);

			expect(traces).toEqual([trace1, trace2]); // Original array unchanged
		});
	});
});
