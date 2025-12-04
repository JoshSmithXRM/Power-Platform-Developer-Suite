import type { WebResource } from '../../domain/entities/WebResource';
import { WebResourceViewModel } from '../../application/viewModels/WebResourceViewModel';
import { WebResourceTypeFormatter } from '../utils/WebResourceTypeFormatter';
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
		const fileExtension = webResource.webResourceType.getFileExtension();
		const canEdit = webResource.canEdit();

		// Base view model without optional nameLink
		const baseViewModel = {
			id: webResource.id,
			name,
			displayName: webResource.displayName || name,
			type: WebResourceTypeFormatter.formatDisplayName(webResource.webResourceType),
			typeCode,
			fileExtension,
			createdOn: DateFormatter.formatDate(webResource.createdOn),
			createdOnSortValue: webResource.createdOn.getTime(),
			modifiedOn: DateFormatter.formatDate(webResource.modifiedOn),
			modifiedOnSortValue: webResource.modifiedOn.getTime(),
			createdBy: webResource.createdBy,
			modifiedBy: webResource.modifiedBy,
			managed: webResource.isManaged ? 'Yes' : 'No',
			isManaged: webResource.isManaged,
			isEditable: canEdit
		};

		// Only add nameLink for editable resources (text-based, not managed)
		// Non-editable resources (images, managed) display as plain text since clicking would fail
		if (canEdit) {
			const nameLink: CellLink = {
				command: 'openWebResource',
				commandData: {
					id: webResource.id,
					name: name,
					'file-extension': fileExtension
				},
				className: 'clickable-link'
			};
			return { ...baseViewModel, nameLink };
		}

		return baseViewModel;
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
