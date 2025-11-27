/**
 * View rendering for DataTableSection.
 * Generates HTML for data tables with sorting and search.
 */

import type { DataTableConfig } from '../DataTablePanel';
import {
	calculateColumnWidthsWithOptionalTypes,
	hasTypedColumns,
	type ColumnWithCalculatedWidth
} from '../tables';

import { escapeHtml } from './htmlHelpers';

export interface DataTableViewData {
	readonly data: ReadonlyArray<Record<string, unknown>>;
	readonly config: DataTableConfig;
	readonly sortColumn?: string | undefined;
	readonly sortDirection?: 'asc' | 'desc' | undefined;
	readonly searchQuery?: string | undefined;
	readonly isLoading?: boolean | undefined;
	readonly errorMessage?: string | undefined;
}

/**
 * Renders complete data table with search, headers, and rows.
 * Calculates column widths from data when types are defined.
 */
export function renderDataTableSection(viewData: DataTableViewData): string {
	const { data, config, isLoading, errorMessage, searchQuery } = viewData;

	if (errorMessage) {
		return renderError(errorMessage);
	}

	if (isLoading) {
		return renderLoading();
	}

	const sortColumn = viewData.sortColumn || config.defaultSortColumn;
	const sortDirection = viewData.sortDirection || config.defaultSortDirection;

	// Calculate column widths if any columns have types defined
	const calculatedColumns = hasTypedColumns(config.columns)
		? calculateColumnWidthsWithOptionalTypes(data, config.columns)
		: config.columns as ReadonlyArray<ColumnWithCalculatedWidth>;

	return `
		<div class="table-wrapper">
			${config.enableSearch !== false ? renderSearchBox(config.searchPlaceholder, viewData.searchQuery) : ''}
			<div class="table-content">
				${renderTable(data, calculatedColumns, config, sortColumn, sortDirection, searchQuery)}
			</div>
			${renderFooter(data.length)}
		</div>
	`;
}

/**
 * Renders search input box.
 */
function renderSearchBox(placeholder: string, searchQuery?: string): string {
	return `
		<div class="search-container">
			<input
				type="text"
				id="searchInput"
				placeholder="${escapeHtml(placeholder)}"
				value="${escapeHtml(searchQuery || '')}"
			>
		</div>
	`;
}

/**
 * Renders table with headers and data rows.
 * Uses data-table class for CSS consistency pattern styling.
 */
function renderTable(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<ColumnWithCalculatedWidth>,
	config: DataTableConfig,
	sortColumn: string,
	sortDirection: 'asc' | 'desc',
	searchQuery?: string
): string {
	return `
		<div class="table-container">
			<table class="data-table">
				<thead>
					<tr>
						${columns.map(col => renderTableHeader(col, sortColumn, sortDirection)).join('')}
					</tr>
				</thead>
				<tbody>
					${data.length === 0
						? renderNoDataRow(columns.length, config.noDataMessage, searchQuery)
						: data.map(row => renderTableRow(row, columns)).join('')
					}
				</tbody>
			</table>
		</div>
	`;
}

/**
 * Renders table header cell with sort indicator.
 * Uses calculated width if available, otherwise falls back to manual width.
 * Includes data-type for proper sorting (e.g., datetime columns).
 */
function renderTableHeader(
	column: ColumnWithCalculatedWidth,
	sortColumn: string,
	sortDirection: 'asc' | 'desc'
): string {
	const sortIndicator = sortColumn === column.key
		? (sortDirection === 'asc' ? ' ▲' : ' ▼')
		: '';
	// Prefer calculated width, fall back to manual width
	const width = column.calculatedWidth ?? column.width;
	const widthAttr = width ? ` style="width: ${width}"` : '';
	// Include type for proper sorting (datetime, numeric)
	const typeAttr = column.type ? ` data-type="${column.type}"` : '';

	return `<th data-sort="${column.key}"${typeAttr}${widthAttr}>${escapeHtml(column.label)}${sortIndicator}</th>`;
}

/**
 * Renders table data row.
 * Supports custom HTML via {columnKey}Html properties (caller must sanitize).
 * Includes title attribute for tooltip on truncated content.
 */
function renderTableRow(
	row: Record<string, unknown>,
	columns: ReadonlyArray<ColumnWithCalculatedWidth>
): string {
	const cells = columns.map(col => {
		const value = row[col.key];
		const cellClass = row[col.key + 'Class'] || '';
		const cellHtml = row[col.key + 'Html'] || escapeHtml(String(value ?? ''));
		// Plain text value for tooltip (strip HTML)
		const plainText = String(value ?? '');
		const titleAttr = plainText ? ` title="${escapeHtml(plainText)}"` : '';
		return `<td class="${cellClass}"${titleAttr}>${cellHtml}</td>`;
	}).join('');

	return `<tr>${cells}</tr>`;
}

/**
 * Renders "No data" message in table.
 * Shows different message for search results vs empty data.
 */
function renderNoDataRow(columnCount: number, noDataMessage: string, searchQuery?: string): string {
	const message = searchQuery ? 'No matching records found' : noDataMessage;
	return `
		<tr>
			<td colspan="${columnCount}" style="text-align: center; padding: 24px; color: var(--vscode-descriptionForeground);">
				${escapeHtml(message)}
			</td>
		</tr>
	`;
}

/**
 * Renders table footer with record count.
 */
function renderFooter(count: number): string {
	const recordText = count === 1 ? 'record' : 'records';
	return `<div class="table-footer">${count} ${recordText}</div>`;
}

/**
 * Renders loading spinner.
 */
function renderLoading(): string {
	return `
		<div class="loading-container">
			<span class="spinner"></span>
			<span>Loading...</span>
		</div>
	`;
}

/**
 * Renders error message.
 */
function renderError(message: string): string {
	return `
		<div class="error">
			${escapeHtml(message)}
		</div>
	`;
}
