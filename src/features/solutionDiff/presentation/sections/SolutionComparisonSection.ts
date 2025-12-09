/**
 * Section for displaying solution comparison results.
 *
 * Renders solution selector and comparison results.
 */

import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SolutionComparisonViewModel, SolutionOptionViewModel } from '../../application/viewModels/SolutionComparisonViewModel';
import {
  renderSolutionSelector,
  renderComparisonPlaceholder,
  renderComparisonLoading,
  renderSolutionComparison
} from '../views/solutionComparisonView';

/**
 * Custom data for solution comparison section.
 */
interface SolutionComparisonCustomData {
  readonly solutions?: readonly SolutionOptionViewModel[];
  readonly selectedSolutionUniqueName?: string;
  readonly comparisonViewModel?: SolutionComparisonViewModel;
  readonly isComparing?: boolean;
  readonly isSolutionsLoading?: boolean;
}

/**
 * Section for rendering solution comparison UI.
 * Positioned in main content area.
 */
export class SolutionComparisonSection implements ISection {
  public readonly position = SectionPosition.Main;

  /**
   * Renders solution comparison section HTML.
   */
  public render(data: SectionRenderData): string {
    const custom = (data.customData ?? {}) as SolutionComparisonCustomData;
    const solutions = custom.solutions ?? [];
    const selectedUniqueName = custom.selectedSolutionUniqueName;
    const comparison = custom.comparisonViewModel;
    const isComparing = custom.isComparing ?? false;
    const isSolutionsLoading = custom.isSolutionsLoading ?? false;

    const selectorHtml = renderSolutionSelector(solutions, selectedUniqueName, isSolutionsLoading);

    let comparisonHtml: string;
    if (isComparing) {
      comparisonHtml = renderComparisonLoading();
    } else if (comparison !== undefined) {
      comparisonHtml = renderSolutionComparison(comparison);
    } else {
      comparisonHtml = renderComparisonPlaceholder();
    }

    return `
      <div class="solution-comparison-section">
        ${selectorHtml}
        ${comparisonHtml}
      </div>
    `;
  }
}
