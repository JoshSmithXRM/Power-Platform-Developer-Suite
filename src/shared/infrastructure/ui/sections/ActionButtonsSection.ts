/**
 * ActionButtonsSection - Renders action buttons for panels.
 * Displays buttons for user actions (refresh, delete, export, etc.).
 */

import type { ActionButtonsConfig } from '../types/ButtonConfig';
import type { SectionRenderData } from '../types/SectionRenderData';
import { SectionPosition } from '../types/SectionPosition';
import { renderActionButtons } from '../views/actionButtonsView';

import type { ISection } from './ISection';

/**
 * Section that renders action buttons.
 * Typically used in toolbar or footer positions.
 */
export class ActionButtonsSection implements ISection {
	public readonly position: SectionPosition;

	constructor(
		private readonly config: ActionButtonsConfig,
		position: SectionPosition = SectionPosition.Toolbar
	) {
		this.position = position;
	}

	/**
	 * Renders action buttons HTML.
	 * @param data - Section render data (unused for static buttons)
	 * @returns HTML string with action buttons
	 */
	public render(_data: SectionRenderData): string {
		return renderActionButtons(this.config.buttons, this.config.position);
	}
}
