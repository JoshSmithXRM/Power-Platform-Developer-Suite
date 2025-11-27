/**
 * VirtualDataTableSection - Renders virtual scrolling data tables.
 *
 * Differs from DataTableSection:
 * - Renders container with placeholder for virtual rows (not all rows)
 * - Includes pagination status footer (cached/total)
 * - Works with VirtualTableRenderer.js for virtual scrolling
 */

import type { DataTableConfig } from '../DataTablePanel';
import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';
import type {
	VirtualTablePaginationState,
	VirtualTableFilterState,
	VirtualTableVirtualizationState
} from '../../../application/viewModels/VirtualTableViewModel';
import { renderVirtualTableSection } from '../views/virtualTableSectionView';

import type { ISection } from './ISection';

/**
 * Extended render data for virtual table sections.
 */
export interface VirtualTableRenderData extends SectionRenderData {
	readonly pagination?: VirtualTablePaginationState;
	readonly filter?: VirtualTableFilterState;
	readonly virtualization?: VirtualTableVirtualizationState;
}

/**
 * Section for rendering virtual scrolling data tables.
 *
 * Key differences from DataTableSection:
 * - Renders container + header only; rows handled by JS
 * - Pagination status in footer (e.g., "100 of 5000 cached")
 * - Works with VirtualTableRenderer.js on client side
 */
export class VirtualDataTableSection implements ISection {
	public readonly position = SectionPosition.Main;

	constructor(private readonly config: DataTableConfig) {}

	/**
	 * Renders virtual table HTML container.
	 *
	 * Does NOT render all rows - just container structure.
	 * VirtualTableRenderer.js handles row rendering.
	 */
	public render(data: SectionRenderData): string {
		const virtualData = data as VirtualTableRenderData;
		const tableData = data.tableData || [];
		const customData = data.customData || {};

		return renderVirtualTableSection({
			data: tableData,
			config: this.config,
			sortColumn: customData['sortColumn'] as string | undefined,
			sortDirection: customData['sortDirection'] as 'asc' | 'desc' | undefined,
			searchQuery: customData['searchQuery'] as string | undefined,
			isLoading: data.isLoading,
			errorMessage: data.errorMessage,
			pagination: virtualData.pagination,
			filter: virtualData.filter,
			virtualization: virtualData.virtualization
		});
	}
}
