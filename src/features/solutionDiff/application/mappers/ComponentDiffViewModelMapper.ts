import { ComponentComparison } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { getComponentTypeDisplayName } from '../../domain/enums/ComponentType';
import {
	ComponentDiffViewModel,
	ComponentTypeGroupViewModel,
	ComponentViewModel
} from '../viewModels/ComponentDiffViewModel';

/**
 * Mapper: Transform domain ComponentComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class ComponentDiffViewModelMapper {
	/**
	 * Transforms ComponentComparison entity to ViewModel.
	 */
	public static toViewModel(comparison: ComponentComparison): ComponentDiffViewModel {
		const diff = comparison.getDiff();
		const groupedByType = comparison.getComponentsByType();

		const componentsByType: ComponentTypeGroupViewModel[] = [];

		// Transform each component type group
		for (const [type, components] of groupedByType.entries()) {
			componentsByType.push({
				type,
				typeName: getComponentTypeDisplayName(type),
				added: components.added.map(c => this.toComponentViewModel(c)),
				removed: components.removed.map(c => this.toComponentViewModel(c)),
				same: components.same.map(c => this.toComponentViewModel(c)),
				totalCount: components.added.length + components.removed.length + components.same.length,
				hasDifferences: components.added.length > 0 || components.removed.length > 0
			});
		}

		// Sort groups by display name for consistent ordering
		componentsByType.sort((a, b) => a.typeName.localeCompare(b.typeName));

		return {
			summary: diff.getSummary(),
			totalCount: diff.getTotalCount(),
			componentsByType,
			sourceComponentCount: comparison.getSourceComponentCount(),
			targetComponentCount: comparison.getTargetComponentCount()
		};
	}

	/**
	 * Transforms SolutionComponent entity to ComponentViewModel.
	 */
	private static toComponentViewModel(component: SolutionComponent): ComponentViewModel {
		return {
			objectId: component.getObjectId(),
			name: component.getName(),
			componentType: component.getComponentType()
		};
	}
}
