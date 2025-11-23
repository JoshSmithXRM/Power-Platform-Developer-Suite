import { PluginTrace } from '../../../features/pluginTraceViewer/domain/entities/PluginTrace';
import { ExecutionMode } from '../../../features/pluginTraceViewer/domain/valueObjects/ExecutionMode';
import { OperationType } from '../../../features/pluginTraceViewer/domain/valueObjects/OperationType';
import { Duration } from '../../../features/pluginTraceViewer/domain/valueObjects/Duration';
import { CorrelationId } from '../../../features/pluginTraceViewer/domain/valueObjects/CorrelationId';

/**
 * Test factory for creating PluginTrace entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestPluginTrace(overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
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
		stage: 0,
		depth: 1,
		executionStartTime: null,
		constructorStartTime: null,
		exceptionDetails: null,
		messageBlock: null,
		configuration: null,
		secureConfiguration: null,
		correlationId: null,
		requestId: null,
		pluginStepId: null,
		persistenceKey: null,
		organizationId: null,
		profile: null,
		isSystemCreated: null,
		createdBy: null,
		createdOnBehalfBy: null,
		...overrides
	});
}

/**
 * Creates a PluginTrace with an exception (failed trace).
 */
export function createTestFailedPluginTrace(overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
	return createTestPluginTrace({
		exceptionDetails: 'System.Exception: Test exception occurred',
		...overrides
	});
}

/**
 * Creates a PluginTrace with async execution mode.
 */
export function createTestAsyncPluginTrace(overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
	return createTestPluginTrace({
		mode: ExecutionMode.Asynchronous,
		...overrides
	});
}

/**
 * Creates a PluginTrace with a correlation ID for testing related traces.
 */
export function createTestRelatedPluginTrace(correlationId: string, overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
	return createTestPluginTrace({
		correlationId: CorrelationId.create(correlationId),
		...overrides
	});
}

/**
 * Creates a nested PluginTrace (depth > 1).
 */
export function createTestNestedPluginTrace(depth: number, overrides?: Partial<Parameters<typeof PluginTrace.create>[0]>): PluginTrace {
	return createTestPluginTrace({
		depth,
		...overrides
	});
}
