import { ComponentType } from '../enums/ComponentType';
import { ComponentDiff } from '../valueObjects/ComponentDiff';

import { SolutionComponent } from './SolutionComponent';

/**
 * Represents a component group with categorized components.
 */
export interface ComponentGroup {
	readonly added: SolutionComponent[];
	readonly removed: SolutionComponent[];
	readonly same: SolutionComponent[];
}

/**
 * Domain entity representing a component-level comparison between two solutions.
 *
 * Responsibilities:
 * - Compare component lists from source and target solutions
 * - Categorize components as Added, Removed, or Same
 * - Group components by type for organized display
 *
 * Business Rules:
 * - Components are matched by objectId (case-insensitive)
 * - Added: In target but NOT in source
 * - Removed: In source but NOT in target
 * - Same: In both source AND target
 */
export class ComponentComparison {
	private readonly diff: ComponentDiff;

	/**
	 * Creates a new ComponentComparison.
	 *
	 * @param sourceComponents - Components from source solution
	 * @param targetComponents - Components from target solution
	 * @param sourceSolutionId - Source solution GUID
	 * @param targetSolutionId - Target solution GUID
	 */
	constructor(
		private readonly sourceComponents: readonly SolutionComponent[],
		private readonly targetComponents: readonly SolutionComponent[],
		private readonly sourceSolutionId: string,
		private readonly targetSolutionId: string
	) {
		this.diff = this.calculateDiff();
	}

	/**
	 * Calculates component differences between source and target.
	 *
	 * Business Logic:
	 * - Categorize components as Added, Removed, or Same
	 * - Match by objectId (case-insensitive)
	 */
	private calculateDiff(): ComponentDiff {
		const sourceIds = new Set(this.sourceComponents.map(c => c.getObjectId().toLowerCase()));
		const targetIds = new Set(this.targetComponents.map(c => c.getObjectId().toLowerCase()));

		// Added: In target but NOT in source
		const added = this.targetComponents.filter(c => !sourceIds.has(c.getObjectId().toLowerCase()));

		// Removed: In source but NOT in target
		const removed = this.sourceComponents.filter(c => !targetIds.has(c.getObjectId().toLowerCase()));

		// Same: In both source AND target (use source components)
		const same = this.sourceComponents.filter(c => targetIds.has(c.getObjectId().toLowerCase()));

		return new ComponentDiff(added, removed, same);
	}

	/**
	 * Checks if there are any component differences.
	 *
	 * Business Rule: No differences means all components are in both solutions
	 */
	public hasDifferences(): boolean {
		return this.diff.hasDifferences();
	}

	/**
	 * Gets total component count in source solution.
	 */
	public getSourceComponentCount(): number {
		return this.sourceComponents.length;
	}

	/**
	 * Gets total component count in target solution.
	 */
	public getTargetComponentCount(): number {
		return this.targetComponents.length;
	}

	/**
	 * Gets components grouped by type for organized display.
	 *
	 * Business Rule: Group by ComponentType, sorted by type name
	 */
	public getComponentsByType(): Map<ComponentType, ComponentGroup> {
		const groups = new Map<ComponentType, ComponentGroup>();

		// Collect all unique component types present
		const allTypes = new Set<ComponentType>([
			...this.diff.getAdded().map(c => c.getComponentType()),
			...this.diff.getRemoved().map(c => c.getComponentType()),
			...this.diff.getSame().map(c => c.getComponentType())
		]);

		// Build group for each type
		for (const type of allTypes) {
			groups.set(type, {
				added: [...this.diff.getAdded().filter(c => c.isType(type))],
				removed: [...this.diff.getRemoved().filter(c => c.isType(type))],
				same: [...this.diff.getSame().filter(c => c.isType(type))]
			});
		}

		return groups;
	}

	// Getters (NO business logic in getters)
	public getDiff(): ComponentDiff {
		return this.diff;
	}

	public getSourceSolutionId(): string {
		return this.sourceSolutionId;
	}

	public getTargetSolutionId(): string {
		return this.targetSolutionId;
	}
}
