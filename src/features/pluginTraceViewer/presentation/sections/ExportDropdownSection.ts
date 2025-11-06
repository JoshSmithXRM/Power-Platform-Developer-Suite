import { DropdownSection, DropdownItem } from '../../../../shared/infrastructure/ui/sections/DropdownSection';

/**
 * Section: Export Dropdown
 *
 * Dropdown for export actions (CSV, JSON).
 */
export class ExportDropdownSection extends DropdownSection {
	constructor() {
		super('exportDropdown', 'export');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: 'csv', label: 'Export to CSV' },
			{ id: 'json', label: 'Export to JSON' }
		];
	}

	protected getButtonLabel(): string {
		return 'Export';
	}
}
