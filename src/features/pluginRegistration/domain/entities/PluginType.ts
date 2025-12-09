/**
 * Represents a plugin type (class) within an assembly.
 *
 * Business Rules:
 * - Plugin types must belong to an assembly
 * - FriendlyName used for display in tree
 * - TypeName is the fully qualified class name
 * - WorkflowActivityGroupName indicates workflow activity (vs regular plugin)
 *
 * Rich behavior (NOT anemic):
 * - isWorkflowActivity(): boolean
 * - getDisplayName(): string (prefers friendly name)
 */
export class PluginType {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly friendlyName: string,
		private readonly assemblyId: string,
		private readonly workflowActivityGroupName: string | null
	) {}

	/**
	 * Business rule: Determine if this is a workflow activity.
	 * Used by: UI to show different icon
	 */
	public isWorkflowActivity(): boolean {
		return this.workflowActivityGroupName !== null;
	}

	/**
	 * Gets display name (prefers FriendlyName over TypeName).
	 */
	public getDisplayName(): string {
		return this.friendlyName || this.name;
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getFriendlyName(): string {
		return this.friendlyName;
	}

	public getAssemblyId(): string {
		return this.assemblyId;
	}

	public getWorkflowActivityGroupName(): string | null {
		return this.workflowActivityGroupName;
	}
}
