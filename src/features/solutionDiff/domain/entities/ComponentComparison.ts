import { ComponentType } from '../enums/ComponentType';
import { ComponentDiff } from '../valueObjects/ComponentDiff';
import { ComponentData } from '../valueObjects/ComponentData';
import { ColumnDiff } from '../valueObjects/ColumnDiff';

import { SolutionComponent } from './SolutionComponent';

/**
 * Represents a component that exists in both environments but has different content.
 */
export interface ModifiedComponent {
	readonly component: SolutionComponent;
	readonly columnDiffs: readonly ColumnDiff[];
}

/**
 * Represents a component group with categorized components.
 */
export interface ComponentGroup {
	readonly added: SolutionComponent[];
	readonly removed: SolutionComponent[];
	readonly modified: ModifiedComponent[];
	readonly same: SolutionComponent[];
}

/**
 * Domain entity representing a component-level comparison between two solutions.
 *
 * Responsibilities:
 * - Compare component lists from source and target solutions
 * - Categorize components as Added, Removed, Modified, or Same
 * - Group components by type for organized display
 * - Detect content-level differences when component data is provided
 *
 * Business Rules:
 * - Components are matched by objectId (case-insensitive)
 * - Added: In target but NOT in source
 * - Removed: In source but NOT in target
 * - Modified: In both but content differs (when component data provided)
 * - Same: In both source AND target with matching content
 */
export class ComponentComparison {
	private readonly diff: ComponentDiff;
	private readonly modifiedComponents: Map<string, ModifiedComponent>;

	/**
	 * Creates a new ComponentComparison.
	 *
	 * @param sourceComponents - Components from source solution
	 * @param targetComponents - Components from target solution
	 * @param sourceSolutionId - Source solution GUID
	 * @param targetSolutionId - Target solution GUID
	 * @param sourceComponentData - Optional: Fetched component data from source (enables deep comparison)
	 * @param targetComponentData - Optional: Fetched component data from target (enables deep comparison)
	 */
	constructor(
		private readonly sourceComponents: readonly SolutionComponent[],
		private readonly targetComponents: readonly SolutionComponent[],
		private readonly sourceSolutionId: string,
		private readonly targetSolutionId: string,
		private readonly sourceComponentData?: ReadonlyMap<string, ComponentData>,
		private readonly targetComponentData?: ReadonlyMap<string, ComponentData>
	) {
		this.modifiedComponents = new Map();
		this.diff = this.calculateDiff();
	}

	/**
	 * Calculates component differences between source and target.
	 *
	 * Business Logic:
	 * - Categorize components as Added, Removed, Modified, or Same
	 * - Match by objectId (case-insensitive)
	 * - If component data is provided, detect content-level differences
	 */
	private calculateDiff(): ComponentDiff {
		const sourceIds = new Set(this.sourceComponents.map(c => c.getObjectId().toLowerCase()));
		const targetIds = new Set(this.targetComponents.map(c => c.getObjectId().toLowerCase()));

		// Added: In target but NOT in source
		const added = this.targetComponents.filter(c => !sourceIds.has(c.getObjectId().toLowerCase()));

		// Removed: In source but NOT in target
		const removed = this.sourceComponents.filter(c => !targetIds.has(c.getObjectId().toLowerCase()));

		// Components in both - check for modifications if data available
		const inBoth = this.sourceComponents.filter(c => targetIds.has(c.getObjectId().toLowerCase()));

		const same: SolutionComponent[] = [];

		for (const component of inBoth) {
			const objectId = component.getObjectId().toLowerCase();

			// Check for deep differences if component data is available
			if (this.sourceComponentData !== undefined && this.targetComponentData !== undefined) {
				const sourceData = this.sourceComponentData.get(objectId);
				const targetData = this.targetComponentData.get(objectId);

				// Only compare if we have data for both
				if (sourceData !== undefined && targetData !== undefined) {
					if (!sourceData.hasMatchingValues(targetData)) {
						// Component is modified - track the differences
						this.modifiedComponents.set(objectId, {
							component,
							columnDiffs: sourceData.getColumnDifferences(targetData)
						});
						continue;
					}
				}
			}

			// No deep comparison data, or values match
			same.push(component);
		}

		return new ComponentDiff(added, removed, same);
	}

	/**
	 * Checks if there are any component differences.
	 *
	 * Business Rule: Differences include Added, Removed, OR Modified components
	 */
	public hasDifferences(): boolean {
		return this.diff.hasDifferences() || this.modifiedComponents.size > 0;
	}

	/**
	 * Gets modified components (in both environments but content differs).
	 */
	public getModifiedComponents(): readonly ModifiedComponent[] {
		return [...this.modifiedComponents.values()];
	}

	/**
	 * Gets the count of modified components.
	 */
	public getModifiedCount(): number {
		return this.modifiedComponents.size;
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
	 * Business Rule: Group by ComponentType, including Modified category
	 */
	public getComponentsByType(): Map<ComponentType, ComponentGroup> {
		const groups = new Map<ComponentType, ComponentGroup>();

		// Get all modified components for type filtering
		const modifiedList = this.getModifiedComponents();

		// Collect all unique component types present
		const allTypes = new Set<ComponentType>([
			...this.diff.getAdded().map(c => c.getComponentType()),
			...this.diff.getRemoved().map(c => c.getComponentType()),
			...this.diff.getSame().map(c => c.getComponentType()),
			...modifiedList.map(m => m.component.getComponentType())
		]);

		// Build group for each type
		for (const type of allTypes) {
			groups.set(type, {
				added: [...this.diff.getAdded().filter(c => c.isType(type))],
				removed: [...this.diff.getRemoved().filter(c => c.isType(type))],
				modified: modifiedList.filter(m => m.component.isType(type)),
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
