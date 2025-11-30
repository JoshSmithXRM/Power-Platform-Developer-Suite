import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import {
	IEnvironmentVariableRepository,
	EnvironmentVariableDefinitionData,
	EnvironmentVariableValueData
} from '../../domain/interfaces/IEnvironmentVariableRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import { EnvironmentVariableFactory } from '../../domain/services/EnvironmentVariableFactory';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for listing environment variables in an environment.
 * Orchestrates fetching definitions and values, joining them, and optionally filtering by solution.
 */
export class ListEnvironmentVariablesUseCase {
	constructor(
		private readonly envVarRepository: IEnvironmentVariableRepository,
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly factory: EnvironmentVariableFactory,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to list environment variables.
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Solution GUID to filter by (Default Solution returns all environment variables)
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of EnvironmentVariable entities
	 */
	async execute(
		environmentId: string,
		solutionId: string,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariable[]> {
		this.logger.info('ListEnvironmentVariablesUseCase started', { environmentId, solutionId });

		try {
			this.checkCancellation(cancellationToken, 'before execution');

			const [definitions, values] = await this.fetchDefinitionsAndValues(
				environmentId,
				cancellationToken
			);

			this.checkCancellation(cancellationToken, 'after fetching data');

			const filteredDefinitions = await this.filterBySolution(
				definitions,
				environmentId,
				solutionId,
				cancellationToken
			);

			const environmentVariables = this.factory.createFromDefinitionsAndValues(
				filteredDefinitions,
				values
			);

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

	private checkCancellation(cancellationToken: ICancellationToken | undefined, stage: string): void {
		if (cancellationToken?.isCancellationRequested) {
			this.logger.info('ListEnvironmentVariablesUseCase cancelled', { stage });
			throw new OperationCancelledException();
		}
	}

	private async fetchDefinitionsAndValues(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<[EnvironmentVariableDefinitionData[], EnvironmentVariableValueData[]]> {
		return Promise.all([
			this.envVarRepository.findAllDefinitions(environmentId, undefined, cancellationToken),
			this.envVarRepository.findAllValues(environmentId, undefined, cancellationToken)
		]);
	}

	private async filterBySolution(
		definitions: EnvironmentVariableDefinitionData[],
		environmentId: string,
		solutionId: string,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariableDefinitionData[]> {
		const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
			environmentId,
			solutionId,
			'environmentvariabledefinition',
			undefined,
			cancellationToken
		);

		this.checkCancellation(cancellationToken, 'after filtering by solution');

		const componentIdSet = new Set(componentIds);
		const filtered = definitions.filter((def) =>
			componentIdSet.has(def.environmentvariabledefinitionid)
		);

		this.logger.debug('Filtered definitions by solution', {
			totalDefinitions: definitions.length,
			filteredDefinitions: filtered.length,
			solutionId
		});

		return filtered;
	}
}
