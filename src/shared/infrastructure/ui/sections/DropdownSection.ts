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

	/**
	 * Creates a DropdownSection instance.
	 *
	 * @param dropdownId - Unique ID for the dropdown element
	 * @param icon - Optional icon name for the dropdown button
	 */
	constructor(
		protected readonly dropdownId: string,
		protected readonly icon?: string
	) {}

	/**
	 * Subclasses must provide dropdown items.
	 *
	 * Defines the list of options displayed in the dropdown menu.
	 * Items can include separators, icons, and disabled states.
	 *
	 * @returns Array of dropdown items to display
	 */
	protected abstract getDropdownItems(): ReadonlyArray<DropdownItem>;

	/**
	 * Subclasses must provide button label (shows current selection).
	 *
	 * The label is displayed on the dropdown button and typically
	 * reflects the current selection state.
	 *
	 * @returns Label text for the dropdown button
	 */
	protected abstract getButtonLabel(): string;

	/**
	 * Optional: Get current selection ID (for checkmark indicator).
	 *
	 * When provided, the item matching this ID will show a checkmark
	 * in the dropdown menu to indicate current selection.
	 *
	 * @returns ID of currently selected item, or undefined for no selection
	 */
	protected getCurrentSelectionId(): string | undefined {
		return undefined;
	}

	/**
	 * Optional: Button variant (default, primary, danger).
	 *
	 * Controls the visual style of the dropdown button.
	 * Default variant is used unless overridden by subclass.
	 *
	 * @returns Button variant style
	 */
	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'default';
	}

	/**
	 * Renders dropdown HTML using shared view utility.
	 *
	 * Final method - subclasses customize behavior via abstract methods
	 * rather than overriding render directly. This ensures consistent
	 * rendering logic across all dropdown sections.
	 *
	 * @param _data - Section render data (unused by base implementation)
	 * @returns HTML string for the dropdown section
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
