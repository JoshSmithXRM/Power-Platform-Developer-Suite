import { PluginTraceViewModelMapper } from './PluginTraceViewModelMapper';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { CorrelationId } from '../../domain/valueObjects/CorrelationId';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { Duration } from '../../domain/valueObjects/Duration';
import { TraceStatus } from '../../domain/valueObjects/TraceStatus';

describe('PluginTraceViewModelMapper', () => {
	let mapper: PluginTraceViewModelMapper;

	beforeEach(() => {
		mapper = new PluginTraceViewModelMapper();
	});

	// Helper to create a minimal PluginTrace for testing
	function createMockPluginTrace(overrides: Partial<PluginTrace> = {}): PluginTrace {
		const defaultValues = {
			id: 'trace-123',
			createdOn: new Date('2025-01-15T10:30:00Z'),
			pluginName: 'TestPlugin.Execute',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			stage: 20,
			depth: 1,
			duration: Duration.fromMilliseconds(1250),
			constructorDuration: Duration.fromMilliseconds(50),
			executionStartTime: new Date('2025-01-15T10:30:00Z'),
			constructorStartTime: new Date('2025-01-15T10:29:59Z'),
			exceptionDetails: null,
			messageBlock: 'Plugin executed successfully',
			configuration: null,
			secureConfiguration: null,
			correlationId: CorrelationId.create('00000000-0000-0000-0000-000000000000'),
			requestId: 'req-123',
			pluginStepId: 'step-123',
			persistenceKey: 'key-123',
			organizationId: 'org-123',
			profile: null,
			isSystemCreated: false,
			createdBy: 'user-123',
			createdOnBehalfBy: null,
			getStatus: jest.fn().mockReturnValue(TraceStatus.Success)
		};

		return { ...defaultValues, ...overrides } as unknown as PluginTrace;
	}

	describe('toTableRowViewModel', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from domain entity to table row view model', () => {
				// Arrange
				const trace = createMockPluginTrace();

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.id).toBe('trace-123');
				expect(result.createdOn).toContain('1/15/2025'); // Locale-dependent format
				expect(result.pluginName).toBe('TestPlugin.Execute');
				expect(result.entityName).toBe('account');
				expect(result.messageName).toBe('Create');
				expect(result.depth).toBe('1');
			});

			it('should handle null entityName with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ entityName: null });

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.entityName).toBe('N/A');
			});

			it('should generate HTML link with escaped plugin name', () => {
				// Arrange
				const trace = createMockPluginTrace({
					id: 'trace-456',
					pluginName: 'Test<Plugin>'
				});

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.pluginNameHtml).toContain('data-trace-id="trace-456"');
				expect(result.pluginNameHtml).toContain('Test&lt;Plugin&gt;'); // HTML escaped
				expect(result.pluginNameHtml).toContain('plugin-link');
			});

			it('should escape special characters in id and plugin name', () => {
				// Arrange
				const trace = createMockPluginTrace({
					id: 'trace-"123"',
					pluginName: 'Plugin<script>alert("xss")</script>'
				});

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.pluginNameHtml).not.toContain('<script>');
				expect(result.pluginNameHtml).toContain('&lt;script&gt;');
			});
		});

		describe('formatter delegation', () => {
			it('should delegate operation type formatting', () => {
				// Arrange
				const trace = createMockPluginTrace({ operationType: OperationType.Workflow });

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.operationType).toBeDefined();
				expect(typeof result.operationType).toBe('string');
			});

			it('should delegate execution mode formatting', () => {
				// Arrange
				const trace = createMockPluginTrace({ mode: ExecutionMode.Asynchronous });

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.mode).toBeDefined();
				expect(typeof result.mode).toBe('string');
			});

			it('should delegate duration formatting', () => {
				// Arrange
				const trace = createMockPluginTrace({ duration: Duration.fromMilliseconds(2500) });

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.duration).toBeDefined();
				expect(typeof result.duration).toBe('string');
			});

			it('should delegate status formatting', () => {
				// Arrange
				const trace = createMockPluginTrace();
				trace.getStatus = jest.fn().mockReturnValue(TraceStatus.Success);

				// Act
				const result = mapper.toTableRowViewModel(trace);

				// Assert
				expect(result.status).toBeDefined();
				expect(result.statusClass).toBeDefined();
			});
		});

		describe('status handling', () => {
			it('should call getStatus on domain entity', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const getStatusSpy = jest.spyOn(trace, 'getStatus');

				// Act
				mapper.toTableRowViewModel(trace);

				// Assert
				expect(getStatusSpy).toHaveBeenCalled();
			});

			it('should map different status values', () => {
				// Arrange
				const statuses = [TraceStatus.Success, TraceStatus.Exception];

				for (const status of statuses) {
					const trace = createMockPluginTrace();
					trace.getStatus = jest.fn().mockReturnValue(status);

					// Act
					const result = mapper.toTableRowViewModel(trace);

					// Assert
					expect(result.status).toBeDefined();
					expect(result.statusClass).toBeDefined();
				}
			});
		});
	});

	describe('toDetailViewModel', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from domain entity to detail view model', () => {
				// Arrange
				const trace = createMockPluginTrace({
					exceptionDetails: 'Exception occurred',
					configuration: '{"key": "value"}',
					secureConfiguration: '{"secret": "value"}',
					profile: 'profile-data'
				});

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.id).toBe('trace-123');
				expect(result.pluginName).toBe('TestPlugin.Execute');
				expect(result.entityName).toBe('account');
				expect(result.messageName).toBe('Create');
				expect(result.stage).toBe('20');
				expect(result.depth).toBe('1');
				expect(result.exceptionDetails).toBe('Exception occurred');
				expect(result.messageBlock).toBe('Plugin executed successfully');
				expect(result.configuration).toBe('{"key": "value"}');
				expect(result.secureConfiguration).toBe('{"secret": "value"}');
				expect(result.correlationId).toBe('00000000-0000-0000-0000-000000000000');
				expect(result.requestId).toBe('req-123');
				expect(result.pluginStepId).toBe('step-123');
				expect(result.persistenceKey).toBe('key-123');
				expect(result.organizationId).toBe('org-123');
				expect(result.profile).toBe('profile-data');
			});

			it('should handle null entityName with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ entityName: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.entityName).toBe('N/A');
			});

			it('should handle null executionStartTime with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ executionStartTime: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.executionStartTime).toBe('N/A');
			});

			it('should handle null constructorStartTime with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ constructorStartTime: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.constructorStartTime).toBe('N/A');
			});

			it('should handle null exceptionDetails with None fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ exceptionDetails: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.exceptionDetails).toBe('None');
			});

			it('should handle null messageBlock with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ messageBlock: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.messageBlock).toBe('N/A');
			});

			it('should handle null configuration with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ configuration: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.configuration).toBe('N/A');
			});

			it('should handle null secureConfiguration with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ secureConfiguration: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.secureConfiguration).toBe('N/A');
			});

			it('should handle null correlationId with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ correlationId: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.correlationId).toBe('N/A');
			});

			it('should handle null isSystemCreated with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ isSystemCreated: null });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.isSystemCreated).toBe('N/A');
			});

			it('should convert isSystemCreated boolean to string', () => {
				// Arrange
				const traceTrue = createMockPluginTrace({ isSystemCreated: true });
				const traceFalse = createMockPluginTrace({ isSystemCreated: false });

				// Act
				const resultTrue = mapper.toDetailViewModel(traceTrue);
				const resultFalse = mapper.toDetailViewModel(traceFalse);

				// Assert
				expect(resultTrue.isSystemCreated).toBe('true');
				expect(resultFalse.isSystemCreated).toBe('false');
			});
		});

		describe('formatter delegation', () => {
			it('should delegate operation type formatting in detail view', () => {
				// Arrange
				const trace = createMockPluginTrace({ operationType: OperationType.Workflow });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.operationType).toBeDefined();
			});

			it('should delegate execution mode formatting in detail view', () => {
				// Arrange
				const trace = createMockPluginTrace({ mode: ExecutionMode.Asynchronous });

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.mode).toBeDefined();
			});

			it('should delegate duration formatting for both durations', () => {
				// Arrange
				const trace = createMockPluginTrace({
					duration: Duration.fromMilliseconds(3000),
					constructorDuration: Duration.fromMilliseconds(100)
				});

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.duration).toBeDefined();
				expect(result.constructorDuration).toBeDefined();
			});

			it('should delegate status formatting in detail view', () => {
				// Arrange
				const trace = createMockPluginTrace();
				trace.getStatus = jest.fn().mockReturnValue(TraceStatus.Exception);

				// Act
				const result = mapper.toDetailViewModel(trace);

				// Assert
				expect(result.status).toBeDefined();
				expect(result.statusBadgeClass).toBeDefined();
			});
		});
	});

	describe('toTableRowViewModels', () => {
		it('should map array of plugin traces to table row view models', () => {
			// Arrange
			const traces = [
				createMockPluginTrace({ id: 'trace-1', pluginName: 'Plugin1' }),
				createMockPluginTrace({ id: 'trace-2', pluginName: 'Plugin2' }),
				createMockPluginTrace({ id: 'trace-3', pluginName: 'Plugin3' })
			];

			// Act
			const result = mapper.toTableRowViewModels(traces);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]!.id).toBe('trace-1');
			expect(result[1]!.id).toBe('trace-2');
			expect(result[2]!.id).toBe('trace-3');
		});

		it('should handle empty array', () => {
			// Arrange
			const traces: readonly PluginTrace[] = [];

			// Act
			const result = mapper.toTableRowViewModels(traces);

			// Assert
			expect(result).toEqual([]);
		});

		it('should preserve order of traces', () => {
			// Arrange
			const traces = [
				createMockPluginTrace({ id: 'first' }),
				createMockPluginTrace({ id: 'second' }),
				createMockPluginTrace({ id: 'third' })
			];

			// Act
			const result = mapper.toTableRowViewModels(traces);

			// Assert
			expect(result[0]!.id).toBe('first');
			expect(result[1]!.id).toBe('second');
			expect(result[2]!.id).toBe('third');
		});
	});
});
