import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { DropdownItem } from '../../../../shared/infrastructure/ui/types/DropdownTypes';
import { TreeViewMode } from '../../application/enums/TreeViewMode';

/**
 * Section: View Mode Selector
 *
 * Dropdown for switching between tree view modes:
 * - Assembly View: Packages -> Assemblies -> PluginTypes -> Steps (default)
 * - Message View: SDK Messages -> Entities -> Steps (PRT-style)
 *
 * View mode is a presentation concern - switching views uses cached data
 * and does not require API calls.
 */
export class ViewModeSection extends DropdownSection {
	private currentMode: TreeViewMode;

	constructor(initialMode: TreeViewMode = TreeViewMode.Assembly) {
		super('viewModeDropdown', 'list-tree');
		this.currentMode = initialMode;
	}

	/**
	 * Updates the current view mode.
	 * Called by panel when view mode changes.
	 */
	public setCurrentMode(mode: TreeViewMode): void {
		this.currentMode = mode;
	}

	/**
	 * Gets the current view mode.
	 */
	public getCurrentMode(): TreeViewMode {
		return this.currentMode;
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{
				id: TreeViewMode.Assembly,
				label: 'Assembly View',
				icon: 'package',
			},
			{
				id: TreeViewMode.Message,
				label: 'Message View',
				icon: 'symbol-event',
			},
			{
				id: TreeViewMode.Entity,
				label: 'Entity View',
				icon: 'database',
			},
		];
	}

	protected getButtonLabel(): string {
		switch (this.currentMode) {
			case TreeViewMode.Assembly:
				return 'Assembly View';
			case TreeViewMode.Message:
				return 'Message View';
			case TreeViewMode.Entity:
				return 'Entity View';
		}
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentMode;
	}

	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'default';
	}
}
