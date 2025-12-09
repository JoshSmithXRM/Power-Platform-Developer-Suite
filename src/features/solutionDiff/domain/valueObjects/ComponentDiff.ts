import { SolutionComponent } from '../entities/SolutionComponent';

/**
 * Value object representing the categorized differences between component lists.
 *
 * Immutable, encapsulates categorization logic.
 *
 * Responsibilities:
 * - Store categorized component lists (Added, Removed, Same)
 * - Provide summary statistics
 */
export class ComponentDiff {
	private readonly addedComponents: readonly SolutionComponent[];
	private readonly removedComponents: readonly SolutionComponent[];
	private readonly sameComponents: readonly SolutionComponent[];

	/**
	 * Creates a new ComponentDiff.
	 *
	 * @param added - Components added (in target only)
	 * @param removed - Components removed (in source only)
	 * @param same - Components unchanged (in both)
	 */
	constructor(
		added: readonly SolutionComponent[],
		removed: readonly SolutionComponent[],
		same: readonly SolutionComponent[]
	) {
		// Make defensive copies to ensure immutability
		this.addedComponents = [...added];
		this.removedComponents = [...removed];
		this.sameComponents = [...same];
	}

	/**
	 * Gets summary of component differences.
	 *
	 * @returns Human-readable summary string
	 */
	public getSummary(): string {
		if (this.addedComponents.length === 0 && this.removedComponents.length === 0) {
			return 'No component differences';
		}

		const parts: string[] = [];
		if (this.addedComponents.length > 0) {
			parts.push(`${this.addedComponents.length} added`);
		}
		if (this.removedComponents.length > 0) {
			parts.push(`${this.removedComponents.length} removed`);
		}
		if (this.sameComponents.length > 0) {
			parts.push(`${this.sameComponents.length} unchanged`);
		}

		return parts.join(', ');
	}

	/**
	 * Gets total number of components across all categories.
	 */
	public getTotalCount(): number {
		return this.addedComponents.length + this.removedComponents.length + this.sameComponents.length;
	}

	/**
	 * Checks if there are any differences (added or removed components).
	 */
	public hasDifferences(): boolean {
		return this.addedComponents.length > 0 || this.removedComponents.length > 0;
	}

	// Getters (NO business logic in getters)
	public getAdded(): readonly SolutionComponent[] {
		return this.addedComponents;
	}

	public getRemoved(): readonly SolutionComponent[] {
		return this.removedComponents;
	}

	public getSame(): readonly SolutionComponent[] {
		return this.sameComponents;
	}
}
