import { ClearAllResult } from '../../domain/results/ClearAllResult';
import { ClearAllResultViewModel } from '../viewModels/ClearAllResultViewModel';

/**
 * Maps clear all result to view model
 */
export class ClearAllResultMapper {
	public toViewModel(result: ClearAllResult): ClearAllResultViewModel {
		return {
			totalCleared: result.totalCleared,
			clearedGlobalKeys: result.clearedGlobalKeys,
			clearedSecretKeys: result.clearedSecretKeys,
			hasErrors: result.hasErrors(),
			errors: result.errors
		};
	}
}
