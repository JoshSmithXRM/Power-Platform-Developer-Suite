/**
 * ViewModel for displaying environment in list
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state
 */
export interface EnvironmentListViewModel {
	readonly id: string;
	readonly name: string;
	readonly dataverseUrl: string;
	readonly authenticationMethod: string;
	readonly isActive: boolean;
	readonly lastUsedTimestamp?: number;
	readonly lastUsedDisplay: string;
	readonly statusBadge: 'active' | 'inactive';
}
