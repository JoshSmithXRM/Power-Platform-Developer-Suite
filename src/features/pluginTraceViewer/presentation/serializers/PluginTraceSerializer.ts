import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { IEntitySerializer } from '../../../../shared/presentation/serializers/EntitySerializer';

/**
 * Serializes PluginTrace domain entity to raw API format for Raw Data tab.
 * Converts domain value objects to primitives matching actual Dataverse API response.
 */
export class PluginTraceSerializer implements IEntitySerializer<PluginTrace> {
	serializeToRaw(trace: PluginTrace): Record<string, unknown> {
		return {
			plugintracelogid: trace.id,
			createdon: trace.createdOn.toISOString(),
			typename: trace.pluginName,
			primaryentity: trace.entityName ?? null,
			messagename: trace.messageName,
			operationtype: trace.operationType.value,
			mode: trace.mode.value,
			stage: trace.stage,
			depth: trace.depth,
			performanceexecutionduration: trace.duration.milliseconds,
			performanceconstructorduration: trace.constructorDuration?.milliseconds ?? null,
			performanceexecutionstarttime: trace.executionStartTime ?? null,
			performanceconstructorstarttime: trace.constructorStartTime ?? null,
			exceptiondetails: trace.exceptionDetails ?? null,
			messageblock: trace.messageBlock ?? null,
			configuration: trace.configuration ?? null,
			secureconfiguration: trace.secureConfiguration ?? null,
			correlationid: trace.correlationId?.value ?? null,
			requestid: trace.requestId ?? null,
			pluginstepid: trace.pluginStepId ?? null,
			persistencekey: trace.persistenceKey ?? null,
			organizationid: trace.organizationId ?? null,
			profile: trace.profile ?? null,
			issystemcreated: trace.isSystemCreated ?? null,
			createdby: trace.createdBy ?? null,
			createdonbehalfby: trace.createdOnBehalfBy ?? null
		};
	}
}
