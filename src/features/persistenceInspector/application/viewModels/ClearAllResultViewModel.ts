/**
 * ViewModel for clear all operation result
 */
export interface ClearAllResultViewModel {
	readonly totalCleared: number;
	readonly clearedGlobalKeys: number;
	readonly clearedSecretKeys: number;
	readonly hasErrors: boolean;
	readonly errors: Array<{
		key: string;
		error: string;
	}>;
}
