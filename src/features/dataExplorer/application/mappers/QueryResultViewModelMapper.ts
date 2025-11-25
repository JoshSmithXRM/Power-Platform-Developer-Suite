import type { QueryResult } from '../../domain/entities/QueryResult';
import type { QueryResultColumn } from '../../domain/valueObjects/QueryResultColumn';
import type { QueryResultRow, QueryCellValue } from '../../domain/valueObjects/QueryResultRow';
import type {
	QueryResultViewModel,
	QueryColumnViewModel,
	QueryRowViewModel,
} from '../viewModels/QueryResultViewModel';

/**
 * Mapper: QueryResult → QueryResultViewModel
 *
 * Transforms domain QueryResult to presentation-friendly ViewModel.
 * Display transformation logic belongs here, not in domain entities.
 */
export class QueryResultViewModelMapper {
	/**
	 * Maps QueryResult entity to ViewModel.
	 *
	 * @param result - Domain query result to transform
	 * @returns ViewModel ready for presentation layer
	 */
	public toViewModel(result: QueryResult): QueryResultViewModel {
		return {
			columns: result.columns.map((col) => this.mapColumn(col)),
			rows: result.rows.map((row) => this.mapRow(row, result.columns)),
			totalRecordCount: result.totalRecordCount,
			hasMoreRecords: result.hasMoreRecords(),
			executionTimeMs: result.executionTimeMs,
			executedFetchXml: result.executedFetchXml,
		};
	}

	/**
	 * Maps QueryResultColumn to ViewModel column.
	 *
	 * @param column - Domain column to transform
	 * @returns ViewModel column with display header
	 */
	private mapColumn(column: QueryResultColumn): QueryColumnViewModel {
		return {
			name: column.logicalName,
			header: this.toHeaderText(column),
			dataType: column.dataType,
		};
	}

	/**
	 * Converts column to display header text.
	 * Uses displayName if available, otherwise transforms logicalName to title case.
	 *
	 * @param column - Domain column
	 * @returns Display-ready header text
	 */
	private toHeaderText(column: QueryResultColumn): string {
		if (column.displayName && column.displayName !== column.logicalName) {
			return column.displayName;
		}
		// Convert logical_name to Logical Name
		return column.logicalName
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	/**
	 * Maps QueryResultRow to ViewModel row.
	 *
	 * @param row - Domain row to transform
	 * @param columns - Column definitions for the row
	 * @returns ViewModel row with display values
	 */
	private mapRow(
		row: QueryResultRow,
		columns: readonly QueryResultColumn[]
	): QueryRowViewModel {
		const viewModelRow: Record<string, string> = {};

		for (const column of columns) {
			const value = row.getValue(column.logicalName);
			viewModelRow[column.logicalName] = this.toDisplayString(value);
		}

		return viewModelRow;
	}

	/**
	 * Converts cell value to display string.
	 * Handles null, boolean, Date, lookup, and formatted value types.
	 *
	 * @param value - Domain cell value
	 * @returns Display-ready string
	 */
	private toDisplayString(value: QueryCellValue): string {
		if (value === null || value === undefined) {
			return '';
		}

		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}

		if (value instanceof Date) {
			return value.toISOString();
		}

		if (typeof value === 'object') {
			// Lookup or formatted value
			if ('formattedValue' in value && value.formattedValue !== undefined) {
				return String(value.formattedValue);
			}
			if ('name' in value && value.name !== undefined) {
				return String(value.name);
			}
			return JSON.stringify(value);
		}

		return String(value);
	}
}
