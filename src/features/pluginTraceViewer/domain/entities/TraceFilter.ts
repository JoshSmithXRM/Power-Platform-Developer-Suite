import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { ODataQueryBuilder } from '../services/ODataQueryBuilder';
import { CorrelationId } from '../valueObjects/CorrelationId';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { OperationType } from '../valueObjects/OperationType';
import { TraceStatus } from '../valueObjects/TraceStatus';

import { FilterCondition } from './FilterCondition';

/**
 * Domain entity: Trace Filter (Extended with rich filtering behavior)
 *
 * Represents filter criteria for querying plugin traces.
 * Rich model with validation and OData query building behavior.
 *
 * Business Rules:
 * - Plugin name, entity name, message name support substring matching
 * - Correlation ID is exact match only
 * - Date ranges must be valid (from <= to)
 * - Duration min must be <= duration max
 * - Empty/null values ignored in query building
 */
export class TraceFilter {
	constructor(
		public readonly top: number,
		public readonly orderBy: string,
		public readonly conditions: readonly FilterCondition[] = [],
		public readonly pluginNameFilter?: string,
		public readonly entityNameFilter?: string,
		public readonly messageNameFilter?: string,
		public readonly operationTypeFilter?: OperationType,
		public readonly modeFilter?: ExecutionMode,
		public readonly statusFilter?: TraceStatus,
		public readonly createdOnFrom?: Date,
		public readonly createdOnTo?: Date,
		public readonly durationMin?: number,
		public readonly durationMax?: number,
		public readonly hasExceptionFilter?: boolean,
		public readonly correlationIdFilter?: CorrelationId
	) {
		this.validateInvariants();
	}

	/**
	 * Validates business rules on construction.
	 * @throws ValidationError if invariants violated
	 */
	private validateInvariants(): void {
		if (this.createdOnFrom && this.createdOnTo && this.createdOnFrom > this.createdOnTo) {
			throw new ValidationError(
				'TraceFilter',
				'dateRange',
				`${this.createdOnFrom.toISOString()} - ${this.createdOnTo.toISOString()}`,
				'Date range "from" must be before or equal to "to"'
			);
		}

		if (
			this.durationMin !== undefined &&
			this.durationMax !== undefined &&
			this.durationMin > this.durationMax
		) {
			throw new ValidationError(
				'TraceFilter',
				'durationRange',
				`${this.durationMin} - ${this.durationMax}`,
				'Duration min must be less than or equal to max'
			);
		}

		if (this.durationMin !== undefined && this.durationMin < 0) {
			throw new ValidationError(
				'TraceFilter',
				'durationMin',
				this.durationMin.toString(),
				'Duration min must be non-negative'
			);
		}

		if (this.top <= 0) {
			throw new ValidationError(
				'TraceFilter',
				'top',
				this.top.toString(),
				'Top must be greater than zero'
			);
		}
	}

	/**
	 * Builds OData filter query string from criteria.
	 * Delegates to ODataQueryBuilder domain service.
	 *
	 * @returns OData filter string (e.g., "typename eq 'MyPlugin' and messagename eq 'Update'")
	 *          Returns undefined if no filters applied
	 */
	public buildFilterExpression(): string | undefined {
		const builder = new ODataQueryBuilder();

		// NEW: If using query builder conditions, build from those instead
		if (this.conditions.length > 0) {
			return builder.buildFromConditions(this.conditions);
		}

		// LEGACY: Fall back to simple filters for backward compatibility
		return builder.buildFromLegacyFilters({
			pluginNameFilter: this.pluginNameFilter,
			entityNameFilter: this.entityNameFilter,
			messageNameFilter: this.messageNameFilter,
			operationTypeFilter: this.operationTypeFilter,
			modeFilter: this.modeFilter,
			statusFilter: this.statusFilter,
			createdOnFrom: this.createdOnFrom,
			createdOnTo: this.createdOnTo,
			durationMin: this.durationMin,
			durationMax: this.durationMax,
			hasExceptionFilter: this.hasExceptionFilter,
			correlationIdFilter: this.correlationIdFilter
		});
	}

