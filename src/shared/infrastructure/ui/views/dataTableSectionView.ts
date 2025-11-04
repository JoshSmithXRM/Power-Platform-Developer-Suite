/**
 * View rendering for DataTableSection.
 * Generates HTML for data tables with sorting and search.
 */

import type { DataTableConfig } from '../DataTablePanel';

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
 */
export function renderDataTableSection(viewData: DataTableViewData): string {
	const { data, config, isLoading, errorMessage, searchQuery } = viewData;

	if (errorMessage) {
		return renderError(errorMessage);
	}

	if (isLoading) {
		return renderLoading();
	}

	// If no data and no search query, show empty state message
	if (data.length === 0 && !searchQuery) {
		return renderEmptyState(config.noDataMessage);
	}

	const sortColumn = viewData.sortColumn || config.defaultSortColumn;
	const sortDirection = viewData.sortDirection || config.defaultSortDirection;

	return `
		<div class="table-wrapper">
			${config.enableSearch !== false ? renderSearchBox(config.searchPlaceholder, viewData.searchQuery) : ''}
			<div class="table-content">
				${renderTable(data, config, sortColumn, sortDirection)}
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
 */
function renderTable(
	data: ReadonlyArray<Record<string, unknown>>,
	config: DataTableConfig,
	sortColumn: string,
	sortDirection: 'asc' | 'desc'
): string {
	return `
		<div class="table-container">
			<table>
				<thead>
					<tr>
						${config.columns.map(col => renderTableHeader(col, sortColumn, sortDirection)).join('')}
					</tr>
				</thead>
				<tbody>
					${data.length === 0
						? renderNoResults(config.columns.length)
						: data.map(row => renderTableRow(row, config.columns)).join('')
					}
				</tbody>
			</table>
		</div>
	`;
}

/**
 * Renders table header cell with sort indicator.
 */
function renderTableHeader(
	column: { key: string; label: string; width?: string },
	sortColumn: string,
	sortDirection: 'asc' | 'desc'
): string {
	const sortIndicator = sortColumn === column.key
		? (sortDirection === 'asc' ? ' ▲' : ' ▼')
		: '';
	const widthAttr = column.width ? ` style="width: ${column.width}"` : '';

	return `<th data-sort="${column.key}"${widthAttr}>${escapeHtml(column.label)}${sortIndicator}</th>`;
}

/**
 * Renders table data row.
 * Supports custom HTML via {columnKey}Html properties (caller must sanitize).
 */
function renderTableRow(
	row: Record<string, unknown>,
	columns: ReadonlyArray<{ key: string; label: string; width?: string }>
): string {
	const cells = columns.map(col => {
		const value = row[col.key];
		const cellClass = row[col.key + 'Class'] || '';
		const cellHtml = row[col.key + 'Html'] || escapeHtml(String(value || ''));
		return `<td class="${cellClass}">${cellHtml}</td>`;
	}).join('');

	return `<tr>${cells}</tr>`;
}

/**
 * Renders "No matching records" message in table.
 */
function renderNoResults(columnCount: number): string {
	return `
		<tr>
			<td colspan="${columnCount}" style="text-align: center; padding: 24px; color: var(--vscode-descriptionForeground);">
				No matching records found
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

/**
 * Renders empty state message.
 */
function renderEmptyState(message: string): string {
	return `<p style="padding: 16px;">${escapeHtml(message)}</p>`;
}
