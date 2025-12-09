import { IsolationMode } from '../valueObjects/IsolationMode';
import { SourceType } from '../valueObjects/SourceType';

/**
 * Represents a plugin assembly registered in Dataverse.
 *
 * Business Rules:
 * - Assemblies have unique IDs
 * - Assemblies may belong to a package (packageId) or be standalone (packageId = null)
 * - Managed assemblies cannot be modified
 * - Assembly version determines update vs new registration
 * - IsolationMode determines execution context (Sandbox vs None)
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (checks if managed)
 * - canDelete(activeStepCount): boolean (checks if has active steps)
 * - getDisplayVersion(): string (formatted version)
 * - isInPackage(): boolean (checks if part of a package)
 */
export class PluginAssembly {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly version: string,
		private readonly isolationMode: IsolationMode,
		private readonly isManaged: boolean,
		private readonly sourceType: SourceType,
		private readonly packageId: string | null,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date
	) {}

	/**
	 * Business rule: Can update if unmanaged AND standalone (not in a package).
	 * Assemblies in packages must be updated via the package.
	 * Used by: UI to show/hide update context menu
	 */
	public canUpdate(): boolean {
		return !this.isManaged && !this.isInPackage();
	}

	/**
	 * Business rule: Assemblies with active steps cannot be deleted.
	 * Caller must pass activeStepCount from repository.
	 *
	 * @param activeStepCount - Number of enabled steps in this assembly
	 */
	public canDelete(activeStepCount: number): boolean {
		return !this.isManaged && activeStepCount === 0;
	}

	/**
	 * Formats version for display.
	 */
	public getDisplayVersion(): string {
		return this.version;
	}

	/**
	 * Business rule: Check if assembly belongs to a package.
	 * Used by: Tree rendering to group assemblies under packages
	 */
	public isInPackage(): boolean {
		return this.packageId !== null;
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getVersion(): string {
		return this.version;
	}

	public getIsolationMode(): IsolationMode {
		return this.isolationMode;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}

	public getSourceType(): SourceType {
		return this.sourceType;
	}

	public getPackageId(): string | null {
		return this.packageId;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}

	public getModifiedOn(): Date {
		return this.modifiedOn;
	}
}
