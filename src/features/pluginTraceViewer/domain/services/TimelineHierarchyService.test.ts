import { TimelineHierarchyService } from './TimelineHierarchyService';
import { PluginTrace } from './../entities/PluginTrace';
import { ExecutionMode } from './../valueObjects/ExecutionMode';
import { OperationType } from './../valueObjects/OperationType';
import { Duration } from './../valueObjects/Duration';

describe('TimelineHierarchyService', () => {
	let service: TimelineHierarchyService;

	beforeEach(() => {
		service = new TimelineHierarchyService();
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

	describe('buildHierarchy', () => {
		it('should return empty array for empty input', () => {
			const result = service.buildHierarchy([]);
			expect(result).toEqual([]);
		});

		it('should create single root node for single trace', () => {
			const trace = createTrace({ id: 'root', depth: 0 });
			const result = service.buildHierarchy([trace]);

			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(trace);
			expect(result[0]?.children).toHaveLength(0);
			expect(result[0]?.depth).toBe(0);
		});

		it('should create parent-child relationship based on depth', () => {
			const parent = createTrace({
				id: 'parent',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(200)
			});
			const child = createTrace({
				id: 'child',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.050Z'),
				duration: Duration.fromMilliseconds(100)
			});

			const result = service.buildHierarchy([parent, child]);

			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(parent);
			expect(result[0]?.children).toHaveLength(1);
			expect(result[0]?.children[0]?.trace).toBe(child);
		});

		it('should create multiple root nodes for multiple depth-0 traces', () => {
			const root1 = createTrace({
				id: 'root1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const root2 = createTrace({
				id: 'root2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:01.000Z')
			});

			const result = service.buildHierarchy([root1, root2]);

			expect(result).toHaveLength(2);
			expect(result[0]?.trace).toBe(root1);
			expect(result[1]?.trace).toBe(root2);
		});

		it('should handle multi-level hierarchy correctly', () => {
			const root = createTrace({
				id: 'root',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(300)
			});
			const child1 = createTrace({
				id: 'child1',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.050Z'),
				duration: Duration.fromMilliseconds(100)
			});
			const grandchild1 = createTrace({
				id: 'grandchild1',
				depth: 2,
				createdOn: new Date('2024-01-01T10:00:00.075Z'),
				duration: Duration.fromMilliseconds(50)
			});

			const result = service.buildHierarchy([root, child1, grandchild1]);

			expect(result).toHaveLength(1);
			const rootNode = result[0];
			expect(rootNode?.trace).toBe(root);
			expect(rootNode?.children).toHaveLength(1);
			expect(rootNode?.children[0]?.trace).toBe(child1);
			expect(rootNode?.children[0]?.children).toHaveLength(1);
			expect(rootNode?.children[0]?.children[0]?.trace).toBe(grandchild1);
		});

		it('should handle orphaned traces (missing parent) as root nodes', () => {
			const orphan = createTrace({
				id: 'orphan',
				depth: 2, // No depth-0 or depth-1 parent
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});

			const result = service.buildHierarchy([orphan]);

			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(orphan);
			expect(result[0]?.depth).toBe(2); // Preserves original depth
		});

		it('should sort traces chronologically before building hierarchy', () => {
			const trace1 = createTrace({
				id: 'first',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const trace2 = createTrace({
				id: 'second',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.100Z')
			});
			const trace3 = createTrace({
				id: 'third',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.200Z')
			});

			// Pass in reverse chronological order
			const result = service.buildHierarchy([trace3, trace1, trace2]);

			expect(result).toHaveLength(1);
			expect(result[0]?.trace).toBe(trace1);
			expect(result[0]?.children).toHaveLength(2);
			expect(result[0]?.children[0]?.trace).toBe(trace2); // First child chronologically
			expect(result[0]?.children[1]?.trace).toBe(trace3); // Second child chronologically
		});

		it('should calculate positioning percentages based on timeline duration', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'), // 0ms
				duration: Duration.fromMilliseconds(100)
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.200Z'), // 200ms
				duration: Duration.fromMilliseconds(100)
			});

			const result = service.buildHierarchy([trace1, trace2]);

			// Total duration: 0ms to 300ms (200ms start + 100ms duration) = 300ms
			// Trace1: offset 0ms / 300ms = 0%, width 100ms / 300ms = 33.33%
			// Trace2: offset 200ms / 300ms = 66.66%, width 100ms / 300ms = 33.33%
			expect(result[0]?.offsetPercent).toBeCloseTo(0, 1);
			expect(result[0]?.widthPercent).toBeCloseTo(33.33, 1);
			expect(result[1]?.offsetPercent).toBeCloseTo(66.67, 1);
			expect(result[1]?.widthPercent).toBeCloseTo(33.33, 1);
		});

		it('should calculate positioning for nested children', () => {
			const parent = createTrace({
				id: 'parent',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'), // 0ms
				duration: Duration.fromMilliseconds(200)
			});
			const child = createTrace({
				id: 'child',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.050Z'), // 50ms
				duration: Duration.fromMilliseconds(100)
			});

			const result = service.buildHierarchy([parent, child]);

			// Total duration: 0ms to 200ms = 200ms
			// Parent: offset 0ms / 200ms = 0%, width 200ms / 200ms = 100%
			// Child: offset 50ms / 200ms = 25%, width 100ms / 200ms = 50%
			const parentNode = result[0];
			expect(parentNode?.offsetPercent).toBeCloseTo(0, 1);
			expect(parentNode?.widthPercent).toBeCloseTo(100, 1);

			const childNode = parentNode?.children[0];
			expect(childNode?.offsetPercent).toBeCloseTo(25, 1);
			expect(childNode?.widthPercent).toBeCloseTo(50, 1);
		});

		it('should enforce minimum 0.5% width for very short traces', () => {
			const shortTrace = createTrace({
				id: 'short',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(1) // 1ms out of 10000ms = 0.01%
			});
			const longTrace = createTrace({
				id: 'long',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.001Z'),
				duration: Duration.fromMilliseconds(10000)
			});

			const result = service.buildHierarchy([shortTrace, longTrace]);

			// Short trace width would be ~0.01%, but should be clamped to 0.5%
			expect(result[0]?.widthPercent).toBeGreaterThanOrEqual(0.5);
		});

		it('should handle simultaneous traces (zero duration timeline)', () => {
			const trace1 = createTrace({
				id: 'trace1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(0)
			});
			const trace2 = createTrace({
				id: 'trace2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z'), // Same time
				duration: Duration.fromMilliseconds(0)
			});

			const result = service.buildHierarchy([trace1, trace2]);

			// When total duration is 0, assign equal positioning (0% offset, 100% width)
			expect(result[0]?.offsetPercent).toBe(0);
			expect(result[0]?.widthPercent).toBe(100);
			expect(result[1]?.offsetPercent).toBe(0);
			expect(result[1]?.widthPercent).toBe(100);
		});

		it('should handle sibling traces at same depth', () => {
			const root = createTrace({
				id: 'root',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const child1 = createTrace({
				id: 'child1',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.010Z')
			});
			const child2 = createTrace({
				id: 'child2',
				depth: 1, // Sibling of child1
				createdOn: new Date('2024-01-01T10:00:00.020Z')
			});
			const child3 = createTrace({
				id: 'child3',
				depth: 1, // Sibling of child1 and child2
				createdOn: new Date('2024-01-01T10:00:00.030Z')
			});

			const result = service.buildHierarchy([root, child1, child2, child3]);

			// All children should be siblings under root
			expect(result[0]?.children).toHaveLength(3);
			expect(result[0]?.children[0]?.trace).toBe(child1);
			expect(result[0]?.children[1]?.trace).toBe(child2);
			expect(result[0]?.children[2]?.trace).toBe(child3);
		});
	});

	describe('getTotalDuration', () => {
		it('should return 0 for empty trace array', () => {
			const result = service.getTotalDuration([]);
			expect(result).toBe(0);
		});

		it('should return duration for single trace', () => {
			const trace = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(150)
			});

			const result = service.getTotalDuration([trace]);
			expect(result).toBe(150);
		});

		it('should calculate span from first start to last end', () => {
			const trace1 = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.000Z'), // Start: 0ms
				duration: Duration.fromMilliseconds(100) // End: 100ms
			});
			const trace2 = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.200Z'), // Start: 200ms
				duration: Duration.fromMilliseconds(50) // End: 250ms
			});

			const result = service.getTotalDuration([trace1, trace2]);
			expect(result).toBe(250); // 0ms to 250ms
		});

		it('should handle overlapping traces correctly', () => {
			const trace1 = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.000Z'), // Start: 0ms
				duration: Duration.fromMilliseconds(200) // End: 200ms
			});
			const trace2 = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.100Z'), // Start: 100ms (inside trace1)
				duration: Duration.fromMilliseconds(50) // End: 150ms (inside trace1)
			});

			const result = service.getTotalDuration([trace1, trace2]);
			expect(result).toBe(200); // 0ms to 200ms (trace2 ends before trace1)
		});

		it('should handle zero-duration traces', () => {
			const trace = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(0)
			});

			const result = service.getTotalDuration([trace]);
			expect(result).toBe(0);
		});

		it('should calculate duration regardless of input order', () => {
			const early = createTrace({
				createdOn: new Date('2024-01-01T10:00:00.000Z'),
				duration: Duration.fromMilliseconds(100)
			});
			const late = createTrace({
				createdOn: new Date('2024-01-01T10:00:01.000Z'), // 1 second later
				duration: Duration.fromMilliseconds(100)
			});

			const result1 = service.getTotalDuration([early, late]);
			const result2 = service.getTotalDuration([late, early]);

			expect(result1).toBe(1100); // 0ms to 1100ms
			expect(result2).toBe(1100); // Same regardless of order
		});
	});

	describe('countTotalNodes', () => {
		it('should return 0 for empty array', () => {
			const result = service.countTotalNodes([]);
			expect(result).toBe(0);
		});

		it('should count single root node', () => {
			const trace = createTrace({ depth: 0 });
			const hierarchy = service.buildHierarchy([trace]);

			const result = service.countTotalNodes(hierarchy);
			expect(result).toBe(1);
		});

		it('should count multiple root nodes', () => {
			const trace1 = createTrace({
				id: 'root1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const trace2 = createTrace({
				id: 'root2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:01.000Z')
			});

			const hierarchy = service.buildHierarchy([trace1, trace2]);

			const result = service.countTotalNodes(hierarchy);
			expect(result).toBe(2);
		});

		it('should count parent and children', () => {
			const parent = createTrace({
				id: 'parent',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const child1 = createTrace({
				id: 'child1',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.010Z')
			});
			const child2 = createTrace({
				id: 'child2',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.020Z')
			});

			const hierarchy = service.buildHierarchy([parent, child1, child2]);

			const result = service.countTotalNodes(hierarchy);
			expect(result).toBe(3); // 1 parent + 2 children
		});

		it('should count entire hierarchy recursively', () => {
			const root = createTrace({
				id: 'root',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const child1 = createTrace({
				id: 'child1',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.010Z')
			});
			const grandchild1 = createTrace({
				id: 'grandchild1',
				depth: 2,
				createdOn: new Date('2024-01-01T10:00:00.015Z')
			});
			const grandchild2 = createTrace({
				id: 'grandchild2',
				depth: 2,
				createdOn: new Date('2024-01-01T10:00:00.020Z')
			});

			const hierarchy = service.buildHierarchy([root, child1, grandchild1, grandchild2]);

			const result = service.countTotalNodes(hierarchy);
			expect(result).toBe(4); // 1 root + 1 child + 2 grandchildren
		});

		it('should count multiple trees in forest', () => {
			const root1 = createTrace({
				id: 'root1',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:00.000Z')
			});
			const child1 = createTrace({
				id: 'child1',
				depth: 1,
				createdOn: new Date('2024-01-01T10:00:00.010Z')
			});
			const root2 = createTrace({
				id: 'root2',
				depth: 0,
				createdOn: new Date('2024-01-01T10:00:01.000Z')
			});

			const hierarchy = service.buildHierarchy([root1, child1, root2]);

			const result = service.countTotalNodes(hierarchy);
			expect(result).toBe(3); // Tree 1: 2 nodes, Tree 2: 1 node
		});
	});
});
