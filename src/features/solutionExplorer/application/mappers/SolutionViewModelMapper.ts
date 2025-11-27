import { Solution } from '../../domain/entities/Solution';
import { SolutionViewModel } from '../viewModels/SolutionViewModel';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import type { SolutionCollectionService } from '../../domain/services/SolutionCollectionService';

/**
 * Maps Solution domain entities to SolutionViewModel presentation DTOs.
 */
export class SolutionViewModelMapper {
  constructor(private readonly collectionService: SolutionCollectionService) {}

  /**
   * Maps a single Solution entity to a ViewModel.
   * @param solution - Solution entity to convert
   * @returns SolutionViewModel presentation object
   */
  toViewModel(solution: Solution): SolutionViewModel {
    const escapedName = escapeHtml(solution.friendlyName);
    const escapedId = escapeHtml(solution.id);

    return {
      id: solution.id,
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
      friendlyNameHtml: `<a href="#" class="solution-link" data-command="openInMaker" data-solution-id="${escapedId}" title="${escapedName}">${escapedName}</a>`,
      version: solution.version,
      isManaged: solution.isManaged ? 'Managed' : 'Unmanaged',
      publisherName: solution.publisherName,
      installedOn: DateFormatter.formatDate(solution.installedOn),
      description: solution.description,
      modifiedOn: DateFormatter.formatDate(solution.modifiedOn),
      isVisible: solution.isVisible ? 'Yes' : 'No',
      isApiManaged: solution.isApiManaged ? 'Yes' : 'No',
    };
  }

  /**
   * Maps an array of Solution entities to ViewModels.
   * @param solutions - Array of Solution entities
   * @param shouldSort - If true, sorts solutions (Default first, then alphabetically)
   * @returns Array of view models
   */
  toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
    const solutionsToMap = shouldSort ? this.collectionService.sort(solutions) : solutions;
    return solutionsToMap.map((solution) => this.toViewModel(solution));
  }
}
