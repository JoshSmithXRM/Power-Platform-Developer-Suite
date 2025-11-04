import type { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';

/**
 * Interface for UI sections that can be composed into panel layouts.
 *
 * Sections are stateless components that transform data into HTML.
 * They do NOT handle events or maintain state - that's the panel's responsibility.
 *
 * @example
 * ```typescript
 * export class DataTableSection implements ISection {
 *   readonly position = SectionPosition.Main;
 *
 *   constructor(private config: DataTableConfig) {}
 *
 *   render(data: SectionRenderData): string {
 *     return renderDataTable(data.tableData || [], this.config);
 *   }
 * }
 * ```
 */
export interface ISection {
	/**
	 * Where this section should be rendered in the layout.
	 * Required - determines section placement in layout templates.
	 */
	readonly position: SectionPosition;

	/**
	 * Renders section HTML from data.
	 * Must be a pure function - same data always produces same HTML.
	 *
	 * @param data - Data to render (table rows, detail data, filters, etc.)
	 * @returns HTML string to inject into layout
	 */
	render(data: SectionRenderData): string;
}
