/**
 * ViewModel for displaying environment in list
 */
export interface EnvironmentListViewModel {
	id: string;
	name: string;
	dataverseUrl: string;
	authenticationMethod: string;
	isActive: boolean;
	lastUsed?: Date;
	lastUsedDisplay: string;
	statusBadge: 'active' | 'inactive';
}
