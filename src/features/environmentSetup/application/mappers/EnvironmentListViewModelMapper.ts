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
		return {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			dataverseUrl: environment.getDataverseUrl().getValue(),
			authenticationMethod: environment.getAuthenticationMethod().toString(),
			isActive: environment.getIsActive(),
			lastUsed: environment.getLastUsed(),
			lastUsedDisplay: this.formatLastUsed(environment.getLastUsed()),
			statusBadge: environment.getIsActive() ? 'active' : 'inactive'
		};
	}

	/**
	 * Sorts view models by last used (most recent first), then alphabetically by name.
	 * This is a presentation concern - different views may want different sort orders.
	 *
	 * @param viewModels - View models to sort
	 * @returns Sorted view models (mutates and returns same array)
	 */
	private sortByLastUsedThenName(viewModels: EnvironmentListViewModel[]): EnvironmentListViewModel[] {
		return viewModels.sort((a, b) => {
			// Both have last used - most recent first
			if (a.lastUsed && b.lastUsed) {
				return b.lastUsed.getTime() - a.lastUsed.getTime();
			}
			// Only 'a' has last used - 'a' comes first
			if (a.lastUsed) {
				return -1;
			}
			// Only 'b' has last used - 'b' comes first
			if (b.lastUsed) {
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
