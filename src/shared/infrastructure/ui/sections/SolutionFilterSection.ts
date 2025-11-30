/**
 * SolutionFilterSection - Renders solution dropdown filter.
 */

import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';
import { renderSolutionFilter } from '../views/solutionFilterView';

import type { ISection } from './ISection';

export interface SolutionFilterConfig {
	readonly label?: string;
}

/**
 * Section for rendering solution filter dropdown.
 * Positioned in toolbar by default, typically after environment selector.
 *
 * The Default Solution in Dataverse acts as "show all" since it contains
 * all unmanaged customizations. No synthetic "All" option is needed.
 */
export class SolutionFilterSection implements ISection {
	public readonly position = SectionPosition.Toolbar;

	constructor(private readonly config: SolutionFilterConfig = {}) {}

	/**
	 * Renders solution filter HTML.
	 */
	public render(data: SectionRenderData): string {
		const solutions = data.solutions || [];
		const currentSolutionId = data.currentSolutionId;
		const label = this.config.label || 'Solution:';

		return renderSolutionFilter(solutions, currentSolutionId, label);
	}
}
