import type { PluginTrace } from '../entities/PluginTrace';
import { TimelineNode } from '../valueObjects/TimelineNode';

/**
 * Domain service for building hierarchical timeline structures from plugin traces.
 * Handles parent-child relationships based on execution depth and timing.
 */
export class TimelineHierarchyService {
	/**
	 * Builds a hierarchical timeline from flat trace list.
	 * Groups traces by correlation ID and creates parent-child relationships based on depth.
	 *
	 * @param traces - Flat list of plugin traces
	 * @returns Array of root timeline nodes (depth 0) with positioned children
	 */
	buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
		if (traces.length === 0) {
			return [];
		}

		// Sort traces chronologically by creation time
		const sortedTraces = [...traces].sort((a, b) =>
			a.createdOn.getTime() - b.createdOn.getTime()
		);

		// Build parent-child relationships based on depth
		const roots = this.buildDepthBasedHierarchy(sortedTraces);

		// Calculate timeline positioning for all nodes
		const timelineStart = this.getTimelineStart(sortedTraces);
		const timelineEnd = this.getTimelineEnd(sortedTraces);
		const totalDuration = timelineEnd - timelineStart;

		if (totalDuration <= 0) {
			// All traces at same time - assign equal spacing
			return roots.map(root => this.assignEqualPositioning(root));
		}

		// Calculate positioning based on actual execution times
		return roots.map(root =>
			this.calculatePositioning(root, timelineStart, totalDuration)
		);
	}

	/**
	 * Builds parent-child relationships based on execution depth.
	 * Traces with depth N are children of the most recent trace with depth N-1.
	 */
	private buildDepthBasedHierarchy(sortedTraces: readonly PluginTrace[]): TimelineNode[] {
		const roots: TimelineNode[] = [];
		const depthStack: TimelineNode[] = []; // Stack tracking current parent at each depth

		for (const trace of sortedTraces) {
			const depth = trace.depth;

			// Create unpositioned node (positioning will be calculated later)
			const node = TimelineNode.create(trace, [], depth, 0, 0);

			if (depth === 0) {
				// Root level trace
				roots.push(node);
				depthStack[0] = node;
			} else {
				// Child trace - find parent at depth-1
				const parentDepth = depth - 1;
				const parent = depthStack[parentDepth];

				if (parent) {
					// Add as child to parent
					const updatedChildren = [...parent.children, node];
					const updatedParent = parent.withChildren(updatedChildren);

					// Update parent in stack and roots/children
					depthStack[parentDepth] = updatedParent;
					this.updateNodeInHierarchy(roots, parent, updatedParent);
				} else {
					// Parent not found - treat as root (orphaned trace)
					roots.push(node);
				}

				// Set as current node at this depth
				depthStack[depth] = node;
			}

			// Clear deeper levels (they're no longer active parents)
			depthStack.splice(depth + 1);
		}

		return roots;
	}

	/**
	 * Updates a node within the hierarchy (replaces old node with new node).
	 */
	private updateNodeInHierarchy(
		roots: TimelineNode[],
		oldNode: TimelineNode,
		newNode: TimelineNode
	): void {
		// Search and replace in roots
		const rootIndex = roots.indexOf(oldNode);
		if (rootIndex >= 0) {
			roots[rootIndex] = newNode;
			return;
		}

		// Search and replace in children recursively
		for (let i = 0; i < roots.length; i++) {
			const root = roots[i];
			if (!root) {
				continue;
			}

			const updated = this.replaceNodeInChildren(root, oldNode, newNode);
			if (updated !== root) {
				roots[i] = updated;
				return;
			}
		}
	}

	/**
	 * Recursively searches children and replaces node if found.
	 */
	private replaceNodeInChildren(
		parent: TimelineNode,
		oldNode: TimelineNode,
		newNode: TimelineNode
	): TimelineNode {
		// Check if old node is in children
		const childIndex = parent.children.indexOf(oldNode);
		if (childIndex >= 0) {
			// Replace child
			const updatedChildren = [...parent.children];
			updatedChildren[childIndex] = newNode;
			return parent.withChildren(updatedChildren);
		}

		// Recursively search grandchildren
		let updated = false;
		const updatedChildren = parent.children.map(child => {
			const result = this.replaceNodeInChildren(child, oldNode, newNode);
			if (result !== child) {
				updated = true;
			}
			return result;
		});

		return updated ? parent.withChildren(updatedChildren) : parent;
	}

	/**
	 * Calculates positioning for a node and all descendants.
	 */
	private calculatePositioning(
		node: TimelineNode,
		timelineStart: number,
		totalDuration: number
	): TimelineNode {
		const trace = node.trace;
		const traceStart = trace.createdOn.getTime();
		const traceDuration = trace.duration.milliseconds;

		// Calculate position as percentage of total timeline
		const offsetPercent = ((traceStart - timelineStart) / totalDuration) * 100;
		const widthPercent = Math.max((traceDuration / totalDuration) * 100, 0.5); // Min 0.5% width for visibility

		// Update this node's positioning
		const positionedNode = node.withPositioning(offsetPercent, widthPercent);

		// Recursively position children
		if (positionedNode.children.length > 0) {
			const positionedChildren = positionedNode.children.map(child =>
				this.calculatePositioning(child, timelineStart, totalDuration)
			);
			return positionedNode.withChildren(positionedChildren);
		}

		return positionedNode;
	}

	/**
	 * Assigns equal positioning when all traces are at same time.
	 */
	private assignEqualPositioning(node: TimelineNode): TimelineNode {
		const positionedNode = node.withPositioning(0, 100);

		if (positionedNode.children.length > 0) {
			const positionedChildren = positionedNode.children.map(child =>
				this.assignEqualPositioning(child)
			);
			return positionedNode.withChildren(positionedChildren);
		}

		return positionedNode;
	}

	/**
	 * Gets the earliest trace start time in milliseconds.
	 */
	private getTimelineStart(traces: readonly PluginTrace[]): number {
		return Math.min(...traces.map(t => t.createdOn.getTime()));
	}

	/**
	 * Gets the latest trace end time in milliseconds.
	 */
	private getTimelineEnd(traces: readonly PluginTrace[]): number {
		return Math.max(...traces.map(t =>
			t.createdOn.getTime() + t.duration.milliseconds
		));
	}

	/**
	 * Gets the total duration from first trace start to last trace end.
	 */
	getTotalDuration(traces: readonly PluginTrace[]): number {
		if (traces.length === 0) {
			return 0;
		}

		const start = this.getTimelineStart(traces);
		const end = this.getTimelineEnd(traces);
		return end - start;
	}

	/**
	 * Counts total nodes in a hierarchy.
	 */
	countTotalNodes(roots: readonly TimelineNode[]): number {
		return roots.reduce((sum, root) => sum + root.getTotalNodeCount(), 0);
	}
}
