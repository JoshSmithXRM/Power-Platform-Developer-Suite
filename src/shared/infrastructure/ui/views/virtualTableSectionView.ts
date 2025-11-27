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
 */
export function renderVirtualTableSection(viewData: VirtualTableViewData): string {
	const { data, config, isLoading, errorMessage, searchQuery, pagination } = viewData;

	if (errorMessage) {
		return renderError(errorMessage);
	}

	if (isLoading && data.length === 0) {
		return renderLoading();
	}

	const sortColumn = viewData.sortColumn || config.defaultSortColumn;
	const sortDirection = viewData.sortDirection || config.defaultSortDirection;

	// Serialize row data for JS to read
	const rowDataJson = JSON.stringify(data);
	const estimatedRowHeight = viewData.virtualization?.estimatedItemHeight || 32;

	return `
		<div class="table-wrapper virtual-table-wrapper">
			${config.enableSearch !== false ? renderSearchBox(config.searchPlaceholder, searchQuery) : ''}
			<div class="table-content">
				${renderVirtualTable(data, config, sortColumn, sortDirection, searchQuery, rowDataJson, estimatedRowHeight)}
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
 * Renders virtual scrolling table structure.
 *
 * The tbody is a virtual scroll container that JS will populate.
 * Row data is stored in data-rows attribute for JS to read.
 */
function renderVirtualTable(
	data: ReadonlyArray<Record<string, unknown>>,
	config: DataTableConfig,
	sortColumn: string,
	sortDirection: 'asc' | 'desc',
	searchQuery: string | undefined,
	rowDataJson: string,
	estimatedRowHeight: number
): string {
	// Calculate container height for virtual scrolling
	const visibleRows = Math.min(data.length, 20); // Show roughly 20 rows max initially
	const containerHeight = visibleRows * estimatedRowHeight;

	// Scroll wrapper handles both horizontal and vertical scrolling
	// Table uses natural layout - no display:block hacks
	// Sticky thead stays visible during scroll
	return `
		<div class="table-container virtual-table-container">
			<div
				id="virtualScrollWrapper"
				class="virtual-scroll-wrapper"
				style="height: ${containerHeight}px; overflow: auto;"
			>
				<table class="virtual-table">
					<thead>
						<tr>
							${config.columns.map(col => renderTableHeader(col, sortColumn, sortDirection)).join('')}
						</tr>
					</thead>
					<tbody
						id="virtualTableBody"
						data-rows="${escapeHtml(rowDataJson)}"
						data-columns="${escapeHtml(JSON.stringify(config.columns))}"
						data-row-height="${estimatedRowHeight}"
					>
						${data.length === 0
							? renderNoDataRow(config.columns.length, config.noDataMessage, searchQuery)
							: renderInitialRows(data, config.columns, estimatedRowHeight)
						}
					</tbody>
				</table>
			</div>
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
 * Renders initial visible rows (for non-JS fallback and initial paint).
 *
 * VirtualTableRenderer.js will take over rendering after initialization.
 */
function renderInitialRows(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<{ key: string; label: string; width?: string }>,
	rowHeight: number
): string {
	// Render first 50 rows for initial paint (or all if fewer)
	const initialCount = Math.min(data.length, 50);
	const rows = data.slice(0, initialCount);

	return rows.map((row, index) => renderTableRow(row, columns, index, rowHeight)).join('');
}

/**
 * Renders a single table row.
 *
 * Each row has a data-index for virtual scrolling positioning.
 */
function renderTableRow(
	row: Record<string, unknown>,
	columns: ReadonlyArray<{ key: string; label: string; width?: string }>,
	index: number,
	rowHeight: number
): string {
	const cells = columns.map(col => {
		const value = row[col.key];
		const cellClass = row[col.key + 'Class'] || '';
		const cellHtml = row[col.key + 'Html'] || escapeHtml(String(value || ''));
		return `<td class="${cellClass}">${cellHtml}</td>`;
	}).join('');

	return `<tr data-index="${index}" style="height: ${rowHeight}px;">${cells}</tr>`;
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
