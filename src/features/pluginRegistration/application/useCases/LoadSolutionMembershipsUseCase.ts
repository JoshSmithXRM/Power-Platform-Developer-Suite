import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';

/**
 * Plugin registration component type codes in Dataverse.
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent
 */
export const PLUGIN_COMPONENT_TYPES = {
	PACKAGE: 36,
	ASSEMBLY: 91,
	TYPE: 92,
	STEP: 93,
	IMAGE: 94,
	SERVICE_ENDPOINT: 95
} as const;

/**
 * All plugin-related component types for bulk query.
 */
const ALL_PLUGIN_COMPONENT_TYPES = [
	PLUGIN_COMPONENT_TYPES.PACKAGE,
	PLUGIN_COMPONENT_TYPES.ASSEMBLY,
	PLUGIN_COMPONENT_TYPES.TYPE,
	PLUGIN_COMPONENT_TYPES.STEP,
	PLUGIN_COMPONENT_TYPES.IMAGE,
	PLUGIN_COMPONENT_TYPES.SERVICE_ENDPOINT
];

/**
 * Result type for solution memberships.
 * Maps solutionId -> Set of objectIds in that solution.
 */
export type SolutionMemberships = Map<string, Set<string>>;

/**
 * Serializable version of solution memberships for webview transport.
 * Maps solutionId -> array of objectIds.
 */
export interface SolutionMembershipsDto {
	readonly [solutionId: string]: readonly string[];
}

/**
 * Loads all plugin registration component memberships across all solutions.
 *
 * This data is used for client-side filtering by solution. The query is
 * designed to run in parallel with the main tree load to avoid UX regression.
 *
 * Data structure: solutionId -> Set of objectIds in that solution.
 * This allows O(1) lookup when filtering tree nodes by solution.
 */
export class LoadSolutionMembershipsUseCase {
	constructor(
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads all solution memberships for plugin-related component types.
	 *
	 * @param environmentId - Target environment GUID
	 * @returns Map of solutionId -> Set of objectIds
	 */
	public async execute(environmentId: string): Promise<SolutionMemberships> {
		const startTime = Date.now();

		this.logger.info('LoadSolutionMembershipsUseCase: Loading memberships', {
			environmentId,
			componentTypes: ALL_PLUGIN_COMPONENT_TYPES
		});

		const memberships = await this.solutionComponentRepository.findAllByComponentTypes(
			environmentId,
			ALL_PLUGIN_COMPONENT_TYPES
		);

		this.logger.info('LoadSolutionMembershipsUseCase: Loaded memberships', {
			solutionCount: memberships.size,
			totalMs: Date.now() - startTime
		});

		return memberships;
	}

	/**
	 * Converts solution memberships to a serializable DTO for webview transport.
	 * Maps and Sets don't serialize to JSON, so we convert to plain objects/arrays.
	 */
	public static toDto(memberships: SolutionMemberships): SolutionMembershipsDto {
		const dto: Record<string, readonly string[]> = {};
		for (const [solutionId, objectIds] of memberships) {
			dto[solutionId] = Array.from(objectIds);
		}
		return dto;
	}
}
