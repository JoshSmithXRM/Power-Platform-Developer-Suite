import { Solution } from '../../domain/entities/Solution';
import { SolutionViewModel } from '../viewModels/SolutionViewModel';

/**
 * Maps Solution domain entities to SolutionViewModel presentation DTOs.
 */
export class SolutionViewModelMapper {
  /**
   * Maps a single Solution entity to a ViewModel.
   */
  static toViewModel(solution: Solution): SolutionViewModel {
    return {
      id: solution.id,
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
      version: solution.version,
      isManaged: solution.isManaged ? 'Managed' : 'Unmanaged',
      publisherName: solution.publisherName,
      installedOn: solution.installedOn?.toLocaleString() ?? '',
      description: solution.description,
      modifiedOn: solution.modifiedOn.toLocaleString(),
      isVisible: solution.isVisible ? 'Yes' : 'No',
      isApiManaged: solution.isApiManaged ? 'Yes' : 'No',
    };
  }

  /**
   * Maps an array of Solution entities to ViewModels.
   */
  static toViewModels(solutions: Solution[]): SolutionViewModel[] {
    return solutions.map((solution) => this.toViewModel(solution));
  }
}
