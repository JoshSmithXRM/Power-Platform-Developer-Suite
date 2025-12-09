import { ComponentType } from '../enums/ComponentType';

/**
 * Domain entity representing a Power Platform solution component.
 *
 * Responsibilities:
 * - Encapsulate component metadata (type, ID, name)
 * - Provide component categorization
 * - Support component comparison
 *
 * Business Rules:
 * - objectId is unique within an environment but differs across environments
 * - displayName is for UI display only (may be null for some component types)
 * - componentType determines component behavior and category
 */
export class SolutionComponent {
	/**
	 * Creates a new SolutionComponent.
	 *
	 * @param objectId - Component object ID (GUID)
	 * @param componentType - Component type (maps to ComponentType enum)
	 * @param displayName - Human-readable name (null if unavailable)
	 * @param solutionId - Parent solution ID
	 * @throws {Error} When objectId or solutionId is empty
	 */
	constructor(
		private readonly objectId: string,
		private readonly componentType: ComponentType,
		private readonly displayName: string | null,
		private readonly solutionId: string
	) {
		this.validateInvariants();
	}

	/**
	 * Validates business rules on construction.
	 */
	private validateInvariants(): void {
		if (this.objectId.trim() === '') {
			throw new Error('Component objectId cannot be empty');
		}

		if (this.solutionId.trim() === '') {
			throw new Error('Component solutionId cannot be empty');
		}
	}

	/**
	 * Gets the name for this component.
	 *
	 * Business Rule: Falls back to objectId if displayName is null.
	 * This is a domain concept - the component's identifier for comparison and matching.
	 */
	public getName(): string {
		return this.displayName ?? this.objectId;
	}

	/**
	 * Checks if this component matches another by objectId.
	 *
	 * Business Rule: Components are matched by objectId (case-insensitive)
	 * Used for cross-environment comparison.
	 */
	public matchesById(other: SolutionComponent): boolean {
		return this.objectId.toLowerCase() === other.objectId.toLowerCase();
	}

	/**
	 * Checks if this component is of a specific type.
	 */
	public isType(type: ComponentType): boolean {
		return this.componentType === type;
	}

	// Getters (NO business logic in getters)
	public getObjectId(): string {
		return this.objectId;
	}

	public getComponentType(): ComponentType {
		return this.componentType;
	}

	public getSolutionId(): string {
		return this.solutionId;
	}
}
