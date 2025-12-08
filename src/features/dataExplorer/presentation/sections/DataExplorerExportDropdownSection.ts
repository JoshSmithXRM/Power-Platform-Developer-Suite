import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { DropdownItem } from '../../../../shared/infrastructure/ui/types/DropdownTypes';

/**
 * Section: Data Explorer Export Dropdown
 *
 * Dropdown for export actions in Data Explorer toolbar.
 * - Results: CSV, JSON (disabled when no results)
 * - Query: FetchXML, SQL, Notebook (disabled when no entity selected)
 */
export class DataExplorerExportDropdownSection extends DropdownSection {
	constructor() {
		super('dataExplorerExportDropdown', 'export');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			// Results section
			{ id: 'resultsCsv', label: 'Results as CSV' },
			{ id: 'resultsJson', label: 'Results as JSON' },
			// Separator
			{ id: 'separator1', label: '', separator: true },
			// Query section
			{ id: 'queryFetchXml', label: 'Query as FetchXML (.xml)' },
			{ id: 'querySql', label: 'Query as SQL (.sql)' },
			{ id: 'queryNotebook', label: 'Query as Notebook (.ppdsnb)' },
		];
	}

	protected getButtonLabel(): string {
		return 'Export';
	}
}
