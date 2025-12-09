/**
 * Represents a plugin package in Dataverse.
 * Plugin packages are containers for assemblies, supporting NuGet-based deployment.
 *
 * Business Rules:
 * - Packages can contain multiple assemblies
 * - Managed packages cannot be modified
 * - Package version determines update vs new registration
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (checks if managed)
 * - canDelete(assemblyCount): boolean (checks if has assemblies)
 * - getDisplayVersion(): string (formatted version)
 */
export class PluginPackage {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly uniqueName: string,
		private readonly version: string,
		private readonly isManaged: boolean,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date
	) {}

	/**
	 * Business rule: Managed packages cannot be updated.
	 */
	public canUpdate(): boolean {
		return !this.isManaged;
	}

	/**
	 * Business rule: Packages with assemblies cannot be deleted.
	 * Caller must pass assemblyCount from repository.
	 *
	 * @param assemblyCount - Number of assemblies in this package
	 */
	public canDelete(assemblyCount: number): boolean {
		return !this.isManaged && assemblyCount === 0;
	}

	/**
	 * Formats version for display.
	 */
	public getDisplayVersion(): string {
		return this.version;
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getUniqueName(): string {
		return this.uniqueName;
	}

	public getVersion(): string {
		return this.version;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}

	public getModifiedOn(): Date {
		return this.modifiedOn;
	}
}
