import { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import { EnvironmentVariableViewModel } from '../viewModels/EnvironmentVariableViewModel';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';
import { EnvironmentVariableCollectionService } from '../../domain/services/EnvironmentVariableCollectionService';

/**
 * Maps EnvironmentVariable domain entities to EnvironmentVariableViewModel presentation DTOs.
 */
export class EnvironmentVariableViewModelMapper {
	private static readonly collectionService = new EnvironmentVariableCollectionService();

	/**
	 * Maps a single EnvironmentVariable entity to a ViewModel.
	 * @param envVar - EnvironmentVariable entity to convert
	 * @returns EnvironmentVariableViewModel presentation object
	 */
	static toViewModel(envVar: EnvironmentVariable): EnvironmentVariableViewModel {
		return {
			definitionId: envVar.definitionId,
			schemaName: envVar.schemaName,
			displayName: envVar.displayName,
			type: envVar.getTypeName(),
			currentValue: envVar.currentValue ?? '',
			defaultValue: envVar.defaultValue ?? '',
			isManaged: envVar.isManaged ? 'Managed' : 'Unmanaged',
			description: envVar.description,
			modifiedOn: DateFormatter.formatDate(envVar.modifiedOn)
		};
	}

	/**
	 * Maps an array of EnvironmentVariable entities to ViewModels.
	 * @param envVars - Array of EnvironmentVariable entities
	 * @param shouldSort - If true, sorts variables using domain sorting rules before mapping
	 * @returns Array of view models
	 */
	static toViewModels(envVars: EnvironmentVariable[], shouldSort = false): EnvironmentVariableViewModel[] {
		const varsToMap = shouldSort ? this.collectionService.sort(envVars) : envVars;
		return varsToMap.map((envVar) => this.toViewModel(envVar));
	}
}
