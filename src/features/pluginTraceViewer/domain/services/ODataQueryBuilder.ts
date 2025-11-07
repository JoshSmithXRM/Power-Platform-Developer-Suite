import type { CorrelationId } from '../valueObjects/CorrelationId';
import type { ExecutionMode } from '../valueObjects/ExecutionMode';
import type { OperationType } from '../valueObjects/OperationType';
import type { TraceStatus } from '../valueObjects/TraceStatus';
import type { FilterCondition } from '../entities/FilterCondition';

/**
 * Domain Service: OData Query Builder
 *
 * Handles construction of OData v4 filter queries for plugin traces.
 * Encapsulates OData syntax knowledge, keeping domain entities focused on business logic.
 *
 * Supports two filter strategies:
 * 1. Query Builder: Build from FilterCondition[] with AND/OR operators
 * 2. Legacy Filters: Build from individual filter properties (backward compatibility)
 *
 * Business Rules:
 * - Query builder conditions combined with AND or OR
 * - Legacy filters always combined with AND
 * - Empty/undefined values are ignored
 * - Single quotes in values are escaped as ''
 */
export class ODataQueryBuilder {
	/**
	 * Builds OData filter from query builder conditions.
	 * Combines enabled conditions with AND or OR operator.
	 */
	public buildFromConditions(
		conditions: readonly FilterCondition[],
		logicalOperator: 'and' | 'or'
	): string | undefined {
		const expressions = conditions
			.map(condition => condition.toODataExpression())
			.filter((expr): expr is string => expr !== undefined);

		if (expressions.length === 0) {
			return undefined;
		}

		if (expressions.length === 1) {
			return `(${expressions[0]})`;
		}

		// Combine with AND or OR based on logicalOperator
		const operator = logicalOperator === 'or' ? ' or ' : ' and ';
		return expressions.map(expr => `(${expr})`).join(operator);
	}

	/**
	 * Builds OData filter from legacy filter properties.
	 * Maintained for backward compatibility with simple filter UI.
	 *
	 * @deprecated Legacy filter support - migrate to query builder conditions
	 */
	// eslint-disable-next-line complexity -- Complexity from handling multiple legacy filter types, acceptable in service
	public buildFromLegacyFilters(filters: {
		pluginNameFilter: string | undefined;
		entityNameFilter: string | undefined;
		messageNameFilter: string | undefined;
		operationTypeFilter: OperationType | undefined;
		modeFilter: ExecutionMode | undefined;
		statusFilter: TraceStatus | undefined;
		createdOnFrom: Date | undefined;
		createdOnTo: Date | undefined;
		durationMin: number | undefined;
		durationMax: number | undefined;
		hasExceptionFilter: boolean | undefined;
		correlationIdFilter: CorrelationId | undefined;
	}): string | undefined {
		const conditions: string[] = [];

		// Text substring filters (contains operator)
		if (filters.pluginNameFilter) {
			conditions.push(`contains(typename, '${this.escapeODataString(filters.pluginNameFilter)}')`);
		}

		if (filters.entityNameFilter) {
			conditions.push(
				`contains(primaryentity, '${this.escapeODataString(filters.entityNameFilter)}')`
			);
		}

		if (filters.messageNameFilter) {
			conditions.push(
				`contains(messagename, '${this.escapeODataString(filters.messageNameFilter)}')`
			);
		}

		// Enum filters (equality)
		if (filters.operationTypeFilter) {
			conditions.push(`operationtype eq ${filters.operationTypeFilter.toNumber()}`);
		}

		if (filters.modeFilter) {
			conditions.push(`mode eq ${filters.modeFilter.toNumber()}`);
		}

		// Status filter (exception vs success)
		if (filters.statusFilter) {
			if (filters.statusFilter.isException()) {
				conditions.push(`exceptiondetails ne null`);
			} else {
				conditions.push(`exceptiondetails eq null`);
			}
		}

		// Date range filters
		if (filters.createdOnFrom) {
			const fromIso = filters.createdOnFrom.toISOString();
			conditions.push(`createdon ge ${fromIso}`);
		}

		if (filters.createdOnTo) {
			const toIso = filters.createdOnTo.toISOString();
			conditions.push(`createdon le ${toIso}`);
		}

		// Duration range filters
		if (filters.durationMin !== undefined) {
			conditions.push(`performanceexecutionduration ge ${filters.durationMin}`);
		}

		if (filters.durationMax !== undefined) {
			conditions.push(`performanceexecutionduration le ${filters.durationMax}`);
		}

		// Exception presence filter
		if (filters.hasExceptionFilter !== undefined) {
			if (filters.hasExceptionFilter) {
				conditions.push(`exceptiondetails ne null`);
			} else {
				conditions.push(`exceptiondetails eq null`);
			}
		}

		// Correlation ID (exact match)
		if (filters.correlationIdFilter && !filters.correlationIdFilter.isEmpty()) {
			conditions.push(
				`correlationid eq '${this.escapeODataString(filters.correlationIdFilter.getValue())}'`
			);
		}

		// Combine conditions with AND
		return conditions.length > 0 ? conditions.join(' and ') : undefined;
	}

	/**
	 * Escapes single quotes in OData string literals.
	 * Business rule: OData string literals escape ' as ''
	 */
	private escapeODataString(value: string): string {
		return value.replace(/'/g, "''");
	}
}
