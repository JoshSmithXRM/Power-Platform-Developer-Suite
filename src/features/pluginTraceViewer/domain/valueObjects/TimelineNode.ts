import type { PluginTrace } from '../entities/PluginTrace';

/**
 * Value object representing a node in the timeline hierarchy.
 * Each node contains a trace and its positioned children in the execution timeline.
 */
export class TimelineNode {
	private constructor(
		public readonly trace: PluginTrace,
		public readonly children: readonly TimelineNode[],
		public readonly depth: number,
		public readonly offsetPercent: number,
		public readonly widthPercent: number
	) {}

	/**
	 * Creates a timeline node with calculated positioning.
	 * @param trace - The plugin trace for this node
	 * @param children - Child nodes in execution order
	 * @param depth - Nesting depth (0 = root)
	 * @param offsetPercent - Horizontal position in timeline (0-100%)
	 * @param widthPercent - Width of execution bar (0-100%)
	 */
	static create(
		trace: PluginTrace,
		children: readonly TimelineNode[],
		depth: number,
		offsetPercent: number,
		widthPercent: number
	): TimelineNode {
		if (depth < 0) {
			throw new Error('Invalid TimelineNode: depth cannot be negative');
		}

		if (offsetPercent < 0 || offsetPercent > 100) {
			throw new Error('Invalid TimelineNode: offsetPercent must be between 0 and 100');
		}

		if (widthPercent < 0 || widthPercent > 100) {
			throw new Error('Invalid TimelineNode: widthPercent must be between 0 and 100');
		}

		return new TimelineNode(trace, children, depth, offsetPercent, widthPercent);
	}

	/**
	 * Creates a new node with updated positioning while preserving trace and children.
	 * Immutable update pattern (returns new instance rather than mutating).
	 *
	 * @param offsetPercent - Horizontal position in timeline (0-100%)
	 * @param widthPercent - Width of execution bar (0-100%)
	 * @returns New TimelineNode with updated positioning
	 */
	withPositioning(offsetPercent: number, widthPercent: number): TimelineNode {
		return new TimelineNode(
			this.trace,
			this.children,
			this.depth,
			offsetPercent,
			widthPercent
		);
	}

	/**
	 * Creates a new node with updated children while preserving trace and positioning.
	 * Immutable update pattern (returns new instance rather than mutating).
	 *
	 * @param children - New child nodes
	 * @returns New TimelineNode with updated children
	 */
	withChildren(children: readonly TimelineNode[]): TimelineNode {
		return new TimelineNode(
			this.trace,
			children,
			this.depth,
			this.offsetPercent,
			this.widthPercent
		);
	}

	/**
	 * Gets all descendant nodes in depth-first order.
	 * Useful for flattening the hierarchy for iteration or analysis.
	 *
	 * @returns Readonly array of all descendant nodes (excludes this node)
	 */
	getAllDescendants(): readonly TimelineNode[] {
		const descendants: TimelineNode[] = [];

		const traverse = (node: TimelineNode): void => {
			descendants.push(node);
			node.children.forEach(child => traverse(child));
		};

		this.children.forEach(child => traverse(child));
		return descendants;
	}

	/**
	 * Counts total nodes in this subtree including this node.
	 * Recursively counts all descendants.
	 *
	 * @returns Total count of nodes in subtree
	 */
	getTotalNodeCount(): number {
		return 1 + this.children.reduce((sum, child) => sum + child.getTotalNodeCount(), 0);
	}

	/**
	 * Checks if this node's trace has any exception.
	 * Delegates to the underlying PluginTrace entity.
	 *
	 * @returns True if trace recorded an exception
	 */
	hasException(): boolean {
		return this.trace.hasException();
	}

	/**
	 * Gets the correlation ID from the underlying trace if available.
	 *
	 * @returns Correlation ID string or null if not present
	 */
	getCorrelationId(): string | null {
		return this.trace.correlationId?.value ?? null;
	}
}
