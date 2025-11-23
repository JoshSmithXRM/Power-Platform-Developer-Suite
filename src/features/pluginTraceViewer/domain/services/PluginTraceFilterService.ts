import { PluginTrace } from '../entities/PluginTrace';

/**
 * Type-safe filter operators for OData queries.
 */
export type FilterOperator =
	| 'contains'
	| 'eq'
	| 'startswith'
	| 'endswith'
	| 'gt'
	| 'lt'
	| 'ge'
	| 'le'
	| 'isNull'
	| 'isNotNull';

export interface FilterCondition {
	field: string;
	operator: FilterOperator;
	value: string | number;
}

/**
 * Domain service for building OData filters and client-side search.
 *
 * Note: Uses static methods for pure transformation logic (no state).
 * Documented exception to CLAUDE.md preference for instance methods.
 */
export class PluginTraceFilterService {
	/**
	 * Builds OData $filter query from conditions.
	 *
	 * Supports operators:
	 * - contains, eq, startswith, endswith (strings)
	 * - gt, lt, ge, le (numbers/dates)
	 * - isNull, isNotNull (nullability)
	 *
	 * Combines with AND logic.
	 */
	static buildODataFilter(conditions: FilterCondition[]): string {
		if (conditions.length === 0) {
			return '';
		}

		const filters = conditions.map((c) => {
			switch (c.operator) {
				case 'contains':
					return `contains(${c.field}, '${this.escapeOData(String(c.value))}')`;
				case 'eq':
					return `${c.field} eq '${this.escapeOData(String(c.value))}'`;
				case 'startswith':
					return `startswith(${c.field}, '${this.escapeOData(String(c.value))}')`;
				case 'endswith':
					return `endswith(${c.field}, '${this.escapeOData(String(c.value))}')`;
				case 'gt':
					return `${c.field} gt ${c.value}`;
				case 'lt':
					return `${c.field} lt ${c.value}`;
				case 'ge':
					return `${c.field} ge ${c.value}`;
				case 'le':
					return `${c.field} le ${c.value}`;
				case 'isNull':
					return `${c.field} eq null`;
				case 'isNotNull':
					return `${c.field} ne null`;
				default: {
					const exhaustiveCheck: never = c.operator;
					throw new Error(`Invalid FilterOperator: unsupported operator ${exhaustiveCheck}`);
				}
			}
		});

		return filters.join(' and ');
	}

	/**
	 * Applies client-side search filter.
	 * Searches across all text fields in loaded traces.
	 * Accepts and returns readonly arrays to prevent mutation.
	 */
	static applyClientSideSearch(
		traces: readonly PluginTrace[],
		searchTerm: string
	): readonly PluginTrace[] {
		if (!searchTerm || searchTerm.trim().length === 0) {
			return traces;
		}

		const query = searchTerm.toLowerCase();
		return traces.filter(
			(trace) =>
				trace.pluginName.toLowerCase().includes(query) ||
				(trace.entityName?.toLowerCase().includes(query) ?? false) ||
				trace.messageName.toLowerCase().includes(query) ||
				(trace.exceptionDetails?.toLowerCase().includes(query) ??
					false) ||
				(trace.correlationId
					?.toString()
					.toLowerCase()
					.includes(query) ?? false)
		);
	}

	private static escapeOData(value: string): string {
		return value.replace(/'/g, "''");
	}
}
