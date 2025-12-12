import type { QueryResult } from '../../domain/entities/QueryResult';
import type { QueryResultColumn } from '../../domain/valueObjects/QueryResultColumn';
import type { QueryResultRow, QueryCellValue, QueryLookupValue, QueryFormattedValue } from '../../domain/valueObjects/QueryResultRow';
import type {
	QueryResultViewModel,
	QueryColumnViewModel,
	QueryRowViewModel,
	RowLookupsViewModel,
	LookupViewModel,
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
	 * @param columnsToShow - Optional column filter (for virtual column support). If provided,
	 *                        only these columns will be included in the output (case-insensitive).
	 * @returns ViewModel ready for presentation layer
	 */
	public toViewModel(result: QueryResult, columnsToShow?: string[] | null): QueryResultViewModel {
		const entityLogicalName = this.extractEntityNameFromFetchXml(result.executedFetchXml);

		// Expand columns to include virtual "name" columns for optionsets and lookups
		let expandedColumns = this.expandColumnsWithVirtualNameColumns(result.columns);
		let mappedRows = result.rows.map((row) => this.mapRow(row, result.columns));
		let rowLookups = result.rows.map((row) => this.extractLookups(row, result.columns));

		// Apply column filter if provided (for virtual column transformation)
		if (columnsToShow !== undefined && columnsToShow !== null && columnsToShow.length > 0) {
			const allowedColumnsLower = new Set(columnsToShow.map(c => c.toLowerCase()));

			// Filter columns
			expandedColumns = expandedColumns.filter(col =>
				allowedColumnsLower.has(col.name.toLowerCase())
			);

			// Filter row data to only include allowed columns
			mappedRows = mappedRows.map(row => {
				const filteredRow: Record<string, string> = {};
				for (const col of expandedColumns) {
					const value = row[col.name];
					if (value !== undefined) {
						filteredRow[col.name] = value;
					}
				}
				return filteredRow as QueryRowViewModel;
			});

			// Filter rowLookups to only include allowed columns
			rowLookups = rowLookups.map(lookups => {
				const filteredLookups: Record<string, LookupViewModel> = {};
				for (const col of expandedColumns) {
					const lookup = lookups[col.name];
					if (lookup !== undefined) {
						filteredLookups[col.name] = lookup;
					}
				}
				return filteredLookups as RowLookupsViewModel;
			});
		}

		return {
			columns: expandedColumns,
			rows: mappedRows,
			rowLookups,
			totalRecordCount: result.totalRecordCount,
			hasMoreRecords: result.hasMoreRecords(),
			executionTimeMs: result.executionTimeMs,
			executedFetchXml: result.executedFetchXml,
			entityLogicalName,
		};
	}

	/**
	 * Expands columns to include virtual "name" columns for optionset, lookup, and boolean fields.
	 *
	 * For optionset columns (e.g., accountcategorycode), creates a companion column
	 * with "name" suffix (e.g., accountcategorycodename) to hold the label.
	 *
	 * For lookup columns (e.g., primarycontactid), creates a companion column
	 * with "name" suffix (e.g., primarycontactidname) to hold the display name.
	 * This ensures the column name matches the content - "id" suffix columns show GUIDs.
	 *
	 * For boolean columns (e.g., ismanaged), creates a companion column
	 * with "name" suffix (e.g., ismanagedname) to hold the Yes/No label.
	 *
	 * Avoids duplicates: If the user already queried the virtual name column directly
	 * (e.g., createdbyname), we don't add another one.
	 *
	 * @param columns - Original domain columns
	 * @returns Expanded columns including virtual name columns
	 */
	private expandColumnsWithVirtualNameColumns(
		columns: readonly QueryResultColumn[]
	): QueryColumnViewModel[] {
		const expandedColumns: QueryColumnViewModel[] = [];

		// Build set of existing column names to avoid duplicates
		const existingColumnNames = new Set(columns.map((c) => c.logicalName));

		for (const column of columns) {
			// Add the original column
			expandedColumns.push(this.mapColumn(column));

			// For optionset, lookup, and boolean columns, add a companion "name" column
			// BUT only if it doesn't already exist in the original columns
			if (column.dataType === 'optionset' || column.dataType === 'lookup' || column.dataType === 'boolean') {
				const nameColumnName = `${column.logicalName}name`;

				// Skip if the user already queried this virtual column directly
				if (!existingColumnNames.has(nameColumnName)) {
					expandedColumns.push({
						name: nameColumnName,
						header: nameColumnName, // Use logical name as header (e.g., "statuscodename")
						dataType: 'string',
					});
				}
			}
		}

		return expandedColumns;
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
	 * Uses displayName if distinct from logicalName, otherwise uses logicalName as-is.
	 *
	 * @param column - Domain column
	 * @returns Display-ready header text
	 */
	private toHeaderText(column: QueryResultColumn): string {
		if (column.displayName && column.displayName !== column.logicalName) {
			return column.displayName;
		}
		// Use logical name as-is - no formatting transformation
		return column.logicalName;
	}

	/**
	 * Maps QueryResultRow to ViewModel row.
	 * For optionset and lookup columns, creates both the raw value column and the "name" column.
	 *
	 * When the user queries both a lookup column (e.g., createdby) AND its virtual name column
	 * (e.g., createdbyname), we skip processing the explicit name column to avoid overwriting
	 * the value we derived from the lookup (which has the correct name from Dataverse).
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

		// Identify name columns that should be populated from lookup/optionset/boolean columns
		// These shouldn't be overwritten by explicit column values
		const virtualNameColumns = new Set(
			columns
				.filter((c) => c.dataType === 'lookup' || c.dataType === 'optionset' || c.dataType === 'boolean')
				.map((c) => `${c.logicalName}name`)
		);

		for (const column of columns) {
			// Skip columns that are virtual name columns for lookups/optionsets/booleans
			// The lookup/optionset/boolean processing already populates these with the correct value
			// Don't check dataType - it could be 'string', 'unknown', etc. depending on the data
			if (virtualNameColumns.has(column.logicalName)) {
				continue;
			}

			const value = row.getValue(column.logicalName);

			// Handle optionset columns specially
			if (column.dataType === 'optionset' && this.isFormattedValue(value)) {
				// Original column shows raw numeric value
				viewModelRow[column.logicalName] = value.value === null ? '' : String(value.value);
				// Virtual "name" column shows formatted label
				viewModelRow[`${column.logicalName}name`] = value.formattedValue || '';
			}
			// Handle null optionset columns for consistency
			else if (column.dataType === 'optionset' && value === null) {
				viewModelRow[column.logicalName] = '';
				viewModelRow[`${column.logicalName}name`] = '';
			}
			// Handle boolean columns specially (like optionsets)
			// Boolean fields return FormattedValue from Dataverse with value: true/false
			else if (column.dataType === 'boolean' && this.isFormattedValue(value)) {
				// Original column shows raw boolean value (true/false as API returns)
				viewModelRow[column.logicalName] = value.value === null ? '' : String(value.value);
				// Virtual "name" column shows formatted label (Yes/No)
				viewModelRow[`${column.logicalName}name`] = value.formattedValue || '';
			}
			// Handle null boolean columns
			else if (column.dataType === 'boolean' && value === null) {
				viewModelRow[column.logicalName] = '';
				viewModelRow[`${column.logicalName}name`] = '';
			}
			// Handle lookup columns specially - show GUID in column, name in name column
			else if (column.dataType === 'lookup' && this.isLookupValue(value)) {
				// Original column shows GUID (column name ends with "id", should show ID)
				viewModelRow[column.logicalName] = value.id;
				// Virtual "name" column shows display name
				viewModelRow[`${column.logicalName}name`] = value.name || '';
			}
			// Handle null lookup columns
			else if (column.dataType === 'lookup' && value === null) {
				viewModelRow[column.logicalName] = '';
				viewModelRow[`${column.logicalName}name`] = '';
			} else {
				viewModelRow[column.logicalName] = this.toDisplayString(value, column.dataType);
			}
		}

		return viewModelRow;
	}

	/**
	 * Type guard to check if a value is a QueryFormattedValue.
	 */
	private isFormattedValue(value: QueryCellValue): value is QueryFormattedValue {
		return (
			value !== null &&
			typeof value === 'object' &&
			'formattedValue' in value &&
			'value' in value &&
			!('entityType' in value) // Exclude lookups which also have formattedValue-like structure
		);
	}

	/**
	 * Converts cell value to display string.
	 * Handles null, boolean, Date, lookup, and formatted value types.
	 *
	 * Note: Optionset and boolean columns are handled specially in mapRow() and should not
	 * reach this method with FormattedValue objects. For other formatted values (like money),
	 * we use the formatted display string.
	 *
	 * @param value - Domain cell value
	 * @param _dataType - Column data type (reserved for future use)
	 * @returns Display-ready string
	 */
	private toDisplayString(value: QueryCellValue, _dataType?: string): string {
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
			// Lookup without name - fall back to ID (more useful than JSON)
			// This happens when Dataverse doesn't return FormattedValue annotation
			// (e.g., owninguser, owningteam system fields)
			if ('id' in value && value.id !== undefined) {
				return String(value.id);
			}
			// ManagedProperty complex type (e.g., ishidden, iscustomizable)
			// Extract the Value property and display as 0/1 for SQL filter consistency
			// Users can filter with WHERE ishidden = 0 (what they see = what they filter by)
			if (this.isManagedProperty(value)) {
				return value.Value ? '1' : '0';
			}
			return JSON.stringify(value);
		}

		return String(value);
	}

	/**
	 * Extracts lookup metadata from a row.
	 * Creates a map of column names to lookup info for cells that contain record references.
	 *
	 * For lookup columns, adds entries for BOTH the original column (e.g., primarycontactid)
	 * AND the virtual name column (e.g., primarycontactidname) so both are clickable.
	 *
	 * @param row - Domain row to extract lookups from
	 * @param columns - Column definitions for the row
	 * @returns Map of column names to lookup info
	 */
	private extractLookups(
		row: QueryResultRow,
		columns: readonly QueryResultColumn[]
	): RowLookupsViewModel {
		const lookups: Record<string, { entityType: string; id: string }> = {};

		for (const column of columns) {
			const value = row.getValue(column.logicalName);
			if (this.isLookupValue(value)) {
				const lookupInfo = {
					entityType: value.entityType,
					id: value.id,
				};
				// Add to original column (e.g., primarycontactid - shows GUID)
				lookups[column.logicalName] = lookupInfo;
				// Also add to virtual name column (e.g., primarycontactidname - shows display name)
				// This makes both columns clickable
				lookups[`${column.logicalName}name`] = lookupInfo;
			}
		}

		return lookups;
	}

	/**
	 * Type guard to check if a value is a lookup.
	 */
	private isLookupValue(value: QueryCellValue): value is QueryLookupValue {
		return (
			value !== null &&
			typeof value === 'object' &&
			'id' in value &&
			'entityType' in value
		);
	}

	/**
	 * Type guard to check if a value is a ManagedProperty complex type.
	 * ManagedProperty objects have Value (capital V) and ManagedPropertyLogicalName properties.
	 * Example: { Value: false, CanBeChanged: true, ManagedPropertyLogicalName: "ishidden" }
	 */
	private isManagedProperty(value: object): value is { Value: boolean; CanBeChanged: boolean; ManagedPropertyLogicalName: string } {
		return (
			'Value' in value &&
			'ManagedPropertyLogicalName' in value
		);
	}

	/**
	 * Extracts the main entity logical name from FetchXML.
	 *
	 * @param fetchXml - The FetchXML string
	 * @returns The entity logical name or null if not found
	 */
	private extractEntityNameFromFetchXml(fetchXml: string): string | null {
		// Match <entity name="..."> pattern
		const entityMatch = /<entity\s+[^>]*name\s*=\s*["']([^"']+)["']/i.exec(fetchXml);
		return entityMatch?.[1] ?? null;
	}
}
