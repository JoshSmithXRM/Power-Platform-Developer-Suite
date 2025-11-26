import type { WebResource } from '../../domain/entities/WebResource';
import { WebResourceViewModel } from '../../application/viewModels/WebResourceViewModel';
import { WebResourceTypeFormatter } from '../utils/WebResourceTypeFormatter';
import { StorageSizeFormatter } from '../../../../shared/infrastructure/ui/utils/StorageSizeFormatter';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';
import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';

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
		const escapedName = escapeHtml(name);
		const typeCode = webResource.webResourceType.getCode();

		// Create clickable link that triggers openWebResource command
		// data-* attributes are collected by wireDataCommands in messaging.js
		const nameHtml = `<a href="#" class="clickable-link" data-command="openWebResource" data-id="${escapeHtml(webResource.id)}" data-name="${escapedName}" data-type-code="${typeCode}">${escapedName}</a>`;

		return {
			id: webResource.id,
			name,
			nameHtml,
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
