import type { WebResource } from '../../domain/entities/WebResource';
import { WebResourceViewModel } from '../../application/viewModels/WebResourceViewModel';
import { WebResourceTypeFormatter } from '../utils/WebResourceTypeFormatter';
import { StorageSizeFormatter } from '../../../../shared/infrastructure/ui/utils/StorageSizeFormatter';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';
import type { CellLink } from '../../../../shared/infrastructure/ui/types/CellLink';

/**
 * Mapper: WebResource to View Models
 *
 * Maps domain entities to presentation DTOs using formatters.
 * Handles simple presentation sorting per MAPPER_PATTERNS.md Pattern 2.
 */
export class WebResourceViewModelMapper {
	/**
	 * Maps a single WebResource entity to a ViewModel.
	 * @param webResource - WebResource entity to convert
	 * @returns WebResourceViewModel presentation object
	 */
	public toViewModel(webResource: WebResource): WebResourceViewModel {
		const name = webResource.name.getValue();
		const typeCode = webResource.webResourceType.getCode();

		// Structured link data for virtual table renderer
		// data-* attributes are collected by wireDataCommands in messaging.js
		const nameLink: CellLink = {
			command: 'openWebResource',
			commandData: {
				id: webResource.id,
				name: name,
				'type-code': String(typeCode)
			},
			className: 'clickable-link'
		};

		return {
			id: webResource.id,
			name,
			nameLink,
			displayName: webResource.displayName || name,
			type: WebResourceTypeFormatter.formatDisplayName(webResource.webResourceType),
			typeCode,
			size: StorageSizeFormatter.formatSize(webResource.contentSize),
			modifiedOn: DateFormatter.formatDate(webResource.modifiedOn),
			isManaged: webResource.isManaged,
			isEditable: webResource.canEdit()
		};
	}

	/**
	 * Maps an array of WebResource entities to ViewModels.
	 * @param webResources - Array of WebResource entities
	 * @param shouldSort - Whether to sort alphabetically by name (default: true)
	 * @returns Array of view models, sorted by name if shouldSort is true
	 */
	public toViewModels(webResources: readonly WebResource[], shouldSort = true): WebResourceViewModel[] {
		const viewModels = webResources.map((wr) => this.toViewModel(wr));
		return shouldSort ? this.sortByName(viewModels) : viewModels;
	}

	/**
	 * Sorts view models alphabetically by name.
	 * Simple presentation sorting - acceptable inline per MAPPER_PATTERNS.md Pattern 2.
	 */
	private sortByName(viewModels: WebResourceViewModel[]): WebResourceViewModel[] {
		return viewModels.sort((a, b) => a.name.localeCompare(b.name));
	}
}
