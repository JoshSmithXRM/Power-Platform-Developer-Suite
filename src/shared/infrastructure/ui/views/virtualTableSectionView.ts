/**
 * View rendering for VirtualDataTableSection.
 *
 * Renders virtual scrolling table container.
 * Key difference from dataTableSectionView: renders container, not all rows.
 * VirtualTableRenderer.js handles row rendering on client side.
 */

import type { DataTableConfig } from '../DataTablePanel';
import type {
	VirtualTablePaginationState,
	VirtualTableFilterState,
	VirtualTableVirtualizationState
} from '../../../application/viewModels/VirtualTableViewModel';
import {
	calculateColumnWidthsWithOptionalTypes,
	hasTypedColumns,
	type ColumnWithCalculatedWidth
} from '../tables';
import { isCellLink, type CellLink } from '../types/CellLink';

import { escapeHtml } from './htmlHelpers';

export interface VirtualTableViewData {
	readonly data: ReadonlyArray<Record<string, unknown>>;
	readonly config: DataTableConfig;
	readonly sortColumn?: string | undefined;
	readonly sortDirection?: 'asc' | 'desc' | undefined;
	readonly searchQuery?: string | undefined;
	readonly isLoading?: boolean | undefined;
	readonly errorMessage?: string | undefined;
	readonly pagination?: VirtualTablePaginationState | undefined;
	readonly filter?: VirtualTableFilterState | undefined;
	readonly virtualization?: VirtualTableVirtualizationState | undefined;
}

/**
 * Renders virtual scrolling data table container.
 *
 * Unlike regular DataTableSection, this:
 * - Renders only container + header
 * - Stores row data in a data attribute for JS to read
 * - Includes virtual scroll container for TanStack Virtual
 * - Calculates column widths from data when types are defined
 */
export function renderVirtualTableSection(viewData: VirtualTableViewData): string {
	const { data, config, isLoading, errorMessage, searchQuery, pagination } = viewData;

	if (errorMessage) {
		return renderError(errorMessage);
	}

	// NOTE: Do NOT early return with renderLoading() here!
	// Virtual tables need the table structure (virtualTableBody) to exist so
	// VirtualTableRenderer.js can update it when data arrives via postMessage.
	// Instead, pass isLoading to renderVirtualTable to show loading row INSIDE tbody.

	const sortColumn = viewData.sortColumn || config.defaultSortColumn;
	const sortDirection = viewData.sortDirection || config.defaultSortDirection;

	// Calculate column widths if any columns have types defined
	const calculatedColumns = hasTypedColumns(config.columns)
		? calculateColumnWidthsWithOptionalTypes(data, config.columns)
		: config.columns as ReadonlyArray<ColumnWithCalculatedWidth>;

	// Serialize row data for JS to read
	const rowDataJson = JSON.stringify(data);
	const estimatedRowHeight = viewData.virtualization?.estimatedItemHeight || 36;

	return `
		<div class="table-wrapper virtual-table-wrapper">
			${config.enableSearch !== false ? renderSearchBox(config.searchPlaceholder, searchQuery) : ''}
			<div class="table-content">
				${renderVirtualTable(data, calculatedColumns, config, sortColumn, sortDirection, searchQuery, rowDataJson, estimatedRowHeight, isLoading)}
			</div>
			${renderVirtualFooter(data.length, pagination, isLoading)}
		</div>
	`;
}

/**
 * Renders search input box.
 */
