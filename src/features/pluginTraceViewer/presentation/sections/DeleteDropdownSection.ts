import type { DropdownItem } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';

/**
 * Delete dropdown section for Plugin Trace Viewer.
 * Provides options to delete selected, all, or old traces (30+ days).
 */
export class DeleteDropdownSection extends DropdownSection {
	constructor() {
		super('deleteDropdown', 'trash');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: 'selected', label: 'Delete Selected' },
			{ id: 'all', label: 'Delete All Traces' },
			{ id: 'old', label: 'Delete Old Traces (30+ days)' },
		];
	}

	protected getButtonLabel(): string {
		return 'Delete';
	}

	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'danger';
	}
}
