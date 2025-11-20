import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type {
	PluginTraceTableRowViewModel,
	PluginTraceDetailViewModel,
} from '../../application/viewModels/PluginTraceViewModel';
import { TraceStatusFormatter } from '../utils/TraceStatusFormatter';
import { ExecutionModeFormatter } from '../utils/ExecutionModeFormatter';
import { OperationTypeFormatter } from '../utils/OperationTypeFormatter';
import { DurationFormatter } from '../utils/DurationFormatter';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

/**
 * Mapper: Plugin Trace to View Models
 *
 * Maps domain entities to presentation DTOs using formatters.
 * Transformation only - no sorting or business logic.
 */
export class PluginTraceViewModelMapper {
	/**
	 * Maps a PluginTrace entity to a table row view model.
	 *
	 * @param trace - The domain entity to map
	 * @returns Table row view model ready for display
	 */
	toTableRowViewModel(trace: PluginTrace): PluginTraceTableRowViewModel {
		const status = trace.getStatus();
		const escapedId = escapeHtml(trace.id);
		const escapedName = escapeHtml(trace.pluginName);

		return {
			id: trace.id,
			createdOn: trace.createdOn.toLocaleString(),
			pluginName: trace.pluginName,
			pluginNameHtml: `<a href="#" class="plugin-link" data-command="viewDetail" data-trace-id="${escapedId}">${escapedName}</a>`,
			entityName: trace.entityName ?? 'N/A',
			messageName: trace.messageName,
			operationType: OperationTypeFormatter.getDisplayName(
				trace.operationType
			),
			mode: ExecutionModeFormatter.getDisplayName(trace.mode),
			depth: trace.depth.toString(),
			duration: DurationFormatter.format(trace.duration),
			status: TraceStatusFormatter.getDisplayName(status),
			statusClass: TraceStatusFormatter.getBadgeClass(status),
		};
	}

	/**
	 * Maps a PluginTrace entity to a detail view model.
	 *
	 * @param trace - The domain entity to map
	 * @returns Detail view model ready for display
	 */
	// eslint-disable-next-line complexity -- Linear field mapping (18 fields), not branching logic
	toDetailViewModel(trace: PluginTrace): PluginTraceDetailViewModel {
		const status = trace.getStatus();

		return {
			id: trace.id,
			createdOn: trace.createdOn.toLocaleString(),
			pluginName: trace.pluginName,
			entityName: trace.entityName ?? 'N/A',
			messageName: trace.messageName,
			operationType: OperationTypeFormatter.getDisplayName(
				trace.operationType
			),
			mode: ExecutionModeFormatter.getDisplayName(trace.mode),
			stage: trace.stage.toString(),
			depth: trace.depth.toString(),
			duration: DurationFormatter.format(trace.duration),
			constructorDuration: DurationFormatter.format(
				trace.constructorDuration
			),
			executionStartTime: trace.executionStartTime?.toLocaleString() ?? 'N/A',
			constructorStartTime: trace.constructorStartTime?.toLocaleString() ?? 'N/A',
			status: TraceStatusFormatter.getDisplayName(status),
			statusBadgeClass: TraceStatusFormatter.getBadgeClass(status),
			exceptionDetails: trace.exceptionDetails ?? 'None',
			messageBlock: trace.messageBlock ?? 'N/A',
			configuration: trace.configuration ?? 'N/A',
			secureConfiguration: trace.secureConfiguration ?? 'N/A',
			correlationId: trace.correlationId?.value ?? 'N/A',
			requestId: trace.requestId ?? 'N/A',
			pluginStepId: trace.pluginStepId ?? 'N/A',
			persistenceKey: trace.persistenceKey ?? 'N/A',
			organizationId: trace.organizationId ?? 'N/A',
			profile: trace.profile ?? 'N/A',
			isSystemCreated: trace.isSystemCreated?.toString() ?? 'N/A',
			createdBy: trace.createdBy ?? 'N/A',
			createdOnBehalfBy: trace.createdOnBehalfBy ?? 'N/A',
		};
	}

	/**
	 * Maps an array of PluginTrace entities to table row view models.
	 *
	 * @param traces - Array of domain entities to map
	 * @returns Array of table row view models
	 */
	toTableRowViewModels(
		traces: readonly PluginTrace[]
	): PluginTraceTableRowViewModel[] {
		return traces.map((trace) => this.toTableRowViewModel(trace));
	}
}
