import type { SectionRenderData } from '../types/SectionRenderData';
import { SectionPosition } from '../types/SectionPosition';
import type { DropdownRenderConfig } from '../views/dropdownView';
import { renderDropdown } from '../views/dropdownView';

import type { ISection } from './ISection';

/**
 * Dropdown item configuration.
 */
export interface DropdownItem {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly disabled?: boolean;
	readonly separator?: boolean;
}

/**
 * Shared infrastructure: Dropdown Section Base
 *
 * Abstract base class for all dropdown sections.
 * Implements ISection with reusable dropdown rendering.
 *
 * Subclasses provide:
 * - Dropdown items (options)
 * - Current selection state
 * - Button label (dynamic based on selection)
 * - Optional: icon, disabled state
 */
export abstract class DropdownSection implements ISection {
	public readonly position = SectionPosition.Toolbar;

	constructor(
		protected readonly dropdownId: string,
		protected readonly icon?: string
	) {}

	/**
	 * Subclasses must provide dropdown items.
	 */
	protected abstract getDropdownItems(): ReadonlyArray<DropdownItem>;

	/**
	 * Subclasses must provide button label (shows current selection).
	 */
	protected abstract getButtonLabel(): string;

	/**
	 * Optional: Get current selection ID (for checkmark indicator).
	 * Default: no selection highlighted
	 */
	protected getCurrentSelectionId(): string | undefined {
		return undefined;
	}

	/**
	 * Optional: Button variant (default, primary, danger).
	 * Default: 'default'
	 */
	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'default';
	}

	/**
	 * Renders dropdown HTML using shared view utility.
	 * Final - subclasses customize via abstract methods, not by overriding render.
	 */
	public render(_data: SectionRenderData): string {
		const icon = this.icon;
		const currentSelectionId = this.getCurrentSelectionId();

		const config: DropdownRenderConfig = {
			id: this.dropdownId,
			label: this.getButtonLabel(),
			items: this.getDropdownItems(),
			variant: this.getButtonVariant(),
			...(icon !== undefined && { icon }),
			...(currentSelectionId !== undefined && { currentSelectionId })
		};

		return renderDropdown(config);
	}
}
