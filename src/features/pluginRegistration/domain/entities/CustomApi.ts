import { AllowedCustomProcessingStepType } from '../valueObjects/AllowedCustomProcessingStepType';
import { BindingType } from '../valueObjects/BindingType';

/**
 * Represents a Custom API definition in Dataverse.
 *
 * Custom APIs are message-like entities that can be invoked via the Web API.
 * They can optionally be backed by a plugin type for server-side execution.
 *
 * Business Rules:
 * - Custom APIs with BindingType Entity or EntityCollection require boundEntityLogicalName
 * - IsFunction=true creates an OData function (GET), false creates an action (POST)
 * - PluginTypeId is optional - APIs can be implemented via Power Automate or external code
 * - Managed Custom APIs cannot be updated or deleted
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (checks if not managed)
 * - canDelete(): boolean (checks if not managed)
 * - hasPluginImplementation(): boolean (checks if pluginTypeId is set)
 * - requiresBoundEntity(): boolean (checks binding type)
 */
export class CustomApi {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly uniqueName: string,
		private readonly displayName: string,
		private readonly description: string | null,
		private readonly isFunction: boolean,
		private readonly isPrivate: boolean,
		private readonly executePrivilegeName: string | null,
		private readonly bindingType: BindingType,
		private readonly boundEntityLogicalName: string | null,
		private readonly allowedCustomProcessingStepType: AllowedCustomProcessingStepType,
		private readonly pluginTypeId: string | null,
		private readonly pluginTypeName: string | null,
		private readonly sdkMessageId: string | null,
		private readonly isManaged: boolean,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date
	) {}

	/**
	 * Business rule: Can update if not managed.
	 */
	public canUpdate(): boolean {
		return !this.isManaged;
	}

	/**
	 * Business rule: Can delete if not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Business rule: Has plugin implementation if pluginTypeId is set.
	 */
	public hasPluginImplementation(): boolean {
		return this.pluginTypeId !== null;
	}

	/**
	 * Business rule: Requires bound entity if binding type is Entity or EntityCollection.
	 */
	public requiresBoundEntity(): boolean {
		return this.bindingType.requiresBoundEntity();
	}

	/**
	 * Returns the HTTP verb used to invoke this API.
	 */
	public getHttpVerb(): string {
		return this.isFunction ? 'GET' : 'POST';
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

	public getDisplayName(): string {
		return this.displayName;
	}

	public getDescription(): string | null {
		return this.description;
	}

	public getIsFunction(): boolean {
		return this.isFunction;
	}

	public getIsPrivate(): boolean {
		return this.isPrivate;
	}

	public getExecutePrivilegeName(): string | null {
		return this.executePrivilegeName;
	}

	public getBindingType(): BindingType {
		return this.bindingType;
	}

	public getBoundEntityLogicalName(): string | null {
		return this.boundEntityLogicalName;
	}

	public getAllowedCustomProcessingStepType(): AllowedCustomProcessingStepType {
		return this.allowedCustomProcessingStepType;
	}

	public getPluginTypeId(): string | null {
		return this.pluginTypeId;
	}

	public getPluginTypeName(): string | null {
		return this.pluginTypeName;
	}

	public getSdkMessageId(): string | null {
		return this.sdkMessageId;
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
