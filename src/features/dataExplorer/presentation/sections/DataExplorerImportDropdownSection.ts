import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { DropdownItem } from '../../../../shared/infrastructure/ui/types/DropdownTypes';

/**
 * Section: Data Explorer Import Dropdown
 *
 * Dropdown for import actions in Data Explorer toolbar.
 * - FetchXML file (.xml)
 * - SQL file (.sql)
 */
export class DataExplorerImportDropdownSection extends DropdownSection {
	constructor() {
		super('dataExplorerImportDropdown', 'cloud-download');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: 'fetchXml', label: 'FetchXML File (.xml)' },
			{ id: 'sql', label: 'SQL File (.sql)' },
		];
	}

	protected getButtonLabel(): string {
		return 'Import';
	}
}
