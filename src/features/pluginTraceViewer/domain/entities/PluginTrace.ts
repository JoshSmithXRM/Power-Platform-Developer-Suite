import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { TraceStatus } from '../valueObjects/TraceStatus';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { OperationType } from '../valueObjects/OperationType';
import { Duration } from '../valueObjects/Duration';
import { CorrelationId } from '../valueObjects/CorrelationId';

/**
 * Module-level helper: Validates required string field.
 */
function validateRequiredField(
	entityName: string,
	fieldName: string,
	value: string
): void {
	if (!value?.trim()) {
		throw new ValidationError(
			entityName,
			fieldName,
			value,
			`${fieldName} is required`
		);
	}
}

/**
 * Domain entity: Plugin Trace (Rich Model)
 *
 * Represents a single plugin execution trace with rich business logic.
 * This is NOT an anemic model - it contains behavior methods that encapsulate
 * business rules about plugin trace analysis.
 *
 * Responsibilities:
 * - Determine execution status (success/exception)
 * - Identify related traces (via correlation ID)
 * - Analyze execution characteristics (nested, synchronous, etc.)
 * - Format performance summaries
 */
export class PluginTrace {
	private constructor(
		public readonly id: string,
		public readonly createdOn: Date,
		public readonly pluginName: string,
		public readonly entityName: string | null,
		public readonly messageName: string,
		public readonly operationType: OperationType,
		public readonly mode: ExecutionMode,
		public readonly stage: number,
		public readonly depth: number,
		public readonly duration: Duration,
		public readonly constructorDuration: Duration,
		public readonly exceptionDetails: string | null,
		public readonly messageBlock: string | null,
		public readonly configuration: string | null,
		public readonly secureConfiguration: string | null,
		public readonly correlationId: CorrelationId | null,
		public readonly requestId: string | null,
		public readonly pluginStepId: string | null,
		public readonly persistenceKey: string | null
	) {}

	/**
	 * A trace with empty or null exceptionDetails is successful.
	 */
	hasException(): boolean {
		return (
			this.exceptionDetails !== null &&
			this.exceptionDetails.trim().length > 0
		);
	}

	isSuccessful(): boolean {
		return !this.hasException();
	}

	getStatus(): TraceStatus {
		return this.hasException()
			? TraceStatus.Exception
			: TraceStatus.Success;
	}

	/**
	 * Related traces share the same correlationId.
	 */
	isRelatedTo(other: PluginTrace): boolean {
		if (this.correlationId === null || other.correlationId === null) {
			return false;
		}
		return this.correlationId.equals(other.correlationId);
	}

	/**
	 * Depth > 1 indicates plugin was called from another plugin.
	 */
	isNested(): boolean {
		return this.depth > 1;
	}

	isSynchronous(): boolean {
		return this.mode.equals(ExecutionMode.Synchronous);
	}

	isAsynchronous(): boolean {
		return this.mode.equals(ExecutionMode.Asynchronous);
	}

	hasCorrelationId(): boolean {
		return this.correlationId !== null && !this.correlationId.isEmpty();
	}

	/**
	 * Validates required fields (id, pluginName, messageName) before construction.
	 */
	static create(params: {
		// Required fields
		id: string;
		createdOn: Date;
		pluginName: string;
		entityName: string | null;
		messageName: string;
		operationType: OperationType;
		mode: ExecutionMode;
		duration: Duration;
		constructorDuration: Duration;

		// Optional fields with defaults
		stage?: number; // Default: 0
		depth?: number; // Default: 1

		// Nullable fields (can be undefined or null, normalized to null)
		exceptionDetails?: string | null;
		messageBlock?: string | null;
		configuration?: string | null;
		secureConfiguration?: string | null;
		correlationId?: CorrelationId | null;
		requestId?: string | null;
		pluginStepId?: string | null;
		persistenceKey?: string | null;
	}): PluginTrace {
		// Validation
		validateRequiredField('PluginTrace', 'id', params.id);
		validateRequiredField('PluginTrace', 'pluginName', params.pluginName);
		validateRequiredField('PluginTrace', 'messageName', params.messageName);

		return new PluginTrace(
			params.id,
			params.createdOn,
			params.pluginName,
			params.entityName,
			params.messageName,
			params.operationType,
			params.mode,
			params.stage ?? 0,
			params.depth ?? 1,
			params.duration,
			params.constructorDuration,
			params.exceptionDetails ?? null,
			params.messageBlock ?? null,
			params.configuration ?? null,
			params.secureConfiguration ?? null,
			params.correlationId ?? null,
			params.requestId ?? null,
			params.pluginStepId ?? null,
			params.persistenceKey ?? null
		);
	}
}
