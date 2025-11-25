/**
 * EnvironmentSelectorSection - Renders environment dropdown selector.
 */

import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';
import { renderEnvironmentSelector } from '../views/environmentSelectorView';
import type { EnvironmentSelectorConfig } from '../types/EnvironmentSelectorTypes';

import type { ISection } from './ISection';

/**
 * Section for rendering environment selector dropdown.
 * Positioned in toolbar by default.
 */
export class EnvironmentSelectorSection implements ISection {
	public readonly position = SectionPosition.Toolbar;

	constructor(private readonly config: EnvironmentSelectorConfig = {}) {}

	/**
	 * Renders environment selector HTML.
	 */
	public render(data: SectionRenderData): string {
		const environments = data.environments || [];
		const currentEnvironmentId = data.currentEnvironmentId;
		const label = this.config.label || 'Environment:';

		return renderEnvironmentSelector(environments, currentEnvironmentId, label);
	}
}
