import { CustomApiParameterType } from '../valueObjects/CustomApiParameterType';

/**
 * Direction of a Custom API parameter.
 */
export type CustomApiParameterDirection = 'request' | 'response';

/**
 * Represents a Custom API request parameter or response property.
 *
 * In Dataverse, these are stored in separate tables:
 * - customapirequestparameter for input parameters
 * - customapiresponseproperty for output parameters
 *
 * Business Rules:
 * - Parameters with type Entity, EntityCollection, or EntityReference require logicalEntityName
 * - IsOptional only applies to request parameters
 * - Response properties are always required (isOptional is always false)
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (always true for unmanaged APIs)
 * - canDelete(): boolean (always true for unmanaged APIs)
 * - requiresEntityLogicalName(): boolean (checks parameter type)
 * - isRequest(): boolean (checks direction)
 * - isResponse(): boolean (checks direction)
 */
export class CustomApiParameter {
	constructor(
		private readonly id: string,
		private readonly customApiId: string,
		private readonly name: string,
		private readonly uniqueName: string,
		private readonly displayName: string,
		private readonly description: string | null,
		private readonly type: CustomApiParameterType,
		private readonly logicalEntityName: string | null,
		private readonly isOptional: boolean,
		private readonly direction: CustomApiParameterDirection
	) {}

	/**
	 * Business rule: Parameters can always be updated if the parent API is unmanaged.
	 * We don't track managed state on parameters themselves.
	 */
	public canUpdate(): boolean {
		return true;
	}

	/**
	 * Business rule: Parameters can always be deleted if the parent API is unmanaged.
	 * We don't track managed state on parameters themselves.
	 */
	public canDelete(): boolean {
		return true;
	}

	/**
	 * Business rule: Requires entity logical name if type is Entity, EntityCollection, or EntityReference.
	 */
	public requiresEntityLogicalName(): boolean {
		return this.type.requiresEntityLogicalName();
	}

	/**
	 * Returns true if this is a request parameter.
	 */
	public isRequest(): boolean {
		return this.direction === 'request';
	}

	/**
	 * Returns true if this is a response property.
	 */
	public isResponse(): boolean {
		return this.direction === 'response';
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getCustomApiId(): string {
		return this.customApiId;
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

	public getType(): CustomApiParameterType {
		return this.type;
	}

	public getLogicalEntityName(): string | null {
		return this.logicalEntityName;
	}

	public getIsOptional(): boolean {
		return this.isOptional;
	}

	public getDirection(): CustomApiParameterDirection {
		return this.direction;
	}
}
