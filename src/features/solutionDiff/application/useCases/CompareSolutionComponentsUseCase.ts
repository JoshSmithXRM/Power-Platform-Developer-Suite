import { ISolutionComponentRepository, SolutionComponentDto } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { ComponentComparison } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { mapComponentType } from '../../domain/enums/ComponentType';
import { ComponentData } from '../../domain/valueObjects/ComponentData';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import {
	ComponentDataFetcher,
	ProgressCallback,
	FetchedComponentData
} from '../../infrastructure/services/ComponentDataFetcher';

/**
 * Options for component comparison.
 */
export interface CompareComponentsOptions {
	/** Progress callback for UI updates during deep comparison */
	onProgress?: ProgressCallback;
}

/**
 * Use case: Compare solution components between two environments.
 *
 * Orchestrates:
 * 1. Fetch components from source solution
 * 2. Fetch components from target solution
 * 3. Map DTOs to domain entities
 * 4. Optionally fetch component data for deep comparison
 * 5. Create ComponentComparison entity
 * 6. Return comparison entity
 *
 * Business logic is IN ComponentComparison entity, NOT here.
 */
export class CompareSolutionComponentsUseCase {
	constructor(
		private readonly componentRepository: ISolutionComponentRepository,
		private readonly componentDataFetcher: ComponentDataFetcher | undefined,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes component comparison.
	 */
	public async execute(
		sourceEnvironmentId: string,
		targetEnvironmentId: string,
		sourceSolutionId: string,
		targetSolutionId: string,
		options?: CompareComponentsOptions,
		cancellationToken?: ICancellationToken
	): Promise<ComponentComparison> {
		this.logStart(sourceEnvironmentId, targetEnvironmentId, sourceSolutionId, targetSolutionId);

		// Fetch and map components
		const { sourceComponents, targetComponents } = await this.fetchAndMapComponents(
			sourceEnvironmentId, targetEnvironmentId, sourceSolutionId, targetSolutionId, cancellationToken
		);

		// Fetch component data for deep comparison (detects Modified)
		const { sourceComponentData, targetComponentData } = await this.fetchDeepComparisonData(
			sourceEnvironmentId, targetEnvironmentId,
			sourceComponents, targetComponents, options?.onProgress, cancellationToken
		);

		// Domain entity handles comparison logic
		const comparison = new ComponentComparison(
			sourceComponents, targetComponents, sourceSolutionId, targetSolutionId,
			sourceComponentData, targetComponentData
		);

		this.logCompletion(comparison);
		return comparison;
	}

	/**
	 * Logs the start of a comparison operation.
	 */
	private logStart(
		sourceEnvId: string, targetEnvId: string, sourceSolId: string, targetSolId: string
	): void {
		this.logger.info('Comparing solution components', {
			sourceEnvironmentId: sourceEnvId, targetEnvironmentId: targetEnvId,
			sourceSolutionId: sourceSolId, targetSolutionId: targetSolId
		});
	}

	/**
	 * Fetches components from both solutions and maps to domain entities.
	 */
	private async fetchAndMapComponents(
		sourceEnvId: string, targetEnvId: string, sourceSolId: string, targetSolId: string,
		cancellationToken?: ICancellationToken
	): Promise<{ sourceComponents: SolutionComponent[]; targetComponents: SolutionComponent[] }> {
		const [sourceDtos, targetDtos] = await Promise.all([
			this.componentRepository.findAllComponentsForSolution(sourceEnvId, sourceSolId, undefined, cancellationToken),
			this.componentRepository.findAllComponentsForSolution(targetEnvId, targetSolId, undefined, cancellationToken)
		]);
		return {
			sourceComponents: sourceDtos.map(dto => this.mapToDomainEntity(dto)),
			targetComponents: targetDtos.map(dto => this.mapToDomainEntity(dto))
		};
	}

	/**
	 * Fetches component data for deep comparison (Modified detection).
	 */
	private async fetchDeepComparisonData(
		sourceEnvId: string, targetEnvId: string,
		sourceComponents: SolutionComponent[], targetComponents: SolutionComponent[],
		onProgress?: ProgressCallback, cancellationToken?: ICancellationToken
	): Promise<{
		sourceComponentData: Map<string, ComponentData> | undefined;
		targetComponentData: Map<string, ComponentData> | undefined;
	}> {
		if (this.componentDataFetcher === undefined) {
			return { sourceComponentData: undefined, targetComponentData: undefined };
		}

		const { source, target } = await this.componentDataFetcher.fetchComponentData(
			sourceEnvId, targetEnvId, sourceComponents, targetComponents, onProgress, cancellationToken
		);

		this.logger.debug('Component data fetched for comparison', {
			sourceFetched: source.components.length, sourceErrors: source.errors.length,
			targetFetched: target.components.length, targetErrors: target.errors.length
		});

		return {
			sourceComponentData: this.buildComponentDataMap(source.components),
			targetComponentData: this.buildComponentDataMap(target.components)
		};
	}

	/**
	 * Logs completion of comparison.
	 */
	private logCompletion(comparison: ComponentComparison): void {
		this.logger.info('Component comparison completed', {
			sourceCount: comparison.getSourceComponentCount(),
			targetCount: comparison.getTargetComponentCount(),
			hasDifferences: comparison.hasDifferences(),
			modifiedCount: comparison.getModifiedCount()
		});
	}

	/**
	 * Builds a map of component data keyed by lowercase objectId.
	 */
	private buildComponentDataMap(components: readonly FetchedComponentData[]): Map<string, ComponentData> {
		const map = new Map<string, ComponentData>();
		for (const fetched of components) {
			map.set(
				fetched.objectId.toLowerCase(),
				new ComponentData(
					fetched.objectId,
					fetched.componentType,
					fetched.displayName,
					fetched.columnValues
				)
			);
		}
		return map;
	}

	/**
	 * Maps DTO to domain entity.
	 */
	private mapToDomainEntity(dto: SolutionComponentDto): SolutionComponent {
		return new SolutionComponent(
			dto.objectId,
			mapComponentType(dto.componentType),
			dto.displayName,
			dto.solutionId
		);
	}
}
