import type { TimelineNode } from '../../domain/valueObjects/TimelineNode';
import type { TimelineViewModel, TimelineNodeViewModel } from '../viewModels/TimelineViewModel';
import { Duration } from '../../application/types';
import { DurationFormatter } from '../utils/DurationFormatter';
import { ExecutionModeFormatter } from '../utils/ExecutionModeFormatter';

/**
 * Maps timeline domain entities to view models for presentation.
 * Handles formatting and transformation for UI display.
 */
export class TimelineViewModelMapper {
	/**
	 * Maps timeline hierarchy to view model.
	 *
	 * @param roots - Root timeline nodes
	 * @param correlationId - Correlation ID for this timeline
	 * @param totalDurationMs - Total execution duration in milliseconds
	 * @returns Timeline view model ready for rendering
	 */
	toViewModel(
		roots: readonly TimelineNode[],
		correlationId: string | null,
		totalDurationMs: number
	): TimelineViewModel {
		const traceCount = roots.reduce((sum, root) => sum + root.getTotalNodeCount(), 0);

		return {
			correlationId: this.formatCorrelationId(correlationId),
			totalDuration: DurationFormatter.format(Duration.fromMilliseconds(totalDurationMs)),
			traceCount,
			nodes: roots.map(root => this.toNodeViewModel(root))
		};
	}

	/**
	 * Maps a timeline node to node view model (recursive).
	 */
	private toNodeViewModel(node: TimelineNode): TimelineNodeViewModel {
		const trace = node.trace;

		return {
			id: trace.id,
			pluginName: trace.pluginName,
			messageName: trace.messageName,
			entityName: trace.entityName ?? 'N/A',
			depth: node.depth,
			offsetPercent: node.offsetPercent,
			widthPercent: node.widthPercent,
			hasException: node.hasException(),
			duration: DurationFormatter.format(trace.duration),
			time: this.formatTime(trace.createdOn),
			mode: ExecutionModeFormatter.getDisplayName(trace.mode),
			children: node.children.map(child => this.toNodeViewModel(child))
		};
	}

	/**
	 * Formats correlation ID for display (truncates to 8 chars).
	 */
	private formatCorrelationId(correlationId: string | null): string {
		if (!correlationId) {
			return 'N/A';
		}

		if (correlationId.length <= 8) {
			return correlationId;
		}

		return `${correlationId.substring(0, 8)}...`;
	}

	/**
	 * Formats time to HH:MM:SS.mmm format.
	 */
	private formatTime(date: Date): string {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

		return `${hours}:${minutes}:${seconds}.${milliseconds}`;
	}
}