function renderSearchBox(placeholder: string, searchQuery?: string): string {
	return `
		<div class="search-container" data-selection-zone="search">
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
 * Renders virtual scrolling table structure.
 *
 * The tbody is a virtual scroll container that JS will populate.
 * Row data is stored in data-rows attribute for JS to read.
 *
 * IMPORTANT: Table structure MUST always be rendered (even when loading)
 * because VirtualTableRenderer.js needs virtualTableBody to exist to update it.
 */
function renderVirtualTable(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<ColumnWithCalculatedWidth>,
	config: DataTableConfig,
	sortColumn: string,
	sortDirection: 'asc' | 'desc',
	searchQuery: string | undefined,
	rowDataJson: string,
	estimatedRowHeight: number,
	isLoading?: boolean
): string {
	// Virtual scroll wrapper fills available space via CSS (height: 100%)
	// JS reads actual container height and calculates visible rows dynamically
	// No hardcoded max height - parent container controls available space

	// Scroll wrapper handles both horizontal and vertical scrolling
	// Table uses natural layout - no display:block hacks
	// Sticky thead stays visible during scroll
	return `
		<div class="table-container virtual-table-container" data-selection-zone="table">
			<div
				id="virtualScrollWrapper"
				class="virtual-scroll-wrapper"
			>
				<table class="virtual-table">
					<thead>
						<tr>
							${columns.map(col => renderTableHeader(col, sortColumn, sortDirection)).join('')}
						</tr>
					</thead>
					<tbody
						id="virtualTableBody"
						data-rows="${escapeHtml(rowDataJson)}"
						data-columns="${escapeHtml(JSON.stringify(columns))}"
						data-row-height="${estimatedRowHeight}"
						${isLoading ? 'data-loading="true"' : ''}
					>
						${data.length === 0
							? (isLoading
								? renderLoadingRow(columns.length)
								: renderNoDataRow(columns.length, config.noDataMessage, searchQuery))
							: renderInitialRows(data, columns, estimatedRowHeight)
						}
					</tbody>
				</table>
			</div>
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
 * Renders initial visible rows (for non-JS fallback and initial paint).
 *
 * VirtualTableRenderer.js will take over rendering after initialization.
 */
function renderInitialRows(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<ColumnWithCalculatedWidth>,
	rowHeight: number
): string {
	// Render first 50 rows for initial paint (or all if fewer)
	const initialCount = Math.min(data.length, 50);
	const rows = data.slice(0, initialCount);

	return rows.map((row, index) => renderTableRow(row, columns, index, rowHeight)).join('');
}

/**
 * Renders a link element from structured CellLink data.
 * All values are escaped to prevent XSS.
 */
function renderCellLink(text: string, linkData: CellLink): string {
	const escapedText = escapeHtml(text);
	const escapedClass = escapeHtml(linkData.className);
	const escapedCommand = escapeHtml(linkData.command);
	const escapedTitle = escapeHtml(linkData.title ?? text);

	// Build data attributes from commandData
	const dataAttrs = Object.entries(linkData.commandData)
		.map(([key, value]) => `data-${escapeHtml(key)}="${escapeHtml(value)}"`)
		.join(' ');

	return `<a href="#" class="${escapedClass}" data-command="${escapedCommand}" ${dataAttrs} title="${escapedTitle}">${escapedText}</a>`;
}

/**
 * Renders a single table row.
 *
 * Each row has a data-index for virtual scrolling positioning.
 * Cells include title attribute for tooltip on truncated content.
 * Supports {key}Link for structured link data (no raw HTML parsing).
 */
function renderTableRow(
	row: Record<string, unknown>,
	columns: ReadonlyArray<ColumnWithCalculatedWidth>,
	index: number,
	rowHeight: number
): string {
	const cells = columns.map(col => {
		const value = row[col.key];
		const cellClass = row[col.key + 'Class'] || '';
		const plainText = String(value ?? '');
		const titleAttr = plainText ? ` title="${escapeHtml(plainText)}"` : '';

		// Sort value for reliable date/numeric sorting (timestamps, ISO strings)
		const sortValue = row[col.key + 'SortValue'];
		const sortAttr = sortValue !== undefined ? ` data-sort-value="${escapeHtml(String(sortValue))}"` : '';

		// Check for structured link data (preferred - no HTML parsing)
		const cellLink = row[col.key + 'Link'];
		let cellContent: string;
		if (isCellLink(cellLink)) {
			cellContent = renderCellLink(plainText, cellLink);
		} else {
			cellContent = escapeHtml(plainText);
		}

		return `<td class="${cellClass}"${titleAttr}${sortAttr}>${cellContent}</td>`;
	}).join('');

	return `<tr data-index="${index}" style="height: ${rowHeight}px;">${cells}</tr>`;
}

/**
 * Renders loading spinner row inside table.
 *
 * Unlike renderLoading() which replaces the entire table, this renders
 * a loading indicator AS A TABLE ROW, preserving the table structure.
 * This allows VirtualTableRenderer.js to find and update virtualTableBody.
 */
function renderLoadingRow(columnCount: number): string {
	return `
		<tr>
			<td colspan="${columnCount}" style="text-align: center; padding: 24px;">
				<span class="spinner"></span>
				<span style="margin-left: 8px;">Loading...</span>
			</td>
		</tr>
	`;
}

/**
 * Renders "No data" message in table.
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
 *
 * Matches regular DataTableSection format for consistency:
 * - No filter: "1,246 records"
 * - Filter applied: "28 of 1,246 records"
 * - Loading: shows spinner indicator
 */
function renderVirtualFooter(
	visibleCount: number,
	pagination?: VirtualTablePaginationState,
	isLoading?: boolean
): string {
	if (!pagination) {
		// Fallback to simple count (matches regular DataTable)
		const recordText = visibleCount === 1 ? 'record' : 'records';
		return `<div class="table-footer">${visibleCount.toLocaleString()} ${recordText}</div>`;
	}

	const { cachedCount, totalCount, isLoading: isBackgroundLoading, isFullyCached } = pagination;

	// Loading indicator (only when background loading)
	const loadingIndicator = isBackgroundLoading
		? ' <span class="background-loading-indicator" title="Loading more records...">⟳</span>'
		: '';

	// Initial loading state
	if (isLoading) {
		return `<div class="table-footer">Loading...${loadingIndicator}</div>`;
	}

	// Use cached count as "available" records when not fully cached
	const availableCount = isFullyCached ? totalCount : cachedCount;
	const recordText = availableCount === 1 ? 'record' : 'records';

	// Filter applied (visible < available) - show "X of Y records" format
	if (visibleCount < availableCount) {
		return `<div class="table-footer">${visibleCount.toLocaleString()} of ${availableCount.toLocaleString()} ${recordText}${loadingIndicator}</div>`;
	}

	// No filter - show simple "X records" format (matches regular DataTable)
	return `<div class="table-footer">${availableCount.toLocaleString()} ${recordText}${loadingIndicator}</div>`;
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
