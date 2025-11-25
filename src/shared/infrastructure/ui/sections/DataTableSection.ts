/**
 * DataTableSection - Renders data tables in panels.
 * Stateless section that delegates HTML generation to view layer.
 */

import type { DataTableConfig } from '../DataTablePanel';
import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';
import { renderDataTableSection } from '../views/dataTableSectionView';

import type { ISection } from './ISection';

/**
 * Section for rendering data tables with search and sorting.
 * Positioned in main content area by default.
 */
export class DataTableSection implements ISection {
	public readonly position = SectionPosition.Main;

	constructor(private readonly config: DataTableConfig) {}

	/**
	 * Renders data table HTML.
	 * Delegates to view layer for HTML generation.
	 */
	public render(data: SectionRenderData): string {
		const tableData = data.tableData || [];
		const customData = data.customData || {};

		return renderDataTableSection({
			data: tableData,
			config: this.config,
			sortColumn: customData['sortColumn'] as string | undefined,
			sortDirection: customData['sortDirection'] as 'asc' | 'desc' | undefined,
			searchQuery: customData['searchQuery'] as string | undefined,
			isLoading: data.isLoading,
			errorMessage: data.errorMessage,
		});
	}
}
