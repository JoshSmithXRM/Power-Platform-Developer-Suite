import { TimelineViewModelMapper } from './TimelineViewModelMapper';
import { TimelineNode } from '../../domain/valueObjects/TimelineNode';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { CorrelationId } from '../../domain/valueObjects/CorrelationId';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { Duration } from '../../domain/valueObjects/Duration';

describe('TimelineViewModelMapper', () => {
	let mapper: TimelineViewModelMapper;

	beforeEach(() => {
		mapper = new TimelineViewModelMapper();
	});

	// Helper to create a minimal PluginTrace for testing
	function createMockPluginTrace(overrides: Partial<PluginTrace> = {}): PluginTrace {
		const defaultValues = {
			id: 'trace-123',
			createdOn: new Date('2025-01-15T14:30:45Z'),
			pluginName: 'TestPlugin.Execute',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			stage: 20,
			depth: 1,
			duration: Duration.fromMilliseconds(1250),
			constructorDuration: Duration.fromMilliseconds(50),
			executionStartTime: new Date('2025-01-15T14:30:45Z'),
			constructorStartTime: new Date('2025-01-15T14:30:44Z'),
			exceptionDetails: null,
			messageBlock: 'Plugin executed successfully',
			configuration: null,
			secureConfiguration: null,
			correlationId: CorrelationId.create('12345678-1234-1234-1234-123456789012'),
			requestId: 'req-123',
			pluginStepId: 'step-123',
			persistenceKey: 'key-123',
			organizationId: 'org-123',
			profile: null,
			isSystemCreated: false,
			createdBy: 'user-123',
			createdOnBehalfBy: null,
			hasException: jest.fn().mockReturnValue(false)
		};

		return { ...defaultValues, ...overrides } as unknown as PluginTrace;
	}

	// Helper to create a mock TimelineNode
	function createMockTimelineNode(
		trace: PluginTrace,
		children: readonly TimelineNode[] = [],
		depth = 0,
		offsetPercent = 0,
		widthPercent = 100
	): TimelineNode {
		return TimelineNode.create(trace, children, depth, offsetPercent, widthPercent);
	}

	describe('toViewModel', () => {
		describe('basic timeline mapping', () => {
			it('should map single root node to view model', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], '12345678-abcd', 1500);

				// Assert
				expect(result.correlationId).toBe('12345678...');
				expect(result.totalDuration).toBeDefined();
				expect(result.traceCount).toBe(1);
				expect(result.nodes).toHaveLength(1);
				expect(result.nodes[0]!.id).toBe('trace-123');
			});

			it('should map multiple root nodes', () => {
				// Arrange
				const trace1 = createMockPluginTrace({ id: 'trace-1' });
				const trace2 = createMockPluginTrace({ id: 'trace-2' });
				const root1 = createMockTimelineNode(trace1);
				const root2 = createMockTimelineNode(trace2);

				// Act
				const result = mapper.toViewModel([root1, root2], 'corr-123', 2000);

				// Assert
				expect(result.nodes).toHaveLength(2);
				expect(result.nodes[0]!.id).toBe('trace-1');
				expect(result.nodes[1]!.id).toBe('trace-2');
				expect(result.traceCount).toBe(2);
			});

			it('should handle empty roots array', () => {
				// Act
				const result = mapper.toViewModel([], null, 0);

				// Assert
				expect(result.nodes).toEqual([]);
				expect(result.traceCount).toBe(0);
				expect(result.correlationId).toBe('N/A');
			});
		});

		describe('correlation ID formatting', () => {
			it('should return N/A for null correlation ID', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], null, 1000);

				// Assert
				expect(result.correlationId).toBe('N/A');
			});

			it('should return full correlation ID if 8 characters or less', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], 'abc123', 1000);

				// Assert
				expect(result.correlationId).toBe('abc123');
			});

			it('should truncate correlation ID to 8 characters with ellipsis', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], '12345678-1234-1234-1234-123456789012', 1000);

				// Assert
				expect(result.correlationId).toBe('12345678...');
			});
		});

		describe('trace count calculation', () => {
			it('should count single root without children', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], 'corr-123', 1000);

				// Assert
				expect(result.traceCount).toBe(1);
			});

			it('should count root with children recursively', () => {
				// Arrange
				const parentTrace = createMockPluginTrace({ id: 'parent' });
				const child1Trace = createMockPluginTrace({ id: 'child1' });
				const child2Trace = createMockPluginTrace({ id: 'child2' });

				const child1 = createMockTimelineNode(child1Trace, [], 1);
				const child2 = createMockTimelineNode(child2Trace, [], 1);
				const parent = createMockTimelineNode(parentTrace, [child1, child2]);

				// Act
				const result = mapper.toViewModel([parent], 'corr-123', 2000);

				// Assert
				expect(result.traceCount).toBe(3); // parent + 2 children
			});

			it('should count multiple roots with nested children', () => {
				// Arrange
				const trace1 = createMockPluginTrace({ id: 'root1' });
				const trace2 = createMockPluginTrace({ id: 'root2' });
				const childTrace = createMockPluginTrace({ id: 'child' });

				const child = createMockTimelineNode(childTrace, [], 1);
				const root1 = createMockTimelineNode(trace1, [child]);
				const root2 = createMockTimelineNode(trace2);

				// Act
				const result = mapper.toViewModel([root1, root2], 'corr-123', 3000);

				// Assert
				expect(result.traceCount).toBe(3); // root1 + child + root2
			});
		});

		describe('total duration formatting', () => {
			it('should format total duration in milliseconds', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const root = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([root], 'corr-123', 2500);

				// Assert
				expect(result.totalDuration).toBeDefined();
				expect(typeof result.totalDuration).toBe('string');
			});
		});
	});

	describe('toNodeViewModel (via toViewModel)', () => {
		describe('basic node field mapping', () => {
			it('should map all required node fields', () => {
				// Arrange
				const trace = createMockPluginTrace({
					id: 'trace-456',
					pluginName: 'AccountPlugin',
					messageName: 'Update',
					entityName: 'contact',
					createdOn: new Date('2025-01-15T09:15:30Z')
				});
				const node = createMockTimelineNode(trace, [], 2, 25.5, 50.0);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.id).toBe('trace-456');
				expect(nodeViewModel.pluginName).toBe('AccountPlugin');
				expect(nodeViewModel.messageName).toBe('Update');
				expect(nodeViewModel.entityName).toBe('contact');
				expect(nodeViewModel.depth).toBe(2);
				expect(nodeViewModel.offsetPercent).toBe(25.5);
				expect(nodeViewModel.widthPercent).toBe(50.0);
			});

			it('should handle null entityName with N/A fallback', () => {
				// Arrange
				const trace = createMockPluginTrace({ entityName: null });
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.entityName).toBe('N/A');
			});

			it('should map hasException correctly', () => {
				// Arrange
				const trace = createMockPluginTrace();
				trace.hasException = jest.fn().mockReturnValue(true);
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.hasException).toBe(true);
			});
		});

		describe('time formatting', () => {
			it('should format time as HH:MM:SS', () => {
				// Arrange
				const trace = createMockPluginTrace({
					createdOn: new Date('2025-01-15T14:05:03Z')
				});
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
			});

			it('should pad hours, minutes, and seconds with zeros', () => {
				// Arrange
				const trace = createMockPluginTrace({
					createdOn: new Date('2025-01-15T01:02:03Z')
				});
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert - time will be adjusted for local timezone, but padding should work
				expect(nodeViewModel.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
				expect(nodeViewModel.time.split(':').every(part => part.length === 2)).toBe(true);
			});
		});

		describe('formatter delegation', () => {
			it('should delegate duration formatting', () => {
				// Arrange
				const trace = createMockPluginTrace({
					duration: Duration.fromMilliseconds(3500)
				});
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.duration).toBeDefined();
				expect(typeof nodeViewModel.duration).toBe('string');
			});

			it('should delegate execution mode formatting', () => {
				// Arrange
				const trace = createMockPluginTrace({
					mode: ExecutionMode.Asynchronous
				});
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.mode).toBeDefined();
				expect(typeof nodeViewModel.mode).toBe('string');
			});
		});

		describe('recursive children mapping', () => {
			it('should recursively map child nodes', () => {
				// Arrange
				const parentTrace = createMockPluginTrace({ id: 'parent' });
				const child1Trace = createMockPluginTrace({ id: 'child1' });
				const child2Trace = createMockPluginTrace({ id: 'child2' });

				const child1 = createMockTimelineNode(child1Trace, [], 1);
				const child2 = createMockTimelineNode(child2Trace, [], 1);
				const parent = createMockTimelineNode(parentTrace, [child1, child2]);

				// Act
				const result = mapper.toViewModel([parent], 'corr-123', 2000);
				const parentNode = result.nodes[0]!;

				// Assert
				expect(parentNode.children).toHaveLength(2);
				expect(parentNode.children[0]!.id).toBe('child1');
				expect(parentNode.children[1]!.id).toBe('child2');
			});

			it('should handle deeply nested children', () => {
				// Arrange
				const grandchildTrace = createMockPluginTrace({ id: 'grandchild' });
				const childTrace = createMockPluginTrace({ id: 'child' });
				const parentTrace = createMockPluginTrace({ id: 'parent' });

				const grandchild = createMockTimelineNode(grandchildTrace, [], 2);
				const child = createMockTimelineNode(childTrace, [grandchild], 1);
				const parent = createMockTimelineNode(parentTrace, [child]);

				// Act
				const result = mapper.toViewModel([parent], 'corr-123', 3000);
				const parentNode = result.nodes[0]!;

				// Assert
				expect(parentNode.children).toHaveLength(1);
				expect(parentNode.children[0]!.id).toBe('child');
				expect(parentNode.children[0]!.children).toHaveLength(1);
				expect(parentNode.children[0]!.children[0]!.id).toBe('grandchild');
			});

			it('should handle nodes with no children', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const node = createMockTimelineNode(trace);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.children).toEqual([]);
			});
		});

		describe('positioning data', () => {
			it('should preserve offsetPercent and widthPercent values', () => {
				// Arrange
				const trace = createMockPluginTrace();
				const node = createMockTimelineNode(trace, [], 0, 12.34, 56.78);

				// Act
				const result = mapper.toViewModel([node], 'corr-123', 1000);
				const nodeViewModel = result.nodes[0]!;

				// Assert
				expect(nodeViewModel.offsetPercent).toBe(12.34);
				expect(nodeViewModel.widthPercent).toBe(56.78);
			});

			it('should handle boundary positioning values', () => {
				// Arrange
				const trace1 = createMockPluginTrace({ id: 'trace-1' });
				const trace2 = createMockPluginTrace({ id: 'trace-2' });
				const node1 = createMockTimelineNode(trace1, [], 0, 0, 100);
				const node2 = createMockTimelineNode(trace2, [], 0, 100, 0);

				// Act
				const result = mapper.toViewModel([node1, node2], 'corr-123', 1000);

				// Assert
				expect(result.nodes[0]!.offsetPercent).toBe(0);
				expect(result.nodes[0]!.widthPercent).toBe(100);
				expect(result.nodes[1]!.offsetPercent).toBe(100);
				expect(result.nodes[1]!.widthPercent).toBe(0);
			});
		});
	});
});
