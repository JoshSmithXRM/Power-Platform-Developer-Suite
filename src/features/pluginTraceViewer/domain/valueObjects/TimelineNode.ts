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
			throw new Error('Timeline depth cannot be negative');
		}

		if (offsetPercent < 0 || offsetPercent > 100) {
			throw new Error('Timeline offset must be between 0 and 100');
		}

		if (widthPercent < 0 || widthPercent > 100) {
			throw new Error('Timeline width must be between 0 and 100');
		}

		return new TimelineNode(trace, children, depth, offsetPercent, widthPercent);
	}

	/**
	 * Creates a new node with updated positioning while preserving trace and children.
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
	 * Counts total nodes in this subtree (including this node).
	 */
	getTotalNodeCount(): number {
		return 1 + this.children.reduce((sum, child) => sum + child.getTotalNodeCount(), 0);
	}

	/**
	 * Checks if this node has any exception.
	 */
	hasException(): boolean {
		return this.trace.hasException();
	}

	/**
	 * Gets the correlation ID if available.
	 */
	getCorrelationId(): string | null {
		return this.trace.correlationId?.value ?? null;
	}
}
