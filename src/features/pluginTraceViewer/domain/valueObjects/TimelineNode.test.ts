import { TimelineNode } from './TimelineNode';
import { PluginTrace } from '../entities/PluginTrace';
import { ExecutionMode } from './ExecutionMode';
import { OperationType } from './OperationType';
import { Duration } from './Duration';
import { CorrelationId } from './CorrelationId';

describe('TimelineNode', () => {
	// Test data factory
	function createValidTrace(overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
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
	}

	describe('create', () => {
		it('should create node with valid parameters', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.trace).toBe(trace);
			expect(node.children).toEqual([]);
			expect(node.depth).toBe(0);
			expect(node.offsetPercent).toBe(10);
			expect(node.widthPercent).toBe(50);
		});

		it('should create node with children', () => {
			const parent = createValidTrace({ id: 'parent' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });

			const child1 = TimelineNode.create(child1Trace, [], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const node = TimelineNode.create(parent, [child1, child2], 0, 10, 80);

			expect(node.children).toHaveLength(2);
			expect(node.children[0]).toBe(child1);
			expect(node.children[1]).toBe(child2);
		});

		it('should throw error for negative depth', () => {
			const trace = createValidTrace();
			expect(() => TimelineNode.create(trace, [], -1, 10, 50)).toThrow(
				'Timeline depth cannot be negative'
			);
		});

		it('should throw error for negative offset', () => {
			const trace = createValidTrace();
			expect(() => TimelineNode.create(trace, [], 0, -1, 50)).toThrow(
				'Timeline offset must be between 0 and 100'
			);
		});

		it('should throw error for offset greater than 100', () => {
			const trace = createValidTrace();
			expect(() => TimelineNode.create(trace, [], 0, 101, 50)).toThrow(
				'Timeline offset must be between 0 and 100'
			);
		});

		it('should throw error for negative width', () => {
			const trace = createValidTrace();
			expect(() => TimelineNode.create(trace, [], 0, 10, -1)).toThrow(
				'Timeline width must be between 0 and 100'
			);
		});

		it('should throw error for width greater than 100', () => {
			const trace = createValidTrace();
			expect(() => TimelineNode.create(trace, [], 0, 10, 101)).toThrow(
				'Timeline width must be between 0 and 100'
			);
		});

		it('should allow offset of 0', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 0, 50);
			expect(node.offsetPercent).toBe(0);
		});

		it('should allow offset of 100', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 100, 0);
			expect(node.offsetPercent).toBe(100);
		});

		it('should allow width of 0', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 50, 0);
			expect(node.widthPercent).toBe(0);
		});

		it('should allow width of 100', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 0, 100);
			expect(node.widthPercent).toBe(100);
		});

		it('should allow depth of 0 (root level)', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 10, 50);
			expect(node.depth).toBe(0);
		});

		it('should allow large depth values', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 10, 10, 50);
			expect(node.depth).toBe(10);
		});
	});

	describe('withPositioning', () => {
		it('should create new instance with updated positioning', () => {
			const trace = createValidTrace();
			const original = TimelineNode.create(trace, [], 0, 10, 50);
			const updated = original.withPositioning(20, 60);

			expect(updated).not.toBe(original);
			expect(updated.offsetPercent).toBe(20);
			expect(updated.widthPercent).toBe(60);
		});

		it('should preserve trace in new instance', () => {
			const trace = createValidTrace();
			const original = TimelineNode.create(trace, [], 0, 10, 50);
			const updated = original.withPositioning(20, 60);

			expect(updated.trace).toBe(original.trace);
		});

		it('should preserve children in new instance', () => {
			const parent = createValidTrace({ id: 'parent' });
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(parent, [child], 0, 10, 80);
			const updated = original.withPositioning(15, 70);

			expect(updated.children).toBe(original.children);
			expect(updated.children).toHaveLength(1);
			expect(updated.children[0]).toBe(child);
		});

		it('should preserve depth in new instance', () => {
			const trace = createValidTrace();
			const original = TimelineNode.create(trace, [], 3, 10, 50);
			const updated = original.withPositioning(20, 60);

			expect(updated.depth).toBe(3);
		});

		it('should not modify original instance', () => {
			const trace = createValidTrace();
			const original = TimelineNode.create(trace, [], 0, 10, 50);
			original.withPositioning(20, 60);

			expect(original.offsetPercent).toBe(10);
			expect(original.widthPercent).toBe(50);
		});
	});

	describe('withChildren', () => {
		it('should create new instance with updated children', () => {
			const parent = createValidTrace({ id: 'parent' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });

			const child1 = TimelineNode.create(child1Trace, [], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const original = TimelineNode.create(parent, [child1], 0, 10, 80);
			const updated = original.withChildren([child1, child2]);

			expect(updated).not.toBe(original);
			expect(updated.children).toHaveLength(2);
			expect(updated.children[0]).toBe(child1);
			expect(updated.children[1]).toBe(child2);
		});

		it('should preserve trace in new instance', () => {
			const trace = createValidTrace();
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(trace, [], 0, 10, 50);
			const updated = original.withChildren([child]);

			expect(updated.trace).toBe(original.trace);
		});

		it('should preserve positioning in new instance', () => {
			const trace = createValidTrace();
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(trace, [], 0, 10, 50);
			const updated = original.withChildren([child]);

			expect(updated.offsetPercent).toBe(10);
			expect(updated.widthPercent).toBe(50);
		});

		it('should preserve depth in new instance', () => {
			const trace = createValidTrace();
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(trace, [], 3, 10, 50);
			const updated = original.withChildren([child]);

			expect(updated.depth).toBe(3);
		});

		it('should not modify original instance', () => {
			const trace = createValidTrace();
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(trace, [], 0, 10, 50);
			original.withChildren([child]);

			expect(original.children).toHaveLength(0);
		});

		it('should allow replacing children with empty array', () => {
			const trace = createValidTrace();
			const childTrace = createValidTrace({ id: 'child', depth: 2 });
			const child = TimelineNode.create(childTrace, [], 1, 20, 30);

			const original = TimelineNode.create(trace, [child], 0, 10, 50);
			const updated = original.withChildren([]);

			expect(updated.children).toHaveLength(0);
		});
	});

	describe('getAllDescendants', () => {
		it('should return empty array when node has no children', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.getAllDescendants()).toEqual([]);
		});

		it('should return direct children in depth-first order', () => {
			const parent = createValidTrace({ id: 'parent' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });

			const child1 = TimelineNode.create(child1Trace, [], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const node = TimelineNode.create(parent, [child1, child2], 0, 10, 80);
			const descendants = node.getAllDescendants();

			expect(descendants).toHaveLength(2);
			expect(descendants[0]).toBe(child1);
			expect(descendants[1]).toBe(child2);
		});

		it('should return all descendants in depth-first order', () => {
			const root = createValidTrace({ id: 'root' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });
			const grandchild1Trace = createValidTrace({ id: 'grandchild1', depth: 3 });
			const grandchild2Trace = createValidTrace({ id: 'grandchild2', depth: 3 });

			const grandchild1 = TimelineNode.create(grandchild1Trace, [], 2, 25, 10);
			const grandchild2 = TimelineNode.create(grandchild2Trace, [], 2, 40, 10);
			const child1 = TimelineNode.create(child1Trace, [grandchild1, grandchild2], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const node = TimelineNode.create(root, [child1, child2], 0, 10, 80);
			const descendants = node.getAllDescendants();

			expect(descendants).toHaveLength(4);
			expect(descendants[0]).toBe(child1);
			expect(descendants[1]).toBe(grandchild1);
			expect(descendants[2]).toBe(grandchild2);
			expect(descendants[3]).toBe(child2);
		});

		it('should handle deep nesting correctly', () => {
			const level0 = createValidTrace({ id: 'level0' });
			const level1Trace = createValidTrace({ id: 'level1', depth: 2 });
			const level2Trace = createValidTrace({ id: 'level2', depth: 3 });
			const level3Trace = createValidTrace({ id: 'level3', depth: 4 });

			const level3 = TimelineNode.create(level3Trace, [], 3, 35, 5);
			const level2 = TimelineNode.create(level2Trace, [level3], 2, 30, 15);
			const level1 = TimelineNode.create(level1Trace, [level2], 1, 20, 30);
			const level0Node = TimelineNode.create(level0, [level1], 0, 10, 50);

			const descendants = level0Node.getAllDescendants();

			expect(descendants).toHaveLength(3);
			expect(descendants[0]).toBe(level1);
			expect(descendants[1]).toBe(level2);
			expect(descendants[2]).toBe(level3);
		});
	});

	describe('getTotalNodeCount', () => {
		it('should return 1 for node with no children', () => {
			const trace = createValidTrace();
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.getTotalNodeCount()).toBe(1);
		});

		it('should count node plus direct children', () => {
			const parent = createValidTrace({ id: 'parent' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });

			const child1 = TimelineNode.create(child1Trace, [], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const node = TimelineNode.create(parent, [child1, child2], 0, 10, 80);

			expect(node.getTotalNodeCount()).toBe(3); // 1 parent + 2 children
		});

		it('should count entire subtree recursively', () => {
			const root = createValidTrace({ id: 'root' });
			const child1Trace = createValidTrace({ id: 'child1', depth: 2 });
			const child2Trace = createValidTrace({ id: 'child2', depth: 2 });
			const grandchild1Trace = createValidTrace({ id: 'grandchild1', depth: 3 });
			const grandchild2Trace = createValidTrace({ id: 'grandchild2', depth: 3 });

			const grandchild1 = TimelineNode.create(grandchild1Trace, [], 2, 25, 10);
			const grandchild2 = TimelineNode.create(grandchild2Trace, [], 2, 40, 10);
			const child1 = TimelineNode.create(child1Trace, [grandchild1, grandchild2], 1, 20, 30);
			const child2 = TimelineNode.create(child2Trace, [], 1, 60, 20);

			const node = TimelineNode.create(root, [child1, child2], 0, 10, 80);

			expect(node.getTotalNodeCount()).toBe(5); // 1 root + 2 children + 2 grandchildren
		});

		it('should handle deep linear hierarchy', () => {
			const level0 = createValidTrace({ id: 'level0' });
			const level1Trace = createValidTrace({ id: 'level1', depth: 2 });
			const level2Trace = createValidTrace({ id: 'level2', depth: 3 });
			const level3Trace = createValidTrace({ id: 'level3', depth: 4 });
			const level4Trace = createValidTrace({ id: 'level4', depth: 5 });

			const level4 = TimelineNode.create(level4Trace, [], 4, 40, 5);
			const level3 = TimelineNode.create(level3Trace, [level4], 3, 35, 10);
			const level2 = TimelineNode.create(level2Trace, [level3], 2, 30, 15);
			const level1 = TimelineNode.create(level1Trace, [level2], 1, 20, 30);
			const level0Node = TimelineNode.create(level0, [level1], 0, 10, 50);

			expect(level0Node.getTotalNodeCount()).toBe(5); // 5 levels deep
		});
	});

	describe('hasException', () => {
		it('should return false when trace has no exception', () => {
			const trace = createValidTrace({ exceptionDetails: null });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.hasException()).toBe(false);
		});

		it('should return false when exception is empty string', () => {
			const trace = createValidTrace({ exceptionDetails: '' });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.hasException()).toBe(false);
		});

		it('should return false when exception is whitespace', () => {
			const trace = createValidTrace({ exceptionDetails: '   ' });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.hasException()).toBe(false);
		});

		it('should return true when trace has exception', () => {
			const trace = createValidTrace({ exceptionDetails: 'System.Exception: Error occurred' });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.hasException()).toBe(true);
		});

		it('should delegate to trace hasException method', () => {
			const trace = createValidTrace({ exceptionDetails: 'Error' });
			const hasExceptionSpy = jest.spyOn(trace, 'hasException');
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			node.hasException();

			expect(hasExceptionSpy).toHaveBeenCalled();
		});
	});

	describe('getCorrelationId', () => {
		it('should return null when trace has no correlation ID', () => {
			const trace = createValidTrace({ correlationId: null });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.getCorrelationId()).toBeNull();
		});

		it('should return correlation ID value when present', () => {
			const correlationId = CorrelationId.create('12345678-1234-1234-1234-123456789012');
			const trace = createValidTrace({ correlationId });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.getCorrelationId()).toBe('12345678-1234-1234-1234-123456789012');
		});

		it('should unwrap correlation ID value object', () => {
			const correlationId = CorrelationId.create('abcdef12-3456-7890-abcd-ef1234567890');
			const trace = createValidTrace({ correlationId });
			const node = TimelineNode.create(trace, [], 0, 10, 50);

			expect(node.getCorrelationId()).toBe(correlationId.value);
		});
	});
});
