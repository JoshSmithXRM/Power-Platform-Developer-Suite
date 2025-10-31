import { Environment } from '../../domain/entities/Environment';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';

/**
 * Maps Environment entity to list ViewModel
 */
export class EnvironmentListViewModelMapper {
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
