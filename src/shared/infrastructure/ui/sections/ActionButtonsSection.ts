/**
 * ActionButtonsSection - Renders action buttons for panels.
 * Displays buttons for user actions (refresh, delete, export, etc.).
 */

import type { ActionButtonsConfig, ButtonConfig } from '../types/ButtonConfig';
import type { SectionRenderData } from '../types/SectionRenderData';
import { SectionPosition } from '../types/SectionPosition';
import { renderActionButtons } from '../views/actionButtonsView';

import type { ISection } from './ISection';

/**
 * Section that renders action buttons.
 * Typically used in toolbar or footer positions.
 * Respects isLoading flag to disable buttons during data loading.
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
	 * When isLoading is true, all buttons are rendered as disabled.
	 * @param data - Section render data (isLoading disables all buttons)
	 * @returns HTML string with action buttons
	 */
	public render(data: SectionRenderData): string {
		// When loading, disable all buttons in the initial render
		const buttons: ReadonlyArray<ButtonConfig> = data.isLoading
			? this.config.buttons.map(btn => ({ ...btn, disabled: true }))
			: this.config.buttons;
		return renderActionButtons(buttons, this.config.position);
	}
}
