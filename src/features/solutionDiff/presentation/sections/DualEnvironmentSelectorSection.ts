/**
 * Section for selecting source and target environments.
 *
 * Renders two dropdowns side-by-side for dual-environment comparison.
 */

import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { renderDualEnvironmentSelector } from '../views/dualEnvironmentSelectorView';

/**
 * Custom data for dual environment selector.
 */
interface DualEnvironmentCustomData {
  readonly sourceEnvironmentId?: string;
  readonly targetEnvironmentId?: string;
}

/**
 * Section for rendering dual environment selector (source + target).
 * Positioned in header by default.
 */
export class DualEnvironmentSelectorSection implements ISection {
  public readonly position = SectionPosition.Header;

  /**
   * Renders dual environment selector HTML.
   */
  public render(data: SectionRenderData): string {
    const custom = (data.customData ?? {}) as DualEnvironmentCustomData;
    const environments = data.environments ?? [];
    const sourceEnvironmentId = custom.sourceEnvironmentId;
    const targetEnvironmentId = custom.targetEnvironmentId;

    return renderDualEnvironmentSelector(environments, sourceEnvironmentId, targetEnvironmentId);
  }
}
