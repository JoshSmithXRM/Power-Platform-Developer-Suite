import { ISolutionComponentRepository, SolutionComponentDto } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { ComponentComparison } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { mapComponentType } from '../../domain/enums/ComponentType';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

/**
 * Use case: Compare solution components between two environments.
 *
 * Orchestrates:
 * 1. Fetch components from source solution
 * 2. Fetch components from target solution
 * 3. Map DTOs to domain entities
 * 4. Create ComponentComparison entity
 * 5. Return comparison entity
 *
 * Business logic is IN ComponentComparison entity, NOT here.
 */
export class CompareSolutionComponentsUseCase {
	constructor(
		private readonly componentRepository: ISolutionComponentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes component comparison.
	 *
	 * @param sourceEnvironmentId - Source environment GUID
	 * @param targetEnvironmentId - Target environment GUID
	 * @param sourceSolutionId - Source solution GUID
	 * @param targetSolutionId - Target solution GUID (may differ from source)
	 * @param cancellationToken - Optional cancellation token
	 * @returns ComponentComparison entity with diff results
	 */
	public async execute(
		sourceEnvironmentId: string,
		targetEnvironmentId: string,
		sourceSolutionId: string,
		targetSolutionId: string,
		cancellationToken?: ICancellationToken
	): Promise<ComponentComparison> {
		this.logger.info('Comparing solution components', {
			sourceEnvironmentId,
			targetEnvironmentId,
			sourceSolutionId,
			targetSolutionId
		});

		// Fetch components from both solutions in parallel for performance
		const [sourceDtos, targetDtos] = await Promise.all([
			this.componentRepository.findAllComponentsForSolution(
				sourceEnvironmentId,
				sourceSolutionId,
				undefined,
				cancellationToken
			),
			this.componentRepository.findAllComponentsForSolution(
				targetEnvironmentId,
				targetSolutionId,
				undefined,
				cancellationToken
			)
		]);

		// Map DTOs to domain entities
		const sourceComponents = sourceDtos.map(dto => this.mapToDomainEntity(dto));
		const targetComponents = targetDtos.map(dto => this.mapToDomainEntity(dto));

		// Domain entity handles comparison logic
		const comparison = new ComponentComparison(
			sourceComponents,
			targetComponents,
			sourceSolutionId,
			targetSolutionId
		);

		this.logger.info('Component comparison completed', {
			sourceCount: comparison.getSourceComponentCount(),
			targetCount: comparison.getTargetComponentCount(),
			hasDifferences: comparison.hasDifferences()
		});

		return comparison;
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
