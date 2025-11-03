import { Solution } from '../../domain/entities/Solution';
import { SolutionViewModel } from '../viewModels/SolutionViewModel';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';

/**
 * Maps Solution domain entities to SolutionViewModel presentation DTOs.
 */
export class SolutionViewModelMapper {
  /**
   * Maps a single Solution entity to a ViewModel.
   * @param solution - Solution entity to convert
   * @returns SolutionViewModel presentation object
   */
  static toViewModel(solution: Solution): SolutionViewModel {
    return {
      id: solution.id,
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
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
   * @param shouldSort - If true, sorts solutions using domain sorting rules before mapping
   * @returns Array of view models
   */
  static toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
    const solutionsToMap = shouldSort ? Solution.sort(solutions) : solutions;
    return solutionsToMap.map((solution) => this.toViewModel(solution));
  }
}
