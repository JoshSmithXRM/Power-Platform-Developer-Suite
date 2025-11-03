import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IEnvironmentVariableRepository } from '../../domain/interfaces/IEnvironmentVariableRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for listing environment variables in an environment.
 * Orchestrates fetching definitions and values, joining them, and optionally filtering by solution.
 */
export class ListEnvironmentVariablesUseCase {
	constructor(
		private readonly envVarRepository: IEnvironmentVariableRepository,
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to list environment variables.
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Optional solution GUID to filter by
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of EnvironmentVariable entities
	 */
	async execute(
		environmentId: string,
		solutionId?: string,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariable[]> {
		this.logger.info('ListEnvironmentVariablesUseCase started', { environmentId, solutionId });

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListEnvironmentVariablesUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			// Fetch definitions and values in parallel for better performance
			const [definitions, values] = await Promise.all([
				this.envVarRepository.findAllDefinitions(environmentId, undefined, cancellationToken),
				this.envVarRepository.findAllValues(environmentId, undefined, cancellationToken)
			]);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListEnvironmentVariablesUseCase cancelled after fetching data');
				throw new OperationCancelledException();
			}

			// Filter by solution if solutionId is provided
			let filteredDefinitions = definitions;
			if (solutionId) {
				const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
					environmentId,
					solutionId,
					'environmentvariabledefinition',
					undefined,
					cancellationToken
				);

				if (cancellationToken?.isCancellationRequested) {
					this.logger.info('ListEnvironmentVariablesUseCase cancelled after filtering by solution');
					throw new OperationCancelledException();
				}

				const componentIdSet = new Set(componentIds);
				filteredDefinitions = definitions.filter((def) =>
					componentIdSet.has(def.environmentvariabledefinitionid)
				);

				this.logger.debug('Filtered definitions by solution', {
					totalDefinitions: definitions.length,
					filteredDefinitions: filteredDefinitions.length,
					solutionId
				});
			}

			// Create a map of values by definition ID for efficient lookup
			const valuesByDefinitionId = new Map(
				values.map((val) => [val._environmentvariabledefinitionid_value, val])
			);

			// Join definitions with values and create entities
			const environmentVariables = filteredDefinitions.map((def) => {
				const value = valuesByDefinitionId.get(def.environmentvariabledefinitionid);

				return new EnvironmentVariable(
					def.environmentvariabledefinitionid,
					def.schemaname,
					def.displayname,
					def.type,
					def.defaultvalue,
					value?.value ?? null,
					def.ismanaged,
					def.description ?? '',
					new Date(def.modifiedon),
					value?.environmentvariablevalueid ?? null
				);
			});

			this.logger.info('ListEnvironmentVariablesUseCase completed', {
				count: environmentVariables.length
			});

			return environmentVariables;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('ListEnvironmentVariablesUseCase failed', normalizedError);
			throw normalizedError;
		}
	}
}