	/**
	 * Checks if any filters are active.
	 * Used by: UI to show "Clear All" button and active filter count
	 */
	public hasActiveFilters(): boolean {
		// NEW: Check for enabled conditions
		if (this.conditions.some(condition => condition.enabled)) {
			return true;
		}

		// LEGACY: Check simple filters
		return (
			this.pluginNameFilter !== undefined ||
			this.entityNameFilter !== undefined ||
			this.messageNameFilter !== undefined ||
			this.operationTypeFilter !== undefined ||
			this.modeFilter !== undefined ||
			this.statusFilter !== undefined ||
			this.createdOnFrom !== undefined ||
			this.createdOnTo !== undefined ||
			this.durationMin !== undefined ||
			this.durationMax !== undefined ||
			this.hasExceptionFilter !== undefined ||
			(this.correlationIdFilter !== undefined && !this.correlationIdFilter.isEmpty())
		);
	}

	/**
	 * Counts active filters.
	 * Used by: UI to display filter count badge
	 */
	public getActiveFilterCount(): number {
		// NEW: If using query builder conditions, count enabled conditions
		if (this.conditions.length > 0) {
			return this.conditions.filter(condition => condition.enabled).length;
		}

		// LEGACY: Fall back to simple filter count
		let count = 0;
		if (this.pluginNameFilter) count++;
		if (this.entityNameFilter) count++;
		if (this.messageNameFilter) count++;
		if (this.operationTypeFilter) count++;
		if (this.modeFilter) count++;
		if (this.statusFilter) count++;
		if (this.createdOnFrom || this.createdOnTo) count++; // Date range counts as 1
		if (this.durationMin !== undefined || this.durationMax !== undefined) count++;
		if (this.hasExceptionFilter !== undefined) count++;
		if (this.correlationIdFilter && !this.correlationIdFilter.isEmpty()) count++;
		return count;
	}

	/**
	 * Factory method: Create default filter (no criteria)
	 */
	static default(): TraceFilter {
		return new TraceFilter(100, 'createdon desc');
	}

	/**
	 * Factory method: Create filter from parameters
	 */
	static create(params: {
		top?: number;
		orderBy?: string;
		conditions?: readonly FilterCondition[];
		pluginNameFilter?: string;
		entityNameFilter?: string;
		messageNameFilter?: string;
		operationTypeFilter?: OperationType;
		modeFilter?: ExecutionMode;
		statusFilter?: TraceStatus;
		createdOnFrom?: Date;
		createdOnTo?: Date;
		durationMin?: number;
		durationMax?: number;
		hasExceptionFilter?: boolean;
		correlationIdFilter?: CorrelationId;
	}): TraceFilter {
		return new TraceFilter(
			params.top ?? 100,
			params.orderBy ?? 'createdon desc',
			params.conditions ?? [],
			params.pluginNameFilter,
			params.entityNameFilter,
			params.messageNameFilter,
			params.operationTypeFilter,
			params.modeFilter,
			params.statusFilter,
			params.createdOnFrom,
			params.createdOnTo,
			params.durationMin,
			params.durationMax,
			params.hasExceptionFilter,
			params.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with plugin name filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 * Example: TraceFilter.create({ conditions: [FilterCondition.create({ field: FilterField.PluginName, operator: FilterOperator.Contains, value: 'MyPlugin' })] })
	 */
	public withPluginName(pluginName: string | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,
			pluginName,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with entity name filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withEntityName(entityName: string | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			entityName,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with message name filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withMessageName(messageName: string | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			messageName,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with operation type filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withOperationType(operationType: OperationType | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			operationType,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with mode filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withMode(mode: ExecutionMode | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			mode,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with status filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withStatus(status: TraceStatus | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			status,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with date range
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withDateRange(from: Date | undefined, to: Date | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			from,
			to,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with duration range
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withDurationRange(min: number | undefined, max: number | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			min,
			max,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with exception filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withHasException(hasException: boolean | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			hasException,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with correlation ID filter
	 *
	 * @deprecated Legacy filter method. Use query builder pattern with FilterCondition instead.
	 */
	public withCorrelationId(correlationId: CorrelationId | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			correlationId
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with top changed
	 *
	 * @deprecated Use TraceFilter.create({ top: value }) instead for consistency.
	 */
	public withTop(top: number): TraceFilter {
		return new TraceFilter(
			top,
			this.orderBy,
			this.conditions,

			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with all filters cleared
	 */
	public clearFilters(): TraceFilter {
		return new TraceFilter(this.top, this.orderBy);
	}
}
