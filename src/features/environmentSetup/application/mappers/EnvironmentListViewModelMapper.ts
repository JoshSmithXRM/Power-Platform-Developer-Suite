import { Environment } from '../../domain/entities/Environment';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';
import { RelativeTimeFormatter } from '../../../../shared/infrastructure/ui/utils/RelativeTimeFormatter';

/**
 * Maps Environment entity to list ViewModel
 */
export class EnvironmentListViewModelMapper {
	/**
	 * Transforms domain entities to sorted view models.
	 * Sorting is a presentation concern handled by the mapper.
	 *
	 * @param environments - Domain entities to transform
	 * @returns View models sorted by last used (most recent first), then by name
	 */
	public toSortedViewModels(environments: Environment[]): EnvironmentListViewModel[] {
		const viewModels = environments.map(env => this.toViewModel(env));
		return this.sortByLastUsedThenName(viewModels);
	}

	public toViewModel(environment: Environment): EnvironmentListViewModel {
		const lastUsed = environment.getLastUsed();
		const result: EnvironmentListViewModel = {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			dataverseUrl: environment.getDataverseUrl().getValue(),
			authenticationMethod: environment.getAuthenticationMethod().toString(),
			isActive: environment.getIsActive(),
			lastUsedDisplay: RelativeTimeFormatter.formatRelativeTime(lastUsed),
			statusBadge: environment.getIsActive() ? 'active' : 'inactive',
			...(lastUsed !== undefined && { lastUsedTimestamp: lastUsed.getTime() })
		};

		return result;
	}

	/**
	 * Sorts view models by last used (most recent first), then alphabetically by name.
	 * This is a presentation concern - different views may want different sort orders.
	 *
	 * Uses immutable timestamps instead of mutable Date objects for reliable comparison.
	 *
	 * @param viewModels - View models to sort
	 * @returns Sorted view models (mutates and returns same array)
	 */
	private sortByLastUsedThenName(viewModels: EnvironmentListViewModel[]): EnvironmentListViewModel[] {
		return viewModels.sort((a, b) => {
			// Both have last used - most recent first (higher timestamp = more recent)
			if (a.lastUsedTimestamp && b.lastUsedTimestamp) {
				return b.lastUsedTimestamp - a.lastUsedTimestamp;
			}
			// Only 'a' has last used - 'a' comes first
			if (a.lastUsedTimestamp) {
				return -1;
			}
			// Only 'b' has last used - 'b' comes first
			if (b.lastUsedTimestamp) {
				return 1;
			}
			// Neither has last used - sort alphabetically by name
			return a.name.localeCompare(b.name);
		});
	}
}
