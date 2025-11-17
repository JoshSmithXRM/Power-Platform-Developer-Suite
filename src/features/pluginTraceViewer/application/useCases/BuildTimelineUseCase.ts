import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { TimelineNode } from '../../domain/valueObjects/TimelineNode';
import { TimelineHierarchyService } from '../../domain/services/TimelineHierarchyService';

/**
 * Use case for building timeline hierarchy from plugin traces.
 * Filters traces by correlation ID and builds hierarchical structure.
 *
 * NO business logic - orchestrates domain service only.
 */
export class BuildTimelineUseCase {
	private readonly hierarchyService: TimelineHierarchyService;

	constructor(private readonly logger: ILogger) {
		this.hierarchyService = new TimelineHierarchyService();
	}

	/**
	 * Builds timeline hierarchy for traces with given correlation ID.
	 *
	 * @param allTraces - All available traces
	 * @param correlationId - Correlation ID to filter by (null/undefined for all traces)
	 * @returns Timeline hierarchy roots
	 */
	execute(
		allTraces: readonly PluginTrace[],
		correlationId: string | null | undefined
	): readonly TimelineNode[] {
		this.logger.debug('Building timeline hierarchy', {
			totalTraces: allTraces.length,
			correlationId: correlationId ?? 'all'
		});

		// Filter traces by correlation ID if provided
		const filteredTraces = correlationId
			? allTraces.filter(t =>
				t.hasCorrelationId() && t.correlationId?.value === correlationId
			)
			: allTraces;

		if (filteredTraces.length === 0) {
			this.logger.debug('No traces found for timeline', { correlationId });
			return [];
		}

		// Build hierarchy using domain service
		const hierarchy = this.hierarchyService.buildHierarchy(filteredTraces);

		const totalNodes = this.hierarchyService.countTotalNodes(hierarchy);
		const totalDuration = this.hierarchyService.getTotalDuration(filteredTraces);

		this.logger.debug('Timeline hierarchy built', {
			correlationId: correlationId ?? 'all',
			roots: hierarchy.length,
			totalNodes,
			totalDuration: `${totalDuration}ms`
		});

		return hierarchy;
	}
}
