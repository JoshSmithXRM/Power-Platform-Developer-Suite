import { Environment } from '../../domain/entities/Environment';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';

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
		return {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			dataverseUrl: environment.getDataverseUrl().getValue(),
			authenticationMethod: environment.getAuthenticationMethod().toString(),
			isActive: environment.getIsActive(),
			lastUsedTimestamp: lastUsed?.getTime(),
			lastUsedDisplay: this.formatLastUsed(lastUsed),
			statusBadge: environment.getIsActive() ? 'active' : 'inactive'
		};
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

	private formatLastUsed(lastUsed: Date | undefined): string {
		if (!lastUsed) {
			return 'Never';
		}

		const now = Date.now();
		const diffMs = now - lastUsed.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMinutes < 1) {
			return 'Just now';
		} else if (diffMinutes < 60) {
			return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		} else if (diffDays < 7) {
			return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		} else {
			return lastUsed.toLocaleDateString();
		}
	}
}
