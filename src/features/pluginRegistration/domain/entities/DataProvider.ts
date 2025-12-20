/**
 * DataProvider entity representing an entitydataprovider record in Dataverse.
 * Maps plugin types to virtual entity operations (Retrieve, RetrieveMultiple, Create, Update, Delete).
 *
 * Data Providers enable Virtual Entities by connecting custom plugin types to handle
 * CRUD operations. Each operation can have a plugin type assigned or use the "not implemented"
 * placeholder GUID which means the operation is not supported.
 */
export class DataProvider {
	/**
	 * Dataverse uses this GUID as a placeholder when an operation's plugin is not implemented.
	 */
	private static readonly NOT_IMPLEMENTED_GUID = 'c1919979-0021-4f11-a587-a8f904bdfdf9';

	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly dataSourceLogicalName: string,
		private readonly description: string | null,
		private readonly retrievePluginId: string | null,
		private readonly retrieveMultiplePluginId: string | null,
		private readonly createPluginId: string | null,
		private readonly updatePluginId: string | null,
		private readonly deletePluginId: string | null,
		private readonly isManaged: boolean,
		private readonly isCustomizable: boolean,
		private readonly solutionId: string | null,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date
	) {}

	// ============================================================
	// Business Rules
	// ============================================================

	/**
	 * Data Providers can be updated if they are unmanaged or customizable.
	 */
	public canUpdate(): boolean {
		return !this.isManaged || this.isCustomizable;
	}

	/**
	 * Data Providers can only be deleted if they are not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Checks if the Retrieve operation has a plugin assigned.
	 * Most virtual entities require at least RetrieveMultiple, Retrieve is optional.
	 */
	public hasRetrieve(): boolean {
		return this.isPluginImplemented(this.retrievePluginId);
	}

	/**
	 * Checks if the RetrieveMultiple operation has a plugin assigned.
	 * This is typically required for virtual entities to appear in views.
	 */
	public hasRetrieveMultiple(): boolean {
		return this.isPluginImplemented(this.retrieveMultiplePluginId);
	}

	/**
	 * Checks if the Create operation has a plugin assigned.
	 */
	public hasCreate(): boolean {
		return this.isPluginImplemented(this.createPluginId);
	}

	/**
	 * Checks if the Update operation has a plugin assigned.
	 */
	public hasUpdate(): boolean {
		return this.isPluginImplemented(this.updatePluginId);
	}

	/**
	 * Checks if the Delete operation has a plugin assigned.
	 */
	public hasDelete(): boolean {
		return this.isPluginImplemented(this.deletePluginId);
	}

	/**
	 * Returns true if any write operation (Create, Update, Delete) has a plugin assigned.
	 * This indicates the virtual entity supports CUD operations.
	 */
	public hasCudOperations(): boolean {
		return this.hasCreate() || this.hasUpdate() || this.hasDelete();
	}

	// ============================================================
	// Static Helpers
	// ============================================================

	/**
	 * Returns the "not implemented" GUID used by Dataverse.
	 */
	public static getNotImplementedGuid(): string {
		return DataProvider.NOT_IMPLEMENTED_GUID;
	}

	/**
	 * Checks if a GUID represents the "not implemented" placeholder.
	 */
	public static isNotImplementedGuid(guid: string | null): boolean {
		if (guid === null) {
			return true;
		}
		return guid.toLowerCase() === DataProvider.NOT_IMPLEMENTED_GUID.toLowerCase();
	}

	// ============================================================
	// Getters
	// ============================================================

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getDataSourceLogicalName(): string {
		return this.dataSourceLogicalName;
	}

	public getDescription(): string | null {
		return this.description;
	}

	public getRetrievePluginId(): string | null {
		return this.retrievePluginId;
	}

	public getRetrieveMultiplePluginId(): string | null {
		return this.retrieveMultiplePluginId;
	}

	public getCreatePluginId(): string | null {
		return this.createPluginId;
	}

	public getUpdatePluginId(): string | null {
		return this.updatePluginId;
	}

	public getDeletePluginId(): string | null {
		return this.deletePluginId;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}

	public isCustomizableInManagedState(): boolean {
		return this.isCustomizable;
	}

	public getSolutionId(): string | null {
		return this.solutionId;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}

	public getModifiedOn(): Date {
		return this.modifiedOn;
	}

	// ============================================================
	// Private Helpers
	// ============================================================

	private isPluginImplemented(pluginId: string | null): boolean {
		return pluginId !== null && !DataProvider.isNotImplementedGuid(pluginId);
	}
}
